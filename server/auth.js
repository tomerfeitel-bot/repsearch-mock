const { createClient } = require('@supabase/supabase-js')
const { getOne } = require('./db')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for Supabase Auth.')
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function userFromToken(token) {
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) return null
  const profile = await getOne(
    'SELECT id, email, username, onboarded FROM users WHERE id = ?',
    [data.user.id],
  )
  return profile || null
}

async function authSessionRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Auth required' })
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data?.user) return res.status(401).json({ error: 'Invalid or expired token' })
    req.authUser = data.user
    next()
  } catch (err) {
    next(err)
  }
}

async function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Auth required' })
  try {
    const user = await userFromToken(token)
    if (!user) return res.status(401).json({ error: 'User not found' })
    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

async function authOptional(req, _res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    req.user = null
    return next()
  }
  try {
    req.user = await userFromToken(token)
    next()
  } catch {
    req.user = null
    next()
  }
}

module.exports = { supabaseAdmin, authSessionRequired, authRequired, authOptional }
