const express = require('express');
const { db, getAll, getOne, runQuery: dbRun } = require('../db');
const { authRequired } = require('../auth');
const { nanoid, nowIso, safeStr, safeEnum } = require('../util');
const { sanitizeLabels } = require('../postLabels');
const { runQuery: researchQuery } = require('../research/queryEngine');

const router = express.Router();

const KINDS = ['discussion', 'workout', 'program', 'template', 'study'];
const ITEM_KINDS = { workout: 'workouts', program: 'programs', template: 'workout_templates' };
const VISIBILITY = ['public', 'followers'];
const SORTS = ['hot', 'new', 'top'];
const STUDY_CACHE_TTL_MS = 5 * 60 * 1000;
const STUDY_CACHE_MAX_ENTRIES = 100;
const studyAttachmentCache = new Map();
const ORDER_BY = {
  new: 'p.created_at DESC',
  top: 'p.score DESC, p.created_at DESC',
  hot: 'hot_rank(p.score, p.created_at) DESC, p.created_at DESC'
};

async function followingIds(userId) {
  return (await getAll('SELECT following_id FROM follows WHERE follower_id = ?', [userId])).map((r) => r.following_id);
}

async function labelsFor(postId) {
  return (await getAll('SELECT label FROM post_labels WHERE post_id = ?', [postId])).map((r) => r.label);
}

async function recomputePostScore(postId) {
  const sum = (await getOne('SELECT COALESCE(SUM(value), 0) AS s FROM post_votes WHERE post_id = ?', [postId])).s;
  await dbRun('UPDATE posts SET score = ? WHERE id = ?', [sum, postId]);
  return sum;
}

async function recomputeCommentScore(commentId) {
  const sum = (await getOne('SELECT COALESCE(SUM(value), 0) AS s FROM comment_votes WHERE comment_id = ?', [commentId])).s;
  await dbRun('UPDATE comments SET score = ? WHERE id = ?', [sum, commentId]);
  return sum;
}

// Light attachment summary for cards/detail. Rich program/template experiences are
// fetched separately by the client via /api/programs/:id and /api/templates/:id.
async function attachmentSummary(post) {
  if (post.kind === 'workout') {
    const w = await getOne(
      `SELECT w.id, w.date, w.duration_min, w.workout_day, w.workout_split_type,
              (SELECT COUNT(*) FROM sets s WHERE s.workout_id = w.id) AS set_count,
              (SELECT COUNT(DISTINCT s.exercise_id) FROM sets s WHERE s.workout_id = w.id) AS exercise_count
         FROM workouts w WHERE w.id = ?`,
      [post.attachment_id]
    );
    return w || null;
  }
  if (post.kind === 'program') {
    const p = await getOne(
      `SELECT p.id, p.name, p.description, p.weeks, p.strictness, p.visibility,
              (SELECT COUNT(*) FROM program_enrollments WHERE program_id = p.id) AS enrollment_count
         FROM programs p WHERE p.id = ?`,
      [post.attachment_id]
    );
    return p || null;
  }
  if (post.kind === 'template') {
    const t = await getOne(
      `SELECT t.id, t.name, t.description, t.workout_day, t.usage_count, t.strictness, t.visibility,
              (SELECT COUNT(*) FROM template_exercises te WHERE te.template_id = t.id) AS exercise_count
         FROM workout_templates t WHERE t.id = ?`,
      [post.attachment_id]
    );
    return t || null;
  }
  if (post.kind === 'study') {
    return await hydrateStudy(post.study_feature_json);
  }
  return null;
}

async function runStudySide(feature, filters) {
  const r = await researchQuery(db, {
    filters,
    groupBy: feature.groupBy,
    measure: feature.measure,
    exerciseId: feature.exerciseId || undefined,
    muscle: feature.muscle || undefined,
    minCohort: feature.minCohort
  });
  if (r.error) return { error: r.error };
  return { buckets: r.buckets || [], totalCohortSize: r.totalCohortSize || 0 };
}

async function hydrateStudy(json) {
  const key = json || '';
  const now = Date.now();
  for (const [cacheKey, entry] of studyAttachmentCache) {
    if (entry.expiresAt <= now) studyAttachmentCache.delete(cacheKey);
  }
  const cached = studyAttachmentCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  let feature;
  try {feature = JSON.parse(json || '{}');} catch {return null;}
  if (!feature || !feature.groupBy || !feature.measure) return { error: 'Study has no replayable query' };
  const base = { mode: feature.mode === 'compare' ? 'compare' : 'single', groupBy: feature.groupBy, measure: feature.measure, label: feature.label || '' };
  let value;
  if (base.mode === 'compare') {
    const a = await runStudySide(feature, feature.cohortA?.filters || []);
    const b = await runStudySide(feature, feature.cohortB?.filters || []);
    value = {
      ...base,
      cohortA: { label: feature.cohortA?.label || 'A', ...a },
      cohortB: { label: feature.cohortB?.label || 'B', ...b }
    };
  } else {
    value = { ...base, ...(await runStudySide(feature, feature.filters || [])) };
  }
  if (studyAttachmentCache.size >= STUDY_CACHE_MAX_ENTRIES) {
    studyAttachmentCache.delete(studyAttachmentCache.keys().next().value);
  }
  studyAttachmentCache.set(key, { value, expiresAt: now + STUDY_CACHE_TTL_MS });
  return value;
}

async function shapePost(row, userId, { withAttachment = true } = {}) {
  const vote = await getOne('SELECT value FROM post_votes WHERE post_id = ? AND user_id = ?', [row.id, userId]);
  const saved = await getOne('SELECT 1 AS x FROM saved_posts WHERE post_id = ? AND user_id = ?', [row.id, userId]);
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    user_id: row.user_id,
    username: row.username,
    labels: await labelsFor(row.id),
    score: row.score,
    comment_count: row.comment_count,
    visibility: row.visibility,
    created_at: row.created_at,
    viewer_vote: vote?.value || 0,
    saved: !!saved,
    attachment: withAttachment ? await attachmentSummary(row) : undefined
  };
}

// Batched equivalent of shapePost for a page of rows: collapses the per-row
// votes/saved/labels/attachment lookups into a handful of `IN (…)` queries.
// Study attachments still replay the research query per row (rare, unbatchable).
async function shapePostsBatch(rows, userId) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const ph = ids.map(() => '?').join(',');

  const voteMap = new Map(
    (await getAll(`SELECT post_id, value FROM post_votes WHERE user_id = ? AND post_id IN (${ph})`, [userId, ...ids])).
    map((r) => [r.post_id, r.value]));
  const savedSet = new Set(
    (await getAll(`SELECT post_id FROM saved_posts WHERE user_id = ? AND post_id IN (${ph})`, [userId, ...ids])).
    map((r) => r.post_id));
  const labelsMap = new Map();
  for (const r of await getAll(`SELECT post_id, label FROM post_labels WHERE post_id IN (${ph})`, ids)) {
    if (!labelsMap.has(r.post_id)) labelsMap.set(r.post_id, []);
    labelsMap.get(r.post_id).push(r.label);
  }

  // attachment summaries: one IN(…) query per item-bearing kind, keyed by post id.
  const attByPost = new Map();
  const fetchSummaries = async (kind, sql) => {
    const group = rows.filter((r) => r.kind === kind && r.attachment_id);
    if (!group.length) return;
    const aids = [...new Set(group.map((r) => r.attachment_id))];
    const aph = aids.map(() => '?').join(',');
    const byId = new Map((await getAll(sql.replace('__IN__', aph), aids)).map((x) => [x.id, x]));
    for (const r of group) attByPost.set(r.id, byId.get(r.attachment_id) || null);
  };
  await fetchSummaries('workout',
  `SELECT w.id, w.date, w.duration_min, w.workout_day, w.workout_split_type,
            (SELECT COUNT(*) FROM sets s WHERE s.workout_id = w.id) AS set_count,
            (SELECT COUNT(DISTINCT s.exercise_id) FROM sets s WHERE s.workout_id = w.id) AS exercise_count
       FROM workouts w WHERE w.id IN (__IN__)`);
  await fetchSummaries('program',
  `SELECT p.id, p.name, p.description, p.weeks, p.strictness, p.visibility,
            (SELECT COUNT(*) FROM program_enrollments WHERE program_id = p.id) AS enrollment_count
       FROM programs p WHERE p.id IN (__IN__)`);
  await fetchSummaries('template',
  `SELECT t.id, t.name, t.description, t.workout_day, t.usage_count, t.strictness, t.visibility,
            (SELECT COUNT(*) FROM template_exercises te WHERE te.template_id = t.id) AS exercise_count
       FROM workout_templates t WHERE t.id IN (__IN__)`);
  for (const r of rows) {
    if (r.kind === 'study') attByPost.set(r.id, await hydrateStudy(r.study_feature_json));
  }

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    user_id: r.user_id,
    username: r.username,
    labels: labelsMap.get(r.id) || [],
    score: r.score,
    comment_count: r.comment_count,
    visibility: r.visibility,
    created_at: r.created_at,
    viewer_vote: voteMap.get(r.id) || 0,
    saved: savedSet.has(r.id),
    attachment: attByPost.has(r.id) ? attByPost.get(r.id) : null
  }));
}

// --- create -----------------------------------------------------------------
router.post('/', authRequired, async (req, res) => {
  const userId = req.user.id;
  const body = req.body || {};
  const kind = safeEnum(body.kind, KINDS);
  if (!kind) return res.status(400).json({ error: 'Choose what to share.' });
  const title = safeStr(body.title, 160) ?? '';
  const text = safeStr(body.body, 5000) ?? '';
  const visibility = safeEnum(body.visibility, VISIBILITY) ?? 'public';
  const labels = sanitizeLabels(body.labels);

  if (kind === 'discussion' && !title) {
    return res.status(400).json({ error: 'A discussion needs a title.' });
  }

  let attachmentType = null;
  let attachmentId = null;
  let studyFeatureJson = null;

  if (ITEM_KINDS[kind]) {
    const id = safeStr(body.attachment_id, 32);
    if (!id) return res.status(400).json({ error: 'Pick something to share.' });
    const table = ITEM_KINDS[kind]; // whitelisted table name
    const item = await getOne(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (!item) return res.status(404).json({ error: 'That item no longer exists.' });
    if (item.user_id !== userId) return res.status(403).json({ error: 'You can only share your own items.' });
    if ((kind === 'program' || kind === 'template') && item.status === 'draft') {
      return res.status(400).json({ error: 'Finish this draft before sharing it.' });
    }
    // Sharing makes the carried item visible — but never more exposed than the
    // post itself. A followers-only post must not flip its workout world-public.
    if (visibility === 'public') {
      await dbRun(`UPDATE ${table} SET visibility = 'public' WHERE id = ?`, [id]);
    } else {
      // followers post: only lift a fully-private item up to 'followers'.
      await dbRun(`UPDATE ${table} SET visibility = 'followers' WHERE id = ? AND visibility = 'private'`, [id]);
    }
    attachmentType = kind;
    attachmentId = id;
  } else if (kind === 'study') {
    const feature = body.study_feature && typeof body.study_feature === 'object' ? body.study_feature : null;
    if (!feature || !feature.groupBy || !feature.measure) {
      return res.status(400).json({ error: 'Pick a Study result and a variable to feature.' });
    }
    attachmentType = 'study';
    studyFeatureJson = JSON.stringify(feature);
  }

  const id = nanoid();
  const now = nowIso();
  await db.exec('BEGIN');
  try {
    await dbRun(
      `INSERT INTO posts (id, user_id, kind, title, body, attachment_type, attachment_id, study_feature_json, score, comment_count, visibility, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
      [id, userId, kind, title, text, attachmentType, attachmentId, studyFeatureJson, visibility, now]
    );
    for (const label of labels) {
      await dbRun('INSERT INTO post_labels (post_id, label) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, label]);
    }
    await db.exec('COMMIT');
  } catch (err) {
    try {await db.exec('ROLLBACK');} catch {/* noop */}
    console.error('Post create failed:', err);
    return res.status(500).json({ error: 'Failed to create post' });
  }
  const row = await getOne('SELECT p.*, u.username FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?', [id]);
  res.status(201).json({ post: await shapePost(row, userId) });
});

// --- feed -------------------------------------------------------------------
router.get('/', authRequired, async (req, res) => {
  const userId = req.user.id;
  const scope = safeEnum(req.query.scope, ['following', 'global']) ?? 'global';
  const sort = safeEnum(req.query.sort, SORTS) ?? 'hot';
  const kind = safeEnum(req.query.kind, KINDS);
  const label = sanitizeLabels([req.query.label])[0];
  const q = safeStr(req.query.q, 100);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);

  const where = [];
  const params = [];
  if (scope === 'following') {
    const ids = [...(await followingIds(userId)), userId];
    where.push(`p.user_id IN (${ids.map(() => '?').join(',')})`);
    params.push(...ids);
    where.push(`p.visibility IN ('public', 'followers')`);
  } else {
    where.push(`p.visibility = 'public'`);
    where.push('u.is_private = 0');
  }
  if (kind) {where.push('p.kind = ?');params.push(kind);}
  if (label) {
    where.push('EXISTS (SELECT 1 FROM post_labels pl WHERE pl.post_id = p.id AND pl.label = ?)');
    params.push(label);
  }
  if (q) {
    where.push('(p.title LIKE ? OR p.body LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }

  // Sort + paginate in SQL (hot via the hot_rank() function registered in db.js),
  // fetching one extra row to decide has_more without a separate COUNT.
  const rows = await getAll(
    `SELECT p.*, u.username FROM posts p JOIN users u ON u.id = p.user_id
      WHERE ${where.join(' AND ')}
      ORDER BY ${ORDER_BY[sort]} LIMIT ? OFFSET ?`,
    [...params, limit + 1, offset]
  );
  const hasMore = rows.length > limit;
  const paged = hasMore ? rows.slice(0, limit) : rows;
  res.json({
    items: await shapePostsBatch(paged, userId),
    scope, sort, limit, offset,
    has_more: hasMore
  });
});

router.get('/saved', authRequired, async (req, res) => {
  const userId = req.user.id;
  const rows = await getAll(
    `SELECT p.*, u.username FROM saved_posts sp
       JOIN posts p ON p.id = sp.post_id
       JOIN users u ON u.id = p.user_id
      WHERE sp.user_id = ?
      ORDER BY sp.created_at DESC`,
    [userId]
  );
  res.json({ items: await shapePostsBatch(rows, userId) });
});

// Everything the composer can attach when "pick existing" is chosen, scoped to
// the user's own shareable items. One call backs the whole composer.
router.get('/compose-options', authRequired, async (req, res) => {
  const userId = req.user.id;
  const workouts = await getAll(
    `SELECT w.id, w.date, w.duration_min, w.workout_day,
            (SELECT COUNT(*) FROM sets s WHERE s.workout_id = w.id) AS set_count,
            (SELECT COUNT(DISTINCT s.exercise_id) FROM sets s WHERE s.workout_id = w.id) AS exercise_count
       FROM workouts w
      WHERE w.user_id = ?
      ORDER BY w.date DESC, w.created_at DESC LIMIT 30`,
    [userId]
  );
  const programs = await getAll(
    `SELECT p.id, p.name, p.weeks, p.strictness,
            (SELECT COUNT(*) FROM program_enrollments WHERE program_id = p.id) AS enrollment_count
       FROM programs p
      WHERE p.user_id = ? AND COALESCE(p.status, 'final') = 'final'
      ORDER BY p.created_at DESC LIMIT 50`,
    [userId]
  );
  const templates = await getAll(
    `SELECT t.id, t.name, t.workout_day, t.usage_count,
            (SELECT COUNT(*) FROM template_exercises te WHERE te.template_id = t.id) AS exercise_count
       FROM workout_templates t
      WHERE t.user_id = ? AND (t.status IS NULL OR t.status = 'final')
      ORDER BY t.created_at DESC LIMIT 50`,
    [userId]
  );
  const studies = (await getAll(
    `SELECT id, label, mode, query_json, evidence_status FROM research_saved_questions
      WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50`,
    [userId]
  )).map((s) => {try {return { ...s, query: JSON.parse(s.query_json), query_json: undefined };} catch {return { ...s, query: {}, query_json: undefined };}});
  res.json({ workouts, programs, templates, studies });
});

// --- comment vote (must precede /:id) ---------------------------------------
router.post('/comments/:commentId/vote', authRequired, async (req, res) => {
  const value = req.body?.value === -1 ? -1 : req.body?.value === 1 ? 1 : 0;
  const comment = await getOne('SELECT id FROM comments WHERE id = ?', [req.params.commentId]);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  const existing = await getOne('SELECT value FROM comment_votes WHERE comment_id = ? AND user_id = ?', [req.params.commentId, req.user.id]);
  if (value === 0 || existing && existing.value === value) {
    await dbRun('DELETE FROM comment_votes WHERE comment_id = ? AND user_id = ?', [req.params.commentId, req.user.id]);
  } else if (existing) {
    await dbRun('UPDATE comment_votes SET value = ? WHERE comment_id = ? AND user_id = ?', [value, req.params.commentId, req.user.id]);
  } else {
    await dbRun('INSERT INTO comment_votes (comment_id, user_id, value) VALUES (?, ?, ?)', [req.params.commentId, req.user.id, value]);
  }
  const score = await recomputeCommentScore(req.params.commentId);
  res.json({ score, viewer_vote: (await getOne('SELECT value FROM comment_votes WHERE comment_id = ? AND user_id = ?', [req.params.commentId, req.user.id]))?.value || 0 });
});

// --- detail -----------------------------------------------------------------
router.get('/:id', authRequired, async (req, res) => {
  const userId = req.user.id;
  const row = await getOne('SELECT p.*, u.username FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Post not found' });
  if (row.visibility === 'followers' && row.user_id !== userId) {
    const f = await getOne('SELECT 1 AS x FROM follows WHERE follower_id = ? AND following_id = ?', [userId, row.user_id]);
    if (!f) return res.status(403).json({ error: 'Forbidden' });
  }
  res.json({ post: await shapePost(row, userId), comments: await commentTree(req.params.id, userId) });
});

async function commentTree(postId, userId) {
  const rows = await getAll(
    `SELECT c.*, u.username FROM comments c JOIN users u ON u.id = c.user_id
      WHERE c.post_id = ?`,
    [postId]
  );
  const votes = new Map(
    (await getAll('SELECT comment_id, value FROM comment_votes WHERE user_id = ? AND comment_id IN (SELECT id FROM comments WHERE post_id = ?)', [userId, postId])).
    map((v) => [v.comment_id, v.value])
  );
  const nodes = new Map();
  for (const r of rows) {
    nodes.set(r.id, {
      id: r.id,
      parent_id: r.parent_id,
      user_id: r.user_id,
      username: r.username,
      body: r.body,
      score: r.score,
      created_at: r.created_at,
      viewer_vote: votes.get(r.id) || 0,
      children: []
    });
  }
  const roots = [];
  for (const node of nodes.values()) {
    if (node.parent_id && nodes.has(node.parent_id)) nodes.get(node.parent_id).children.push(node);else
    roots.push(node);
  }
  const sortRec = (list) => {
    list.sort((a, b) => b.score - a.score || (a.created_at < b.created_at ? -1 : 1));
    list.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

// --- vote / save ------------------------------------------------------------
router.post('/:id/vote', authRequired, async (req, res) => {
  const value = req.body?.value === -1 ? -1 : req.body?.value === 1 ? 1 : 0;
  const post = await getOne('SELECT id FROM posts WHERE id = ?', [req.params.id]);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const existing = await getOne('SELECT value FROM post_votes WHERE post_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (value === 0 || existing && existing.value === value) {
    await dbRun('DELETE FROM post_votes WHERE post_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  } else if (existing) {
    await dbRun('UPDATE post_votes SET value = ? WHERE post_id = ? AND user_id = ?', [value, req.params.id, req.user.id]);
  } else {
    await dbRun('INSERT INTO post_votes (post_id, user_id, value) VALUES (?, ?, ?)', [req.params.id, req.user.id, value]);
  }
  const score = await recomputePostScore(req.params.id);
  res.json({ score, viewer_vote: (await getOne('SELECT value FROM post_votes WHERE post_id = ? AND user_id = ?', [req.params.id, req.user.id]))?.value || 0 });
});

router.post('/:id/save', authRequired, async (req, res) => {
  const post = await getOne('SELECT id FROM posts WHERE id = ?', [req.params.id]);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  await dbRun('INSERT INTO saved_posts (post_id, user_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', [req.params.id, req.user.id, nowIso()]);
  res.json({ saved: true });
});

router.delete('/:id/save', authRequired, async (req, res) => {
  await dbRun('DELETE FROM saved_posts WHERE post_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ saved: false });
});

// --- comments ---------------------------------------------------------------
router.post('/:id/comments', authRequired, async (req, res) => {
  const post = await getOne('SELECT id FROM posts WHERE id = ?', [req.params.id]);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const text = safeStr(req.body?.body, 3000);
  if (!text) return res.status(400).json({ error: 'Comment body required' });
  let parentId = safeStr(req.body?.parent_id, 32);
  if (parentId) {
    const parent = await getOne('SELECT id FROM comments WHERE id = ? AND post_id = ?', [parentId, req.params.id]);
    if (!parent) parentId = null;
  }
  const id = nanoid();
  const now = nowIso();
  await dbRun(
    'INSERT INTO comments (id, post_id, parent_id, user_id, body, score, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
    [id, req.params.id, parentId, req.user.id, text, now]
  );
  await dbRun('UPDATE posts SET comment_count = (SELECT COUNT(*) FROM comments WHERE post_id = ?) WHERE id = ?', [req.params.id, req.params.id]);
  res.status(201).json({
    comment: { id, post_id: req.params.id, parent_id: parentId, user_id: req.user.id, username: req.user.username, body: text, score: 0, created_at: now, viewer_vote: 0, children: [] }
  });
});

module.exports = router;
