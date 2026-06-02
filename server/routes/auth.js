const express = require('express')
const bcrypt = require('bcryptjs')
const { runQuery, getOne } = require('../db')
const { signToken, authRequired } = require('../auth')
const { nanoid, nowIso, userWithDerivedFields } = require('../util')

const router = express.Router()

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

function publicUser(row) {
  if (!row) return null
  const u = userWithDerivedFields({ ...row })
  delete u.password_hash
  return u
}

router.post('/register', asyncHandler(async (req, res) => {
  const { email, username, password } = req.body || {}
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'Valid email required' })
  }
  if (typeof username !== 'string' || !USERNAME_RE.test(username.trim())) {
    return res.status(400).json({ error: 'Username must be 3–24 chars, letters/numbers/underscore' })
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }
  const emailNorm = email.trim().toLowerCase()
  const usernameNorm = username.trim()
  const existing = getOne('SELECT id FROM users WHERE email = ? OR username = ?', [emailNorm, usernameNorm])
  if (existing) return res.status(409).json({ error: 'Email or username already in use' })

  const id = nanoid()
  const hash = await bcrypt.hash(password, 10)
  runQuery(
    `INSERT INTO users (id, email, username, password_hash, created_at, onboarded)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [id, emailNorm, usernameNorm, hash, nowIso()],
  )
  const user = getOne('SELECT * FROM users WHERE id = ?', [id])
  const token = signToken(id)
  res.json({ token, user: publicUser(user) })
}))

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {}
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password required' })
  }
  const user = getOne('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()])
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  const token = signToken(user.id)
  res.json({ token, user: publicUser(user) })
}))

router.get('/me', authRequired, (req, res) => {
  const user = getOne('SELECT * FROM users WHERE id = ?', [req.user.id])
  res.json({ user: publicUser(user) })
})

module.exports = router
