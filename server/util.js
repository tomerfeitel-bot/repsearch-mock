const { customAlphabet } = require('nanoid')

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 12)

function nowIso() { return new Date().toISOString() }

function safeNum(value, { min = -Infinity, max = Infinity } = {}) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < min || n > max) return null
  return n
}

function safeInt(value, opts) {
  const n = safeNum(value, opts)
  if (n === null) return null
  return Math.round(n)
}

function safeStr(value, maxLen = 500) {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  if (!s) return null
  return s.slice(0, maxLen)
}

function safeEnum(value, allowed) {
  if (value === null || value === undefined) return null
  return allowed.includes(value) ? value : null
}

// Calendar-date strings are compared lexically (date >= ?) and used in unique
// keys, so anything that isn't a real YYYY-MM-DD must be rejected.
function safeDateStr(value) {
  const s = safeStr(value, 32)
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T00:00:00Z`)
  if (isNaN(d.getTime())) return null
  return s
}

function safeBool(value) {
  if (value === true || value === 1 || value === '1' || value === 'true') return 1
  if (value === false || value === 0 || value === '0' || value === 'false') return 0
  return null
}

function ageRangeFromDob(dobIso) {
  if (!dobIso) return null
  const dob = new Date(dobIso)
  if (isNaN(dob.getTime())) return null
  const ageMs = Date.now() - dob.getTime()
  const age = ageMs / (365.25 * 24 * 3600 * 1000)
  if (age < 18) return 'under_18'
  if (age < 25) return '18_24'
  if (age < 35) return '25_34'
  if (age < 45) return '35_44'
  if (age < 55) return '45_54'
  if (age < 65) return '55_64'
  return '65_plus'
}

function trainingAgeFromStart(startIso) {
  if (!startIso) return null
  const started = new Date(startIso)
  if (isNaN(started.getTime())) return null
  const years = (Date.now() - started.getTime()) / (365.25 * 24 * 3600 * 1000)
  if (!Number.isFinite(years) || years < 0) return null
  return Math.round(years * 10) / 10
}

function userWithDerivedFields(row) {
  if (!row) return row
  const out = { ...row }
  const trainingAge = trainingAgeFromStart(out.training_started_at)
  if (trainingAge !== null) out.training_age_years = trainingAge
  return out
}

function isoWeek(dateInput) {
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return null
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function estimate1RM(weight, reps) {
  if (!weight || !reps) return null
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

module.exports = {
  nanoid, nowIso,
  safeNum, safeInt, safeStr, safeEnum, safeBool, safeDateStr,
  ageRangeFromDob, trainingAgeFromStart, userWithDerivedFields, isoWeek, estimate1RM,
}
