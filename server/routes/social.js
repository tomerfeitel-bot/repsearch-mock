const express = require('express');
const { runQuery, getOne, getAll } = require('../db');
const { authRequired } = require('../auth');
const { isBlockedEitherWay } = require('../moderation');

const router = express.Router();

router.post('/follow/:userId', authRequired, async (req, res) => {
  const target = await getOne('SELECT id FROM users WHERE id = ?', [req.params.userId]);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (req.params.userId === req.user.id) return res.status(400).json({ error: "Can't follow yourself" });
  // Blocks sever follows when created; refusing re-follows keeps them severed.
  if (await isBlockedEitherWay(req.user.id, target.id)) {
    return res.status(403).json({ error: "You can't follow this user." });
  }
  const existing = await getOne(
    'SELECT 1 AS x FROM follows WHERE follower_id = ? AND following_id = ?',
    [req.user.id, req.params.userId]
  );
  if (!existing) {
    await runQuery('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [req.user.id, req.params.userId]);
  }
  res.json({ following: true });
});

router.delete('/follow/:userId', authRequired, async (req, res) => {
  await runQuery('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, req.params.userId]);
  res.json({ following: false });
});

router.get('/following', authRequired, async (req, res) => {
  const rows = await getAll(
    `SELECT u.id, u.username, u.bio FROM follows f
       JOIN users u ON u.id = f.following_id
      WHERE f.follower_id = ?
      ORDER BY u.username`,
    [req.user.id]
  );
  res.json({ following: rows });
});

router.get('/followers', authRequired, async (req, res) => {
  const rows = await getAll(
    `SELECT u.id, u.username, u.bio FROM follows f
       JOIN users u ON u.id = f.follower_id
      WHERE f.following_id = ?
      ORDER BY u.username`,
    [req.user.id]
  );
  res.json({ followers: rows });
});

module.exports = router;