// Study page is intentionally tonally distinct: dark canvas, single restrained
// accent, monospace numbers. Mirrors the whitelists in server/research/queryEngine.js
// so the UI can't construct queries the backend will reject.

// Rubber Brass palette (light "gym hardware") for the Study page. Graphite is
// the primary mark, brass the warm second series.
export const STUDY_BG = '#f7f8f4'
export const STUDY_CARD = '#ffffff'
export const STUDY_BORDER = '#d5dcd2'
export const STUDY_BORDER_STRONG = '#b0bab0'
export const STUDY_TEXT = '#151817'
export const STUDY_MUTED = '#58615b'
export const STUDY_DIM = '#8a948c'
export const STUDY_ACCENT = '#242825'        // graphite
export const STUDY_ACCENT_DIM = '#6b726c'
export const STUDY_ACCENT_FAINT = 'rgba(36, 40, 37, 0.10)'
export const STUDY_COMPARE_A = '#242825'     // graphite
export const STUDY_COMPARE_B = '#a77b3f'     // brass against graphite
// Warm "action" accent (matches the app-wide --action / indigo-600 remap). Used
// to embolden the discovery heroes — featured questions + surprising findings.
export const STUDY_ACTION = '#c2410c'
export const STUDY_ACTION_SOFT = 'rgba(194, 65, 12, 0.12)'
export const STUDY_ACTION_INK = '#9a330a'    // darker, for warm text on the soft tint (AA)

// Field categories shown in the filter picker, grouped for readability.
// Keys must match server/research/queryEngine.js FIELD_TABLE.
export const FIELD_OPTIONS = [
  { group: 'Profile', fields: [
    { value: 'users.experience_level', label: 'Experience level', enum: ['beginner', 'intermediate', 'advanced'] },
    { value: 'users.goal', label: 'Goal', enum: ['strength', 'hypertrophy', 'fat_loss', 'general_fitness', 'sport_performance'] },
    { value: 'users.split_type', label: 'Split type', enum: ['upper_lower', 'ppl', 'full_body', 'bro_split', 'custom'] },
    { value: 'users.training_age_years', label: 'Training age (years)', type: 'number' },
    { value: 'users.gym_type', label: 'Gym type', enum: ['commercial', 'home', 'outdoor'] },
    { value: 'users.gender', label: 'Gender', enum: ['woman', 'man', 'prefer_not_to_say'] },
    { value: 'users.age_range', label: 'Age range', enum: ['under_18', '18_24', '25_34', '35_44', '45_54', '55_plus'] },
    { value: 'users.enhancement_status', label: 'Enhancement status', enum: ['natural', 'enhanced', 'previously_enhanced', 'prefer_not_to_say'] },
    { value: 'users.height_cm', label: 'Height (cm)', type: 'number' },
    { value: 'users.bodyweight_kg', label: 'Bodyweight (kg)', type: 'number' },
  ]},
  { group: 'Lifestyle', fields: [
    { value: 'users.sleep_hours', label: 'Self-reported sleep (hrs)', type: 'number' },
    { value: 'users.stress_level', label: 'Self-reported stress', enum: ['low', 'moderate', 'high'] },
    { value: 'users.nutrition_phase', label: 'Nutrition phase', enum: ['bulk', 'cut', 'maintenance'] },
    { value: 'users.protein_g_per_kg', label: 'Protein intake (g/kg)', type: 'number' },
    { value: 'users.creatine_use', label: 'Creatine use', enum: ['yes', 'no', 'occasional'] },
    { value: 'users.supplements_json', label: 'Supplements JSON', type: 'text' },
    { value: 'users.ethnic_background_json', label: 'Ethnic background JSON', type: 'text' },
    { value: 'users.job_title', label: 'Job / role', type: 'text' },
    { value: 'users.physical_labor_level', label: 'Physical labor at work', enum: ['sedentary', 'light', 'moderate', 'heavy'] },
    { value: 'users.sport_primary', label: 'Primary sport', enum: ['running', 'cycling', 'swimming', 'team_sport', 'none'] },
    { value: 'users.sport_sessions_per_week', label: 'Sport sessions / week', type: 'number' },
    { value: 'users.vo2_max', label: 'VO2 max', type: 'number' },
    { value: 'users.avg_daily_steps', label: 'Average daily steps', type: 'number' },
    { value: 'users.race_distance', label: 'Race distance', type: 'text' },
  ]},
  { group: 'Logged behavior (weekly)', fields: [
    { value: 'user_systemic_profile.avg_sleep_duration', label: 'Avg sleep duration (hrs)', type: 'number' },
    { value: 'user_systemic_profile.avg_sleep_quality', label: 'Avg sleep quality (1-5)', type: 'number' },
    { value: 'user_systemic_profile.sleep_variance', label: 'Sleep variance', type: 'number' },
    { value: 'user_systemic_profile.avg_nutrition_quality', label: 'Avg nutrition quality', type: 'number' },
    { value: 'user_systemic_profile.avg_stress', label: 'Avg stress (logged)', type: 'number' },
    { value: 'user_systemic_profile.total_cardio_minutes', label: 'Total cardio (min)', type: 'number' },
    { value: 'user_systemic_profile.total_cardio_load', label: 'Total cardio load', type: 'number' },
    { value: 'user_systemic_profile.running_load', label: 'Running load', type: 'number' },
    { value: 'user_systemic_profile.cycling_load', label: 'Cycling load', type: 'number' },
    { value: 'user_systemic_profile.swimming_load', label: 'Swimming load', type: 'number' },
    { value: 'user_systemic_profile.training_consistency', label: 'Training consistency', type: 'number' },
  ]},
  { group: 'Exercise profile', fields: [
    { value: 'user_exercise_profile.total_sessions', label: 'Total sessions', type: 'number' },
    { value: 'user_exercise_profile.avg_weekly_frequency', label: 'Weekly frequency', type: 'number' },
    { value: 'user_exercise_profile.avg_session_position', label: 'Avg session position', type: 'number' },
    { value: 'user_exercise_profile.estimated_1rm', label: 'Estimated 1RM (kg)', type: 'number' },
    { value: 'user_exercise_profile.progression_rate', label: 'Progression rate', type: 'number' },
    { value: 'user_exercise_profile.rir_logging_rate', label: 'RIR logging rate (0-1)', type: 'number' },
  ]},
  { group: 'Set log', fields: [
    { value: 'sets.session_set_order', label: 'Session set order', type: 'number' },
    { value: 'sets.session_position', label: 'Exercise session position', type: 'number' },
    { value: 'sets.set_number', label: 'Exercise set number', type: 'number' },
    { value: 'sets.weight_kg', label: 'Set weight (kg)', type: 'number' },
    { value: 'sets.reps', label: 'Set reps', type: 'number' },
    { value: 'sets.rir', label: 'Set RIR', type: 'number' },
    { value: 'sets.rest_seconds', label: 'Rest before set (sec)', type: 'number' },
    { value: 'sets.failure', label: 'Set to failure', enum: ['0', '1'] },
    { value: 'sets.pain_flag', label: 'Pain flagged', enum: ['0', '1'] },
    { value: 'sets.set_type', label: 'Set type', enum: ['working', 'warmup', 'drop', 'amrap', 'rest_pause', 'cluster'] },
    { value: 'sets.rom_category', label: 'ROM category', enum: ['full', 'partial', 'lengthened', 'shortened'] },
    { value: 'sets.tempo_tag', label: 'Tempo', enum: ['controlled', 'explosive', '3010', '2020', 'paused'] },
  ]},
  { group: 'Exercise meta', fields: [
    { value: 'exercises.primary_muscle', label: 'Primary muscle', type: 'text' },
    { value: 'exercises.movement_pattern', label: 'Movement pattern', enum: ['Push', 'Pull', 'Squat', 'Hinge', 'Fly', 'Isolation'] },
    { value: 'exercises.equipment_type', label: 'Equipment type', enum: ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Smith Machine'] },
    { value: 'exercises.force_vector', label: 'Force vector', enum: ['horizontal', 'vertical', 'diagonal'] },
    { value: 'exercises.bilateral', label: 'Bilateral', enum: ['0', '1'] },
  ]},
]

export const FIELD_BY_VALUE = (() => {
  const m = {}
  for (const g of FIELD_OPTIONS) for (const f of g.fields) m[f.value] = f
  return m
})()

export const OPERATORS = [
  { value: '=', label: '=', needsValue: true },
  { value: '!=', label: '≠', needsValue: true },
  { value: '<', label: '<', needsValue: true, numeric: true },
  { value: '>', label: '>', needsValue: true, numeric: true },
  { value: '<=', label: '≤', needsValue: true, numeric: true },
  { value: '>=', label: '≥', needsValue: true, numeric: true },
  { value: 'IS NULL', label: 'is empty', needsValue: false },
  { value: 'IS NOT NULL', label: 'is set', needsValue: false },
]

export const GROUP_BY_OPTIONS = [
  { value: 'frequency_bucket', label: 'Weekly frequency' },
  { value: 'session_position_bucket', label: 'Session position' },
  { value: 'session_set_order_bucket', label: 'Session set order' },
  { value: 'rir_use', label: 'RIR discipline' },
  { value: 'equipment_type', label: 'Equipment type' },
  { value: 'movement_pattern', label: 'Movement pattern' },
  { value: 'force_vector', label: 'Force vector' },
  { value: 'bilateral', label: 'Bilateral / unilateral' },
  { value: 'experience_level', label: 'Experience level' },
  { value: 'goal', label: 'Goal' },
  { value: 'gender', label: 'Gender' },
  { value: 'age_range', label: 'Age range' },
  { value: 'split_type', label: 'Split type' },
  { value: 'enhancement_status', label: 'Enhancement status' },
  { value: 'physical_labor_level', label: 'Physical labor at work' },
  { value: 'sport_primary', label: 'Primary sport' },
  { value: 'sport_frequency_bucket', label: 'Sport frequency' },
  { value: 'protein_bucket', label: 'Protein intake' },
  { value: 'sleep_quality_quartile', label: 'Sleep quality quartile' },
  { value: 'cardio_load_quartile', label: 'Cardio load quartile' },
  { value: 'rir_bucket', label: 'Proximity to failure (RIR)' },
  { value: 'rest_period_bucket', label: 'Rest period' },
  { value: 'rep_range_bucket', label: 'Rep range' },
  { value: 'sleep_duration_bucket', label: 'Sleep duration' },
  { value: 'stress_bucket', label: 'Stress (logged)' },
  { value: 'nutrition_phase', label: 'Nutrition phase' },
  { value: 'creatine_use', label: 'Creatine use' },
  { value: 'training_age_bucket', label: 'Training age' },
]

// Browseable categories for the Explore "Test relationships with" step.
// Keys reference GROUP_BY_OPTIONS values so labels stay defined in one place.
export const VARIABLE_CATEGORIES = [
  { name: 'Training', keys: ['frequency_bucket', 'rep_range_bucket', 'rir_bucket', 'rest_period_bucket', 'session_position_bucket', 'session_set_order_bucket', 'rir_use', 'equipment_type', 'movement_pattern', 'force_vector', 'bilateral', 'split_type'] },
  { name: 'Lifestyle', keys: ['sleep_duration_bucket', 'sleep_quality_quartile', 'stress_bucket', 'physical_labor_level', 'sport_primary', 'sport_frequency_bucket', 'cardio_load_quartile'] },
  { name: 'Nutrition', keys: ['protein_bucket', 'nutrition_phase', 'creatine_use'] },
  { name: 'Profile', keys: ['experience_level', 'goal', 'gender', 'age_range', 'enhancement_status', 'training_age_bucket'] },
]

export const MEASURE_OPTIONS = [
  { value: 'progression_rate', label: 'Weight progression', units: '%/wk' },
  { value: 'estimated_1rm', label: 'Estimated 1RM', units: 'kg' },
  { value: 'top_set_pct_change', label: 'Percent top-set increase', units: '%' },
  { value: 'logged_1rm', label: 'Logged 1RM', units: 'kg' },
  { value: 'improvement_frequency', label: 'Improvement frequency', units: 'rate' },
  { value: 'recovery_volume_tolerance', label: 'Recovery / volume tolerance', units: 'kg·reps' },
  { value: 'avg_weekly_frequency', label: 'Weekly frequency', units: 'x/wk' },
  { value: 'set_estimated_1rm', label: 'Set estimated 1RM', units: 'kg' },
  { value: 'set_volume_load', label: 'Set volume', units: 'kg x reps' },
  { value: 'set_weight_kg', label: 'Set weight', units: 'kg' },
  { value: 'set_reps', label: 'Set reps', units: 'reps' },
  { value: 'set_rir', label: 'Set RIR', units: 'RIR' },
  { value: 'set_rest_seconds', label: 'Rest before set', units: 'sec' },
  { value: 'volume_load', label: 'Volume load', units: 'kg·reps' },
]

// The Measure step shows only this curated outcome set (mirrors the ConceptC
// prototype). MEASURE_OPTIONS stays broader so saved queries still resolve labels.
export const OUTCOME_OPTIONS = [
  { value: 'progression_rate', label: 'Weight progression', description: 'Tracks whether working weights are rising over qualified training history.' },
  { value: 'top_set_pct_change', label: 'Percent top-set increase', description: 'Normalizes top-set changes against each lifter baseline.' },
  { value: 'estimated_1rm', label: 'Estimated 1RM', description: 'Broader coverage because it uses rep-based estimates.' },
  { value: 'logged_1rm', label: 'Logged 1RM', description: 'Higher accuracy when true maxes are logged, but less population data.' },
  { value: 'improvement_frequency', label: 'Improvement frequency', description: 'Measures how often weight or reps improve, not only slope.' },
  { value: 'recovery_volume_tolerance', label: 'Recovery / volume tolerance', description: 'Advanced signal for how much work users sustain before progress drops.' },
]

// Group-bys whose bucket can be derived directly from a user-profile column.
// We can show the "your bucket" overlay on these without an extra backend call.
export const PERSONAL_BUCKET_FROM_USER = {
  experience_level: u => u.experience_level,
  goal: u => u.goal,
  gender: u => u.gender,
  age_range: u => u.age_range,
  split_type: u => u.split_type,
  enhancement_status: u => u.enhancement_status,
  physical_labor_level: u => u.physical_labor_level,
  sport_primary: u => u.sport_primary || 'none',
  sport_frequency_bucket: u => {
    if (u.sport_sessions_per_week === null || u.sport_sessions_per_week === undefined) return null
    const n = Number(u.sport_sessions_per_week)
    if (n < 2) return '<2/wk'
    if (n < 4) return '2-3/wk'
    return '4+/wk'
  },
  protein_bucket: u => {
    if (u.protein_g_per_kg === null || u.protein_g_per_kg === undefined) return null
    const n = Number(u.protein_g_per_kg)
    if (n < 1.2) return '<1.2g/kg'
    if (n < 1.6) return '1.2-1.6g/kg'
    if (n < 2.2) return '1.6-2.2g/kg'
    return '2.2+g/kg'
  },
  nutrition_phase: u => u.nutrition_phase || null,
  creatine_use: u => u.creatine_use || null,
  stress_bucket: u => u.stress_level || null, // self-report enum matches logged labels
  training_age_bucket: u => {
    if (u.training_age_years === null || u.training_age_years === undefined) return null
    const n = Number(u.training_age_years)
    if (n < 0.5) return '0-6mo'
    if (n < 1) return '6-12mo'
    if (n < 2) return '1-2yr'
    if (n < 4) return '2-4yr'
    if (n < 7) return '4-7yr'
    return '7+yr'
  },
  sleep_duration_bucket: u => {
    if (u.sleep_hours === null || u.sleep_hours === undefined) return null
    const n = Number(u.sleep_hours)
    if (n < 6) return '<6h'
    if (n < 7) return '6-7h'
    if (n < 8) return '7-8h'
    return '8h+'
  },
}

export function prettyBucket(value) {
  if (value === null || value === undefined) return '—'
  const s = String(value)
  return s.replace(/_/g, ' ')
}

export function prettyField(value) {
  return FIELD_BY_VALUE[value]?.label || value
}

export function prettyMeasure(value) {
  return MEASURE_OPTIONS.find(m => m.value === value)?.label || value
}

export function prettyGroupBy(value) {
  return GROUP_BY_OPTIONS.find(g => g.value === value)?.label || value
}

// Build a plain-language headline restating a query.
export function describeQuery({ filters = [], groupBy, measure, exerciseId, exerciseName, muscle }) {
  const m = prettyMeasure(measure)
  const g = prettyGroupBy(groupBy)?.toLowerCase()
  const exBit = exerciseName ? ` for ${exerciseName}` : exerciseId ? ` for ${exerciseId}` : muscle ? ` for ${muscle}` : ''
  const fBits = filters.map(f => {
    const fld = prettyField(f.field).toLowerCase()
    if (f.op === 'IS NULL') return `no ${fld}`
    if (f.op === 'IS NOT NULL') return `any ${fld}`
    return `${fld} ${f.op} ${prettyBucket(f.value)}`
  })
  const filtBit = fBits.length ? ` where ${fBits.join(' and ')}` : ''
  return `${m} by ${g}${exBit}${filtBit}`
}

// "People like me" trait matchers. Each compiles to one or more whitelisted
// filter rows via toFilters, so the cohort runs through the existing /query
// and /scan endpoints with no server changes.
export const PEOPLE_FILTERS = [
  {
    key: 'split_type', label: 'Training split', matchKind: 'exact',
    userValue: u => u?.split_type,
    toFilters: u => (u?.split_type ? [{ field: 'users.split_type', op: '=', value: u.split_type }] : []),
  },
  {
    key: 'experience_level', label: 'Experience level', matchKind: 'exact',
    userValue: u => u?.experience_level,
    toFilters: u => (u?.experience_level ? [{ field: 'users.experience_level', op: '=', value: u.experience_level }] : []),
  },
  {
    key: 'gender', label: 'Sex', matchKind: 'exact',
    userValue: u => u?.gender,
    toFilters: u => (u?.gender ? [{ field: 'users.gender', op: '=', value: u.gender }] : []),
  },
  {
    key: 'enhancement_status', label: 'Enhancement', matchKind: 'exact',
    userValue: u => u?.enhancement_status,
    toFilters: u => (u?.enhancement_status ? [{ field: 'users.enhancement_status', op: '=', value: u.enhancement_status }] : []),
  },
  {
    key: 'age_range', label: 'Age range', matchKind: 'exact',
    userValue: u => u?.age_range,
    toFilters: u => (u?.age_range ? [{ field: 'users.age_range', op: '=', value: u.age_range }] : []),
  },
  {
    key: 'nutrition_phase', label: 'Nutrition phase', matchKind: 'exact',
    userValue: u => u?.nutrition_phase,
    toFilters: u => (u?.nutrition_phase ? [{ field: 'users.nutrition_phase', op: '=', value: u.nutrition_phase }] : []),
  },
  {
    key: 'stress_level', label: 'Stress', matchKind: 'exact',
    userValue: u => u?.stress_level,
    toFilters: u => (u?.stress_level ? [{ field: 'users.stress_level', op: '=', value: u.stress_level }] : []),
  },
  {
    key: 'creatine_use', label: 'Creatine use', matchKind: 'exact',
    userValue: u => u?.creatine_use,
    toFilters: u => (u?.creatine_use ? [{ field: 'users.creatine_use', op: '=', value: u.creatine_use }] : []),
  },
  {
    key: 'runner_status', label: 'Runner status', matchKind: 'exact',
    userValue: u => (u?.sport_primary === 'running' ? 'runner' : 'non-runner'),
    toFilters: u => (u?.sport_primary === 'running'
      ? [{ field: 'users.sport_primary', op: '=', value: 'running' }]
      : [{ field: 'users.sport_primary', op: '!=', value: 'running' }]),
  },
  {
    key: 'training_age_years', label: 'Training age', matchKind: 'number', unit: 'yr', step: 0.5, defaultMinus: 1, defaultPlus: 1,
    userValue: u => (u?.training_age_years != null ? `${u.training_age_years}yr` : null),
    toFilters: (u, value) => {
      if (u?.training_age_years == null) return []
      const minus = value?.minus ?? 1
      const plus = value?.plus ?? 1
      return [
        { field: 'users.training_age_years', op: '>=', value: Math.max(0, u.training_age_years - minus) },
        { field: 'users.training_age_years', op: '<=', value: u.training_age_years + plus },
      ]
    },
  },
  {
    key: 'sleep_hours', label: 'Sleep (self-report)', matchKind: 'number', unit: 'h', step: 0.5, defaultMinus: 1, defaultPlus: 1,
    userValue: u => (u?.sleep_hours != null ? `${u.sleep_hours}h` : null),
    toFilters: (u, value) => {
      if (u?.sleep_hours == null) return []
      const minus = value?.minus ?? 1
      const plus = value?.plus ?? 1
      return [
        { field: 'users.sleep_hours', op: '>=', value: Math.max(0, u.sleep_hours - minus) },
        { field: 'users.sleep_hours', op: '<=', value: u.sleep_hours + plus },
      ]
    },
  },
  {
    key: 'protein_g_per_kg', label: 'Protein intake', matchKind: 'number', unit: 'g/kg', step: 0.1, defaultMinus: 0.3, defaultPlus: 0.3,
    userValue: u => (u?.protein_g_per_kg != null ? `${u.protein_g_per_kg}g/kg` : null),
    toFilters: (u, value) => {
      if (u?.protein_g_per_kg == null) return []
      const minus = value?.minus ?? 0.3
      const plus = value?.plus ?? 0.3
      return [
        { field: 'users.protein_g_per_kg', op: '>=', value: Math.max(0, Math.round((u.protein_g_per_kg - minus) * 10) / 10) },
        { field: 'users.protein_g_per_kg', op: '<=', value: Math.round((u.protein_g_per_kg + plus) * 10) / 10 },
      ]
    },
  },
]

export const PEOPLE_FILTER_BY_KEY = PEOPLE_FILTERS.reduce((acc, f) => ({ ...acc, [f.key]: f }), {})
export const DEFAULT_MATCH_KEYS = ['split_type', 'experience_level', 'gender']

export function defaultMatchValue(filter) {
  if (filter?.matchKind === 'number') return { minus: filter.defaultMinus ?? 1, plus: filter.defaultPlus ?? 1 }
  return null
}

// Compile active People-like-me matches into whitelisted filter rows.
export function peopleToFilters(user, matchKeys = [], matchValues = {}) {
  if (!user) return []
  const out = []
  for (const f of PEOPLE_FILTERS) {
    if (!matchKeys.includes(f.key)) continue
    const value = matchValues[f.key] ?? defaultMatchValue(f)
    out.push(...f.toFilters(user, value))
  }
  return out
}

// Label the shape of a bucket series for the result detail panel.
export function detectPattern(buckets) {
  const vals = (buckets || []).map(b => b.avg_measure).filter(v => v != null)
  if (vals.length < 2) return 'Flat'
  const diffs = []
  for (let i = 1; i < vals.length; i++) diffs.push(vals[i] - vals[i - 1])
  const ups = diffs.filter(d => d > 0).length
  const downs = diffs.filter(d => d < 0).length
  if (downs === 0) return 'Positive'
  if (ups === 0) return 'Negative'
  const maxIdx = vals.indexOf(Math.max(...vals))
  const minIdx = vals.indexOf(Math.min(...vals))
  if (maxIdx > 0 && maxIdx < vals.length - 1) return 'Threshold'
  if (minIdx > 0 && minIdx < vals.length - 1) return 'U-shaped'
  return 'Mixed'
}
