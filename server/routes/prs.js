const express = require('express');
const { getAll } = require('../db');
const { authRequired } = require('../auth');

const router = express.Router();

router.get('/', authRequired, async (req, res) => {
  const rows = await getAll(
    `SELECT p.*, e.name AS exercise_name, e.primary_muscle, e.equipment_type
       FROM prs p
       LEFT JOIN exercises e ON e.id = p.exercise_id
      WHERE p.user_id = ?
      ORDER BY p.date DESC, p.weight_kg DESC`,
    [req.user.id]
  );
  res.json({ prs: rows });
});

module.exports = router;