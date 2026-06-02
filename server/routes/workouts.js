const express = require('express')
const { db, runQuery, getOne, getAll } = require('../db')
const { authRequired } = require('../auth')
const { nanoid, nowIso, safeNum, safeInt, safeStr, safeEnum, safeBool } = require('../util')
const { canViewWorkout } = require('../visibility')

const router = express.Router()

const VISIBILITY = ['private', 'followers', 'public']
const SET_TYPES = ['warmup', 'working', 'backoff', 'drop', 'amrap', 'rest_pause', 'cluster']
const ROM_CATEGORIES = ['full', 'partial', 'lengthened', 'shortened']
const TEMPO_TAGS = ['controlled', 'explosive', '3010', '2020', 'paused']
const EQUIPMENT_TYPES = ['Barbell', 'EZ-Bar', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Smith Machine', 'Kettlebell', 'Trap Bar', 'Landmine', 'Plate']
const RUN_CLASSIFICATIONS = ['exact', 'adapted', 'derived']
const TIMING_PRESETS = ['next_day', 'after_1_rest_day', 'after_2_rest_days', 'two_to_three_days', 'any_time_this_week', 'optional_bonus', 'advanced']
const TIMING_DEFAULTS = {
  next_day: { min: 18, ideal: 24, max: 36 },
  after_1_rest_day: { min: 36, ideal: 48, max: 72 },
  after_2_rest_days: { min: 60, ideal: 72, max: 96 },
  two_to_three_days: { min: 48, ideal: 72, max: 96 },
  any_time_this_week: { min: 0, ideal: 72, max: 168 },
  optional_bonus: { min: 0, ideal: 0, max: 168 },
  advanced: { min: 36, ideal: 48, max: 72 },
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== ''
}

function timingWindow(session = {}) {
  const preset = TIMING_PRESETS.includes(session.timing_preset) ? session.timing_preset : 'after_1_rest_day'
  const fallback = TIMING_DEFAULTS[preset] || TIMING_DEFAULTS.after_1_rest_day
  return {
    preset,
    min: Number.isFinite(Number(session.timing_min_hours)) ? Number(session.timing_min_hours) : fallback.min,
    ideal: Number.isFinite(Number(session.timing_ideal_hours)) ? Number(session.timing_ideal_hours) : fallback.ideal,
    max: Number.isFinite(Number(session.timing_max_hours)) ? Number(session.timing_max_hours) : fallback.max,
  }
}

function addHours(iso, hours) {
  return new Date(new Date(iso).getTime() + (Number(hours) || 0) * 60 * 60 * 1000).toISOString()
}

function orderedProgramSessions(programId) {
  return getAll(
    `SELECT pw.*, pb.sort_order AS block_sort_order
       FROM program_workouts pw
       LEFT JOIN program_blocks pb ON pb.id = pw.block_id
      WHERE pw.program_id = ?
      ORDER BY COALESCE(pb.sort_order, 0), pw.sort_order`,
    [programId],
  )
}

function advanceProgramPhase(userId, programId, sessionId, runClassification, completedAt) {
  if (!programId) return null
  const enrollment = getOne(
    `SELECT pe.*, p.is_open_ended
       FROM program_enrollments pe
       JOIN programs p ON p.id = pe.program_id
      WHERE pe.user_id = ? AND pe.program_id = ? AND pe.status = 'active'`,
    [userId, programId],
  )
  if (!enrollment) return null
  const sessions = orderedProgramSessions(programId)
  if (!sessions.length) return null
  const phase = getOne(
    'SELECT * FROM user_program_phase WHERE user_id = ? AND program_id = ?',
    [userId, programId],
  )
  const currentSessionId = sessionId || phase?.next_session_id || sessions[0].id
  const currentIndex = Math.max(0, sessions.findIndex(s => s.id === currentSessionId))
  let nextIndex = currentIndex + 1
  let nextSession = sessions[nextIndex]
  const now = nowIso()

  if (!nextSession && enrollment.is_open_ended) {
    nextIndex = 0
    nextSession = sessions[0]
  }
  if (!nextSession) {
    runQuery(
      `UPDATE program_enrollments
          SET status = 'completed', completed_at = ?
        WHERE id = ?`,
      [completedAt, enrollment.id],
    )
    if (phase) {
      runQuery(
        `UPDATE user_program_phase
            SET sequence_position = ?, next_session_id = NULL, next_suggested_at = NULL,
                timing_status = 'completed', adaptation_decision = ?, updated_at = ?
          WHERE id = ?`,
        [currentIndex + 1, runClassification, now, phase.id],
      )
      return getOne('SELECT * FROM user_program_phase WHERE id = ?', [phase.id])
    }
    return null
  }

  const window = timingWindow(nextSession)
  const nextSuggestedAt = addHours(completedAt, window.ideal)
  const nextWeek = Math.max(1, Number(nextSession.week_number) || 1)
  if (phase) {
    runQuery(
      `UPDATE user_program_phase
          SET week_number = ?, block_id = ?, sequence_position = ?, next_session_id = ?,
              next_suggested_at = ?, timing_status = 'on_track', adaptation_decision = ?, updated_at = ?
        WHERE id = ?`,
      [nextWeek, nextSession.block_id, nextIndex, nextSession.id, nextSuggestedAt, runClassification, now, phase.id],
    )
    return getOne('SELECT * FROM user_program_phase WHERE id = ?', [phase.id])
  }

  const phaseId = nanoid()
  runQuery(
    `INSERT INTO user_program_phase (
       id, user_id, program_id, week_number, block_id, sequence_position,
       next_session_id, next_suggested_at, timing_status, adaptation_decision, started_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'on_track', ?, ?, ?)`,
    [phaseId, userId, programId, nextWeek, nextSession.block_id, nextIndex, nextSession.id, nextSuggestedAt, runClassification, completedAt, now],
  )
  return getOne('SELECT * FROM user_program_phase WHERE id = ?', [phaseId])
}

function cleanRir(value) {
  if (value === '5+') return '5+'
  return safeInt(value, { min: 0, max: 4 })
}

function cleanSet(rawSet) {
  return {
    exercise_id: safeStr(rawSet.exercise_id, 64),
    set_number: safeInt(rawSet.set_number, { min: 1, max: 100 }) ?? 1,
    weight_kg: safeNum(rawSet.weight_kg, { min: 0, max: 1500 }),
    reps: safeInt(rawSet.reps, { min: 0, max: 500 }),
    rir: cleanRir(rawSet.rir),
    failure: safeBool(rawSet.failure) ?? 0,
    rom_category: safeEnum(rawSet.rom_category, ROM_CATEGORIES),
    tempo_tag: safeEnum(rawSet.tempo_tag, TEMPO_TAGS),
    equipment_type: safeEnum(rawSet.equipment_type, EQUIPMENT_TYPES),
    set_type: safeEnum(rawSet.set_type, SET_TYPES) ?? 'working',
    session_set_order: safeInt(rawSet.session_set_order, { min: 1, max: 1000 }),
    rest_seconds: safeInt(rawSet.rest_seconds, { min: 0, max: 600 }),
    pain_flag: safeBool(rawSet.pain_flag) ?? 0,
    set_notes: safeStr(rawSet.set_notes, 500),
    planned_exercise_id: safeStr(rawSet.planned_exercise_id, 64),
    template_set_id: safeStr(rawSet.template_set_id, 64),
    substitution_for: safeStr(rawSet.substitution_for, 64),
    _client_ts: Number(rawSet.client_ts) || 0,
  }
}

function detectPRs(userId, workoutSets, workoutDate) {
  const hits = []
  const bestByRepTarget = new Map()
  for (const set of workoutSets) {
    if (!set.exercise_id || !set.weight_kg || !set.reps) continue
    if (set.set_type === 'warmup') continue
    const key = `${set.exercise_id}|${set.reps}`
    const current = bestByRepTarget.get(key)
    if (!current || set.weight_kg > current.weight_kg) bestByRepTarget.set(key, set)
  }

  for (const set of bestByRepTarget.values()) {
    const existing = getOne(
      'SELECT MAX(weight_kg) AS best FROM prs WHERE user_id = ? AND exercise_id = ? AND reps = ?',
      [userId, set.exercise_id, set.reps],
    )
    const prevBest = existing?.best || 0
    if (set.weight_kg > prevBest) {
      const prId = nanoid()
      runQuery(
        `INSERT INTO prs (id, user_id, exercise_id, weight_kg, reps, date, set_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [prId, userId, set.exercise_id, set.weight_kg, set.reps, workoutDate, set._setId],
      )
      hits.push({
        exercise_id: set.exercise_id,
        weight_kg: set.weight_kg,
        reps: set.reps,
        previous_kg: prevBest,
      })
    }
  }
  return hits
}

function loadWorkoutWithSets(workoutId, userId) {
  const workout = getOne('SELECT * FROM workouts WHERE id = ?', [workoutId])
  if (!workout) return null
  if (!canViewWorkout(workout, userId)) return null
  const sets = getAll(
    `SELECT s.*,
            COALESCE(ex.name, cx.name) AS exercise_name,
            COALESCE(ex.primary_muscle, cx.primary_muscle) AS primary_muscle,
            COALESCE(s.equipment_type, ex.equipment_type, cx.equipment_type) AS equipment_type
       FROM sets s
       LEFT JOIN exercises ex ON ex.id = s.exercise_id
       LEFT JOIN custom_exercises cx ON cx.id = s.exercise_id AND cx.user_id = ?
      WHERE s.workout_id = ?
      ORDER BY s.session_position ASC, s.set_number ASC`,
    [userId || '', workoutId],
  )
  return { ...workout, sets }
}

router.post('/', authRequired, (req, res) => {
  const body = req.body || {}
  const userId = req.user.id
  const id = nanoid()
  const now = nowIso()
  const date = safeStr(body.date, 32) || now.slice(0, 10)

  const duration = safeInt(body.duration_min, { min: 0, max: 24 * 60 })
  const visibility = safeEnum(body.visibility, VISIBILITY) ?? 'private'
  const notes = safeStr(body.notes, 2000) ?? ''
  const programId = safeStr(body.program_id, 32)
  const programSessionId = safeStr(body.program_session_id, 32)
  const templateId = safeStr(body.template_id, 32)
  const splitType = safeStr(body.workout_split_type, 40)
  const day = safeStr(body.workout_day, 40)
  const sessionEffort = safeEnum(body.session_effort, ['easy', 'moderate', 'hard', 'all_out'])
  const feelRating = safeInt(body.feel_rating, { min: 1, max: 10 })
  const adherence = safeStr(body.adherence, 40)
  const subsNote = safeStr(body.substitutions_note, 500)
  const soreness = safeStr(body.soreness_note, 500)
  const startTime = safeStr(body.start_time, 32)
  const runClassification = safeEnum(body.run_classification, RUN_CLASSIFICATIONS) ?? 'exact'

  const rawSets = Array.isArray(body.sets) ? body.sets : []
  const cleaned = rawSets.map(cleanSet).filter(s => s.exercise_id)
  const invalidSet = cleaned.find(s => hasValue(s.weight_kg) !== hasValue(s.reps))
  if (invalidSet) {
    return res.status(400).json({ error: 'Every saved set needs both weight and reps.' })
  }
  const saveableSets = cleaned.filter(s => hasValue(s.weight_kg) && hasValue(s.reps))
  if (saveableSets.length === 0) {
    return res.status(400).json({ error: 'Add at least one set with weight and reps before saving.' })
  }

  const firstTsByExercise = new Map()
  for (const s of saveableSets) {
    const cur = firstTsByExercise.get(s.exercise_id)
    if (cur === undefined || s._client_ts < cur) firstTsByExercise.set(s.exercise_id, s._client_ts)
  }
  const exerciseOrder = [...firstTsByExercise.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([eid]) => eid)
  const positionByExercise = new Map(exerciseOrder.map((eid, i) => [eid, i + 1]))

  db.exec('BEGIN')
  try {
    runQuery(
      `INSERT INTO workouts (
         id, user_id, created_at, date, duration_min, start_time, notes, visibility,
         program_id, template_id, workout_split_type, workout_day,
         session_effort, feel_rating, adherence, substitutions_note, soreness_note, run_classification
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, now, date, duration, startTime, notes, visibility,
       programId, templateId, splitType, day,
       sessionEffort, feelRating, adherence, subsNote, soreness, runClassification],
    )

    for (const s of saveableSets) {
      const setId = nanoid()
      s._setId = setId
      const pos = positionByExercise.get(s.exercise_id)
      runQuery(
        `INSERT INTO sets (
           id, workout_id, user_id, exercise_id, set_number,
           weight_kg, reps, rir, failure, rom_category, tempo_tag,
           equipment_type, set_type, session_position,
           session_set_order, rest_seconds, pain_flag, set_notes, planned_exercise_id, template_set_id, substitution_for
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [setId, id, userId, s.exercise_id, s.set_number,
         s.weight_kg, s.reps, s.rir, s.failure, s.rom_category, s.tempo_tag,
         s.equipment_type, s.set_type, pos,
         s.session_set_order, s.rest_seconds, s.pain_flag, s.set_notes, s.planned_exercise_id, s.template_set_id, s.substitution_for],
      )
    }
    const prsHit = detectPRs(userId, saveableSets, date)
    const updatedPhase = advanceProgramPhase(userId, programId, programSessionId, runClassification, now)
    db.exec('COMMIT')
    const workout = loadWorkoutWithSets(id, userId)
    res.json({ workout, prsHit, phase: updatedPhase })
  } catch (err) {
    try { db.exec('ROLLBACK') } catch { /* noop */ }
    console.error('Workout save failed:', err)
    res.status(500).json({ error: 'Failed to save workout' })
  }
})

router.get('/', authRequired, (req, res) => {
  const userId = req.user.id
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100)
  const offset = Math.max(parseInt(req.query.offset) || 0, 0)
  const fromDate = safeStr(req.query.from, 32)
  const toDate = safeStr(req.query.to, 32)
  const day = safeStr(req.query.day, 40)

  const wheres = ['user_id = ?']
  const params = [userId]
  if (fromDate) { wheres.push('date >= ?'); params.push(fromDate) }
  if (toDate) { wheres.push('date <= ?'); params.push(toDate) }
  if (day) { wheres.push('workout_day = ?'); params.push(day) }

  const total = getOne(`SELECT COUNT(*) AS n FROM workouts WHERE ${wheres.join(' AND ')}`, params).n
  const rows = getAll(
    `SELECT * FROM workouts WHERE ${wheres.join(' AND ')} ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  )
  const ids = rows.map(r => r.id)
  let setsByWorkout = {}
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',')
    const allSets = getAll(
      `SELECT s.*,
              COALESCE(ex.name, cx.name) AS exercise_name,
              COALESCE(ex.primary_muscle, cx.primary_muscle) AS primary_muscle,
              COALESCE(s.equipment_type, ex.equipment_type, cx.equipment_type) AS equipment_type
         FROM sets s
         LEFT JOIN exercises ex ON ex.id = s.exercise_id
         LEFT JOIN custom_exercises cx ON cx.id = s.exercise_id AND cx.user_id = ?
        WHERE s.workout_id IN (${placeholders})
        ORDER BY s.session_position, s.set_number`,
      [userId, ...ids],
    )
    setsByWorkout = allSets.reduce((acc, s) => {
      (acc[s.workout_id] ||= []).push(s); return acc
    }, {})
  }
  res.json({
    workouts: rows.map(w => ({ ...w, sets: setsByWorkout[w.id] || [] })),
    total, limit, offset,
  })
})

router.get('/:id', authRequired, (req, res) => {
  const w = loadWorkoutWithSets(req.params.id, req.user.id)
  if (!w) return res.status(404).json({ error: 'Workout not found' })
  res.json({ workout: w })
})

router.patch('/:id', authRequired, (req, res) => {
  const w = getOne('SELECT user_id FROM workouts WHERE id = ?', [req.params.id])
  if (!w) return res.status(404).json({ error: 'Workout not found' })
  if (w.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' })

  const allowed = {
    notes: v => safeStr(v, 2000) ?? '',
    visibility: v => safeEnum(v, VISIBILITY),
    duration_min: v => safeInt(v, { min: 0, max: 24 * 60 }),
    session_effort: v => safeEnum(v, ['easy', 'moderate', 'hard', 'all_out']),
    feel_rating: v => safeInt(v, { min: 1, max: 10 }),
    soreness_note: v => safeStr(v, 500),
    substitutions_note: v => safeStr(v, 500),
    run_classification: v => safeEnum(v, RUN_CLASSIFICATIONS),
  }
  const cols = []
  const vals = []
  for (const [k, raw] of Object.entries(req.body || {})) {
    if (!allowed[k]) continue
    const cleaned = allowed[k](raw)
    cols.push(`${k} = ?`); vals.push(cleaned)
  }
  if (!cols.length) return res.json({ workout: loadWorkoutWithSets(req.params.id, req.user.id) })
  vals.push(req.params.id)
  runQuery(`UPDATE workouts SET ${cols.join(', ')} WHERE id = ?`, vals)
  res.json({ workout: loadWorkoutWithSets(req.params.id, req.user.id) })
})

router.delete('/:id', authRequired, (req, res) => {
  const w = getOne('SELECT user_id FROM workouts WHERE id = ?', [req.params.id])
  if (!w) return res.status(404).json({ error: 'Workout not found' })
  if (w.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' })
  db.exec('BEGIN')
  try {
    const prRows = getAll(
      `SELECT p.id
         FROM prs p
         JOIN sets s ON s.id = p.set_id
        WHERE s.workout_id = ? AND p.user_id = ?`,
      [req.params.id, req.user.id],
    )
    if (prRows.length) {
      const placeholders = prRows.map(() => '?').join(',')
      const prIds = prRows.map(p => p.id)
      runQuery(`DELETE FROM feed_posts WHERE source_type = 'pr' AND source_id IN (${placeholders})`, prIds)
      runQuery(`DELETE FROM prs WHERE id IN (${placeholders})`, prIds)
    }
    runQuery('DELETE FROM feed_posts WHERE source_type = ? AND source_id = ?', ['workout', req.params.id])
    runQuery('DELETE FROM workouts WHERE id = ?', [req.params.id])
    db.exec('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    try { db.exec('ROLLBACK') } catch { /* noop */ }
    console.error('Workout delete failed:', err)
    res.status(500).json({ error: 'Failed to delete workout' })
  }
})

module.exports = router
