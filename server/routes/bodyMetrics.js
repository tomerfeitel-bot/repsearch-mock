const express = require('express');
const { runQuery, getAll } = require('../db');
const { authRequired } = require('../auth');
const { nanoid, nowIso, safeNum, safeStr } = require('../util');

const router = express.Router();

const MEASUREMENTS = {
  bodyweight_kg: { min: 25, max: 350 },
  arm_cm: { min: 15, max: 80 },
  chest_cm: { min: 40, max: 200 },
  waist_cm: { min: 40, max: 200 },
  thigh_cm: { min: 20, max: 120 },
  calf_cm: { min: 15, max: 80 }
};

router.post('/', authRequired, async (req, res) => {
  const body = req.body || {};
  const date = safeStr(body.date, 32) || nowIso().slice(0, 10);
  const now = nowIso();
  const cleaned = {};
  for (const [k, range] of Object.entries(MEASUREMENTS)) {
    if (Object.prototype.hasOwnProperty.call(body, k)) {
      cleaned[k] = safeNum(body[k], range);
    }
  }
  if (!Object.values(cleaned).some((v) => v != null)) {
    return res.status(400).json({ error: 'Add at least one measurement.' });
  }
  const id = nanoid();
  const keys = ['id', 'user_id', 'date', 'created_at', ...Object.keys(cleaned)];
  const vals = [id, req.user.id, date, now, ...Object.values(cleaned)];
  await runQuery(
    `INSERT INTO body_metrics_history (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
    vals
  );

  const snapshotCols = Object.keys(cleaned).map((k) => `${k} = ?`);
  snapshotCols.push('body_metrics_measured_at = ?');
  const snapshotVals = [...Object.values(cleaned), now, req.user.id];
  await runQuery(`UPDATE users SET ${snapshotCols.join(', ')} WHERE id = ?`, snapshotVals);

  res.json({ entry: { id, date, ...cleaned } });
});

router.get('/', authRequired, async (req, res) => {
  const rows = await getAll(
    'SELECT * FROM body_metrics_history WHERE user_id = ? ORDER BY date DESC, created_at DESC',
    [req.user.id]
  );
  res.json({ history: rows });
});

module.exports = router;