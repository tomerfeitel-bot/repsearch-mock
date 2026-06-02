import { nanoid } from './nanoid.js'

export function freshSet(overrides = {}) {
  return { id: nanoid(), weight: '', reps: '', rir: '', done: false, ...overrides }
}

export function initWorkout() {
  return {
    name: 'Push Day',
    startedAt: new Date(Date.now() - 42 * 60000).toISOString(),
    exercises: [
      {
        id: nanoid(),
        exerciseName: 'Bench Press (Barbell)',
        primary_muscle: 'Mid Chest',
        sets: [
          freshSet({ weight: '100', reps: '8', rir: '2', done: true }),
          freshSet({ weight: '100', reps: '8', rir: '2', done: true }),
          freshSet({ weight: '100', reps: '', rir: '', done: false }),
        ],
      },
      {
        id: nanoid(),
        exerciseName: 'Incline Press (Dumbbell)',
        primary_muscle: 'Upper Chest',
        sets: [
          freshSet({ weight: '32', reps: '10', rir: '', done: false }),
          freshSet({ weight: '32', reps: '', rir: '', done: false }),
          freshSet({ weight: '32', reps: '', rir: '', done: false }),
        ],
      },
      {
        id: nanoid(),
        exerciseName: 'Fly (Cable)',
        primary_muscle: 'Mid Chest',
        sets: [
          freshSet({ weight: '15', reps: '12', rir: '', done: false }),
          freshSet({ weight: '15', reps: '', rir: '', done: false }),
          freshSet({ weight: '15', reps: '', rir: '', done: false }),
        ],
      },
      {
        id: nanoid(),
        exerciseName: 'Tricep Pushdown (Cable)',
        primary_muscle: 'Triceps',
        sets: [
          freshSet({ weight: '22.5', reps: '12', rir: '', done: false }),
          freshSet({ weight: '22.5', reps: '', rir: '', done: false }),
        ],
      },
    ],
  }
}

const now = Date.now()
export const MOCK_POSTS = [
  {
    id: '1',
    kind: 'discussion',
    title: 'Training to failure on isolations vs compounds — does it matter?',
    body: 'Been running PPL for 6 months. Getting good results on compounds but wondering if I should push harder on cables.',
    username: 'igor_volkov',
    score: 42,
    viewer_vote: 0,
    comment_count: 18,
    saved: false,
    created_at: new Date(now - 2 * 3600000).toISOString(),
    labels: ['programming'],
  },
  {
    id: '2',
    kind: 'workout',
    body: 'Best push session in months. Bench moved really well today.',
    username: 'sarah_kline',
    score: 31,
    viewer_vote: 1,
    comment_count: 7,
    saved: true,
    created_at: new Date(now - 5 * 3600000).toISOString(),
    attachment: { workout_day: 'Push A', duration_min: 68, exercise_count: 5, set_count: 18 },
  },
  {
    id: '3',
    kind: 'pr',
    title: '4-plate deadlift — 180 kg at 78 kg bodyweight',
    body: '',
    username: 'mats_n',
    score: 89,
    viewer_vote: 0,
    comment_count: 34,
    saved: false,
    created_at: new Date(now - 8 * 3600000).toISOString(),
    labels: [],
  },
  {
    id: '4',
    kind: 'study',
    title: 'RIR 2 vs RIR 0: does proximity to failure change hypertrophy outcomes?',
    body: 'Analyzed 6 months of pull sessions. Going closer to failure on rows seems more impactful than on pulldowns.',
    username: 'anna_berg',
    score: 67,
    viewer_vote: 0,
    comment_count: 22,
    saved: false,
    created_at: new Date(now - 14 * 3600000).toISOString(),
    labels: ['research'],
  },
  {
    id: '5',
    kind: 'program',
    title: '4-Day Upper/Lower Hypertrophy Block',
    body: 'Sharing the program I\'ve been running for 12 weeks. Good linear progress throughout.',
    username: 'coach_lena',
    score: 55,
    viewer_vote: 0,
    comment_count: 12,
    saved: false,
    created_at: new Date(now - 22 * 3600000).toISOString(),
    attachment: { name: '4-Day U/L Hypertrophy', enrollment_count: 23 },
  },
  {
    id: '6',
    kind: 'discussion',
    title: 'How do you actually structure deload weeks?',
    body: 'I keep skipping them and burning out every 8-10 weeks. Looking for practical approaches that don\'t feel like a waste.',
    username: 'dan_f',
    score: 28,
    viewer_vote: -1,
    comment_count: 41,
    saved: false,
    created_at: new Date(now - 30 * 3600000).toISOString(),
    labels: ['recovery'],
  },
  {
    id: '7',
    kind: 'template',
    title: 'High-Frequency Push Template (4x/week)',
    body: 'Built around incline emphasis with daily undulation. Each session 45-55 min.',
    username: 'felix_m',
    score: 19,
    viewer_vote: 0,
    comment_count: 5,
    saved: false,
    created_at: new Date(now - 48 * 3600000).toISOString(),
    attachment: { name: 'High-Freq Push 4x', exercise_count: 5, usage_count: 12 },
  },
]

export const KIND_META = {
  discussion: { label: 'Discussion', color: '#94a3b8' },
  workout:    { label: 'Workout',    color: '#34d399' },
  program:    { label: 'Program',    color: '#818cf8' },
  template:   { label: 'Template',   color: '#38bdf8' },
  study:      { label: 'Study',      color: '#86efac' },
  pr:         { label: 'PR',         color: '#fbbf24' },
}

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return `${Math.floor(diff / 60000)}m`
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ---- Comment threads for the "Pulse" concept thread view ----
// Nested by `children`. `op` marks the original poster so the conversation has an
// anchor. `hoursAgo` is resolved to an ISO timestamp at module load. Authored to
// read like a real training discussion so the thread feels like an open conversation,
// not a list of detached one-line replies.
function cmt(username, body, score, hoursAgo, viewer_vote = 0, op = false, children = []) {
  return { id: nanoid(), username, body, score, viewer_vote, op, created_at: new Date(now - hoursAgo * 3600000).toISOString(), children }
}

export const MOCK_THREADS = {
  // 1 — failure on isolations vs compounds (OP: igor_volkov)
  '1': [
    cmt('coach_lena', 'On compounds I stay 1-2 RIR almost always. The fatigue cost of grinding a true failure rep on bench or squat is not worth what it does to the next two sessions. Isolations are where actual failure pays off.', 31, 1.5, 0, false, [
      cmt('igor_volkov', 'That lines up with what I feel. Squats to failure wreck my whole week, but pushing cable flyes to failure just makes them sore. So maybe the answer is failure placement, not failure yes/no?', 14, 1.1, 0, true, [
        cmt('anna_berg', 'Yes, exactly that. Proximity to failure matters more on movements where the limiting factor is the target muscle, not your stabilizers or your spine. Save the last-rep grind for the moves that isolate.', 22, 0.8),
      ]),
      cmt('dan_f', 'Counterpoint: a lot of people use "I keep compounds at 2 RIR" as permission to never actually train hard. If your logbook never shows a failed rep anywhere, you are probably leaving growth on the table.', 9, 1.0, 0, false, [
        cmt('coach_lena', 'Fair. There is a difference between disciplined RIR and just stopping when it gets uncomfortable. The log should show you flirting with failure regularly, even if you rarely cross it on the big lifts.', 12, 0.6),
      ]),
    ]),
    cmt('mats_n', 'Six months in you probably still have room to just add reps and weight at 1-2 RIR. The failure question gets more interesting once linear progress actually stalls. Until then, send the cables and keep the bar moving.', 18, 1.2),
  ],
  // 4 — RIR 2 vs RIR 0 hypertrophy (OP: anna_berg)
  '4': [
    cmt('coach_lena', 'This matches the mechanistic story: rows have a longer effective stretch under load and more stabilizer demand, so getting close to failure recruits more of the target. Pulldowns fatigue your grip and biceps before your lats ever get there.', 41, 4, 1, false, [
      cmt('anna_berg', 'Right, and that is why the pulldown "failure" is often just grip or elbow flexor failure, not lat failure. The data point I cannot explain yet is why the effect held even when I matched grip width.', 19, 3.2, 0, true),
    ]),
    cmt('igor_volkov', 'How did you control for the rows just being earlier in the session when you are fresher? Order effects could be doing a lot of work here.', 16, 3.5, 0, false, [
      cmt('anna_berg', 'Good catch. I alternated which one led across the six months, so freshness should wash out. Not a clean RCT obviously, but the pattern survived the reorder.', 11, 3.0, 0, true),
    ]),
    cmt('sarah_kline', 'Saving this. Going to actually log RIR per set on my pull days instead of eyeballing it and see if my own data agrees.', 7, 2.5),
  ],
  // 6 — structuring deload weeks (OP: dan_f)
  '6': [
    cmt('mats_n', 'I stopped doing calendar deloads and switched to autoregulated ones: when two sessions in a row feel heavier than the log says they should, I cut volume in half for a week. Burnout basically disappeared.', 27, 8, 0, false, [
      cmt('dan_f', 'This is the practical answer I was looking for. "Every 8 weeks no matter what" never matched how I actually feel. What metric do you trust most for "feels heavier than it should"?', 8, 7.2, 0, true, [
        cmt('mats_n', 'Bar speed on the first working set, mostly. If my normal opener suddenly feels like a top set, that is the tell. Grip strength in the morning is a decent backup signal.', 13, 6.8),
      ]),
    ]),
    cmt('coach_lena', 'Keep intensity, cut volume. A deload where you drop the weight but keep all your sets still beats you up. Drop to ~2 sets per muscle at your normal loads and you keep the skill while shedding the fatigue.', 21, 7),
    cmt('anna_berg', 'One thing people miss: a deload is also a great time to test a true single or a rep PR on one lift. You are fresh, fatigue is low, and it tells you what the block actually built.', 10, 6.5),
  ],
  // 3 — deadlift PR (OP: mats_n)
  '3': [
    cmt('igor_volkov', 'Massive. 180 at 78 bodyweight is over 2.3x. What did the last 8 weeks of programming look like getting into this?', 24, 7.5, 0, false, [
      cmt('mats_n', 'Thanks. Mostly volume on the front end then a 3-week taper. Doubles at 85-90% with long rest, nothing fancy. The taper is what made it feel weightless on the day.', 17, 7.0, 0, true),
    ]),
    cmt('sarah_kline', 'Form on the video looks clean too, no rounding. Congrats, that is a genuinely strong pull at that weight.', 12, 6.8),
  ],
}

// Short, friendly fallback for posts without an authored thread.
export const FALLBACK_THREAD = [
  cmt('felix_m', 'Solid post. Following this to see what people add.', 6, 1.5),
  cmt('sarah_kline', 'Appreciate you sharing the details, not just the highlight.', 4, 1.0),
]

export function threadFor(postId) {
  return MOCK_THREADS[postId] || FALLBACK_THREAD
}

export function countThread(nodes) {
  return nodes.reduce((n, c) => n + 1 + countThread(c.children || []), 0)
}

// ---- Progress mock data (used by the cohesive-style Progress concepts) ----

// Bench Press top-set progression, ~12 sessions over a training block.
export const LIFT_SERIES = [
  { date: 'Mar 04', topSet: 82.5, reps: 8, e1rm: 104 },
  { date: 'Mar 11', topSet: 85, reps: 8, e1rm: 107 },
  { date: 'Mar 18', topSet: 85, reps: 9, e1rm: 110 },
  { date: 'Mar 25', topSet: 87.5, reps: 7, e1rm: 108 },
  { date: 'Apr 01', topSet: 90, reps: 6, e1rm: 108 },
  { date: 'Apr 08', topSet: 90, reps: 8, e1rm: 114 },
  { date: 'Apr 15', topSet: 92.5, reps: 7, e1rm: 114 },
  { date: 'Apr 22', topSet: 92.5, reps: 8, e1rm: 117 },
  { date: 'Apr 29', topSet: 95, reps: 6, e1rm: 114 },
  { date: 'May 06', topSet: 95, reps: 8, e1rm: 120 },
  { date: 'May 13', topSet: 97.5, reps: 7, e1rm: 120 },
  { date: 'May 20', topSet: 100, reps: 8, e1rm: 127 },
]

// Personal records, newest first. `muscle` reuses names already in the app.
export const PR_LIST = [
  { id: 'pr1', exercise: 'Bench Press (Barbell)', muscle: 'Mid Chest', split: 'Push', weight: 100, reps: 8, e1rm: 127, daysAgo: 4 },
  { id: 'pr2', exercise: 'Deadlift (Barbell)', muscle: 'Lower Back', split: 'Pull', weight: 180, reps: 3, e1rm: 198, daysAgo: 9 },
  { id: 'pr3', exercise: 'Squat (Barbell)', muscle: 'Quads', split: 'Legs', weight: 150, reps: 5, e1rm: 175, daysAgo: 11 },
  { id: 'pr4', exercise: 'Overhead Press (Barbell)', muscle: 'Front Delts', split: 'Push', weight: 60, reps: 6, e1rm: 72, daysAgo: 18 },
  { id: 'pr5', exercise: 'Pull-up (Weighted)', muscle: 'Lats', split: 'Pull', weight: 30, reps: 8, e1rm: 38, daysAgo: 23 },
  { id: 'pr6', exercise: 'Romanian Deadlift', muscle: 'Hamstrings', split: 'Legs', weight: 120, reps: 8, e1rm: 152, daysAgo: 31 },
]

// Bodyweight trend, weekly.
export const BODY_SERIES = [
  { date: 'Mar 04', bw: 79.4 },
  { date: 'Mar 18', bw: 79.1 },
  { date: 'Apr 01', bw: 78.6 },
  { date: 'Apr 15', bw: 78.2 },
  { date: 'Apr 29', bw: 77.9 },
  { date: 'May 13', bw: 77.6 },
  { date: 'May 20', bw: 77.5 },
]

// Tape measurements with change since block start (cm).
export const MEASUREMENTS = [
  { key: 'Arms', muscle: 'Biceps', current: 39.2, delta: +0.6 },
  { key: 'Chest', muscle: 'Mid Chest', current: 104.5, delta: +1.1 },
  { key: 'Waist', muscle: 'Abs', current: 80.1, delta: -1.4 },
  { key: 'Thighs', muscle: 'Quads', current: 60.3, delta: +0.8 },
  { key: 'Calves', muscle: 'Calves', current: 38.0, delta: +0.2 },
  { key: 'Shoulders', muscle: 'Front Delts', current: 122.0, delta: +0.9 },
]

// One month of training days for the history heatmap. `split` null = rest day.
// Indexed by day-of-month (1-based); array is built for a 31-day month grid.
const SPLIT_CYCLE = ['Push', 'Pull', 'Legs', null, 'Push', 'Pull', null]
export const HISTORY_DAYS = Array.from({ length: 31 }, (_, i) => {
  const day = i + 1
  // Deterministic-but-natural pattern: follow the cycle, with a deload gap.
  const inDeload = day >= 22 && day <= 24
  const split = inDeload ? null : SPLIT_CYCLE[i % SPLIT_CYCLE.length]
  return { day, split, volume: split ? 9000 + ((day * 737) % 6000) : 0 }
})

export const SPLIT_COLORS = {
  Push: '#c4633a',
  Pull: '#4a8fa6',
  Legs: '#6a9a55',
  Other: '#9a8c7d',
}

// Weekly session counts for the small history bar chart.
export const WEEK_SESSIONS = [
  { week: 'W1', sessions: 4 },
  { week: 'W2', sessions: 5 },
  { week: 'W3', sessions: 4 },
  { week: 'W4', sessions: 2 },
  { week: 'W5', sessions: 5 },
]
