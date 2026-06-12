const express = require('express');
const { getOne, getAll, runQuery } = require('../db');
const { authRequired, adminRequired } = require('../auth');
const { nanoid, nowIso, safeStr, safeEnum } = require('../util');
const { removePost, removeComment } = require('../moderation');

const router = express.Router();

const REPORT_TARGETS = ['post', 'comment', 'user'];
const REPORT_REASONS = ['spam', 'harassment', 'inappropriate', 'misinformation', 'other'];
const REPORT_STATUSES = ['open', 'resolved', 'dismissed'];

// users.id is uuid — a malformed value would throw a cast error inside Postgres
// before any WHERE could reject it, so validate the shape up front.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function safeUuid(value) {
  const s = safeStr(value, 40);
  return s && UUID_RE.test(s) ? s : null;
}

// --- reports ------------------------------------------------------------------
router.post('/reports', authRequired, async (req, res) => {
  const targetType = safeEnum(req.body?.target_type, REPORT_TARGETS);
  const targetId = safeStr(req.body?.target_id, 64);
  const reason = safeEnum(req.body?.reason, REPORT_REASONS);
  const details = safeStr(req.body?.details, 1000) ?? '';
  if (!targetType || !targetId || !reason) {
    return res.status(400).json({ error: 'target_type, target_id and reason are required' });
  }

  let targetUserId;
  let excerpt;
  if (targetType === 'post') {
    const post = await getOne('SELECT id, user_id, title, body FROM posts WHERE id = ?', [targetId]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    targetUserId = post.user_id;
    excerpt = (post.title || post.body || '').slice(0, 200);
  } else if (targetType === 'comment') {
    const comment = await getOne('SELECT id, user_id, body FROM comments WHERE id = ? AND deleted = 0', [targetId]);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    targetUserId = comment.user_id;
    excerpt = (comment.body || '').slice(0, 200);
  } else {
    const id = safeUuid(targetId);
    const target = id ? await getOne('SELECT id, username FROM users WHERE id = ?', [id]) : null;
    if (!target) return res.status(404).json({ error: 'User not found' });
    targetUserId = target.id;
    excerpt = `@${target.username}`;
  }
  if (targetUserId === req.user.id) {
    return res.status(400).json({ error: "You can't report your own content." });
  }

  // Re-reporting the same target is a silent success — the report exists.
  await runQuery(
    `INSERT INTO reports (id, reporter_id, target_type, target_id, target_user_id, reason, details, excerpt, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
     ON CONFLICT (reporter_id, target_type, target_id) DO NOTHING`,
    [nanoid(), req.user.id, targetType, targetId, targetUserId, reason, details, excerpt, nowIso()]
  );
  res.status(201).json({ ok: true });
});

// --- blocks ---------------------------------------------------------------------
router.get('/blocks', authRequired, async (req, res) => {
  const rows = await getAll(
    `SELECT u.id, u.username, b.created_at FROM user_blocks b
       JOIN users u ON u.id = b.blocked_id
      WHERE b.blocker_id = ?
      ORDER BY b.created_at DESC`,
    [req.user.id]
  );
  res.json({ blocked: rows });
});

router.post('/blocks/:userId', authRequired, async (req, res) => {
  const targetId = safeUuid(req.params.userId);
  if (!targetId) return res.status(400).json({ error: 'Invalid user id' });
  if (targetId === req.user.id) return res.status(400).json({ error: "You can't block yourself" });
  const target = await getOne('SELECT id FROM users WHERE id = ?', [targetId]);
  if (!target) return res.status(404).json({ error: 'User not found' });
  await runQuery(
    'INSERT INTO user_blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
    [req.user.id, targetId, nowIso()]
  );
  // Sever the relationship both ways so neither feed carries the other.
  await runQuery(
    'DELETE FROM follows WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)',
    [req.user.id, targetId, targetId, req.user.id]
  );
  res.json({ blocked: true });
});

router.delete('/blocks/:userId', authRequired, async (req, res) => {
  const targetId = safeUuid(req.params.userId);
  if (!targetId) return res.status(400).json({ error: 'Invalid user id' });
  await runQuery('DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?', [req.user.id, targetId]);
  res.json({ blocked: false });
});

// --- admin review ---------------------------------------------------------------
router.get('/admin/reports', adminRequired, async (req, res) => {
  const status = safeEnum(req.query.status, [...REPORT_STATUSES, 'all']) ?? 'open';
  const rows = await getAll(
    `SELECT r.*, ru.username AS reporter_username, tu.username AS target_username, tu.banned AS target_banned
       FROM reports r
       LEFT JOIN users ru ON ru.id = r.reporter_id
       LEFT JOIN users tu ON tu.id = r.target_user_id
      ${status === 'all' ? '' : 'WHERE r.status = ?'}
      ORDER BY r.created_at DESC LIMIT 200`,
    status === 'all' ? [] : [status]
  );
  // Current content state per report, so review shows live text or "removed".
  const reports = [];
  for (const r of rows) {
    let content = null;
    if (r.target_type === 'post') {
      const p = await getOne('SELECT id, title, body FROM posts WHERE id = ?', [r.target_id]);
      content = p ? { exists: true, title: p.title, body: p.body } : { exists: false };
    } else if (r.target_type === 'comment') {
      const c = await getOne('SELECT id, body, deleted, post_id FROM comments WHERE id = ?', [r.target_id]);
      content = c && !c.deleted ? { exists: true, body: c.body, post_id: c.post_id } : { exists: false };
    }
    reports.push({ ...r, content });
  }
  res.json({ reports, status });
});

router.post('/admin/reports/:id/resolve', adminRequired, async (req, res) => {
  const report = await getOne('SELECT * FROM reports WHERE id = ?', [req.params.id]);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  const status = safeEnum(req.body?.status, ['resolved', 'dismissed']);
  if (!status) return res.status(400).json({ error: 'status must be resolved or dismissed' });
  const note = safeStr(req.body?.note, 1000) ?? '';

  const actions = [];
  if (req.body?.remove_content) {
    if (report.target_type === 'post') {
      const post = await getOne('SELECT id FROM posts WHERE id = ?', [report.target_id]);
      if (post) {
        await removePost(post.id);
        actions.push('removed_post');
      }
    } else if (report.target_type === 'comment') {
      const comment = await getOne('SELECT id, post_id FROM comments WHERE id = ?', [report.target_id]);
      if (comment) {
        await removeComment(comment);
        actions.push('removed_comment');
      }
    } else {
      return res.status(400).json({ error: 'User reports have no content to remove' });
    }
  }
  if (req.body?.ban_user) {
    if (!report.target_user_id) return res.status(400).json({ error: 'No target user on this report' });
    await runQuery('UPDATE users SET banned = 1 WHERE id = ?', [report.target_user_id]);
    actions.push('banned_user');
  }

  await runQuery(
    'UPDATE reports SET status = ?, reviewed_at = ?, resolution_note = ? WHERE id = ?',
    [status, nowIso(), note, req.params.id]
  );
  res.json({ ok: true, status, actions });
});

router.post('/admin/users/:userId/unban', adminRequired, async (req, res) => {
  const targetId = safeUuid(req.params.userId);
  if (!targetId) return res.status(400).json({ error: 'Invalid user id' });
  await runQuery('UPDATE users SET banned = 0 WHERE id = ?', [targetId]);
  res.json({ ok: true });
});

module.exports = router;
