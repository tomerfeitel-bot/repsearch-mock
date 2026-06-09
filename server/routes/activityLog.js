const express = require('express');
const { runQuery, getAll } = require('../db');
const { authRequired } = require('../auth');
const { nanoid, nowIso, safeInt, safeStr, safeEnum } = require('../util');

const router = express.Router();

const ACTIVITIES = ['running', 'cycling', 'swimming', 'walking', 'hiking', 'team_sport', 'climbing', 'rowing', 'yoga', 'other'];

router.post('/', authRequired, async (req, res) => {
  const body = req.body || {};
  const id = nanoid();
  const now = nowIso();
  const date = safeStr(body.date, 32) || now.slice(0, 10);
  const type = safeEnum(body.activity_type, ACTIVITIES) ?? 'other';
  const duration = safeInt(body.duration_min, { min: 0, max: 24 * 60 });
  const intensity = safeInt(body.intensity, { min: 1, max: 5 });
  const notes = safeStr(body.notes, 500);
  await runQuery(
    `INSERT INTO activity_log (id, user_id, date, created_at, activity_type, duration_min, intensity, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.user.id, date, now, type, duration, intensity, notes]
  );
  res.json({ activity: { id, date, activity_type: type, duration_min: duration, intensity, notes } });
});

router.get('/', authRequired, async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
  const rows = await getAll(
    'SELECT * FROM activity_log WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT ?',
    [req.user.id, limit]
  );
  res.json({ activities: rows });
});

module.exports = router;