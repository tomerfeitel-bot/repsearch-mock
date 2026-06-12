const express = require('express');
const { runQuery, getOne, getAll } = require('../db');
const { authRequired } = require('../auth');
const { nanoid, nowIso, safeNum, safeInt, safeStr, safeBool, safeDateStr } = require('../util');

const router = express.Router();

const FIELDS = {
  sleep_duration: (v) => safeNum(v, { min: 0, max: 16 }),
  sleep_quality: (v) => safeInt(v, { min: 1, max: 5 }),
  nutrition_quality: (v) => safeInt(v, { min: 1, max: 5 }),
  calories: (v) => safeInt(v, { min: 0, max: 12000 }),
  protein_g_per_kg: (v) => safeNum(v, { min: 0, max: 8 }),
  protein_g: (v) => safeNum(v, { min: 0, max: 800 }),
  hydration: (v) => safeInt(v, { min: 0, max: 20 }),
  bodyweight_kg: (v) => safeNum(v, { min: 25, max: 350 }),
  subjective_energy: (v) => safeInt(v, { min: 1, max: 5 }),
  stress_level: (v) => safeInt(v, { min: 1, max: 5 }),
  illness_flag: (v) => safeBool(v),
  notes: (v) => safeStr(v, 1000)
};

async function syncBodyweight(userId, date, bodyweightKg, now) {
  if (bodyweightKg == null) return;
  const existing = await getOne(
    'SELECT id FROM body_metrics_history WHERE user_id = ? AND date = ? ORDER BY created_at DESC LIMIT 1',
    [userId, date]
  );
  if (existing) {
    await runQuery('UPDATE body_metrics_history SET bodyweight_kg = ?, created_at = ? WHERE id = ?', [bodyweightKg, now, existing.id]);
  } else {
    await runQuery(
      `INSERT INTO body_metrics_history (id, user_id, date, created_at, bodyweight_kg)
       VALUES (?, ?, ?, ?, ?)`,
      [nanoid(), userId, date, now, bodyweightKg]
    );
  }
  await runQuery(
    'UPDATE users SET bodyweight_kg = ?, body_metrics_measured_at = ? WHERE id = ?',
    [bodyweightKg, now, userId]
  );
}

router.post('/', authRequired, async (req, res) => {
  const body = req.body || {};
  const date = safeDateStr(body.date) || nowIso().slice(0, 10);
  const userId = req.user.id;

  const cleaned = {};
  for (const [k, fn] of Object.entries(FIELDS)) {
    if (Object.prototype.hasOwnProperty.call(body, k)) {
      cleaned[k] = fn(body[k]);
    }
  }

  const existing = await getOne('SELECT id FROM daily_log WHERE user_id = ? AND date = ?', [userId, date]);
  const now = nowIso();
  if (existing) {
    const cols = Object.keys(cleaned).map((k) => `${k} = ?`);
    if (cols.length) {
      await runQuery(`UPDATE daily_log SET ${cols.join(', ')} WHERE id = ?`, [...Object.values(cleaned), existing.id]);
    }
    if (Object.prototype.hasOwnProperty.call(cleaned, 'bodyweight_kg')) {
      await syncBodyweight(userId, date, cleaned.bodyweight_kg, now);
    }
    res.json({ log: await getOne('SELECT * FROM daily_log WHERE id = ?', [existing.id]) });
  } else {
    const id = nanoid();
    const keys = ['id', 'user_id', 'date', 'created_at', ...Object.keys(cleaned)];
    const vals = [id, userId, date, now, ...Object.values(cleaned)];
    await runQuery(
      `INSERT INTO daily_log (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
      vals
    );
    if (Object.prototype.hasOwnProperty.call(cleaned, 'bodyweight_kg')) {
      await syncBodyweight(userId, date, cleaned.bodyweight_kg, now);
    }
    res.json({ log: await getOne('SELECT * FROM daily_log WHERE id = ?', [id]) });
  }
});

router.get('/:date', authRequired, async (req, res) => {
  const row = await getOne(
    'SELECT * FROM daily_log WHERE user_id = ? AND date = ?',
    [req.user.id, req.params.date]
  );
  res.json({ log: row || null });
});

router.get('/', authRequired, async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 200);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const rows = await getAll(
    'SELECT * FROM daily_log WHERE user_id = ? ORDER BY date DESC LIMIT ? OFFSET ?',
    [req.user.id, limit, offset]
  );
  res.json({ logs: rows, limit, offset });
});

module.exports = router;
