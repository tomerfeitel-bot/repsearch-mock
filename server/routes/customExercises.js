const express = require('express')
const { runQuery, getAll } = require('../db')
const { authRequired } = require('../auth')
const { nanoid, nowIso, safeStr, safeEnum, safeBool } = require('../util')

const router = express.Router()

const MOVEMENTS = ['Push', 'Pull', 'Squat', 'Hinge', 'Fly', 'Isolation']
const EQUIPMENT = ['Barbell', 'EZ-Bar', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Smith Machine', 'Kettlebell', 'Trap Bar', 'Landmine', 'Plate']
const FORCE = ['horizontal', 'vertical', 'diagonal']

router.get('/', authRequired, (req, res) => {
  const rows = getAll(
    'SELECT * FROM custom_exercises WHERE user_id = ? ORDER BY name ASC',
    [req.user.id],
  )
  res.json({ exercises: rows })
})

router.post('/', authRequired, (req, res) => {
  const body = req.body || {}
  const name = safeStr(body.name, 80)
  const primaryMuscle = safeStr(body.primary_muscle, 40)
  if (!name || !primaryMuscle) return res.status(400).json({ error: 'name and primary_muscle required' })

  const id = `custom_${nanoid()}`
  runQuery(
    `INSERT INTO custom_exercises (id, user_id, name, primary_muscle, secondary_muscle, movement_pattern, equipment_type, force_vector, bilateral, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, req.user.id, name, primaryMuscle,
      safeStr(body.secondary_muscle, 40),
      safeEnum(body.movement_pattern, MOVEMENTS),
      safeEnum(body.equipment_type, EQUIPMENT),
      safeEnum(body.force_vector, FORCE),
      safeBool(body.bilateral) ?? 1,
      nowIso(),
    ],
  )
  res.json({
    exercise: {
      id,
      name,
      primary_muscle: primaryMuscle,
      secondary_muscle: safeStr(body.secondary_muscle, 40),
      movement_pattern: safeEnum(body.movement_pattern, MOVEMENTS),
      equipment_type: safeEnum(body.equipment_type, EQUIPMENT),
      force_vector: safeEnum(body.force_vector, FORCE),
      bilateral: safeBool(body.bilateral) ?? 1,
    },
  })
})

module.exports = router
