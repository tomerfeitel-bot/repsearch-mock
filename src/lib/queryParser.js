// Turns a plain-language question into a runnable explorer config by filling the
// explorer's slots — groupBy, measure, filters, mode, plus exercise/muscle scope —
// from the vocabularies in queryLexicon.js. Pure functions, no React.

import {
  COMPARE_TRIGGERS,
  EXERCISE_PHRASES,
  FILTER_LEXICON,
  GROUPBY_LEXICON,
  MEASURE_LEXICON,
  MUSCLE_TERMS,
  NUMERIC_COMPARATORS,
  NUMERIC_CONCEPTS,
  PHRASE_SYNONYMS,
  POPULAR_PRESET_IDS,
  SEARCH_PRESETS,
  STOPWORDS,
  SYNONYMS,
  makeConfig,
} from './queryLexicon.js'
import { SEED_EXERCISES } from './exercises.js'
import { describeQuery, prettyBucket, prettyGroupBy, prettyMeasure } from './researchTheme.js'

// Filter fields that are also a groupBy dimension. Naming two values of one of
// these ("men vs women") means the user wants that dimension as the AXIS.
const FIELD_TO_GROUPBY = {
  'users.gender': 'gender',
  'users.experience_level': 'experience_level',
  'users.enhancement_status': 'enhancement_status',
  'users.goal': 'goal',
  'users.split_type': 'split_type',
  'users.physical_labor_level': 'physical_labor_level',
  'users.sport_primary': 'sport_primary',
  'exercises.movement_pattern': 'movement_pattern',
  'exercises.equipment_type': 'equipment_type',
  'exercises.force_vector': 'force_vector',
  'exercises.bilateral': 'bilateral',
}

const DEFAULT_AXIS = 'frequency_bucket'
const EXERCISE_BY_ID = Object.fromEntries(SEED_EXERCISES.map(ex => [ex.id, ex]))

function stem(word) {
  if (word.length < 4) return word
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y'
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3)
  if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2)
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1)
  return word
}

function cleanText(text) {
  return ` ${String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()} `
}

// raw text -> { tokens:Set, phrase:string, hasCompare:boolean }
export function normalize(text) {
  let s = ` ${cleanText(text).trim()} `
  for (const [pattern, replacement] of PHRASE_SYNONYMS) s = s.replace(pattern, ` ${replacement} `)
  const rawTokens = s.split(/\s+/).filter(Boolean)
  const hasCompare = rawTokens.some(t => COMPARE_TRIGGERS.has(t))
  const tokens = new Set()
  for (const raw of rawTokens) {
    const syn = SYNONYMS[raw] || raw
    if (STOPWORDS.has(syn)) continue
    tokens.add(stem(syn))
  }
  return { tokens, phrase: [...tokens].join(' '), hasCompare }
}

function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  if (Math.abs(m - n) > 2) return 3
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    prev = cur
  }
  return prev[n]
}

function fuzzyHit(term, tokens) {
  // Short words collide too easily under edit distance (full~pull, rest~best),
  // so only fuzzy-match terms of 5+ chars. protien→protein (len 7) still works.
  if (term.length < 5) return false
  const max = term.length >= 7 ? 2 : 1
  for (const t of tokens) {
    if (Math.abs(t.length - term.length) > max) continue
    if (levenshtein(term, t) <= max) return true
  }
  return false
}

// +2 for an exact token hit, +1 for a typo-distance hit.
export function scoreEntry(terms, tokens) {
  let score = 0
  for (const term of terms) {
    const stemmed = stem(term)
    if (tokens.has(stemmed)) score += 2
    else if (fuzzyHit(stemmed, tokens)) score += 1
  }
  return score
}

// ---- exercise / muscle / numeric detection (run on raw text) ----

function detectExercise(text) {
  for (const [pattern, id] of EXERCISE_PHRASES) {
    const m = text.match(pattern)
    if (m && EXERCISE_BY_ID[id]) {
      return { id, cleaned: text.replace(pattern, ' ') }
    }
  }
  return { id: '', cleaned: text }
}

function detectMuscle(text) {
  // longest keys first so "hamstrings" wins over a shorter accidental match
  const keys = Object.keys(MUSCLE_TERMS).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    const re = new RegExp(`\\b${key}\\b`)
    if (re.test(text)) return { muscle: MUSCLE_TERMS[key], cleaned: text.replace(re, ' ') }
  }
  return { muscle: '', cleaned: text }
}

function nearestConcept(text, index) {
  let best = null
  let bestDist = Infinity
  for (const concept of NUMERIC_CONCEPTS) {
    for (const word of concept.words) {
      let from = 0
      let idx
      while ((idx = text.indexOf(word, from)) !== -1) {
        const dist = Math.abs(idx - index)
        if (dist < bestDist) { bestDist = dist; best = concept }
        from = idx + 1
      }
    }
  }
  return bestDist <= 35 ? best : null
}

function parseNumericFilters(text) {
  const filters = []
  let working = text
  const byPhrase = [...NUMERIC_COMPARATORS].sort((a, b) => b[0].length - a[0].length)
  for (const [phrase, op] of byPhrase) {
    const re = new RegExp(phrase.replace(/ /g, '\\s+') + '\\s+(\\d+(?:\\.\\d+)?)', 'g')
    let m
    while ((m = re.exec(working))) {
      const concept = nearestConcept(text, m.index)
      if (concept) filters.push({ field: concept.field, op, value: Number(m[1]) })
    }
    working = working.replace(re, ' ')
  }
  // training age: "<n> years (of) training" or "training for over <n> years"
  let am = text.match(/(\d+)\s*(?:years?|yrs?)\s*(?:of\s+)?(?:training|lifting|experience|trained|lifted)/)
  if (!am) am = text.match(/(?:training|lifting|experience)\s+(?:for\s+)?(?:over|above|more than|under|below|less than|at least|at most)?\s*(\d+)\s*(?:years?|yrs?)/)
  if (am) {
    const ctx = text.slice(Math.max(0, am.index - 15), am.index + am[0].length)
    let op = '>='
    if (/under|below|less than|at most|fewer/.test(ctx)) op = '<'
    else if (/over|above|more than/.test(ctx)) op = '>'
    filters.push({ field: 'users.training_age_years', op, value: Number(am[1]) })
  }
  // dedupe by field (keep first)
  const seen = new Set()
  return filters.filter(f => (seen.has(f.field) ? false : seen.add(f.field)))
}

// ---- slot resolution ----

function bestGroupBy(tokens, fieldValues) {
  let best = null
  let bestAdj = 0
  for (const entry of GROUPBY_LEXICON) {
    const score = scoreEntry(entry.terms, tokens)
    if (score <= 0) continue
    const filterField = Object.keys(FIELD_TO_GROUPBY).find(f => FIELD_TO_GROUPBY[f] === entry.value)
    const single = filterField && fieldValues[filterField] && fieldValues[filterField].length === 1
    const adj = single ? score - 1 : score
    if (adj > bestAdj || (adj === bestAdj && best && score > best.score)) {
      best = { value: entry.value, score }
      bestAdj = adj
    }
  }
  return best
}

function bestMeasure(tokens) {
  let best = null
  for (const entry of MEASURE_LEXICON) {
    const score = scoreEntry(entry.terms, tokens)
    if (score > 0 && (!best || score > best.score)) best = { value: entry.value, score }
  }
  return best
}

function collectFilters(tokens) {
  const fieldValues = {}
  for (const entry of FILTER_LEXICON) {
    const score = scoreEntry(entry.terms, tokens)
    if (score <= 0) continue
    const { field, value } = entry.filter
    if (!fieldValues[field]) fieldValues[field] = []
    if (!fieldValues[field].some(v => v.value === value)) {
      fieldValues[field].push({ ...entry.filter, score })
    }
  }
  return fieldValues
}

function scorePresets(tokens) {
  return SEARCH_PRESETS
    .map(preset => ({ preset, score: scoreEntry(preset.keywords, tokens) }))
    .sort((a, b) => b.score - a.score)
}

function popularPresets() {
  return POPULAR_PRESET_IDS.map(id => SEARCH_PRESETS.find(p => p.id === id)).filter(Boolean)
}

function buildInterpretation(config) {
  const exName = config.exerciseId ? EXERCISE_BY_ID[config.exerciseId]?.name : ''
  if (config.mode === 'compare') {
    const scope = exName ? ` for ${exName}` : config.muscle ? ` for ${config.muscle}` : ''
    return `${prettyMeasure(config.measure)} by ${prettyGroupBy(config.groupBy).toLowerCase()}${scope}: ${config.cohortALabel} vs ${config.cohortBLabel}`
  }
  return describeQuery({
    filters: config.filtersA,
    groupBy: config.groupBy,
    measure: config.measure,
    exerciseId: config.exerciseId,
    exerciseName: exName,
    muscle: config.muscle,
  })
}

export function describeConfig(config) {
  return buildInterpretation(config)
}

// Compose a config from detected slots. Returns { config, confident } or null.
function compose(text) {
  const raw = cleanText(text)
  const ex = detectExercise(raw)
  const mus = ex.id ? { muscle: '', cleaned: ex.cleaned } : detectMuscle(ex.cleaned)
  const numericFilters = parseNumericFilters(raw)

  const { tokens, hasCompare } = normalize(mus.cleaned)
  const fieldValues = collectFilters(tokens)
  const gb = bestGroupBy(tokens, fieldValues)
  const ms = bestMeasure(tokens)
  const measure = ms ? ms.value : 'progression_rate'

  const pairField = Object.keys(fieldValues).find(f => fieldValues[f].length >= 2)

  let mode = 'single'
  let groupBy = gb ? gb.value : null
  let cohortA = null
  let cohortB = null
  const consumed = new Set()

  if (pairField) {
    const pairGroupBy = FIELD_TO_GROUPBY[pairField]
    const pairIsAxis = pairGroupBy && (!gb || gb.score <= 2 || gb.value === pairGroupBy)
    if (pairIsAxis) {
      groupBy = pairGroupBy
      consumed.add(pairField)
    } else {
      mode = 'compare'
      const [a, b] = fieldValues[pairField]
      cohortA = [{ field: a.field, op: a.op, value: a.value }]
      cohortB = [{ field: b.field, op: b.op, value: b.value }]
      consumed.add(pairField)
      if (!groupBy) groupBy = DEFAULT_AXIS
    }
  } else if (hasCompare && gb) {
    groupBy = gb.value
  }

  const extra = []
  for (const field of Object.keys(fieldValues)) {
    if (consumed.has(field)) continue
    if (FIELD_TO_GROUPBY[field] === groupBy) continue
    extra.push({ field: fieldValues[field][0].field, op: fieldValues[field][0].op, value: fieldValues[field][0].value })
  }
  const sideFilters = [...extra, ...numericFilters]

  // No axis yet, but a lone filter on a groupable dimension → make it the axis.
  if (!groupBy && extra.length === 1 && FIELD_TO_GROUPBY[extra[0].field]) {
    groupBy = FIELD_TO_GROUPBY[extra[0].field]
    sideFilters.splice(sideFilters.indexOf(extra[0]), 1)
  }
  // Still no axis but we have scope/filters → fall back to the default axis.
  if (!groupBy && (sideFilters.length || ex.id || mus.muscle)) groupBy = DEFAULT_AXIS
  if (!groupBy) return null

  const config = mode === 'compare'
    ? makeConfig({
        mode: 'compare',
        groupBy,
        measure,
        filtersA: [...cohortA, ...sideFilters],
        filtersB: [...cohortB, ...sideFilters],
        cohortALabel: prettyBucket(cohortA[0].value),
        cohortBLabel: prettyBucket(cohortB[0].value),
        exerciseId: ex.id,
        muscle: ex.id ? '' : mus.muscle,
      })
    : makeConfig({
        groupBy,
        measure,
        filtersA: sideFilters,
        exerciseId: ex.id,
        muscle: ex.id ? '' : mus.muscle,
      })

  const confident = Boolean(
    (gb && gb.score >= 2) || mode === 'compare' || consumed.size > 0 || ms || ex.id || mus.muscle || numericFilters.length,
  )
  return { config, confident }
}

// Main entry. text -> { status, config, interpretation, suggestions, popular }
export function parseQuery(text) {
  const popular = popularPresets()
  if (!text || !text.trim()) {
    return { status: 'empty', config: null, interpretation: '', suggestions: [], popular }
  }

  const { tokens } = normalize(text)
  const rankedPresets = scorePresets(tokens)
  const topPreset = rankedPresets[0]
  const suggestions = rankedPresets.filter(p => p.score > 0).slice(0, 4).map(p => p.preset)

  const composed = compose(text)

  if (composed && composed.confident) {
    return {
      status: 'confident',
      config: composed.config,
      interpretation: buildInterpretation(composed.config),
      suggestions: suggestions.slice(0, 3),
      popular,
    }
  }

  if (topPreset && topPreset.score >= 4) {
    return {
      status: 'confident',
      config: topPreset.preset.config,
      interpretation: buildInterpretation(topPreset.preset.config),
      suggestions: suggestions.filter(p => p.id !== topPreset.preset.id).slice(0, 3),
      popular,
    }
  }

  if (composed || suggestions.length) {
    return {
      status: 'ambiguous',
      config: composed ? composed.config : null,
      interpretation: composed ? buildInterpretation(composed.config) : '',
      suggestions: suggestions.length ? suggestions : popular,
      popular,
    }
  }

  return { status: 'unknown', config: null, interpretation: '', suggestions: [], popular }
}
