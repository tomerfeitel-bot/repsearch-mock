const express = require('express');
const { getAll, getOne, runQuery } = require('../db');
const { authRequired } = require('../auth');
const { nanoid, nowIso, safeEnum, safeStr } = require('../util');

const router = express.Router();

const SCOPES = ['following', 'global'];
const TYPES = ['all', 'workouts', 'prs', 'progression', 'plans'];
const POST_TYPES = ['workout', 'pr', 'progression'];
const POST_VISIBILITY = ['public', 'followers'];

async function followingIds(userId) {
  const rows = await getAll('SELECT following_id FROM follows WHERE follower_id = ?', [userId]);
  return rows.map((r) => r.following_id);
}

async function progressRowsForUser(userId, limit = 20) {
  const rows = await getAll(
    `SELECT a.id, a.user_id, a.exercise_id, a.week, a.estimated_1rm AS curr_1rm, a.updated_at,
            e.name AS exercise_name,
            (SELECT b.estimated_1rm FROM user_exercise_profile b
              WHERE b.user_id = a.user_id AND b.exercise_id = a.exercise_id AND b.week < a.week
              ORDER BY b.week DESC LIMIT 1) AS prev_1rm
       FROM user_exercise_profile a
       LEFT JOIN exercises e ON e.id = a.exercise_id
      WHERE a.user_id = ? AND a.estimated_1rm IS NOT NULL
      ORDER BY a.updated_at DESC LIMIT ?`,
    [userId, limit]
  );
  return rows.
  filter((r) => r.prev_1rm && r.curr_1rm && r.curr_1rm > r.prev_1rm * 1.10).
  map((r) => ({
    ...r,
    gain_pct: Math.round((r.curr_1rm / r.prev_1rm - 1) * 1000) / 10
  }));
}

router.get('/post-options', authRequired, async (req, res) => {
  const userId = req.user.id;
  const workouts = await getAll(
    `SELECT w.*,
            (SELECT COUNT(*) FROM sets s WHERE s.workout_id = w.id) AS set_count,
            (SELECT COUNT(DISTINCT s.exercise_id) FROM sets s WHERE s.workout_id = w.id) AS exercise_count,
            fp.caption AS posted_caption,
            fp.created_at AS posted_at
       FROM workouts w
       LEFT JOIN feed_posts fp
         ON fp.source_type = 'workout' AND fp.source_id = w.id AND fp.user_id = w.user_id
      WHERE w.user_id = ?
      ORDER BY w.date DESC, w.created_at DESC LIMIT 20`,
    [userId]
  );
  const prs = await getAll(
    `SELECT p.*, e.name AS exercise_name, e.primary_muscle, e.equipment_type,
            fp.caption AS posted_caption,
            fp.created_at AS posted_at
       FROM prs p
       LEFT JOIN exercises e ON e.id = p.exercise_id
       LEFT JOIN feed_posts fp
         ON fp.source_type = 'pr' AND fp.source_id = p.id AND fp.user_id = p.user_id
      WHERE p.user_id = ?
      ORDER BY p.date DESC, p.weight_kg DESC LIMIT 20`,
    [userId]
  );
  const progressRows = await progressRowsForUser(userId, 20);
  const progress = await Promise.all(progressRows.map(async (p) => {
    const fp = await getOne(
      `SELECT caption, created_at FROM feed_posts
        WHERE source_type = 'progression' AND source_id = ? AND user_id = ?`,
      [p.id, userId]
    );
    return { ...p, posted_caption: fp?.caption || '', posted_at: fp?.created_at || null };
  }));
  res.json({ workouts, prs, progress });
});

router.post('/posts', authRequired, async (req, res) => {
  const userId = req.user.id;
  const sourceType = safeEnum(req.body?.source_type, POST_TYPES);
  const sourceId = safeStr(req.body?.source_id, 64);
  const caption = safeStr(req.body?.caption, 280) ?? '';
  const visibility = safeEnum(req.body?.visibility, POST_VISIBILITY) ?? 'public';
  if (!sourceType || !sourceId) return res.status(400).json({ error: 'Choose something from your training to share.' });

  if (sourceType === 'workout') {
    const workout = await getOne('SELECT id, user_id FROM workouts WHERE id = ?', [sourceId]);
    if (!workout) return res.status(404).json({ error: 'Workout not found' });
    if (workout.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });
    await runQuery('UPDATE workouts SET visibility = ? WHERE id = ?', [visibility, sourceId]);
  } else if (sourceType === 'pr') {
    const pr = await getOne('SELECT id, user_id FROM prs WHERE id = ?', [sourceId]);
    if (!pr) return res.status(404).json({ error: 'PR not found' });
    if (pr.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });
  } else if (sourceType === 'progression') {
    const progress = (await progressRowsForUser(userId, 100)).find((p) => p.id === sourceId);
    if (!progress) return res.status(404).json({ error: 'Progress moment not found' });
  }

  const existing = await getOne(
    'SELECT id FROM feed_posts WHERE user_id = ? AND source_type = ? AND source_id = ?',
    [userId, sourceType, sourceId]
  );
  const now = nowIso();
  if (existing) {
    await runQuery(
      'UPDATE feed_posts SET caption = ?, visibility = ?, created_at = ? WHERE id = ?',
      [caption, visibility, now, existing.id]
    );
    return res.json({ post: { id: existing.id, source_type: sourceType, source_id: sourceId, caption, visibility, created_at: now } });
  }
  const id = nanoid();
  await runQuery(
    `INSERT INTO feed_posts (id, user_id, source_type, source_id, caption, visibility, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, sourceType, sourceId, caption, visibility, now]
  );
  res.json({ post: { id, source_type: sourceType, source_id: sourceId, caption, visibility, created_at: now } });
});

router.get('/', authRequired, async (req, res) => {
  const scope = safeEnum(req.query.scope, SCOPES) ?? 'following';
  const type = safeEnum(req.query.type, TYPES) ?? 'all';
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 50);
  // offset feeds straight into each sub-query's LIMIT (limit + offset rows are
  // fetched then merge-sorted in memory) — an unbounded value is a DoS lever.
  const offset = Math.min(Math.max(parseInt(req.query.offset) || 0, 0), 500);
  const userId = req.user.id;

  const followIds = await followingIds(userId);
  let scopeIds = [];
  if (scope === 'following') {
    scopeIds = followIds.length ? followIds : [];
  }
  // Global = everyone

  const items = [];

  if (type === 'all' || type === 'workouts') {
    let wRows;
    if (scope === 'following') {
      if (scopeIds.length) {
        const placeholders = scopeIds.map(() => '?').join(',');
        wRows = await getAll(
          `SELECT w.*,
                  (SELECT COUNT(*) FROM sets s WHERE s.workout_id = w.id) AS set_count,
                  (SELECT COUNT(DISTINCT s.exercise_id) FROM sets s WHERE s.workout_id = w.id) AS exercise_count,
                  u.username, fp.caption AS feed_caption, fp.created_at AS posted_at
             FROM workouts w
             JOIN users u ON u.id = w.user_id
             LEFT JOIN feed_posts fp ON fp.source_type = 'workout' AND fp.source_id = w.id AND fp.user_id = w.user_id
            WHERE w.user_id IN (${placeholders}) AND w.visibility IN ('public', 'followers')
            ORDER BY COALESCE(fp.created_at, w.created_at) DESC LIMIT ?`,
          [...scopeIds, limit + offset]
        );
      } else {
        wRows = [];
      }
    } else {
      wRows = await getAll(
        `SELECT w.*,
                (SELECT COUNT(*) FROM sets s WHERE s.workout_id = w.id) AS set_count,
                (SELECT COUNT(DISTINCT s.exercise_id) FROM sets s WHERE s.workout_id = w.id) AS exercise_count,
                u.username, fp.caption AS feed_caption, fp.created_at AS posted_at
           FROM workouts w
           JOIN users u ON u.id = w.user_id
           LEFT JOIN feed_posts fp ON fp.source_type = 'workout' AND fp.source_id = w.id AND fp.user_id = w.user_id
          WHERE w.visibility = 'public' AND w.user_id != ? AND u.is_private = 0
          ORDER BY COALESCE(fp.created_at, w.created_at) DESC LIMIT ?`,
        [userId, limit + offset]
      );
    }
    for (const w of wRows) {
      items.push({ type: 'workout', id: w.id, ts: w.posted_at || w.created_at, user_id: w.user_id, username: w.username, payload: w });
    }
  }

  if (type === 'all' || type === 'prs') {
    // PRs surface only when the owner deliberately shared them (feed_posts row),
    // at the visibility they chose — never straight from the prs table.
    let pRows;
    if (scope === 'following') {
      if (scopeIds.length) {
        const placeholders = scopeIds.map(() => '?').join(',');
        pRows = await getAll(
          `SELECT p.*, u.username, e.name AS exercise_name,
                  fp.caption AS feed_caption, fp.created_at AS posted_at
             FROM prs p
             JOIN users u ON u.id = p.user_id
             JOIN feed_posts fp ON fp.source_type = 'pr' AND fp.source_id = p.id AND fp.user_id = p.user_id
                  AND fp.visibility IN ('public', 'followers')
             LEFT JOIN exercises e ON e.id = p.exercise_id
            WHERE p.user_id IN (${placeholders})
            ORDER BY fp.created_at DESC LIMIT ?`,
          [...scopeIds, limit + offset]
        );
      } else {
        pRows = [];
      }
    } else {
      pRows = await getAll(
        `SELECT p.*, u.username, e.name AS exercise_name,
                fp.caption AS feed_caption, fp.created_at AS posted_at
           FROM prs p
           JOIN users u ON u.id = p.user_id AND u.is_private = 0
           JOIN feed_posts fp ON fp.source_type = 'pr' AND fp.source_id = p.id AND fp.user_id = p.user_id
                AND fp.visibility = 'public'
           LEFT JOIN exercises e ON e.id = p.exercise_id
          WHERE p.user_id != ?
          ORDER BY fp.created_at DESC LIMIT ?`,
        [userId, limit + offset]
      );
    }
    for (const p of pRows) {
      items.push({ type: 'pr', id: p.id, ts: p.posted_at || p.date + 'T00:00:00Z', user_id: p.user_id, username: p.username, payload: p });
    }
  }

  if (type === 'all' || type === 'progression') {
    // Progression: synthesize from user_exercise_profile rows where the estimated_1rm
    // jumps >10% week-over-week, or phase advances. Compare against previous week per user/exercise.
    let scopeFilter;
    const params = [];
    if (scope === 'following' && scopeIds.length) {
      scopeFilter = `AND a.user_id IN (${scopeIds.map(() => '?').join(',')})`;
      params.push(...scopeIds);
    } else if (scope === 'following' && !scopeIds.length) {

      // No follows -> no progression items
    } else {scopeFilter = `AND a.user_id != ? AND u.is_private = 0`;
      params.push(userId);
    }
    if (scope !== 'following' || scopeIds.length) {
      // Progression moments are derived from private workout data; like PRs they
      // only appear once deliberately shared, at the chosen visibility.
      const fpVisibility = scope === 'following' ? `fp.visibility IN ('public', 'followers')` : `fp.visibility = 'public'`;
      const progressionLimit = limit + offset;
      const progRows = await getAll(
        `SELECT a.id, a.user_id, a.exercise_id, a.week, a.estimated_1rm AS curr_1rm, a.updated_at,
                e.name AS exercise_name, u.username,
                fp.caption AS feed_caption, fp.created_at AS posted_at,
                (SELECT b.estimated_1rm FROM user_exercise_profile b
                  WHERE b.user_id = a.user_id AND b.exercise_id = a.exercise_id AND b.week < a.week
                  ORDER BY b.week DESC LIMIT 1) AS prev_1rm
           FROM user_exercise_profile a
           JOIN users u ON u.id = a.user_id
           LEFT JOIN exercises e ON e.id = a.exercise_id
           JOIN feed_posts fp ON fp.source_type = 'progression' AND fp.source_id = a.id AND fp.user_id = a.user_id
                AND ${fpVisibility}
          WHERE a.estimated_1rm IS NOT NULL ${scopeFilter}
          ORDER BY fp.created_at DESC LIMIT ?`,
        [...params, progressionLimit]
      );
      for (const r of progRows) {
        if (r.prev_1rm && r.curr_1rm && r.curr_1rm > r.prev_1rm * 1.10) {
          items.push({
            type: 'progression',
            id: r.id,
            ts: r.posted_at || r.updated_at,
            user_id: r.user_id, username: r.username,
            payload: { exercise_id: r.exercise_id, exercise_name: r.exercise_name,
              prev_1rm: r.prev_1rm, curr_1rm: r.curr_1rm,
              gain_pct: Math.round((r.curr_1rm / r.prev_1rm - 1) * 1000) / 10,
              feed_caption: r.feed_caption, posted_at: r.posted_at }
          });
        }
      }
    }
  }

  if (type === 'all' || type === 'plans') {
    let scopeFilter;
    const params = [];
    if (scope === 'following' && scopeIds.length) {
      scopeFilter = `AND p.user_id IN (${scopeIds.map(() => '?').join(',')})`;
      params.push(...scopeIds);
    } else if (scope === 'following' && !scopeIds.length) {
      scopeFilter = 'AND 1 = 0';
    } else {
      scopeFilter = 'AND p.user_id != ?';
      params.push(userId);
    }

    const published = await getAll(
      `SELECT p.*, u.username,
              (SELECT COUNT(*) FROM program_enrollments WHERE program_id = p.id) AS enrollment_count
         FROM programs p
         JOIN users u ON u.id = p.user_id
        WHERE p.visibility = 'public' AND COALESCE(p.status, 'final') = 'final' ${scopeFilter}
          ${scope === 'global' ? 'AND u.is_private = 0' : ''}
        ORDER BY p.created_at DESC LIMIT ?`,
      [...params, limit + offset]
    );
    for (const p of published) {
      items.push({
        type: 'program_published',
        id: `program_${p.id}`,
        ts: p.created_at,
        user_id: p.user_id,
        username: p.username,
        payload: p
      });
    }

    const starts = await getAll(
      `SELECT pe.*, p.name, p.weeks, p.strictness, p.visibility, u.username
         FROM program_enrollments pe
         JOIN programs p ON p.id = pe.program_id
         JOIN users u ON u.id = pe.user_id
        WHERE p.visibility = 'public' AND COALESCE(p.status, 'final') = 'final'
          ${scope === 'following' && scopeIds.length ? `AND pe.user_id IN (${scopeIds.map(() => '?').join(',')})` : scope === 'following' ? 'AND 1 = 0' : 'AND pe.user_id != ?'}
          ${scope === 'global' ? 'AND u.is_private = 0' : ''}
        ORDER BY pe.started_at DESC LIMIT ?`,
      [...params, limit + offset]
    );
    for (const s of starts) {
      items.push({
        type: 'program_started',
        id: `program_start_${s.id}`,
        ts: s.started_at,
        user_id: s.user_id,
        username: s.username,
        payload: s
      });
    }
  }

  items.sort((a, b) => a.ts < b.ts ? 1 : -1);
  const paged = items.slice(offset, offset + limit);
  res.json({ items: paged, scope, type, limit, offset, has_more: items.length > offset + limit });
});

module.exports = router;
