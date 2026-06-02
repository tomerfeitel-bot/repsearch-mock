const express = require('express')
const bcrypt = require('bcryptjs')
const { db, runQuery, getOne } = require('../db')
const { authRequired } = require('../auth')
const {
  safeNum, safeInt, safeStr, safeEnum, safeBool, ageRangeFromDob,
  userWithDerivedFields,
} = require('../util')

const router = express.Router()

const GENDERS = ['woman', 'man', 'prefer_not_to_say']
const AGE_RANGES = ['under_18', '18_24', '25_34', '35_44', '45_54', '55_64', '65_plus']
const EXPERIENCE = ['beginner', 'intermediate', 'advanced']
const GOALS = ['strength', 'hypertrophy', 'fat_loss', 'general_fitness', 'sport_performance']
const SPLITS = ['Upper/Lower', 'Push/Pull/Legs', 'Chest/Back/Legs', 'Full Body', 'Bro Split', 'Custom']
const GYMS = ['commercial', 'home', 'outdoor']
const ENHANCEMENT = ['natural', 'enhanced', 'previously_enhanced', 'prefer_not_to_say']
const STRESS = ['low', 'moderate', 'high']
const NUTRITION = ['bulk', 'cut', 'maintenance']
const PROTEIN = ['consistent', 'variable']
const CREATINE = ['yes', 'no', 'occasional']
const UNITS = ['kg', 'lbs']
const SPORTS = ['running', 'cycling', 'swimming', 'team_sport', 'none']
const SPORT_VOLUME = ['low', 'moderate', 'high']
const PHYSICAL_LABOR = ['sedentary', 'light', 'moderate', 'heavy']
const ETHNIC_BACKGROUNDS = [
  'american_indian_alaska_native', 'asian', 'black_african_descent', 'hispanic_latino',
  'middle_eastern_north_african', 'native_hawaiian_pacific_islander',
  'white_european_descent', 'prefer_not_to_say',
]
const SUPPLEMENTS = [
  'creatine', 'protein_powder', 'pre_workout', 'caffeine', 'beta_alanine', 'citrulline',
  'electrolytes', 'multivitamin', 'vitamin_d', 'omega_3', 'magnesium', 'ashwagandha',
  'bcaa_eaa', 'other',
]
const SUPPLEMENT_FREQUENCY = ['daily', 'training_days', 'weekly', 'occasionally']
const SPLIT_WORKOUT_TYPES = [
  'Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body',
  'Chest & Tris', 'Back & Bis', 'Shoulders', 'Arms', 'Cardio',
]
const SPLIT_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Widget keys a user may opt into showing on their public Athlete Card.
// Everything not listed here stays private regardless of request payload.
const PUBLIC_FIELD_KEYS = ['sleep', 'nutrition', 'supplements', 'measurements', 'split']

const MANDATORY_FIELDS = [
  'goal', 'gender', 'date_of_birth', 'training_started_at', 'enhancement_status',
  'preferred_units', 'research_opt_in',
]

function safeDate(value) {
  const s = safeStr(value, 32)
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : s
}

function safeJsonArray(value, allowed) {
  const raw = Array.isArray(value) ? value : (() => {
    if (typeof value !== 'string') return null
    try { return JSON.parse(value) } catch { return null }
  })()
  if (!Array.isArray(raw)) return null
  const cleaned = [...new Set(raw.map(String).filter(v => allowed.includes(v)))]
  return JSON.stringify(cleaned)
}

function safePublicFields(value) {
  const raw = Array.isArray(value) ? value : (() => {
    if (typeof value !== 'string') return null
    try { return JSON.parse(value) } catch { return null }
  })()
  if (!Array.isArray(raw)) return null
  const cleaned = [...new Set(raw.map(String).filter(v => PUBLIC_FIELD_KEYS.includes(v)))]
  return JSON.stringify(cleaned)
}

function safeSplitDays(value) {
  const raw = Array.isArray(value) ? value : (() => {
    if (typeof value !== 'string') return null
    try { return JSON.parse(value) } catch { return null }
  })()
  if (!Array.isArray(raw)) return null
  const seen = new Set()
  const cleaned = raw.map(item => {
    const day = typeof item === 'string' ? item : String(item?.day || '')
    if (!SPLIT_WEEKDAYS.includes(day) || seen.has(day)) return null
    seen.add(day)
    const rawType = item && typeof item === 'object' ? String(item.type || '') : ''
    const type = SPLIT_WORKOUT_TYPES.includes(rawType) ? rawType : (safeStr(rawType, 40) || '')
    return { day, type }
  }).filter(Boolean)
  return JSON.stringify(cleaned)
}

function safeSupplements(value) {
  const raw = Array.isArray(value) ? value : (() => {
    if (typeof value !== 'string') return null
    try { return JSON.parse(value) } catch { return null }
  })()
  if (!Array.isArray(raw)) return null
  const cleaned = raw.map(item => {
    if (!item || typeof item !== 'object') return null
    const key = String(item.key || '')
    if (!SUPPLEMENTS.includes(key)) return null
    const amount = item.amount === null || item.amount === '' || item.amount === undefined
      ? null
      : safeNum(item.amount, { min: 0, max: 100000 })
    const unit = safeStr(item.unit, 24)
    const frequency = SUPPLEMENT_FREQUENCY.includes(item.frequency) ? item.frequency : null
    const name = key === 'other' ? safeStr(item.name, 60) : null
    if (key === 'other' && !name) return null
    return { key, name: name || undefined, amount, unit: unit || undefined, frequency: frequency || undefined }
  }).filter(Boolean)
  return JSON.stringify(cleaned)
}

const FIELD_VALIDATORS = {
  bio: v => safeStr(v, 500) ?? '',
  is_private: v => safeBool(v),
  onboarded: v => safeBool(v),
  experience_level: v => safeEnum(v, EXPERIENCE),
  goal: v => safeEnum(v, GOALS),
  split_type: v => safeEnum(v, SPLITS),
  split_frequency_type: v => safeEnum(v, ['fixed', 'frequency']),
  split_frequency_value: v => safeStr(v, 40),
  public_fields_json: v => safePublicFields(v),
  split_days_json: v => safeSplitDays(v),
  training_age_years: v => safeNum(v, { min: 0, max: 60 }),
  training_started_at: v => safeDate(v),
  gym_type: v => safeEnum(v, GYMS),
  gender: v => safeEnum(v, GENDERS),
  age_range: v => safeEnum(v, AGE_RANGES),
  date_of_birth: v => safeDate(v),
  country_region: v => safeStr(v, 80),
  enhancement_status: v => safeEnum(v, ENHANCEMENT),
  height_cm: v => safeNum(v, { min: 80, max: 260 }),
  bodyweight_kg: v => safeNum(v, { min: 25, max: 350 }),
  arm_cm: v => safeNum(v, { min: 15, max: 80 }),
  chest_cm: v => safeNum(v, { min: 40, max: 200 }),
  waist_cm: v => safeNum(v, { min: 40, max: 200 }),
  thigh_cm: v => safeNum(v, { min: 20, max: 120 }),
  calf_cm: v => safeNum(v, { min: 15, max: 80 }),
  sleep_hours: v => safeNum(v, { min: 0, max: 16 }),
  stress_level: v => safeEnum(v, STRESS),
  nutrition_phase: v => safeEnum(v, NUTRITION),
  protein_consistency: v => safeEnum(v, PROTEIN),
  protein_g_per_kg: v => safeNum(v, { min: 0, max: 8 }),
  creatine_use: v => safeEnum(v, CREATINE),
  supplements_json: v => safeSupplements(v),
  ethnic_background_json: v => safeJsonArray(v, ETHNIC_BACKGROUNDS),
  injury_limitations: v => safeStr(v, 1000),
  job_title: v => safeStr(v, 80),
  physical_labor_level: v => safeEnum(v, PHYSICAL_LABOR),
  preferred_units: v => safeEnum(v, UNITS),
  research_opt_in: v => safeBool(v),
  sport_primary: v => safeEnum(v, SPORTS),
  sport_volume_per_week: v => safeEnum(v, SPORT_VOLUME),
  sport_sessions_per_week: v => safeNum(v, { min: 0, max: 21 }),
  vo2_max: v => safeNum(v, { min: 10, max: 100 }),
  avg_daily_steps: v => safeInt(v, { min: 0, max: 100000 }),
  race_distance: v => safeStr(v, 40),
}

function patchUser(req, res) {
  const updates = req.body || {}
  const cols = []
  const vals = []
  const unknown = []
  for (const [key, raw] of Object.entries(updates)) {
    if (!Object.prototype.hasOwnProperty.call(FIELD_VALIDATORS, key)) {
      unknown.push(key)
      continue
    }
    const cleaned = FIELD_VALIDATORS[key](raw)
    if (cleaned === null && raw !== null && raw !== '') {
      return res.status(400).json({ error: `Invalid value for ${key}` })
    }
    cols.push(`${key} = ?`)
    vals.push(cleaned)
  }
  if (unknown.length) return res.status(400).json({ error: `Unknown field(s): ${unknown.join(', ')}` })

  if (Object.prototype.hasOwnProperty.call(updates, 'date_of_birth')) {
    const age = ageRangeFromDob(updates.date_of_birth)
    cols.push('age_range = ?')
    vals.push(age)
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'training_age_years') &&
      !Object.prototype.hasOwnProperty.call(updates, 'training_started_at')) {
    const years = safeNum(updates.training_age_years, { min: 0, max: 60 })
    if (years !== null) {
      const d = new Date()
      d.setDate(d.getDate() - Math.round(years * 365.25))
      cols.push('training_started_at = ?')
      vals.push(d.toISOString().slice(0, 10))
    }
  }

  if (cols.length === 0) return res.json({ user: userWithDerivedFields(getOne('SELECT * FROM users WHERE id = ?', [req.user.id])) })

  vals.push(req.user.id)
  runQuery(`UPDATE users SET ${cols.join(', ')} WHERE id = ?`, vals)

  const fresh = userWithDerivedFields(getOne('SELECT * FROM users WHERE id = ?', [req.user.id]))
  const allMandatorySet = MANDATORY_FIELDS.every(f => fresh[f] !== null && fresh[f] !== undefined && fresh[f] !== '')
  if (allMandatorySet && !fresh.onboarded) {
    runQuery('UPDATE users SET onboarded = 1 WHERE id = ?', [req.user.id])
    fresh.onboarded = 1
  }
  delete fresh.password_hash
  res.json({ user: fresh })
}

router.patch('/', authRequired, patchUser)

router.post('/advanced', authRequired, (req, res) => {
  const allowedAdvanced = new Set([
    'sleep_hours', 'stress_level', 'nutrition_phase', 'protein_g_per_kg',
    'supplements_json', 'ethnic_background_json', 'injury_limitations',
    'country_region', 'job_title', 'physical_labor_level', 'gym_type',
    'sport_primary', 'sport_sessions_per_week', 'race_distance', 'arm_cm',
    'chest_cm', 'waist_cm', 'thigh_cm', 'calf_cm', 'vo2_max', 'avg_daily_steps',
  ])
  const filtered = {}
  for (const [k, v] of Object.entries(req.body || {})) {
    if (allowedAdvanced.has(k)) filtered[k] = v
  }
  req.body = filtered
  return patchUser(req, res)
})

router.delete('/', authRequired, async (req, res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!password) return res.status(400).json({ error: 'Password confirmation required' })

  const user = getOne('SELECT id, password_hash FROM users WHERE id = ?', [req.user.id])
  if (!user) return res.status(404).json({ error: 'User not found' })

  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return res.status(401).json({ error: 'Incorrect password' })

  db.exec('BEGIN')
  try {
    runQuery('DELETE FROM users WHERE id = ?', [req.user.id])
    db.exec('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    try { db.exec('ROLLBACK') } catch { /* noop */ }
    console.error('Account delete failed:', err)
    res.status(500).json({ error: 'Failed to delete account' })
  }
})

module.exports = router
