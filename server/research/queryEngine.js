// Flexible research query engine.
// Every column, operator, groupBy axis, and measure is whitelisted.
// User input is never interpolated into SQL — only validated identifiers
// chosen from these maps are spliced in; values go through parameterized binds.

const FIELD_TABLE = {
  // users
  'users.experience_level': 'u.experience_level',
  'users.goal': 'u.goal',
  'users.split_type': 'u.split_type',
  'users.training_age_years': "COALESCE(EXTRACT(EPOCH FROM (now() - u.training_started_at::date::timestamp)) / 31557600, u.training_age_years)",
  'users.training_started_at': 'u.training_started_at',
  'users.gym_type': 'u.gym_type',
  'users.gender': 'u.gender',
  'users.age_range': 'u.age_range',
  'users.enhancement_status': 'u.enhancement_status',
  'users.height_cm': 'u.height_cm',
  'users.bodyweight_kg': 'u.bodyweight_kg',
  'users.sleep_hours': 'u.sleep_hours',
  'users.stress_level': 'u.stress_level',
  'users.nutrition_phase': 'u.nutrition_phase',
  'users.protein_consistency': 'u.protein_consistency',
  'users.protein_g_per_kg': 'u.protein_g_per_kg',
  'users.creatine_use': 'u.creatine_use',
  'users.supplements_json': 'u.supplements_json',
  'users.ethnic_background_json': 'u.ethnic_background_json',
  'users.job_title': 'u.job_title',
  'users.physical_labor_level': 'u.physical_labor_level',
  'users.sport_primary': 'u.sport_primary',
  'users.sport_volume_per_week': 'u.sport_volume_per_week',
  'users.sport_sessions_per_week': 'u.sport_sessions_per_week',
  'users.vo2_max': 'u.vo2_max',
  'users.avg_daily_steps': 'u.avg_daily_steps',
  'users.race_distance': 'u.race_distance',
  'users.country_region': 'u.country_region',
  // user_systemic_profile
  'user_systemic_profile.avg_sleep_duration': 'usp.avg_sleep_duration',
  'user_systemic_profile.avg_sleep_quality': 'usp.avg_sleep_quality',
  'user_systemic_profile.sleep_variance': 'usp.sleep_variance',
  'user_systemic_profile.avg_nutrition_quality': 'usp.avg_nutrition_quality',
  'user_systemic_profile.avg_stress': 'usp.avg_stress',
  'user_systemic_profile.total_cardio_minutes': 'usp.total_cardio_minutes',
  'user_systemic_profile.total_cardio_load': 'usp.total_cardio_load',
  'user_systemic_profile.running_load': 'usp.running_load',
  'user_systemic_profile.cycling_load': 'usp.cycling_load',
  'user_systemic_profile.swimming_load': 'usp.swimming_load',
  'user_systemic_profile.other_cardio_load': 'usp.other_cardio_load',
  'user_systemic_profile.bodyweight_trend': 'usp.bodyweight_trend',
  'user_systemic_profile.data_completeness_score': 'usp.data_completeness_score',
  'user_systemic_profile.training_consistency': 'usp.training_consistency',
  // user_exercise_profile
  'user_exercise_profile.total_sessions': 'uep.total_sessions',
  'user_exercise_profile.weeks_of_data': 'uep.weeks_of_data',
  'user_exercise_profile.avg_weekly_frequency': 'uep.avg_weekly_frequency',
  'user_exercise_profile.avg_session_position': 'uep.avg_session_position',
  'user_exercise_profile.avg_reps': 'uep.avg_reps',
  'user_exercise_profile.avg_weight_kg': 'uep.avg_weight_kg',
  'user_exercise_profile.estimated_1rm': 'uep.estimated_1rm',
  'user_exercise_profile.progression_rate': 'uep.progression_rate',
  'user_exercise_profile.rir_logging_rate': 'uep.rir_logging_rate',
  'user_exercise_profile.qualified': 'uep.qualified',
  // exercises
  'exercises.primary_muscle': 'ex.primary_muscle',
  'exercises.secondary_muscle': 'ex.secondary_muscle',
  'exercises.movement_pattern': 'ex.movement_pattern',
  'exercises.equipment_type': 'ex.equipment_type',
  'exercises.force_vector': 'ex.force_vector',
  'exercises.bilateral': 'ex.bilateral',
  // raw sets
  'sets.session_set_order': 's.session_set_order',
  'sets.session_position': 's.session_position',
  'sets.set_number': 's.set_number',
  'sets.weight_kg': 's.weight_kg',
  'sets.reps': 's.reps',
  'sets.rir': 's.rir',
  'sets.rest_seconds': 's.rest_seconds',
  'sets.failure': 's.failure',
  'sets.pain_flag': 's.pain_flag',
  'sets.set_type': 's.set_type',
  'sets.rom_category': 's.rom_category',
  'sets.tempo_tag': 's.tempo_tag',
}

const SIMPLE_OPS = new Set(['=', '!=', '<', '>', '<=', '>='])
const NULL_OPS = new Set(['IS NULL', 'IS NOT NULL'])
const LIFESTYLE_AXES = new Set([
  'sleep_quality_quartile',
  'cardio_load_quartile',
  'sleep_duration_bucket',
  'stress_bucket',
  'protein_bucket',
  'nutrition_phase',
  'creatine_use',
  'sport_primary',
  'sport_frequency_bucket',
  'physical_labor_level',
])
const MUSCLE_GROUPS = {
  Chest: ['Chest', 'Upper Chest', 'Mid Chest', 'Lower Chest'],
  Back: ['Back', 'Lats', 'Upper Back', 'Lower Back'],
  Shoulders: ['Shoulders', 'Front Delts', 'Side Delts', 'Rear Delts'],
  Core: ['Core', 'Abs', 'Obliques'],
}

// groupBy axis -> { sqlExpr: SQL fragment producing the bucket value, labels: array of bucket labels in order }
// For derived buckets we use CASE WHEN against the underlying column.
const GROUP_AXES = {
  frequency_bucket: {
    sqlExpr: `CASE WHEN uep.avg_weekly_frequency < 1.5 THEN '<1.5/wk'
                   WHEN uep.avg_weekly_frequency < 2.5 THEN '1.5-2.5/wk'
                   ELSE '3+/wk' END`,
    requires: 'uep',
  },
  session_position_bucket: {
    sqlExpr: `CASE WHEN uep.avg_session_position <= 1.5 THEN 'first'
                   WHEN uep.avg_session_position <= 3 THEN 'mid'
                   ELSE 'later' END`,
    requires: 'uep',
  },
  session_set_order_bucket: {
    sqlExpr: `CASE WHEN s.session_set_order BETWEEN 1 AND 3 THEN '1-3'
                   WHEN s.session_set_order BETWEEN 4 AND 6 THEN '4-6'
                   WHEN s.session_set_order BETWEEN 7 AND 9 THEN '7-9'
                   WHEN s.session_set_order >= 10 THEN '10+'
                   ELSE NULL END`,
    orderExpr: `CASE WHEN s.session_set_order BETWEEN 1 AND 3 THEN 1
                     WHEN s.session_set_order BETWEEN 4 AND 6 THEN 2
                     WHEN s.session_set_order BETWEEN 7 AND 9 THEN 3
                     WHEN s.session_set_order >= 10 THEN 4
                     ELSE NULL END`,
    requires: 'set',
  },
  rir_use: {
    sqlExpr: `CASE WHEN uep.rir_logging_rate > 0.7 THEN 'logs_rir'
                   ELSE 'no_rir' END`,
    requires: 'uep',
  },
  equipment_type: { sqlExpr: 'ex.equipment_type', requires: 'ex' },
  movement_pattern: { sqlExpr: 'ex.movement_pattern', requires: 'ex' },
  force_vector: { sqlExpr: 'ex.force_vector', requires: 'ex' },
  bilateral: { sqlExpr: `CASE WHEN ex.bilateral = 1 THEN 'bilateral' ELSE 'unilateral' END`, requires: 'ex' },
  experience_level: { sqlExpr: 'u.experience_level', requires: 'u' },
  goal: { sqlExpr: 'u.goal', requires: 'u' },
  gender: { sqlExpr: 'u.gender', requires: 'u' },
  age_range: { sqlExpr: 'u.age_range', requires: 'u' },
  split_type: { sqlExpr: 'u.split_type', requires: 'u' },
  enhancement_status: { sqlExpr: 'u.enhancement_status', requires: 'u' },
  physical_labor_level: { sqlExpr: 'u.physical_labor_level', requires: 'u' },
  sport_primary: { sqlExpr: `COALESCE(u.sport_primary, 'none')`, requires: 'u' },
  sport_frequency_bucket: {
    sqlExpr: `CASE WHEN u.sport_sessions_per_week IS NULL THEN NULL
                   WHEN u.sport_sessions_per_week < 2 THEN '<2/wk'
                   WHEN u.sport_sessions_per_week < 4 THEN '2-3/wk'
                   ELSE '4+/wk' END`,
    orderExpr: `CASE WHEN u.sport_sessions_per_week IS NULL THEN NULL
                     WHEN u.sport_sessions_per_week < 2 THEN 1
                     WHEN u.sport_sessions_per_week < 4 THEN 2
                     ELSE 3 END`,
    requires: 'u',
  },
  protein_bucket: {
    sqlExpr: `CASE WHEN u.protein_g_per_kg IS NULL THEN NULL
                   WHEN u.protein_g_per_kg < 1.2 THEN '<1.2g/kg'
                   WHEN u.protein_g_per_kg < 1.6 THEN '1.2-1.6g/kg'
                   WHEN u.protein_g_per_kg < 2.2 THEN '1.6-2.2g/kg'
                   ELSE '2.2+g/kg' END`,
    orderExpr: `CASE WHEN u.protein_g_per_kg IS NULL THEN NULL
                     WHEN u.protein_g_per_kg < 1.2 THEN 1
                     WHEN u.protein_g_per_kg < 1.6 THEN 2
                     WHEN u.protein_g_per_kg < 2.2 THEN 3
                     ELSE 4 END`,
    requires: 'u',
  },
  sleep_quality_quartile: {
    sqlExpr: `CASE WHEN usp.avg_sleep_quality IS NULL THEN NULL
                   WHEN usp.avg_sleep_quality < 2 THEN 'Q1_poor'
                   WHEN usp.avg_sleep_quality < 3 THEN 'Q2'
                   WHEN usp.avg_sleep_quality < 4 THEN 'Q3'
                   ELSE 'Q4_excellent' END`,
    requires: 'usp',
  },
  cardio_load_quartile: {
    sqlExpr: `CASE WHEN usp.total_cardio_load IS NULL THEN NULL
                   WHEN usp.total_cardio_load < 50 THEN 'Q1_low'
                   WHEN usp.total_cardio_load < 150 THEN 'Q2'
                   WHEN usp.total_cardio_load < 300 THEN 'Q3'
                   ELSE 'Q4_high' END`,
    requires: 'usp',
  },
  rir_bucket: {
    sqlExpr: `CASE WHEN s.rir IS NULL THEN NULL
                   WHEN s.rir <= 0 THEN '0 (failure)'
                   WHEN s.rir = 1 THEN '1'
                   WHEN s.rir = 2 THEN '2'
                   WHEN s.rir = 3 THEN '3'
                   ELSE '4+' END`,
    orderExpr: `CASE WHEN s.rir IS NULL THEN NULL
                     WHEN s.rir <= 0 THEN 0
                     WHEN s.rir >= 4 THEN 4
                     ELSE s.rir END`,
    requires: 'set',
  },
  rest_period_bucket: {
    sqlExpr: `CASE WHEN s.rest_seconds IS NULL THEN NULL
                   WHEN s.rest_seconds < 60 THEN '<60s'
                   WHEN s.rest_seconds < 120 THEN '60-120s'
                   WHEN s.rest_seconds < 180 THEN '2-3min'
                   WHEN s.rest_seconds < 300 THEN '3-5min'
                   ELSE '5min+' END`,
    orderExpr: `CASE WHEN s.rest_seconds IS NULL THEN NULL
                     WHEN s.rest_seconds < 60 THEN 1
                     WHEN s.rest_seconds < 120 THEN 2
                     WHEN s.rest_seconds < 180 THEN 3
                     WHEN s.rest_seconds < 300 THEN 4
                     ELSE 5 END`,
    requires: 'set',
  },
  rep_range_bucket: {
    sqlExpr: `CASE WHEN s.reps IS NULL THEN NULL
                   WHEN s.reps <= 3 THEN '1-3'
                   WHEN s.reps <= 6 THEN '4-6'
                   WHEN s.reps <= 10 THEN '7-10'
                   WHEN s.reps <= 15 THEN '11-15'
                   ELSE '16+' END`,
    orderExpr: `CASE WHEN s.reps IS NULL THEN NULL
                     WHEN s.reps <= 3 THEN 1
                     WHEN s.reps <= 6 THEN 2
                     WHEN s.reps <= 10 THEN 3
                     WHEN s.reps <= 15 THEN 4
                     ELSE 5 END`,
    requires: 'set',
  },
  sleep_duration_bucket: {
    sqlExpr: `CASE WHEN usp.avg_sleep_duration IS NULL THEN NULL
                   WHEN usp.avg_sleep_duration < 6 THEN '<6h'
                   WHEN usp.avg_sleep_duration < 7 THEN '6-7h'
                   WHEN usp.avg_sleep_duration < 8 THEN '7-8h'
                   ELSE '8h+' END`,
    orderExpr: `CASE WHEN usp.avg_sleep_duration IS NULL THEN NULL
                     WHEN usp.avg_sleep_duration < 6 THEN 1
                     WHEN usp.avg_sleep_duration < 7 THEN 2
                     WHEN usp.avg_sleep_duration < 8 THEN 3
                     ELSE 4 END`,
    requires: 'usp',
  },
  stress_bucket: {
    sqlExpr: `CASE WHEN usp.avg_stress IS NULL THEN NULL
                   WHEN usp.avg_stress < 2 THEN 'low'
                   WHEN usp.avg_stress < 3.5 THEN 'moderate'
                   ELSE 'high' END`,
    orderExpr: `CASE WHEN usp.avg_stress IS NULL THEN NULL
                     WHEN usp.avg_stress < 2 THEN 1
                     WHEN usp.avg_stress < 3.5 THEN 2
                     ELSE 3 END`,
    requires: 'usp',
  },
  nutrition_phase: { sqlExpr: 'u.nutrition_phase', requires: 'u' },
  creatine_use: { sqlExpr: 'u.creatine_use', requires: 'u' },
  training_age_bucket: {
    sqlExpr: `CASE WHEN u.training_age_years IS NULL THEN NULL
                   WHEN u.training_age_years < 0.5 THEN '0-6mo'
                   WHEN u.training_age_years < 1 THEN '6-12mo'
                   WHEN u.training_age_years < 2 THEN '1-2yr'
                   WHEN u.training_age_years < 4 THEN '2-4yr'
                   WHEN u.training_age_years < 7 THEN '4-7yr'
                   ELSE '7+yr' END`,
    orderExpr: `CASE WHEN u.training_age_years IS NULL THEN NULL
                     WHEN u.training_age_years < 0.5 THEN 1
                     WHEN u.training_age_years < 1 THEN 2
                     WHEN u.training_age_years < 2 THEN 3
                     WHEN u.training_age_years < 4 THEN 4
                     WHEN u.training_age_years < 7 THEN 5
                     ELSE 6 END`,
    requires: 'u',
  },
}

const MEASURES = {
  progression_rate: { sqlExpr: 'uep.progression_rate', requires: 'uep' },
  estimated_1rm: { sqlExpr: 'uep.estimated_1rm', requires: 'uep' },
  top_set_pct_change: { sqlExpr: 'uep.top_set_pct_change', requires: 'uep' },
  logged_1rm: { sqlExpr: 'uep.logged_1rm', requires: 'uep' },
  improvement_frequency: { sqlExpr: 'uep.improvement_frequency', requires: 'uep' },
  recovery_volume_tolerance: { sqlExpr: 'uep.recovery_volume_tolerance', requires: 'uep' },
  avg_weekly_frequency: { sqlExpr: 'uep.avg_weekly_frequency', requires: 'uep' },
  volume_load: { sqlExpr: 'uep.avg_weight_kg * uep.avg_reps * uep.avg_weekly_frequency', requires: 'uep' },
  set_estimated_1rm: { sqlExpr: 's.weight_kg * (1 + s.reps / 30.0)', requires: 'set' },
  set_volume_load: { sqlExpr: 's.weight_kg * s.reps', requires: 'set' },
  set_weight_kg: { sqlExpr: 's.weight_kg', requires: 'set' },
  set_reps: { sqlExpr: 's.reps', requires: 'set' },
  set_rir: { sqlExpr: 's.rir', requires: 'set' },
  set_rest_seconds: { sqlExpr: 's.rest_seconds', requires: 'set' },
}

function validateFilter(f) {
  if (!f || typeof f !== 'object') return { error: 'Filter must be an object' }
  const col = FIELD_TABLE[f.field]
  if (!col) return { error: `Field not allowed: ${f.field}` }
  const op = String(f.op || '').toUpperCase()
  if (SIMPLE_OPS.has(op)) {
    if (f.value === null || f.value === undefined) return { error: `Operator ${op} requires a value` }
    return { col, op, value: f.value, kind: 'simple' }
  }
  if (op === 'IN') {
    if (!Array.isArray(f.value) || f.value.length === 0) return { error: 'IN requires non-empty array' }
    if (f.value.length > 50) return { error: 'IN list too long' }
    return { col, op, value: f.value, kind: 'in' }
  }
  if (NULL_OPS.has(op)) {
    return { col, op, kind: 'null' }
  }
  return { error: `Operator not allowed: ${op}` }
}

function evidenceStatus(n) {
  if (n >= 100) return 'Strong'
  if (n >= 30) return 'Good'
  if (n >= 10) return 'Sparse'
  if (n > 0) return 'Not enough'
  return 'Not enough'
}

function confidenceFor(n) {
  if (n >= 100) return 86
  if (n >= 30) return Math.max(52, Math.min(78, Math.round(n * 1.4)))
  if (n >= 10) return Math.max(28, Math.min(48, Math.round(n * 2.4)))
  return 0
}

function effectiveMinCohort(requested, { groupBy, expressions = [] } = {}) {
  const raw = Number.isInteger(requested) ? requested : 10
  const requiresLifestyle = (groupBy && LIFESTYLE_AXES.has(groupBy)) || expressions.some(expr => requiresAlias(expr, 'usp'))
  return Math.max(raw, requiresLifestyle ? 30 : 10)
}

function muscleWhereParts(muscle) {
  const values = MUSCLE_GROUPS[muscle] || [String(muscle).slice(0, 40)]
  if (values.length === 1) return { sql: 'ex.primary_muscle = ?', params: values }
  return { sql: `ex.primary_muscle IN (${values.map(() => '?').join(',')})`, params: values }
}

function requiresAlias(expr, alias) {
  return typeof expr === 'string' && expr.includes(`${alias}.`)
}

function buildBaseFrom({ needsExercise, needsSet, needsUep, needsUsp }) {
  const joins = needsSet
    ? [
        'FROM sets s',
        'JOIN workouts w ON w.id = s.workout_id',
        'JOIN users u ON u.id = s.user_id',
      ]
    : [
        'FROM users u',
        'JOIN user_exercise_profile uep ON uep.user_id = u.id',
      ]

  if (needsSet && needsUep) {
    joins.push(`LEFT JOIN user_exercise_profile uep
      ON uep.user_id = s.user_id
     AND uep.exercise_id = s.exercise_id
     AND uep.week = (
       SELECT MAX(uep2.week)
         FROM user_exercise_profile uep2
        WHERE uep2.user_id = s.user_id
          AND uep2.exercise_id = s.exercise_id
     )`)
  }
  if (needsUsp) {
    joins.push(needsSet
      ? `LEFT JOIN user_systemic_profile usp
          ON usp.user_id = s.user_id
         AND usp.week = (
           SELECT MAX(usp2.week)
             FROM user_systemic_profile usp2
            WHERE usp2.user_id = s.user_id
         )`
      : 'LEFT JOIN user_systemic_profile usp ON usp.user_id = u.id AND usp.week = uep.week')
  }
  if (needsExercise) joins.push(`JOIN exercises ex ON ex.id = ${needsSet ? 's' : 'uep'}.exercise_id`)
  return joins.join('\n')
}

async function runQuery(db, opts) {
  const filters = Array.isArray(opts.filters) ? opts.filters : []
  const groupBy = opts.groupBy
  const measureKey = opts.measure
  const exerciseId = opts.exerciseId
  const muscle = opts.muscle

  if (!GROUP_AXES[groupBy]) return { error: `groupBy not allowed: ${groupBy}` }
  if (!MEASURES[measureKey]) return { error: `measure not allowed: ${measureKey}` }

  const axis = GROUP_AXES[groupBy]
  const measure = MEASURES[measureKey]

  const cleanedFilters = []
  const params = []
  for (const raw of filters) {
    const cf = validateFilter(raw)
    if (cf.error) return { error: cf.error }
    cleanedFilters.push(cf)
  }

  const expressions = [
    axis.sqlExpr,
    axis.orderExpr,
    measure.sqlExpr,
    ...cleanedFilters.map(f => f.col),
  ].filter(Boolean)
  const minCohort = effectiveMinCohort(opts.minCohort, { groupBy, expressions })
  const needsSet = axis.requires === 'set' || measure.requires === 'set' || expressions.some(expr => requiresAlias(expr, 's'))
  const needsUep = axis.requires === 'uep' || measure.requires === 'uep' || expressions.some(expr => requiresAlias(expr, 'uep')) || (!needsSet && !measure.requires)
  const needsUsp = axis.requires === 'usp' || measure.requires === 'usp' || expressions.some(expr => requiresAlias(expr, 'usp'))
  const needsExercise = axis.requires === 'ex' || expressions.some(expr => requiresAlias(expr, 'ex')) || !!exerciseId || !!muscle
  const from = buildBaseFrom({ needsExercise, needsSet, needsUep, needsUsp })

  const whereParts = ['u.research_opt_in = 1']
  for (const f of cleanedFilters) {
    if (f.kind === 'simple') {
      whereParts.push(`${f.col} ${f.op} ?`)
      params.push(f.value)
    } else if (f.kind === 'in') {
      const placeholders = f.value.map(() => '?').join(',')
      whereParts.push(`${f.col} IN (${placeholders})`)
      params.push(...f.value)
    } else {
      whereParts.push(`${f.col} ${f.op}`)
    }
  }
  if (exerciseId) {
    whereParts.push(`${needsSet ? 's' : 'uep'}.exercise_id = ?`)
    params.push(String(exerciseId).slice(0, 64))
  }
  if (muscle) {
    const muscleWhere = muscleWhereParts(muscle)
    whereParts.push(muscleWhere.sql)
    params.push(...muscleWhere.params)
  }
  // Require the measure to be non-null so AVG/COUNT are honest
  whereParts.push(`${measure.sqlExpr} IS NOT NULL`)
  whereParts.push(`${axis.sqlExpr} IS NOT NULL`)

  const bucketOrderSelect = axis.orderExpr ? `,\n           MIN(${axis.orderExpr}) AS bucket_order` : ''
  const bucketOrderSort = axis.orderExpr ? 'bucket_order ASC, bucket ASC' : 'bucket ASC'
  const groupSql = `
    SELECT ${axis.sqlExpr} AS bucket,
           COUNT(DISTINCT u.id) AS n,
           AVG(${measure.sqlExpr}) AS avg_measure,
           AVG(${measure.sqlExpr} * ${measure.sqlExpr}) AS mean_sq
           ${bucketOrderSelect}
      ${from}
      WHERE ${whereParts.join(' AND ')}
      GROUP BY bucket
      HAVING COUNT(DISTINCT u.id) >= ?
      ORDER BY ${bucketOrderSort}
  `
  const groupParams = [...params, minCohort]
  const cohortSql = `SELECT COUNT(DISTINCT u.id) AS n ${from} WHERE ${whereParts.join(' AND ')}`

  let rows, totalCohort
  try {
    rows = (await db.appQuery(groupSql, groupParams)).rows
    totalCohort = (await db.appQuery(cohortSql, params)).rows[0].n
  } catch (err) {
    // DB error text can leak schema/SQL internals — log it, never return it.
    console.error('[research] query failed:', err.message)
    return { error: 'Query failed' }
  }

  return {
    buckets: rows.map(r => {
      const variance = r.avg_measure === null || r.mean_sq === null
        ? null
        : Math.max(0, r.mean_sq - r.avg_measure * r.avg_measure)
      return {
        label: r.bucket,
        n: r.n,
        avg_measure: r.avg_measure === null ? null : Math.round(r.avg_measure * 10000) / 10000,
        sd: variance === null ? null : Math.round(Math.sqrt(variance) * 10000) / 10000,
      }
    }),
    totalCohortSize: totalCohort,
    minCohort,
  }
}

async function previewQuery(db, opts) {
  const filters = Array.isArray(opts.filters) ? opts.filters : []
  // Each axis fires two aggregate queries; dedupe + cap (matching /scan's
  // limit) so a hostile payload can't fan out unbounded work.
  const groupBys = Array.isArray(opts.groupBys)
    ? [...new Set(opts.groupBys.filter(Boolean))].slice(0, 24)
    : []
  const measureKey = opts.measure
  const exerciseId = opts.exerciseId
  const muscle = opts.muscle

  if (!MEASURES[measureKey]) return { error: `measure not allowed: ${measureKey}` }
  const measure = MEASURES[measureKey]

  const cleanedFilters = []
  const params = []
  for (const raw of filters) {
    const cf = validateFilter(raw)
    if (cf.error) return { error: cf.error }
    cleanedFilters.push(cf)
  }

  const allExpressions = [
    measure.sqlExpr,
    ...cleanedFilters.map(f => f.col),
    ...groupBys.flatMap(key => GROUP_AXES[key] ? [GROUP_AXES[key].sqlExpr, GROUP_AXES[key].orderExpr] : []),
  ].filter(Boolean)
  const needsSet = measure.requires === 'set' || allExpressions.some(expr => requiresAlias(expr, 's'))
  const needsUep = measure.requires === 'uep' || allExpressions.some(expr => requiresAlias(expr, 'uep')) || !needsSet
  const needsUsp = measure.requires === 'usp' || allExpressions.some(expr => requiresAlias(expr, 'usp'))
  const needsExercise = allExpressions.some(expr => requiresAlias(expr, 'ex')) || !!exerciseId || !!muscle
  const from = buildBaseFrom({ needsExercise, needsSet, needsUep, needsUsp })

  const whereParts = ['u.research_opt_in = 1']
  for (const f of cleanedFilters) {
    if (f.kind === 'simple') {
      whereParts.push(`${f.col} ${f.op} ?`)
      params.push(f.value)
    } else if (f.kind === 'in') {
      const placeholders = f.value.map(() => '?').join(',')
      whereParts.push(`${f.col} IN (${placeholders})`)
      params.push(...f.value)
    } else {
      whereParts.push(`${f.col} ${f.op}`)
    }
  }
  if (exerciseId) {
    whereParts.push(`${needsSet ? 's' : 'uep'}.exercise_id = ?`)
    params.push(String(exerciseId).slice(0, 64))
  }
  if (muscle) {
    const muscleWhere = muscleWhereParts(muscle)
    whereParts.push(muscleWhere.sql)
    params.push(...muscleWhere.params)
  }
  whereParts.push(`${measure.sqlExpr} IS NOT NULL`)

  const countSql = `SELECT COUNT(DISTINCT u.id) AS n ${from} WHERE ${whereParts.join(' AND ')}`
  let baseMatchedUsers = 0
  try {
    baseMatchedUsers = (await db.appQuery(countSql, params)).rows[0].n || 0
  } catch (err) {
    console.error('[research] preview failed:', err.message)
    return { error: 'Preview failed' }
  }

  const variables = await Promise.all(groupBys.map(async groupBy => {
    const axis = GROUP_AXES[groupBy]
    if (!axis) return { groupBy, available: false, error: `groupBy not allowed: ${groupBy}` }
    const result = await runQuery(db, { ...opts, groupBy, filters })
    if (result.error) return { groupBy, available: false, error: result.error, detail: result.detail }
    const after = result.totalCohortSize || 0
    const beforeTier = evidenceStatus(baseMatchedUsers)
    const afterTier = evidenceStatus(after)
    return {
      groupBy,
      available: after >= result.minCohort,
      before: baseMatchedUsers,
      after,
      removed: Math.max(0, baseMatchedUsers - after),
      evidenceStatus: afterTier,
      confidence: confidenceFor(after),
      minCohort: result.minCohort,
      crossesThreshold: beforeTier !== afterTier || after < result.minCohort,
    }
  }))
  const biggestReducer = variables
    .filter(v => v.available !== false)
    .sort((a, b) => (b.removed || 0) - (a.removed || 0))[0] || null

  return {
    baseMatchedUsers,
    evidenceStatus: evidenceStatus(baseMatchedUsers),
    confidence: confidenceFor(baseMatchedUsers),
    variables,
    biggestReducer,
  }
}

module.exports = {
  runQuery,
  previewQuery,
  FIELD_TABLE,
  GROUP_AXES,
  MEASURES,
  evidenceStatus,
  confidenceFor,
  effectiveMinCohort,
}
