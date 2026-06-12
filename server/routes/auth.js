const express = require('express')
const { runQuery, getOne } = require('../db')
const { authRequired, authSessionRequired, isAdminUser } = require('../auth')
const { nowIso, userWithDerivedFields } = require('../util')

const router = express.Router()

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

function publicUser(row) {
  if (!row) return null
  return userWithDerivedFields({ ...row })
}

router.post('/profile', authSessionRequired, asyncHandler(async (req, res) => {
  const authUser = req.authUser
  const { username } = req.body || {}
  if (typeof username !== 'string' || !USERNAME_RE.test(username.trim())) {
    return res.status(400).json({ error: 'Username must be 3-24 chars, letters/numbers/underscore' })
  }

  const usernameNorm = username.trim()
  const existingName = await getOne(
    'SELECT id FROM users WHERE username = ? AND id != ?',
    [usernameNorm, authUser.id],
  )
  if (existingName) return res.status(409).json({ error: 'Username already in use' })

  await runQuery(
    `INSERT INTO users (id, email, username, created_at, onboarded)
     VALUES (?, ?, ?, ?, 0)
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       username = EXCLUDED.username`,
    [authUser.id, authUser.email, usernameNorm, nowIso()],
  )
  const user = await getOne('SELECT * FROM users WHERE id = ?', [authUser.id])
  res.status(201).json({ user: publicUser(user) })
}))

router.get('/me', authRequired, asyncHandler(async (req, res) => {
  const user = publicUser(await getOne('SELECT * FROM users WHERE id = ?', [req.user.id]))
  // Derived from ADMIN_EMAILS, not a column — gates the web /admin page link.
  if (user) user.is_admin = isAdminUser(user) ? 1 : 0
  res.json({ user })
}))

module.exports = router
