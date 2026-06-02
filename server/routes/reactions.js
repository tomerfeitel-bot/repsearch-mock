const express = require('express')
const { runQuery, getAll, getOne } = require('../db')
const { authRequired } = require('../auth')
const { nanoid, nowIso, safeEnum } = require('../util')
const { canViewWorkout } = require('../visibility')

const router = express.Router()

const REACTIONS = ['respect', 'fire', 'strong']

// Toggle a reaction. Body: { workout_id, reaction }
router.post('/', authRequired, (req, res) => {
  const { workout_id } = req.body || {}
  const reaction = safeEnum(req.body?.reaction, REACTIONS)
  if (!workout_id || !reaction) return res.status(400).json({ error: 'workout_id + reaction required' })

  const workout = getOne('SELECT id, visibility, user_id FROM workouts WHERE id = ?', [workout_id])
  if (!workout) return res.status(404).json({ error: 'Workout not found' })
  if (!canViewWorkout(workout, req.user.id)) return res.status(403).json({ error: 'Forbidden' })

  const existing = getOne(
    'SELECT id FROM reactions WHERE workout_id = ? AND user_id = ? AND reaction = ?',
    [workout_id, req.user.id, reaction],
  )
  if (existing) {
    runQuery('DELETE FROM reactions WHERE id = ?', [existing.id])
    return res.json({ toggled: 'off' })
  }
  runQuery(
    'INSERT INTO reactions (id, workout_id, user_id, reaction, created_at) VALUES (?, ?, ?, ?, ?)',
    [nanoid(), workout_id, req.user.id, reaction, nowIso()],
  )
  res.json({ toggled: 'on' })
})

// Reactor list for a workout. Returns { byReaction: { respect: [{id, username}, ...], ... } }
router.get('/workout/:workoutId', authRequired, (req, res) => {
  const workout = getOne('SELECT id, visibility, user_id FROM workouts WHERE id = ?', [req.params.workoutId])
  if (!workout) return res.status(404).json({ error: 'Workout not found' })
  if (!canViewWorkout(workout, req.user.id)) return res.status(403).json({ error: 'Forbidden' })

  const rows = getAll(
    `SELECT r.reaction, u.id, u.username FROM reactions r
       JOIN users u ON u.id = r.user_id
      WHERE r.workout_id = ?
      ORDER BY r.created_at DESC`,
    [req.params.workoutId],
  )
  const byReaction = {}
  for (const r of rows) {
    if (!byReaction[r.reaction]) byReaction[r.reaction] = []
    byReaction[r.reaction].push({ id: r.id, username: r.username })
  }
  res.json({ byReaction })
})

module.exports = router
