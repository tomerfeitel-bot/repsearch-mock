const jwt = require('jsonwebtoken')
const { getOne } = require('./db')

const JWT_SECRET = process.env.JWT_SECRET || 'repsearch-v2-dev-secret-change-me'
const JWT_TTL = process.env.JWT_TTL || '14d'

function signToken(userId) {
  return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: JWT_TTL })
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Auth required' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = getOne('SELECT id, email, username, onboarded FROM users WHERE id = ?', [payload.uid])
    if (!user) return res.status(401).json({ error: 'User not found' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

function authOptional(req, _res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) { req.user = null; return next() }
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = getOne('SELECT id, email, username, onboarded FROM users WHERE id = ?', [payload.uid])
    req.user = user || null
  } catch {
    req.user = null
  }
  next()
}

module.exports = { signToken, authRequired, authOptional, JWT_SECRET }
