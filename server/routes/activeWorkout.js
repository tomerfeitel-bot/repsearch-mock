const express = require('express')
const { runQuery, getOne } = require('../db')
const { authRequired } = require('../auth')
const { nowIso } = require('../util')

const router = express.Router()

router.get('/', authRequired, (req, res) => {
  const row = getOne('SELECT state_json, updated_at FROM active_workouts WHERE user_id = ?', [req.user.id])
  if (!row) return res.json({ state: null, updated_at: null })
  try {
    res.json({ state: JSON.parse(row.state_json), updated_at: row.updated_at })
  } catch {
    res.json({ state: null, updated_at: row.updated_at })
  }
})

router.put('/', authRequired, (req, res) => {
  const state = req.body?.state ?? req.body
  if (typeof state !== 'object' || state === null) {
    return res.status(400).json({ error: 'state object required' })
  }
  const json = JSON.stringify(state)
  if (json.length > 200000) return res.status(413).json({ error: 'State too large' })
  const now = nowIso()
  const existing = getOne('SELECT user_id FROM active_workouts WHERE user_id = ?', [req.user.id])
  if (existing) {
    runQuery('UPDATE active_workouts SET state_json = ?, updated_at = ? WHERE user_id = ?', [json, now, req.user.id])
  } else {
    runQuery('INSERT INTO active_workouts (user_id, state_json, updated_at) VALUES (?, ?, ?)', [req.user.id, json, now])
  }
  res.json({ ok: true, updated_at: now })
})

router.delete('/', authRequired, (req, res) => {
  runQuery('DELETE FROM active_workouts WHERE user_id = ?', [req.user.id])
  res.json({ ok: true })
})

module.exports = router
