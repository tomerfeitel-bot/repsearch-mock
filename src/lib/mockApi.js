// In-memory mock backend for the design sandbox.
// Activated when VITE_MOCK is set (see api.js). Replaces the whole Express/SQLite
// backend with a stateful in-memory store so the app runs with realistic data and
// no server. Writes mutate the store for the session and reset on page refresh.
//
// Response shapes mirror the real routes in server/routes/* so component code is
// untouched. When a route isn't modelled here, the catch-all returns a benign
// empty-ish object so nothing throws.

import { SEED_EXERCISES } from './exercises.js'

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
let idCounter = 1000
const uid = (prefix = 'm') => `${prefix}_${(idCounter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`
const nowIso = () => new Date().toISOString()
const dayIso = (offsetDays = 0) => {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  return d.toISOString().slice(0, 10)
}
const round = (n, p = 1) => Number(n.toFixed(p))

// Deterministic-ish pseudo random so reloads look stable-ish but varied.
function rand(min, max) { return min + Math.random() * (max - min) }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

const EX_BY_ID = new Map(SEED_EXERCISES.map(e => [e.id, e]))
const exName = id => EX_BY_ID.get(id)?.name || id
const exMuscle = id => EX_BY_ID.get(id)?.primary_muscle || 'Chest'
const exEquip = id => EX_BY_ID.get(id)?.equipment_type || 'Barbell'

const MUSCLE_TO_SPLIT = {
  Chest: 'Push', 'Upper Chest': 'Push', 'Mid Chest': 'Push', 'Lower Chest': 'Push',
  Shoulders: 'Push', 'Front Delts': 'Push', 'Side Delts': 'Push', Triceps: 'Push',
  Back: 'Pull', Lats: 'Pull', 'Upper Back': 'Pull', 'Lower Back': 'Pull', Traps: 'Pull',
  'Rear Delts': 'Pull', Biceps: 'Pull', Forearms: 'Pull',
  Quads: 'Legs', Hamstrings: 'Legs', Glutes: 'Legs', Calves: 'Legs', Adductors: 'Legs', Abductors: 'Legs',
}
const splitOf = m => MUSCLE_TO_SPLIT[m] || 'Other'
const estimate1rm = (w, r) => round(w * (1 + r / 30), 1)

// ---------------------------------------------------------------------------
// seed: user
// ---------------------------------------------------------------------------
const ME = {
  id: 'me',
  email: 'you@repsearch.app',
  username: 'tomer',
  onboarded: 1,
  is_private: 0,
  research_opt_in: 1,
  bio: 'Intermediate lifter chasing a 4-plate deadlift. PPL, 5x/week.',
  goal: 'hypertrophy',
  gender: 'man',
  experience_level: 'intermediate',
  split_type: 'Push/Pull/Legs',
  enhancement_status: 'natural',
  preferred_units: 'kg',
  height_cm: 180,
  bodyweight_kg: 82,
  date_of_birth: '1996-04-12',
  age_range: '25_34',
  training_started_at: '2019-09-01',
  training_age_years: 5.7,
  gym_type: 'commercial',
  sleep_hours: 7.5,
  stress_level: 'moderate',
  nutrition_phase: 'bulk',
  protein_consistency: 'consistent',
  protein_g_per_kg: 1.9,
  creatine_use: 'yes',
  sport_primary: 'none',
  physical_labor_level: 'sedentary',
  avg_daily_steps: 8500,
  supplements_json: JSON.stringify([
    { key: 'creatine', amount: 5, unit: 'g', frequency: 'daily' },
    { key: 'protein_powder', frequency: 'daily' },
    { key: 'vitamin_d', amount: 2000, unit: 'IU', frequency: 'daily' },
  ]),
  public_fields_json: JSON.stringify(['sleep', 'nutrition', 'supplements', 'split', 'measurements']),
  split_days_json: JSON.stringify([
    { day: 'Mon', type: 'Push' }, { day: 'Tue', type: 'Pull' }, { day: 'Wed', type: 'Legs' },
    { day: 'Thu', type: 'Push' }, { day: 'Fri', type: 'Pull' }, { day: 'Sat', type: 'Legs' },
  ]),
  created_at: '2024-01-15T08:00:00Z',
}

const OTHER_USERS = [
  { id: 'u_lena', username: 'lena_lifts' },
  { id: 'u_marco', username: 'marco_pr' },
  { id: 'u_sana', username: 'sana_strong' },
  { id: 'u_dev', username: 'devliftson' },
  { id: 'u_kai', username: 'kai_hypertrophy' },
]

// ---------------------------------------------------------------------------
// seed: workouts + sets (last ~10 weeks of PPL)
// ---------------------------------------------------------------------------
const DAY_TEMPLATES = {
  Push: [
    { id: 'bench_barbell', base: 80 }, { id: 'bench_incline_dumbbell', base: 30 },
    { id: 'press_dumbbell_shoulder', base: 24 }, { id: 'raise_lateral', base: 12 },
    { id: 'pushdown_rope', base: 25 },
  ],
  Pull: [
    { id: 'deadlift', base: 140 }, { id: 'pulldown_lat', base: 65 },
    { id: 'row_cable', base: 60 }, { id: 'curl_dumbbell', base: 16 }, { id: 'facepull', base: 20 },
  ],
  Legs: [
    { id: 'squat_barbell', base: 110 }, { id: 'rdl', base: 90 },
    { id: 'leg_press', base: 200 }, { id: 'curl_lying', base: 45 }, { id: 'raise_calf_standing', base: 90 },
  ],
}
const DAY_CYCLE = ['Push', 'Pull', 'Legs']

function buildWorkoutHistory() {
  const workouts = []
  let cycle = 0
  // ~3 sessions/week for 10 weeks, newest first when we sort later
  for (let week = 9; week >= 0; week -= 1) {
    for (let s = 0; s < 3; s += 1) {
      const day = DAY_CYCLE[cycle % 3]
      cycle += 1
      const offset = week * 7 + (6 - s * 2)
      const date = dayIso(offset)
      const createdAt = `${date}T18:${10 + s * 5}:00Z`
      const wId = uid('w')
      const progress = (9 - week) // weeks of progression
      const sets = []
      let pos = 0
      for (const item of DAY_TEMPLATES[day]) {
        pos += 1
        const muscle = exMuscle(item.id)
        const setCount = 3
        for (let n = 0; n < setCount; n += 1) {
          const weight = round(item.base + progress * (item.base * 0.012) + n * 0, 1)
          const reps = 8 - n + Math.round(rand(0, 2))
          sets.push({
            id: uid('s'),
            workout_id: wId,
            user_id: ME.id,
            exercise_id: item.id,
            exercise_name: exName(item.id),
            primary_muscle: muscle,
            equipment_type: exEquip(item.id),
            set_number: n + 1,
            session_position: pos,
            session_set_order: sets.length + 1,
            set_type: 'working',
            weight_kg: weight,
            reps,
            rir: pick([1, 2, 2, 3]),
            failure: 0,
            rom_category: 'full',
            pain_flag: 0,
          })
        }
      }
      workouts.push({
        id: wId,
        user_id: ME.id,
        username: ME.username,
        date,
        created_at: createdAt,
        start_time: createdAt,
        duration_min: 55 + Math.round(rand(-8, 20)),
        workout_day: day,
        workout_split_type: day,
        program_id: null,
        template_id: null,
        run_classification: 'exact',
        session_effort: pick([6, 7, 7, 8]),
        feel_rating: pick([3, 4, 4, 5]),
        visibility: 'public',
        sets,
        set_count: sets.length,
        exercise_count: DAY_TEMPLATES[day].length,
      })
    }
  }
  // newest first
  workouts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.created_at < b.created_at ? 1 : -1)))
  return workouts
}

// ---------------------------------------------------------------------------
// seed: PRs
// ---------------------------------------------------------------------------
function buildPRs() {
  const defs = [
    { exercise_id: 'bench_barbell', weight_kg: 100, reps: 3 },
    { exercise_id: 'squat_barbell', weight_kg: 140, reps: 2 },
    { exercise_id: 'deadlift', weight_kg: 180, reps: 1 },
    { exercise_id: 'press_ohp', weight_kg: 62.5, reps: 4 },
    { exercise_id: 'pulldown_lat', weight_kg: 85, reps: 8 },
    { exercise_id: 'rdl', weight_kg: 120, reps: 6 },
  ]
  return defs.map((d, i) => ({
    id: uid('pr'),
    user_id: ME.id,
    exercise_id: d.exercise_id,
    exercise_name: exName(d.exercise_id),
    primary_muscle: exMuscle(d.exercise_id),
    equipment_type: exEquip(d.exercise_id),
    weight_kg: d.weight_kg,
    reps: d.reps,
    date: dayIso(i * 6 + 2),
    estimated_1rm: estimate1rm(d.weight_kg, d.reps),
  }))
}

// ---------------------------------------------------------------------------
// seed: body metrics history
// ---------------------------------------------------------------------------
function buildBodyHistory() {
  const rows = []
  for (let i = 0; i < 12; i += 1) {
    const date = dayIso(i * 7)
    rows.push({
      id: uid('bm'),
      user_id: ME.id,
      date,
      created_at: `${date}T07:30:00Z`,
      bodyweight_kg: round(82 - i * 0.25, 1),
      arm_cm: round(40 - i * 0.08, 1),
      chest_cm: round(106 - i * 0.1, 1),
      waist_cm: round(82 + i * 0.05, 1),
      thigh_cm: round(60 - i * 0.06, 1),
      calf_cm: round(39 - i * 0.02, 1),
    })
  }
  return rows // newest first (i=0 is today)
}

// ---------------------------------------------------------------------------
// seed: daily logs
// ---------------------------------------------------------------------------
function buildDailyLogs() {
  const logs = []
  for (let i = 1; i < 60; i += 1) {
    if (Math.random() < 0.3) continue
    const date = dayIso(i)
    logs.push({
      id: uid('dl'),
      user_id: ME.id,
      date,
      mood: pick([3, 3, 4, 4, 5]),
      sleep_quality: pick([2, 3, 3, 4, 4, 5]),
      sleep_hours: round(rand(6, 8.5), 1),
      energy: pick([3, 3, 4, 4, 5]),
      soreness: pick([1, 2, 2, 3]),
      stress: pick([1, 2, 2, 3, 3]),
      nutrition_quality: pick([3, 3, 4, 4, 5]),
      hydration: pick([2, 3, 3, 4]),
      notes: '',
      created_at: `${date}T08:00:00Z`,
    })
  }
  return logs
}

// ---------------------------------------------------------------------------
// seed: posts + comments
// ---------------------------------------------------------------------------
function buildPosts() {
  const mk = (over) => ({
    id: uid('p'),
    kind: 'discussion',
    title: '',
    body: '',
    user_id: 'u_lena',
    username: 'lena_lifts',
    labels: [],
    score: 0,
    comment_count: 0,
    visibility: 'public',
    created_at: nowIso(),
    viewer_vote: 0,
    saved: false,
    attachment: null,
    _comments: [],
    ...over,
  })
  const posts = [
    mk({
      kind: 'discussion', user_id: 'u_marco', username: 'marco_pr',
      title: 'Is 3-5 min rest actually worth it for hypertrophy?',
      body: "Been resting ~90s forever. Tried 3 min between compound sets this block and my top sets jumped. Curious what the data says vs broscience.",
      labels: ['Hypertrophy', 'Recovery'], score: 142, comment_count: 2, created_at: dayIso(0) + 'T09:12:00Z',
      _comments: [
        { body: 'Longer rest = more reps at the same load = more stimulus. Pretty well supported now.', username: 'sana_strong', user_id: 'u_sana', score: 31 },
        { body: 'I split the difference: 3 min on compounds, 60-90s on isolation.', username: 'kai_hypertrophy', user_id: 'u_kai', score: 12 },
      ],
    }),
    mk({
      kind: 'workout', user_id: ME.id, username: ME.username,
      title: '', body: 'Push day felt unreal today. Incline finally moving.',
      labels: ['Push'], score: 64, comment_count: 1, created_at: dayIso(1) + 'T19:40:00Z',
      attachment: { id: 'wkx', duration_min: 62, workout_day: 'Push', exercise_count: 5, set_count: 16 },
      _comments: [{ body: 'Strong session 💪', username: 'lena_lifts', user_id: 'u_lena', score: 4 }],
    }),
    mk({
      kind: 'study', user_id: 'u_sana', username: 'sana_strong',
      title: 'Sleep quality vs bench progression — receipts',
      body: 'Pulled this from my logged weeks. Q4 sleepers progress noticeably faster.',
      labels: ['Sleep', 'Evidence'], score: 98, comment_count: 0, created_at: dayIso(2) + 'T11:05:00Z',
      attachment: {
        mode: 'single', groupBy: 'sleep_quality_quartile', measure: 'progression_rate', totalCohortSize: 214,
        buckets: [
          { label: 'Q1_poor', n: 41, avg_measure: 0.34, sd: 0.2 },
          { label: 'Q2', n: 58, avg_measure: 0.51, sd: 0.22 },
          { label: 'Q3', n: 66, avg_measure: 0.69, sd: 0.21 },
          { label: 'Q4_excellent', n: 49, avg_measure: 0.88, sd: 0.25 },
        ],
      },
    }),
    mk({
      kind: 'program', user_id: 'u_dev', username: 'devliftson',
      title: 'My 6-day PPL (open-ended)', body: 'Sharing the block that got me from 140 to 180 deadlift.',
      labels: ['Program'], score: 73, comment_count: 0, created_at: dayIso(3) + 'T14:20:00Z',
      attachment: { id: 'prog1', name: '6-Day PPL — Volume Block', enrollment_count: 38 },
    }),
    mk({
      kind: 'pr', user_id: 'u_kai', username: 'kai_hypertrophy',
      title: '', body: 'New squat PR! 150kg x 2 🎉', labels: ['Legs', 'PR'],
      score: 121, comment_count: 0, created_at: dayIso(4) + 'T17:55:00Z',
    }),
    mk({
      kind: 'template', user_id: 'u_lena', username: 'lena_lifts',
      title: 'Quick 45-min upper', body: 'For busy days. Supersets keep it tight.',
      labels: ['Upper'], score: 40, comment_count: 0, created_at: dayIso(5) + 'T08:30:00Z',
      attachment: { id: 'tpl1', name: 'Express Upper', exercise_count: 6, usage_count: 27 },
    }),
    mk({
      kind: 'discussion', user_id: 'u_kai', username: 'kai_hypertrophy',
      title: 'How do you actually program RIR on the last set?',
      body: 'Do you take the last working set to RIR 0 or keep 1-2 in the tank across the board?',
      labels: ['Programming'], score: 55, comment_count: 0, created_at: dayIso(6) + 'T20:10:00Z',
    }),
  ]
  // attach comment ids
  for (const p of posts) {
    p._comments = (p._comments || []).map(c => ({
      id: uid('c'), post_id: p.id, parent_id: null,
      user_id: c.user_id, username: c.username, body: c.body,
      score: c.score || 0, created_at: p.created_at, viewer_vote: 0, children: [],
    }))
    p.comment_count = p._comments.length
  }
  return posts
}

// ---------------------------------------------------------------------------
// seed: research findings + saved questions
// ---------------------------------------------------------------------------
// Auto-discovered findings surfaced on the "For You" tab and the Evidence tab.
// Field names mirror what the UI reads (FindingButton / FindingsRow):
//   title, n, effect_size, surprising, query_json (for replay into the builder).
const FINDINGS = [
  {
    id: 'f1', title: 'Lifters resting 3-5 min between sets progress ~8% faster on bench',
    detail: 'Across qualified bench logs, the longest-rest bucket showed the steepest progression slope.',
    surprising: false, n: 512, effect_size: 0.62,
    measure: 'progression_rate', groupBy: 'rest_period_bucket', discovered_at: dayIso(2),
    query_json: { groupBy: 'rest_period_bucket', measure: 'progression_rate', exerciseId: 'bench_barbell', minCohort: 10 },
  },
  {
    id: 'f2', title: 'Top-quartile sleep quality tracks with faster strength gains',
    detail: 'Top sleep-quality quartile out-progressed the bottom quartile by a wide margin.',
    surprising: false, n: 178, effect_size: 0.54,
    measure: 'progression_rate', groupBy: 'sleep_quality_quartile', discovered_at: dayIso(5),
    query_json: { groupBy: 'sleep_quality_quartile', measure: 'progression_rate', minCohort: 30 },
  },
  {
    id: 'f3', title: 'Higher training frequency wins for hypertrophy-focused lifters',
    detail: '3+ sessions/week led progression for lifters whose stated goal is hypertrophy.',
    surprising: false, n: 146, effect_size: 0.49,
    measure: 'progression_rate', groupBy: 'frequency_bucket', discovered_at: dayIso(9),
    query_json: { filters: [{ field: 'users.goal', op: '=', value: 'hypertrophy' }], groupBy: 'frequency_bucket', measure: 'progression_rate', minCohort: 10 },
  },
  {
    id: 'f4', title: 'Beginners progress far faster than advanced lifters',
    detail: 'Newer lifters showed the steepest weight progression — the classic "newbie gains" curve, in the data.',
    surprising: false, n: 624, effect_size: 0.71,
    measure: 'progression_rate', groupBy: 'experience_level', discovered_at: dayIso(1),
    query_json: { groupBy: 'experience_level', measure: 'progression_rate', minCohort: 10 },
  },
  {
    id: 'f5', title: 'Machines progress nearly as fast as free weights',
    detail: 'The gap in top-set increase between machine and barbell work was much smaller than the forums suggest.',
    surprising: true, n: 584, effect_size: 1.4,
    measure: 'top_set_pct_change', groupBy: 'equipment_type', discovered_at: dayIso(3),
    query_json: { groupBy: 'equipment_type', measure: 'top_set_pct_change', minCohort: 10 },
  },
  {
    id: 'f6', title: 'Lifters who log RIR out-progress those who don’t',
    detail: 'RIR-logging discipline correlates with faster progression — likely a proxy for autoregulation.',
    surprising: true, n: 219, effect_size: 0.38,
    measure: 'progression_rate', groupBy: 'rir_use', discovered_at: dayIso(6),
    query_json: { groupBy: 'rir_use', measure: 'progression_rate', minCohort: 10 },
  },
  {
    id: 'f7', title: 'High cardio load tracks with slower squat progression',
    detail: 'The top cardio-load quartile progressed squats more slowly than the lowest — an interference signal.',
    surprising: false, n: 111, effect_size: -0.33,
    measure: 'progression_rate', groupBy: 'cardio_load_quartile', discovered_at: dayIso(11),
    query_json: { groupBy: 'cardio_load_quartile', measure: 'progression_rate', exerciseId: 'squat_barbell', minCohort: 10 },
  },
  {
    id: 'f8', title: 'Protein 1.6-2.2 g/kg lines up with higher estimated 1RM',
    detail: 'Higher protein buckets carried a meaningfully higher estimated 1RM, plateauing past ~2.2 g/kg.',
    surprising: false, n: 252, effect_size: 12.5,
    measure: 'estimated_1rm', groupBy: 'protein_bucket', discovered_at: dayIso(8),
    query_json: { groupBy: 'protein_bucket', measure: 'estimated_1rm', minCohort: 10 },
  },
  {
    id: 'f9', title: 'Leaving 1-2 reps in the tank beats going to failure',
    detail: 'Sets logged at RIR 1-2 tracked with faster progression than sets routinely taken to failure (RIR 0).',
    surprising: true, n: 246, effect_size: 0.29,
    measure: 'progression_rate', groupBy: 'rir_bucket', discovered_at: dayIso(13),
    query_json: { groupBy: 'rir_bucket', measure: 'progression_rate', minCohort: 10 },
  },
]

const FEATURED_QUESTIONS = [
  { id: 'split_progression', title: 'Which split builds the most muscle?', subtitle: 'Average progression rate by split type', type: 'query', query: { groupBy: 'split_type', measure: 'progression_rate', minCohort: 10 } },
  { id: 'sleep_strength', title: 'Does sleep affect strength?', subtitle: 'Bench progression by sleep quality', type: 'query', query: { groupBy: 'sleep_quality_quartile', measure: 'progression_rate', exerciseId: 'bench_barbell', minCohort: 10 } },
  { id: 'running_lifting', title: 'How does running affect lifting?', subtitle: 'Squat progression: runners vs non-runners', type: 'compare', query: { cohortA: { label: 'Runners', filters: [{ field: 'users.sport_primary', op: '=', value: 'running' }] }, cohortB: { label: 'Non-runners', filters: [{ field: 'users.sport_primary', op: 'IS NULL' }] }, groupBy: 'frequency_bucket', measure: 'progression_rate', exerciseId: 'squat_barbell', minCohort: 10 } },
  { id: 'hypertrophy_freq', title: 'Best frequency for hypertrophy', subtitle: 'Bench progression for hypertrophy-focused lifters', type: 'query', query: { filters: [{ field: 'users.goal', op: '=', value: 'hypertrophy' }], groupBy: 'frequency_bucket', measure: 'progression_rate', exerciseId: 'bench_barbell', minCohort: 10 } },
  { id: 'failure_matter', title: 'Does training to failure matter?', subtitle: 'Progression by RIR logging discipline', type: 'query', query: { groupBy: 'rir_use', measure: 'progression_rate', minCohort: 10 } },
  { id: 'machine_vs_free', title: 'Machine vs free weight progression', subtitle: 'Progression rate by equipment type', type: 'query', query: { groupBy: 'equipment_type', measure: 'progression_rate', minCohort: 10 } },
  { id: 'rest_period_bench', title: 'How long should you rest on bench?', subtitle: 'Bench progression by rest-period bucket', type: 'query', query: { groupBy: 'rest_period_bucket', measure: 'progression_rate', exerciseId: 'bench_barbell', minCohort: 10 } },
  { id: 'rep_range_growth', title: 'Which rep range drives the most growth?', subtitle: 'Top-set increase by rep-range bucket', type: 'query', query: { groupBy: 'rep_range_bucket', measure: 'top_set_pct_change', minCohort: 10 } },
  { id: 'protein_strength', title: 'How much protein for strength?', subtitle: 'Estimated 1RM by protein intake', type: 'query', query: { groupBy: 'protein_bucket', measure: 'estimated_1rm', minCohort: 10 } },
  { id: 'age_progression', title: 'Does age slow you down?', subtitle: 'Progression rate by age range', type: 'query', query: { groupBy: 'age_range', measure: 'progression_rate', minCohort: 10 } },
  { id: 'natural_vs_enhanced', title: 'Natural vs enhanced progression', subtitle: 'Deadlift progression across lifter status', type: 'compare', query: { cohortA: { label: 'Natural', filters: [{ field: 'users.enhancement_status', op: '=', value: 'natural' }] }, cohortB: { label: 'Enhanced', filters: [{ field: 'users.enhancement_status', op: '=', value: 'enhanced' }] }, groupBy: 'frequency_bucket', measure: 'progression_rate', exerciseId: 'deadlift', minCohort: 10 } },
  { id: 'creatine_effect', title: 'Does creatine show up in the data?', subtitle: 'Estimated 1RM: creatine users vs non-users', type: 'compare', query: { cohortA: { label: 'Creatine', filters: [{ field: 'users.creatine_use', op: '=', value: 'yes' }] }, cohortB: { label: 'No creatine', filters: [{ field: 'users.creatine_use', op: '=', value: 'no' }] }, groupBy: 'experience_level', measure: 'estimated_1rm', minCohort: 10 } },
  { id: 'set_order_fade', title: 'Do later sets still build strength?', subtitle: 'Set volume by position in the session', type: 'query', query: { groupBy: 'session_set_order_bucket', measure: 'set_volume_load', minCohort: 10 } },
  { id: 'cardio_interference', title: 'Does cardio hurt your squat?', subtitle: 'Squat progression by cardio load', type: 'query', query: { groupBy: 'cardio_load_quartile', measure: 'progression_rate', exerciseId: 'squat_barbell', minCohort: 10 } },
]

// bucket label sets for synthesizing query results
const BUCKET_LABELS = {
  split_type: ['Push/Pull/Legs', 'Upper/Lower', 'Full Body', 'Bro Split'],
  frequency_bucket: ['<1.5/wk', '1.5-2.5/wk', '3+/wk'],
  sleep_quality_quartile: ['Q1_poor', 'Q2', 'Q3', 'Q4_excellent'],
  sleep_duration_bucket: ['<6h', '6-7h', '7-8h', '8h+'],
  cardio_load_quartile: ['Q1_low', 'Q2', 'Q3', 'Q4_high'],
  equipment_type: ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Smith Machine'],
  movement_pattern: ['Push', 'Pull', 'Squat', 'Hinge', 'Fly', 'Isolation'],
  force_vector: ['horizontal', 'vertical', 'diagonal'],
  bilateral: ['bilateral', 'unilateral'],
  rir_use: ['logs_rir', 'no_rir'],
  experience_level: ['beginner', 'intermediate', 'advanced'],
  goal: ['strength', 'hypertrophy', 'fat_loss', 'general_fitness'],
  gender: ['woman', 'man'],
  age_range: ['18_24', '25_34', '35_44', '45_54'],
  enhancement_status: ['natural', 'enhanced'],
  protein_bucket: ['<1.2g/kg', '1.2-1.6g/kg', '1.6-2.2g/kg', '2.2+g/kg'],
  stress_bucket: ['low', 'moderate', 'high'],
  nutrition_phase: ['bulk', 'cut', 'maintenance'],
  creatine_use: ['yes', 'no', 'occasional'],
  rep_range_bucket: ['1-3', '4-6', '7-10', '11-15', '16+'],
  rest_period_bucket: ['<60s', '60-120s', '2-3min', '3-5min', '5min+'],
  rir_bucket: ['0 (failure)', '1', '2', '3', '4+'],
  training_age_bucket: ['0-6mo', '6-12mo', '1-2yr', '2-4yr', '4-7yr', '7+yr'],
  session_set_order_bucket: ['1-3', '4-6', '7-9', '10+'],
  sport_primary: ['none', 'running', 'cycling', 'team_sport'],
  sport_frequency_bucket: ['<2/wk', '2-3/wk', '4+/wk'],
  physical_labor_level: ['sedentary', 'light', 'moderate', 'heavy'],
}

// Deterministic string-seeded RNG (mulberry32 over a cheap hash) so synthesized
// charts stay stable across reloads but still vary by group-by + measure.
function hashSeed(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}
function seededRng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Believable effect shapes (relative 0..1, ordered to match BUCKET_LABELS).
// Buckets without an explicit shape get a deterministic gentle curve.
const BUCKET_SHAPES = {
  rest_period_bucket: [0.30, 0.55, 0.80, 1.0, 0.9],       // peaks at 3-5 min
  sleep_quality_quartile: [0.34, 0.56, 0.78, 1.0],         // rising
  sleep_duration_bucket: [0.30, 0.64, 1.0, 0.9],           // peak 7-8h
  frequency_bucket: [0.42, 0.74, 1.0],                     // rising
  experience_level: [1.0, 0.7, 0.46],                      // newbie gains
  training_age_bucket: [1.0, 0.85, 0.68, 0.54, 0.43, 0.35],
  protein_bucket: [0.42, 0.66, 0.92, 1.0],                 // plateau at top
  cardio_load_quartile: [1.0, 0.86, 0.68, 0.52],           // interference
  session_set_order_bucket: [1.0, 0.82, 0.62, 0.45],       // earlier sets win
  rep_range_bucket: [0.70, 0.9, 1.0, 0.86, 0.62],          // peak 7-10
  rir_bucket: [0.72, 1.0, 0.95, 0.78, 0.58],               // peak RIR 1
  rir_use: [1.0, 0.66],                                    // loggers ahead
  age_range: [1.0, 0.84, 0.66, 0.5],                       // declines with age
  stress_bucket: [1.0, 0.78, 0.55],                        // less stress, more gain
  set_number: [1.0, 0.86, 0.72, 0.6],
}

// Output band per measure so values render in believable units
// (kg vs %/wk vs reps), instead of everything sitting at ~0.3-0.9.
const MEASURE_RANGE = {
  progression_rate: [0.25, 1.05],
  estimated_1rm: [78, 142],
  logged_1rm: [80, 150],
  set_estimated_1rm: [62, 128],
  set_weight_kg: [44, 104],
  top_set_pct_change: [2.4, 13.5],
  improvement_frequency: [0.28, 0.74],
  recovery_volume_tolerance: [4200, 13800],
  avg_weekly_frequency: [1.3, 3.4],
  set_volume_load: [1600, 5800],
  set_reps: [5, 12],
  set_rir: [0.6, 3.4],
  set_rest_seconds: [70, 235],
  volume_load: [8200, 25600],
}

function synthBuckets(groupBy, minCohort = 10, measure = 'progression_rate', salt = '') {
  const labels = BUCKET_LABELS[groupBy] || ['Group A', 'Group B', 'Group C']
  const rng = seededRng(hashSeed(`${groupBy}:${measure}:${salt}`))
  const [lo, hi] = MEASURE_RANGE[measure] || [0.3, 1.0]
  const span = hi - lo
  const decimals = hi >= 50 ? 1 : hi >= 10 ? 2 : 4
  // n-counts taper from the most common bucket; deterministic per group-by.
  const peak = Math.round(60 + rng() * 90)
  return labels.map((label, i) => {
    const shape = BUCKET_SHAPES[groupBy]
    // fall back to a smooth deterministic curve when no explicit shape exists
    const rel = shape
      ? shape[i] ?? shape[shape.length - 1]
      : 0.35 + 0.6 * (i / Math.max(1, labels.length - 1))
    const jitter = (rng() - 0.5) * 0.08 * span
    const avg = round(lo + rel * span + jitter, decimals)
    const n = Math.max(minCohort, Math.round(peak * (0.5 + 0.5 * rng())))
    const sd = round(span * (0.12 + rng() * 0.1), decimals)
    return { label, n, avg_measure: avg, sd }
  })
}
function evidenceStatus(n) {
  if (n >= 100) return 'Strong'
  if (n >= 30) return 'Good'
  if (n >= 10) return 'Sparse'
  return 'Not enough'
}
function effectSpread(buckets = []) {
  const numeric = buckets.filter(b => Number.isFinite(Number(b.avg_measure)))
  if (numeric.length < 2) return { strength: 0, effect: null, bestBucket: null, worstBucket: null }
  const sorted = [...numeric].sort((a, b) => a.avg_measure - b.avg_measure)
  const worst = sorted[0], best = sorted[sorted.length - 1]
  const effect = round(best.avg_measure - worst.avg_measure, 4)
  return { strength: Math.min(100, Math.round(Math.abs(effect) * 100)), effect, bestBucket: best.label, worstBucket: worst.label }
}

// ---------------------------------------------------------------------------
// the store
// ---------------------------------------------------------------------------
const store = {
  user: { ...ME },
  activeWorkout: null,       // { state, updated_at }
  workouts: buildWorkoutHistory(),
  prs: buildPRs(),
  bodyHistory: buildBodyHistory(),
  dailyLogs: buildDailyLogs(),
  posts: buildPosts(),
  following: [...OTHER_USERS],
  savedQuestions: [],
  findings: FINDINGS,
}

// ---------------------------------------------------------------------------
// progress computations
// ---------------------------------------------------------------------------
function weekKey(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return d.toISOString().slice(0, 10)
}

function progressSummary() {
  const w = store.workouts
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const weekStart = weekKey(now.toISOString().slice(0, 10))
  const buckets = new Map()
  for (let i = 7; i >= 0; i -= 1) {
    const ref = new Date(); ref.setDate(now.getDate() - i * 7)
    const start = weekKey(ref.toISOString().slice(0, 10))
    const sd = new Date(`${start}T00:00:00`)
    buckets.set(start, { label: `${sd.getMonth() + 1}/${sd.getDate()}`, date: start, count: 0 })
  }
  for (const wk of w) { const k = weekKey(wk.date); if (buckets.has(k)) buckets.get(k).count += 1 }
  return {
    totalWorkouts: w.length,
    sessionsThisMonth: w.filter(x => x.date.startsWith(month)).length,
    trainingDaysThisWeek: new Set(w.filter(x => x.date >= weekStart).map(x => x.date)).size,
    lastWorkout: w[0] || null,
    weeklySessions: [...buckets.values()],
  }
}

function liftsResponse(query) {
  const rowsByEx = new Map()
  for (const w of store.workouts) {
    for (const s of w.sets) {
      if (!rowsByEx.has(s.exercise_id)) {
        rowsByEx.set(s.exercise_id, { id: s.exercise_id, name: s.exercise_name, primary_muscle: s.primary_muscle, split: splitOf(s.primary_muscle), equipment_type: s.equipment_type })
      }
    }
  }
  const exercises = [...rowsByEx.values()].sort((a, b) => a.name.localeCompare(b.name))
  const metric = query.metric || 'top_set'
  const groupBy = query.group_by || 'session'
  let series = []
  if (query.exercise_id) {
    const byDate = new Map()
    const ordered = [...store.workouts].reverse() // oldest first
    for (const w of ordered) {
      for (const s of w.sets) {
        if (s.exercise_id !== query.exercise_id) continue
        const cur = byDate.get(w.date) || { date: w.date, value: null, weight_kg: null, reps: null, workout_count: 1 }
        const v = metric === 'estimated_1rm' ? estimate1rm(s.weight_kg, s.reps)
          : metric === 'volume' ? (cur.value || 0) + s.weight_kg * s.reps
          : metric === 'reps' ? s.reps
          : s.weight_kg
        if (metric === 'volume') { cur.value = round(v, 1) }
        else if (cur.value == null || v > cur.value) { cur.value = v; cur.weight_kg = s.weight_kg; cur.reps = s.reps }
        byDate.set(w.date, cur)
      }
    }
    series = [...byDate.values()].filter(p => p.value != null)
  }
  const stats = series.length ? {
    start: series[0].value, current: series[series.length - 1].value,
    gain: round(series[series.length - 1].value - series[0].value, 1),
    start_date: series[0].date, current_date: series[series.length - 1].date,
  } : null
  return { exercises, metric, groupBy, series, stats }
}

function recordsResponse() {
  const records = [...store.prs].sort((a, b) => a.exercise_name.localeCompare(b.exercise_name))
  const core = ['bench_barbell', 'squat_barbell', 'deadlift', 'press_ohp']
  const defaultPins = core.filter(id => records.some(r => r.exercise_id === id))
  if (!defaultPins.length) defaultPins.push(...records.slice(0, 4).map(r => r.exercise_id))
  return { records, defaultPins }
}

function bodyResponse() {
  const history = store.bodyHistory
  const BODY_METRICS = ['bodyweight_kg', 'arm_cm', 'chest_cm', 'waist_cm', 'thigh_cm', 'calf_cm']
  const asc = [...history].sort((a, b) => (a.date < b.date ? -1 : 1))
  const latest = {}, deltas = {}
  for (const key of BODY_METRICS) {
    const cur = history.find(r => r[key] != null)
    if (cur) latest[key] = { value: cur[key], date: cur.date }
    const vals = asc.filter(r => r[key] != null)
    if (vals.length > 1) deltas[key] = round(vals[vals.length - 1][key] - vals[0][key], 1)
  }
  return { history, summary: { latest, deltas } }
}

function compareResponse(query) {
  let defs = []
  try { defs = JSON.parse(query.series || '[]') } catch { defs = [] }
  const series = (defs || []).slice(0, 3).map((def, idx) => {
    const sourceType = def.source_type || 'exercise'
    const ordered = [...store.workouts].reverse()
    let points = []
    if (sourceType === 'body_metric') {
      points = [...store.bodyHistory].reverse().map(r => ({ date: r.date, value: r[def.source_id] ?? r.bodyweight_kg }))
    } else {
      const byDate = new Map()
      for (const w of ordered) {
        for (const s of w.sets) {
          const match = sourceType === 'exercise' ? s.exercise_id === def.source_id
            : sourceType === 'muscle' ? s.primary_muscle === def.source_id
            : splitOf(s.primary_muscle) === def.source_id
          if (!match) continue
          const cur = byDate.get(w.date) || { date: w.date, value: 0 }
          cur.value = Math.max(cur.value, s.weight_kg)
          byDate.set(w.date, cur)
        }
      }
      points = [...byDate.values()]
    }
    return { id: def.id || `series_${idx}`, label: def.label || def.source_id || 'Series', metric: def.metric || 'top_set', source_type: sourceType, points }
  })
  return { series }
}

// ---------------------------------------------------------------------------
// posts shaping
// ---------------------------------------------------------------------------
function shapePost(p) {
  const { _comments, ...rest } = p
  const comments = _comments || []
  // Surface engagement cues the feed card needs to read as a "conversation
  // poster": the highest-scored top-level reply and the last activity time.
  const top = comments
    .filter(c => !c.parent_id)
    .sort((a, b) => (b.score || 0) - (a.score || 0))[0]
  const lastActivity = comments.reduce(
    (mx, c) => (c.created_at > mx ? c.created_at : mx),
    p.created_at,
  )
  return {
    ...rest,
    last_activity_at: lastActivity,
    top_comment: top ? { username: top.username, body: top.body, score: top.score || 0 } : null,
  }
}

// ---------------------------------------------------------------------------
// router
// ---------------------------------------------------------------------------
function parsePath(path) {
  const [rawPath, queryStr] = path.split('?')
  const query = {}
  if (queryStr) for (const [k, v] of new URLSearchParams(queryStr)) query[k] = v
  return { p: rawPath, query }
}

function handle(method, path, body) {
  const { p, query } = parsePath(path)
  const m = method.toUpperCase()
  const seg = p.split('/').filter(Boolean) // e.g. ['posts','abc','vote']

  // --- auth ---
  if (p === '/auth/login' || p === '/auth/register') {
    return { token: 'mock-token', user: store.user }
  }
  if (p === '/auth/me') return { user: store.user }

  // --- profile ---
  if (p === '/profile' && (m === 'PATCH' || m === 'POST')) {
    store.user = { ...store.user, ...(body || {}) }
    return { user: store.user }
  }
  if (p === '/profile/advanced') { store.user = { ...store.user, ...(body || {}) }; return { user: store.user } }

  // --- active workout ---
  if (p === '/active-workout') {
    if (m === 'GET') return store.activeWorkout ? { state: store.activeWorkout.state, updated_at: store.activeWorkout.updated_at } : { state: null, updated_at: null }
    if (m === 'PUT') { store.activeWorkout = { state: body?.state || null, updated_at: nowIso() }; return { ok: true, updated_at: store.activeWorkout.updated_at } }
    if (m === 'DELETE') { store.activeWorkout = null; return { ok: true } }
  }

  // --- save a finished workout ---
  if (p === '/workouts' && m === 'POST') {
    const id = uid('w')
    const sets = (body?.sets || []).map((s, i) => ({
      ...s, id: uid('s'), workout_id: id, user_id: ME.id,
      exercise_name: exName(s.exercise_id), primary_muscle: exMuscle(s.exercise_id),
      session_position: s.session_position ?? i + 1,
    }))
    const w = {
      id, user_id: ME.id, username: ME.username,
      date: body?.date || dayIso(0), created_at: nowIso(), start_time: body?.start_time,
      duration_min: body?.duration_min || 1, workout_day: body?.workout_day || null,
      workout_split_type: body?.workout_day || null, program_id: body?.program_id || null,
      template_id: body?.template_id || null, run_classification: body?.run_classification || 'exact',
      visibility: 'public', sets, set_count: sets.length,
      exercise_count: new Set(sets.map(s => s.exercise_id)).size,
    }
    store.workouts.unshift(w)
    return { workout: w }
  }

  // --- progress ---
  if (p === '/progress/summary') return { summary: progressSummary() }
  if (p === '/progress/history') {
    let list = store.workouts
    if (query.from) list = list.filter(w => w.date >= query.from)
    if (query.to) list = list.filter(w => w.date <= query.to)
    return { workouts: list }
  }
  if (p === '/progress/lifts') return liftsResponse(query)
  if (p === '/progress/records') return recordsResponse()
  if (p === '/progress/body') return bodyResponse()
  if (p === '/progress/compare') return compareResponse(query)

  // --- daily log ---
  if (p === '/daily-log' && m === 'GET') {
    const limit = parseInt(query.limit) || 90
    return { logs: store.dailyLogs.slice(0, limit) }
  }
  if (seg[0] === 'daily-log' && seg.length === 2 && m === 'GET') {
    const date = seg[1]
    const log = store.dailyLogs.find(l => l.date === date) || null
    return { log }
  }
  if (p === '/daily-log' && m === 'POST') {
    const date = body?.date || dayIso(0)
    const existingIdx = store.dailyLogs.findIndex(l => l.date === date)
    const log = { id: uid('dl'), user_id: ME.id, created_at: nowIso(), ...body, date }
    if (existingIdx >= 0) store.dailyLogs[existingIdx] = log
    else store.dailyLogs.unshift(log)
    return { log }
  }

  // --- body metrics ---
  if (p === '/body-metrics' && m === 'POST') {
    const date = body?.date || dayIso(0)
    const entry = { id: uid('bm'), user_id: ME.id, created_at: nowIso(), ...body, date }
    store.bodyHistory.unshift(entry)
    return { entry }
  }

  // --- research ---
  if (p === '/research/featured-questions') return { questions: FEATURED_QUESTIONS }
  if (p === '/research/findings') return { findings: store.findings }
  if (p === '/research/saved-questions' && m === 'GET') return { savedQuestions: store.savedQuestions }
  if (p === '/research/saved-questions' && m === 'POST') {
    const sq = {
      id: uid('sq'), label: body?.label || 'Saved question', mode: body?.mode || 'single',
      query: body?.query || {}, evidenceStatus: body?.evidence?.status || 'Good',
      qualifiedUsers: body?.evidence?.qualifiedUsers || 0, matchedUsers: body?.evidence?.matchedUsers || 0,
      createdAt: nowIso(), updatedAt: nowIso(),
    }
    store.savedQuestions.unshift(sq)
    return { savedQuestion: sq }
  }
  if (seg[0] === 'research' && seg[1] === 'saved-questions' && seg.length === 3 && m === 'DELETE') {
    store.savedQuestions = store.savedQuestions.filter(s => s.id !== seg[2])
    return { deleted: true }
  }
  if (p === '/research/query' && m === 'POST') {
    const buckets = synthBuckets(body?.groupBy, body?.minCohort, body?.measure)
    const total = buckets.reduce((a, b) => a + b.n, 0)
    return { buckets, totalCohortSize: total, minCohort: body?.minCohort || 10, query: body }
  }
  if (p === '/research/compare-cohorts' && m === 'POST') {
    // Cohort B is nudged off cohort A by a stable per-label offset so the two
    // series differ without looking random.
    const mkA = synthBuckets(body?.groupBy, body?.minCohort, body?.measure)
    const [lo, hi] = MEASURE_RANGE[body?.measure] || [0.3, 1.0]
    const span = hi - lo
    const decimals = hi >= 50 ? 1 : hi >= 10 ? 2 : 4
    const mkB = mkA.map((b, i) => ({
      label: b.label,
      n: Math.max(body?.minCohort || 10, Math.round(b.n * (0.7 + ((i % 3) * 0.12)))),
      avg_measure: round(b.avg_measure + (i % 2 === 0 ? -1 : 1) * span * 0.12, decimals),
      sd: b.sd,
    }))
    const mk = (label, buckets) => ({ label, buckets, totalCohortSize: buckets.reduce((a, b) => a + b.n, 0), minCohort: body?.minCohort || 10 })
    return { cohortA: mk(body?.cohortA?.label || 'A', mkA), cohortB: mk(body?.cohortB?.label || 'B', mkB), query: body }
  }
  if (p === '/research/scan' && m === 'POST') {
    const axes = body?.groupBys || []
    const results = axes.map(groupBy => {
      const buckets = synthBuckets(groupBy, body?.minCohort, body?.measure)
      const total = buckets.reduce((a, b) => a + b.n, 0)
      const spread = effectSpread(buckets)
      return { groupBy, available: buckets.length >= 2, totalCohortSize: total, buckets, ...spread, evidenceStatus: evidenceStatus(total) }
    }).sort((a, b) => (b.strength || 0) - (a.strength || 0))
    return { query: body, results }
  }
  if (p === '/research/compare-scan' && m === 'POST') {
    const axes = body?.groupBys || []
    const results = axes.map(groupBy => {
      const a = synthBuckets(groupBy, body?.minCohort, body?.measure, 'A'), b = synthBuckets(groupBy, body?.minCohort, body?.measure, 'B')
      const sa = effectSpread(a), sb = effectSpread(b)
      const totA = a.reduce((x, y) => x + y.n, 0), totB = b.reduce((x, y) => x + y.n, 0)
      const matched = Math.min(totA, totB)
      return {
        groupBy, available: true,
        cohortA: { label: body?.cohortA?.label || 'A', buckets: a, totalCohortSize: totA, ...sa },
        cohortB: { label: body?.cohortB?.label || 'B', buckets: b, totalCohortSize: totB, ...sb },
        totalCohortSize: matched, evidenceStatus: evidenceStatus(matched), strength: Math.max(sa.strength || 0, sb.strength || 0),
      }
    }).sort((a, b) => (b.strength || 0) - (a.strength || 0))
    return { query: body, results }
  }
  if (p === '/research/preview' && m === 'POST') {
    const base = Math.round(rand(120, 320))
    const variables = (body?.groupBys || []).map(groupBy => {
      const after = Math.max(8, base - Math.round(rand(10, 90)))
      return { groupBy, available: after >= 10, before: base, after, removed: base - after, evidenceStatus: evidenceStatus(after), confidence: Math.min(88, Math.round(after / 4)), minCohort: 10, crossesThreshold: false }
    })
    const biggestReducer = [...variables].sort((a, b) => b.removed - a.removed)[0] || null
    return { baseMatchedUsers: base, evidenceStatus: evidenceStatus(base), confidence: Math.min(88, Math.round(base / 4)), variables, biggestReducer }
  }

  // --- posts ---
  if (p === '/posts' && m === 'GET') {
    let items = store.posts.filter(po => {
      if (query.scope === 'following') return po.user_id === ME.id || store.following.some(f => f.id === po.user_id)
      return true
    })
    if (query.kind) items = items.filter(po => po.kind === query.kind)
    if (query.label) items = items.filter(po => (po.labels || []).includes(query.label))
    if (query.q) { const q = query.q.toLowerCase(); items = items.filter(po => (po.title + ' ' + po.body).toLowerCase().includes(q)) }
    if (query.sort === 'new') items = [...items].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    else if (query.sort === 'top') items = [...items].sort((a, b) => b.score - a.score)
    else items = [...items].sort((a, b) => b.score - a.score)
    const limit = parseInt(query.limit) || 20
    const offset = parseInt(query.offset) || 0
    const paged = items.slice(offset, offset + limit)
    return { items: paged.map(shapePost), scope: query.scope, sort: query.sort, limit, offset, has_more: items.length > offset + limit }
  }
  if (p === '/posts/saved' && m === 'GET') return { items: store.posts.filter(po => po.saved).map(shapePost) }
  if (p === '/posts/compose-options' || p === '/posts/post-options') {
    return {
      workouts: store.workouts.slice(0, 20).map(w => ({ id: w.id, date: w.date, duration_min: w.duration_min, workout_day: w.workout_day, set_count: w.set_count, exercise_count: w.exercise_count })),
      programs: [], templates: [], studies: store.savedQuestions, prs: store.prs, progress: [],
    }
  }
  if (p === '/posts' && m === 'POST') {
    const po = {
      id: uid('p'), kind: body?.kind || 'discussion', title: body?.title || '', body: body?.body || '',
      user_id: ME.id, username: ME.username, labels: body?.labels || [], score: 1, comment_count: 0,
      visibility: body?.visibility || 'public', created_at: nowIso(), viewer_vote: 1, saved: false, attachment: null, _comments: [],
    }
    store.posts.unshift(po)
    return { post: shapePost(po) }
  }
  if (seg[0] === 'posts' && seg.length === 2 && m === 'GET') {
    const po = store.posts.find(x => x.id === seg[1])
    if (!po) return { error: 'Post not found' }
    return { post: shapePost(po), comments: po._comments || [] }
  }
  if (seg[0] === 'posts' && seg[2] === 'vote' && seg.length === 3 && m === 'POST') {
    const po = store.posts.find(x => x.id === seg[1])
    if (po) {
      const prev = po.viewer_vote || 0
      const next = body?.value === prev ? 0 : (body?.value || 0)
      po.score += next - prev
      po.viewer_vote = next
      return { score: po.score, viewer_vote: po.viewer_vote }
    }
    return { score: 0, viewer_vote: 0 }
  }
  if (seg[0] === 'posts' && seg[1] === 'comments' && seg[3] === 'vote' && m === 'POST') {
    for (const po of store.posts) {
      const c = (po._comments || []).find(x => x.id === seg[2])
      if (c) { const prev = c.viewer_vote || 0; const next = body?.value === prev ? 0 : (body?.value || 0); c.score += next - prev; c.viewer_vote = next; return { score: c.score, viewer_vote: c.viewer_vote } }
    }
    return { score: 0, viewer_vote: 0 }
  }
  if (seg[0] === 'posts' && seg[2] === 'save' && m === 'POST') {
    const po = store.posts.find(x => x.id === seg[1]); if (po) po.saved = true; return { saved: true }
  }
  if (seg[0] === 'posts' && seg[2] === 'save' && m === 'DELETE') {
    const po = store.posts.find(x => x.id === seg[1]); if (po) po.saved = false; return { saved: false }
  }
  if (seg[0] === 'posts' && seg[2] === 'comments' && m === 'POST') {
    const po = store.posts.find(x => x.id === seg[1])
    const comment = { id: uid('c'), post_id: seg[1], parent_id: body?.parent_id || null, user_id: ME.id, username: ME.username, body: body?.body || '', score: 0, created_at: nowIso(), viewer_vote: 0, children: [] }
    if (po) {
      if (comment.parent_id) {
        const parent = (po._comments || []).find(c => c.id === comment.parent_id)
        if (parent) parent.children.push(comment); else po._comments.push(comment)
      } else po._comments.push(comment)
      po.comment_count = (po._comments || []).reduce((n, c) => n + 1 + (c.children?.length || 0), 0)
    }
    return { comment }
  }

  // --- social ---
  if (p === '/social/following' && m === 'GET') return { following: store.following, users: store.following }
  if (seg[0] === 'social' && seg[1] === 'follow' && seg.length === 3) {
    if (m === 'POST') { const id = seg[2]; if (!store.following.some(f => f.id === id)) store.following.push({ id, username: id }); return { ok: true } }
    if (m === 'DELETE') { store.following = store.following.filter(f => f.id !== seg[2]); return { ok: true } }
  }
  if (p === '/feed' && m === 'GET') {
    // legacy activity feed — map posts to a light items list
    const items = store.posts.map(po => ({ type: po.kind, id: po.id, ts: po.created_at, user_id: po.user_id, username: po.username, payload: po }))
    const limit = parseInt(query.limit) || 20, offset = parseInt(query.offset) || 0
    return { items: items.slice(offset, offset + limit), total: items.length, has_more: items.length > offset + limit }
  }

  // --- custom exercises ---
  if (p === '/custom-exercises' && m === 'GET') return { exercises: [] }
  if (p === '/custom-exercises' && m === 'POST') return { exercise: { id: uid('custom'), ...(body || {}) } }

  // --- programs / templates (builders, not the focus) ---
  if (p === '/programs') return m === 'POST' ? { program: { id: uid('prog'), ...(body || {}) } } : { programs: [] }
  if (p === '/templates') return m === 'POST' ? { template: { id: uid('tpl'), ...(body || {}) } } : { templates: [] }

  // --- catch-all: benign empties so unmodelled calls don't throw ---
  return { items: [], workouts: [], exercises: [], following: [], programs: [], templates: [], logs: [], history: [], records: [], series: [], questions: [], findings: [], savedQuestions: [], ok: true }
}

// Public entry point used by api.js. Adds slight latency so loading states render.
export function mockRequest(method, path, body) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(handle(method, path, body)), 140)
  })
}
