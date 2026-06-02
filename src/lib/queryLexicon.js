// Language data for the Explore natural-language search bar.
// The parser (queryParser.js) maps a plain-language question onto the explorer's
// slots — groupBy, measure, filters, mode, plus exercise/muscle targeting — using
// the vocabularies here. Robustness to "different wording" lives in SYNONYMS,
// PHRASE_SYNONYMS, EXERCISE_PHRASES and MUSCLE_TERMS.

import { MUSCLE_GROUPS } from './exercises.js'

// Full explorer-state shape, kept in sync with DEFAULT_QUERY in pages/Study.jsx.
export function makeConfig(overrides = {}) {
  return {
    mode: 'single',
    filtersA: [],
    filtersB: [],
    cohortALabel: 'A',
    cohortBLabel: 'B',
    groupBy: 'split_type',
    measure: 'progression_rate',
    exerciseId: '',
    muscle: '',
    minCohort: 10,
    ...overrides,
  }
}

// Words that carry no slot signal. Dropped after synonym expansion.
export const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'am', 'be', 'been', 'do', 'does', 'did', 'done',
  'for', 'of', 'to', 'in', 'on', 'at', 'by', 'with', 'and', 'as', 'it', 'its',
  'what', 'whats', 'how', 'why', 'when', 'which', 'who', 'should', 'shall', 'can',
  'could', 'would', 'will', 'i', 'me', 'my', 'mine', 'you', 'your', 'we', 'our',
  'they', 'them', 'their', 'he', 'she', 'his', 'her', 'if', 'then', 'than', 'that',
  'this', 'these', 'those', 'there', 'here', 'about', 'any', 'some', 'more', 'most',
  'much', 'many', 'really', 'actually', 'just', 'get', 'getting', 'got', 'have',
  'has', 'had', 'help', 'helps', 'helping', 'affect', 'affects', 'affecting',
  'effect', 'effects', 'impact', 'impacts', 'matter', 'matters', 'work', 'works',
  'good', 'bad', 'best', 'better', 'worse', 'us', 'between', 'people', 'someone',
  'lifter', 'lifters', 'guy', 'person', 'training', 'train', 'trainer', 'gym',
  'exercise', 'exercises', 'workout', 'use', 'using', 'fast', 'faster', 'slow',
  'slower', 'differently', 'different', 'over', 'under', 'above', 'below', 'while',
])

// Multi-word phrase replacements, applied (in order) to the raw lowercased string
// BEFORE tokenizing. Collapses phrases into single canonical tokens.
export const PHRASE_SYNONYMS = [
  [/one[\s-]?rep[\s-]?max(imum)?/g, '1rm'],
  [/1[\s-]?rep[\s-]?max/g, '1rm'],
  [/rep[\s-]?maxe?s?/g, '1rm'],
  [/personal[\s-]?best/g, '1rm'],
  [/days?\s+(a|per)\s+week/g, 'frequency'],
  [/times?\s+(a|per)\s+week/g, 'frequency'],
  [/sessions?\s+(a|per)\s+week/g, 'frequency'],
  [/per\s+week/g, 'frequency'],
  [/how\s+often/g, 'frequency'],
  [/to\s+failure/g, 'failure'],
  [/free[\s-]?weights?/g, 'freeweight'],
  [/body[\s-]?weight/g, 'bodyweight'],
  [/full[\s-]?body/g, 'fullbody'],
  [/upper[\s/-]?lower/g, 'upperlower'],
  [/bro[\s-]?split/g, 'brosplit'],
  [/push\s+pull\s+legs?/g, 'ppl'],
  [/exercise\s+order/g, 'sessionorder'],
  [/set\s+order/g, 'sessionorder'],
  [/order\s+of\s+(the\s+)?(exercise|set)s?/g, 'sessionorder'],
  [/session\s+position/g, 'sessionposition'],
  [/fat\s+loss/g, 'fatloss'],
  [/weight\s+loss/g, 'fatloss'],
  [/lose\s+(fat|weight)/g, 'fatloss'],
  [/general\s+fitness/g, 'generalfitness'],
  [/sport\s+performance/g, 'sportperformance'],
  [/athletic\s+performance/g, 'sportperformance'],
  [/team\s+sports?/g, 'teamsport'],
  [/home\s+gym/g, 'homegym'],
  [/commercial\s+gym/g, 'commercialgym'],
  [/desk\s+job/g, 'sedentary'],
  [/office\s+job/g, 'sedentary'],
  [/sit\s+all\s+day/g, 'sedentary'],
  [/manual\s+labou?r/g, 'heavylabor'],
  [/physical\s+(job|labou?r)/g, 'heavylabor'],
  [/high\s+stress/g, 'highstress'],
  [/low\s+stress/g, 'lowstress'],
  [/build(ing)?\s+muscle/g, 'progression'],
  [/muscle\s+(growth|mass|size)/g, 'progression'],
  [/(gain|gaining|put\s+on)\s+muscle/g, 'progression'],
  [/age\s+(range|group|bracket)/g, 'age'],
  [/rest\s+(time|period|between\s+sets?)/g, 'rest'],
  [/compared?\s+to/g, ' versus '],
  [/difference\s+between/g, ' versus '],
  [/(rather|as\s+opposed)\s+than/g, ' versus '],
]

// Single-token synonyms, applied per-token after tokenizing. token -> canonical.
export const SYNONYMS = {
  // enhancement
  natty: 'natural', drugfree: 'natural', clean: 'natural',
  gear: 'enhanced', juice: 'enhanced', juiced: 'enhanced', roids: 'enhanced',
  steroids: 'enhanced', steroid: 'enhanced', ped: 'enhanced', peds: 'enhanced',
  enhanced: 'enhanced',
  // experience
  newbie: 'beginner', newb: 'beginner', noob: 'beginner', novice: 'beginner',
  starter: 'beginner', beginners: 'beginner', rookie: 'beginner', new: 'beginner',
  intermediate: 'intermediate', advanced: 'advanced', experienced: 'advanced',
  veteran: 'advanced', expert: 'advanced', elite: 'advanced', seasoned: 'advanced',
  experience: 'experience', level: 'experience',
  // gender
  men: 'man', male: 'man', males: 'man', guys: 'man', dude: 'man',
  dudes: 'man', boys: 'man', man: 'man',
  women: 'woman', female: 'woman', females: 'woman', girl: 'woman',
  girls: 'woman', lady: 'woman', ladies: 'woman', woman: 'woman',
  // outcomes -> progression
  gains: 'progression', gain: 'progression', gaining: 'progression',
  progress: 'progression', progressing: 'progression', improve: 'progression',
  improving: 'progression', improvement: 'progression', grow: 'progression',
  growing: 'progression', growth: 'progression', results: 'progression',
  stronger: 'progression', strength: 'progression', development: 'progression',
  bigger: 'progression', size: 'progression', adapt: 'progression', adapting: 'progression',
  // outcomes -> 1rm
  max: '1rm', maximum: '1rm', maximal: '1rm', strongest: '1rm', pr: '1rm',
  // measures
  volume: 'volume', tonnage: 'volume', load: 'volume',
  reps: 'rep', repetitions: 'rep', repetition: 'rep',
  // frequency / split
  often: 'frequency', frequent: 'frequency', frequently: 'frequency',
  freq: 'frequency', sessions: 'frequency', workouts: 'frequency',
  split: 'split', splits: 'split', routine: 'split', program: 'split',
  programme: 'split', schedule: 'split',
  // equipment
  machine: 'machine', machines: 'machine',
  freeweight: 'freeweight', freeweights: 'freeweight', barbell: 'barbell',
  barbells: 'barbell', dumbbell: 'dumbbell', dumbbells: 'dumbbell', cable: 'cable',
  cables: 'cable', smith: 'smith',
  // movement / mechanics
  bilateral: 'bilateral', unilateral: 'unilateral', singleleg: 'unilateral',
  push: 'push', pushing: 'push', pull: 'pull', pulling: 'pull',
  hinge: 'hinge', fly: 'fly', flye: 'fly',
  compound: 'compound', compounds: 'compound', isolation: 'isolation',
  isolations: 'isolation', accessory: 'isolation',
  horizontal: 'horizontal', vertical: 'vertical', diagonal: 'diagonal',
  // failure / effort
  failure: 'failure', rir: 'rir', effort: 'failure', intensity: 'failure',
  // nutrition
  protein: 'protein', proteins: 'protein', diet: 'protein', nutrition: 'protein',
  food: 'protein', eating: 'protein', macros: 'protein',
  bulk: 'bulk', bulking: 'bulk', surplus: 'bulk',
  cut: 'cut', cutting: 'cut', deficit: 'cut', shred: 'cut', shredding: 'cut',
  maintenance: 'maintenance', maintaining: 'maintenance',
  // sleep / recovery
  sleep: 'sleep', sleeping: 'sleep', slept: 'sleep', recovery: 'sleep',
  recover: 'sleep', rested: 'sleep',
  // cardio
  cardio: 'cardio', running: 'cardio', run: 'cardio', runner: 'cardio',
  runners: 'cardio', jogging: 'cardio', cycling: 'cardio', bike: 'cardio',
  biking: 'cardio', cyclist: 'cardio', swimming: 'cardio', swim: 'cardio',
  swimmer: 'cardio', endurance: 'cardio', aerobic: 'cardio', conditioning: 'cardio',
  // sport
  sport: 'sport', sports: 'sport', athlete: 'sport', athletes: 'sport',
  athletic: 'sport', teamsport: 'teamsport',
  // job / labor
  job: 'labor', labor: 'labor', labour: 'labor', manual: 'labor',
  sedentary: 'sedentary', heavylabor: 'heavylabor', physical: 'labor',
  // stress
  stress: 'stress', stressed: 'highstress', stressful: 'highstress',
  highstress: 'highstress', lowstress: 'lowstress', relaxed: 'lowstress',
  // goals
  hypertrophy: 'hypertrophy', powerlifting: 'progression',
  generalfitness: 'generalfitness', fitness: 'generalfitness',
  sportperformance: 'sportperformance',
  // gym type
  homegym: 'homegym', commercialgym: 'commercialgym', outdoor: 'outdoor',
  outdoors: 'outdoor', garage: 'homegym',
  // age
  age: 'age', old: 'age', older: 'age', young: 'age', younger: 'age', aging: 'age',
  // rom / tempo / set type
  rom: 'rom', partials: 'partial', partial: 'partial', lengthened: 'lengthened',
  tempo: 'tempo', explosive: 'explosive', controlled: 'controlled',
  warmup: 'warmup', dropset: 'dropset', amrap: 'amrap',
  // pain
  pain: 'pain', painful: 'pain', injury: 'pain', injured: 'pain', hurt: 'pain',
}

// groupBy slot vocabulary. value === GROUP_BY_OPTIONS value in researchTheme.js.
export const GROUPBY_LEXICON = [
  { value: 'frequency_bucket', terms: ['frequency'] },
  { value: 'session_position_bucket', terms: ['sessionposition', 'position'] },
  { value: 'session_set_order_bucket', terms: ['sessionorder', 'order'] },
  { value: 'rir_use', terms: ['failure', 'rir'] },
  { value: 'equipment_type', terms: ['equipment', 'machine', 'freeweight', 'barbell', 'dumbbell', 'cable', 'smith'] },
  { value: 'movement_pattern', terms: ['movement', 'pattern', 'push', 'pull', 'hinge', 'fly', 'isolation', 'compound'] },
  { value: 'force_vector', terms: ['force', 'vector', 'angle', 'horizontal', 'vertical', 'diagonal'] },
  { value: 'bilateral', terms: ['bilateral', 'unilateral'] },
  { value: 'experience_level', terms: ['experience'] },
  { value: 'goal', terms: ['goal', 'goals', 'hypertrophy', 'generalfitness', 'sportperformance'] },
  { value: 'gender', terms: ['gender', 'sex', 'man', 'woman'] },
  { value: 'age_range', terms: ['age'] },
  { value: 'split_type', terms: ['split', 'fullbody', 'upperlower', 'ppl', 'brosplit'] },
  { value: 'enhancement_status', terms: ['enhancement', 'natural', 'enhanced'] },
  { value: 'physical_labor_level', terms: ['labor', 'sedentary', 'heavylabor'] },
  { value: 'sport_primary', terms: ['sport', 'teamsport'] },
  { value: 'sport_frequency_bucket', terms: ['sportfrequency'] },
  { value: 'protein_bucket', terms: ['protein'] },
  { value: 'sleep_quality_quartile', terms: ['sleep'] },
  { value: 'cardio_load_quartile', terms: ['cardio'] },
]

// measure slot vocabulary. value === MEASURE_OPTIONS value in researchTheme.js.
// Note: 'frequency' is deliberately NOT a measure term — it almost always names
// the axis (groupBy frequency_bucket), not the outcome.
export const MEASURE_LEXICON = [
  { value: 'progression_rate', terms: ['progression'] },
  { value: 'estimated_1rm', terms: ['1rm'] },
  { value: 'set_volume_load', terms: ['volume'] },
  { value: 'set_weight_kg', terms: ['weight'] },
  { value: 'set_reps', terms: ['rep'] },
  { value: 'set_rir', terms: ['rir'] },
  { value: 'set_rest_seconds', terms: ['rest'] },
]

// filter slot vocabulary. Each entry maps canonical token(s) to a concrete filter.
// Fields/values mirror FIELD_OPTIONS enums in researchTheme.js.
export const FILTER_LEXICON = [
  // experience
  { terms: ['beginner'], filter: { field: 'users.experience_level', op: '=', value: 'beginner' } },
  { terms: ['intermediate'], filter: { field: 'users.experience_level', op: '=', value: 'intermediate' } },
  { terms: ['advanced'], filter: { field: 'users.experience_level', op: '=', value: 'advanced' } },
  // enhancement
  { terms: ['natural'], filter: { field: 'users.enhancement_status', op: '=', value: 'natural' } },
  { terms: ['enhanced'], filter: { field: 'users.enhancement_status', op: '=', value: 'enhanced' } },
  // gender
  { terms: ['man'], filter: { field: 'users.gender', op: '=', value: 'man' } },
  { terms: ['woman'], filter: { field: 'users.gender', op: '=', value: 'woman' } },
  // nutrition phase
  { terms: ['bulk'], filter: { field: 'users.nutrition_phase', op: '=', value: 'bulk' } },
  { terms: ['cut'], filter: { field: 'users.nutrition_phase', op: '=', value: 'cut' } },
  { terms: ['maintenance'], filter: { field: 'users.nutrition_phase', op: '=', value: 'maintenance' } },
  // goal
  { terms: ['hypertrophy'], filter: { field: 'users.goal', op: '=', value: 'hypertrophy' } },
  { terms: ['fatloss'], filter: { field: 'users.goal', op: '=', value: 'fat_loss' } },
  { terms: ['generalfitness'], filter: { field: 'users.goal', op: '=', value: 'general_fitness' } },
  { terms: ['sportperformance'], filter: { field: 'users.goal', op: '=', value: 'sport_performance' } },
  // split type
  { terms: ['fullbody'], filter: { field: 'users.split_type', op: '=', value: 'full_body' } },
  { terms: ['upperlower'], filter: { field: 'users.split_type', op: '=', value: 'upper_lower' } },
  { terms: ['ppl'], filter: { field: 'users.split_type', op: '=', value: 'ppl' } },
  { terms: ['brosplit'], filter: { field: 'users.split_type', op: '=', value: 'bro_split' } },
  // gym type (not a groupBy)
  { terms: ['homegym'], filter: { field: 'users.gym_type', op: '=', value: 'home' } },
  { terms: ['commercialgym'], filter: { field: 'users.gym_type', op: '=', value: 'commercial' } },
  { terms: ['outdoor'], filter: { field: 'users.gym_type', op: '=', value: 'outdoor' } },
  // stress (not a groupBy)
  { terms: ['highstress'], filter: { field: 'users.stress_level', op: '=', value: 'high' } },
  { terms: ['lowstress'], filter: { field: 'users.stress_level', op: '=', value: 'low' } },
  // physical labor
  { terms: ['sedentary'], filter: { field: 'users.physical_labor_level', op: '=', value: 'sedentary' } },
  { terms: ['heavylabor'], filter: { field: 'users.physical_labor_level', op: '=', value: 'heavy' } },
  // sport
  { terms: ['teamsport'], filter: { field: 'users.sport_primary', op: '=', value: 'team_sport' } },
  // exercise meta
  { terms: ['push'], filter: { field: 'exercises.movement_pattern', op: '=', value: 'Push' } },
  { terms: ['pull'], filter: { field: 'exercises.movement_pattern', op: '=', value: 'Pull' } },
  { terms: ['hinge'], filter: { field: 'exercises.movement_pattern', op: '=', value: 'Hinge' } },
  { terms: ['fly'], filter: { field: 'exercises.movement_pattern', op: '=', value: 'Fly' } },
  { terms: ['isolation'], filter: { field: 'exercises.movement_pattern', op: '=', value: 'Isolation' } },
  { terms: ['barbell'], filter: { field: 'exercises.equipment_type', op: '=', value: 'Barbell' } },
  { terms: ['dumbbell'], filter: { field: 'exercises.equipment_type', op: '=', value: 'Dumbbell' } },
  { terms: ['cable'], filter: { field: 'exercises.equipment_type', op: '=', value: 'Cable' } },
  { terms: ['machine'], filter: { field: 'exercises.equipment_type', op: '=', value: 'Machine' } },
  { terms: ['horizontal'], filter: { field: 'exercises.force_vector', op: '=', value: 'horizontal' } },
  { terms: ['vertical'], filter: { field: 'exercises.force_vector', op: '=', value: 'vertical' } },
  { terms: ['bilateral'], filter: { field: 'exercises.bilateral', op: '=', value: '1' } },
  { terms: ['unilateral'], filter: { field: 'exercises.bilateral', op: '=', value: '0' } },
  // set log
  { terms: ['pain'], filter: { field: 'sets.pain_flag', op: '=', value: '1' } },
  { terms: ['partial'], filter: { field: 'sets.rom_category', op: '=', value: 'partial' } },
  { terms: ['lengthened'], filter: { field: 'sets.rom_category', op: '=', value: 'lengthened' } },
  { terms: ['dropset'], filter: { field: 'sets.set_type', op: '=', value: 'drop' } },
  { terms: ['amrap'], filter: { field: 'sets.set_type', op: '=', value: 'amrap' } },
  { terms: ['explosive'], filter: { field: 'sets.tempo_tag', op: '=', value: 'explosive' } },
  { terms: ['controlled'], filter: { field: 'sets.tempo_tag', op: '=', value: 'controlled' } },
]

// Tokens that signal a two-cohort comparison.
export const COMPARE_TRIGGERS = new Set(['versus', 'vs'])

// Numeric comparators -> SQL op. Matched (longest-first) against raw text.
export const NUMERIC_COMPARATORS = [
  ['at least', '>='],
  ['at most', '<='],
  ['no less than', '>='],
  ['no more than', '<='],
  ['greater than', '>'],
  ['more than', '>'],
  ['less than', '<'],
  ['fewer than', '<'],
  ['over', '>'],
  ['above', '>'],
  ['under', '<'],
  ['below', '<'],
]

// Numeric concepts: a comparator + number near one of these words -> a numeric filter.
export const NUMERIC_CONCEPTS = [
  { field: 'users.sleep_hours', words: ['sleep', 'slept', 'sleeping'] },
  { field: 'users.protein_g_per_kg', words: ['protein'] },
  { field: 'users.bodyweight_kg', words: ['bodyweight', 'weigh', 'weight'] },
  { field: 'users.avg_daily_steps', words: ['steps'] },
  { field: 'users.vo2_max', words: ['vo2'] },
]

// Distinctive exercise names -> exerciseId (SEED_EXERCISES). Checked in order;
// more specific phrases must come before generic ones (e.g. "leg curl" before "curl").
export const EXERCISE_PHRASES = [
  [/romanian\s+deadlift|rdl/, 'rdl'],
  [/sumo\s+deadlift/, 'deadlift_sumo'],
  [/deadlift/, 'deadlift'],
  [/incline\s+(barbell\s+)?(bench|press)/, 'bench_incline_barbell'],
  [/bench\s+press|bench/, 'bench_barbell'],
  [/overhead\s+press|military\s+press|\bohp\b|shoulder\s+press/, 'press_ohp'],
  [/lat\s+pulldown|pulldown/, 'pulldown_lat'],
  [/pull[\s-]?ups?|pullups?/, 'pullup'],
  [/chin[\s-]?ups?|chinups?/, 'chinup'],
  [/face\s+pull/, 'facepull'],
  [/barbell\s+row|bent[\s-]?over\s+row|\brows?\b/, 'row_barbell'],
  [/hip\s+thrust/, 'hip_thrust'],
  [/leg\s+press/, 'leg_press'],
  [/leg\s+extension/, 'extension_leg'],
  [/leg\s+curl/, 'curl_lying'],
  [/front\s+squat/, 'squat_front'],
  [/hack\s+squat/, 'hack_squat'],
  [/goblet\s+squat/, 'squat_goblet'],
  [/back\s+squat|barbell\s+squat|squats?/, 'squat_barbell'],
  [/lateral\s+raise|side\s+raise|lat\s+raise/, 'raise_lateral'],
  [/calf\s+raise|calf\s+raises/, 'raise_calf_standing'],
  [/hammer\s+curl/, 'curl_hammer'],
  [/preacher\s+curl/, 'curl_preacher'],
  [/bicep\s+curl|barbell\s+curl|\bcurls?\b/, 'curl_barbell'],
  [/skull\s?crusher/, 'skullcrusher'],
  [/tricep\s+pushdown|pushdown/, 'pushdown_tricep'],
  [/shrugs?/, 'shrug_barbell'],
  [/plank/, 'plank'],
]

// Colloquial muscle words -> exact MUSCLE_GROUPS value. Built partly from the
// canonical group list so renames in exercises.js stay reflected.
export const MUSCLE_TERMS = {
  chest: 'Chest', pecs: 'Chest', pec: 'Chest',
  back: 'Back', lats: 'Lats', lat: 'Lats',
  shoulders: 'Shoulders', shoulder: 'Shoulders', delts: 'Shoulders', delt: 'Shoulders',
  traps: 'Traps', trap: 'Traps',
  triceps: 'Triceps', tricep: 'Triceps', tris: 'Triceps',
  biceps: 'Biceps', bicep: 'Biceps', bis: 'Biceps',
  forearms: 'Forearms', forearm: 'Forearms',
  quads: 'Quads', quad: 'Quads', quadriceps: 'Quads', legs: 'Quads', leg: 'Quads',
  hamstrings: 'Hamstrings', hamstring: 'Hamstrings', hams: 'Hamstrings',
  glutes: 'Glutes', glute: 'Glutes', butt: 'Glutes', booty: 'Glutes',
  calves: 'Calves', calf: 'Calves',
  abs: 'Abs', ab: 'Abs', core: 'Core', obliques: 'Obliques',
  adductors: 'Adductors', abductors: 'Abductors', neck: 'Neck',
}

// Build a set of canonical muscle names for validation (lowercased).
export const VALID_MUSCLES = new Set(MUSCLE_GROUPS.map(m => m.toLowerCase()))

// Curated, quality-guaranteed questions. They (1) let common asks resolve to
// hand-tuned configs and (2) feed the "did you mean" + popular fallbacks.
export const SEARCH_PRESETS = [
  { id: 'protein-strength', label: 'Does protein intake affect strength gains?', keywords: ['protein', 'progression'], config: makeConfig({ groupBy: 'protein_bucket', measure: 'progression_rate' }) },
  { id: 'sleep-gains', label: 'Does sleep quality affect muscle gains?', keywords: ['sleep', 'progression'], config: makeConfig({ groupBy: 'sleep_quality_quartile', measure: 'progression_rate' }) },
  { id: 'frequency-progression', label: 'How does training frequency affect progression?', keywords: ['frequency', 'progression'], config: makeConfig({ groupBy: 'frequency_bucket', measure: 'progression_rate' }) },
  { id: 'experience-progression', label: 'Do beginners progress faster than advanced lifters?', keywords: ['experience', 'progression'], config: makeConfig({ groupBy: 'experience_level', measure: 'progression_rate' }) },
  { id: 'cardio-strength', label: 'Does cardio hurt strength gains?', keywords: ['cardio', 'progression'], config: makeConfig({ groupBy: 'cardio_load_quartile', measure: 'progression_rate' }) },
  { id: 'natural-vs-enhanced', label: 'Do enhanced lifters progress faster than naturals?', keywords: ['natural', 'enhanced', 'progression'], config: makeConfig({ groupBy: 'enhancement_status', measure: 'progression_rate' }) },
  { id: 'training-to-failure', label: 'Does training to failure improve results?', keywords: ['failure', 'rir', 'progression'], config: makeConfig({ groupBy: 'rir_use', measure: 'progression_rate' }) },
  { id: 'split-progression', label: 'Which training split is best for progression?', keywords: ['split', 'progression'], config: makeConfig({ groupBy: 'split_type', measure: 'progression_rate' }) },
  { id: 'split-1rm', label: 'Which training split builds the most strength?', keywords: ['split', '1rm'], config: makeConfig({ groupBy: 'split_type', measure: 'estimated_1rm' }) },
  { id: 'machine-vs-free', label: 'Machines or free weights for progression?', keywords: ['machine', 'freeweight', 'equipment', 'progression'], config: makeConfig({ groupBy: 'equipment_type', measure: 'progression_rate' }) },
  { id: 'bilateral-unilateral', label: 'Bilateral vs unilateral: which builds more strength?', keywords: ['bilateral', 'unilateral', 'progression'], config: makeConfig({ groupBy: 'bilateral', measure: 'progression_rate' }) },
  { id: 'movement-pattern', label: 'Which movement pattern progresses fastest?', keywords: ['movement', 'pattern', 'push', 'pull', 'progression'], config: makeConfig({ groupBy: 'movement_pattern', measure: 'progression_rate' }) },
  { id: 'force-vector', label: 'Horizontal vs vertical pushing: which progresses faster?', keywords: ['force', 'horizontal', 'vertical', 'progression'], config: makeConfig({ groupBy: 'force_vector', measure: 'progression_rate' }) },
  { id: 'session-position', label: 'Does exercise order in a session matter?', keywords: ['sessionposition', 'sessionorder', 'progression'], config: makeConfig({ groupBy: 'session_position_bucket', measure: 'progression_rate' }) },
  { id: 'set-order', label: 'Do earlier sets progress faster than later sets?', keywords: ['sessionorder', 'progression'], config: makeConfig({ groupBy: 'session_set_order_bucket', measure: 'set_volume_load' }) },
  { id: 'age-progression', label: 'How does age affect strength progression?', keywords: ['age', 'progression'], config: makeConfig({ groupBy: 'age_range', measure: 'progression_rate' }) },
  { id: 'gender-progression', label: 'Do men and women progress differently?', keywords: ['gender', 'man', 'woman', 'progression'], config: makeConfig({ groupBy: 'gender', measure: 'progression_rate' }) },
  { id: 'goal-progression', label: 'Which training goal leads to the most progression?', keywords: ['goal', 'progression'], config: makeConfig({ groupBy: 'goal', measure: 'progression_rate' }) },
  { id: 'sport-progression', label: 'Does playing a sport affect gym progression?', keywords: ['sport', 'progression'], config: makeConfig({ groupBy: 'sport_primary', measure: 'progression_rate' }) },
  { id: 'labor-progression', label: 'Does a physical job affect strength gains?', keywords: ['labor', 'sedentary', 'heavylabor', 'progression'], config: makeConfig({ groupBy: 'physical_labor_level', measure: 'progression_rate' }) },
  { id: 'protein-1rm', label: 'How does protein intake affect your 1RM?', keywords: ['protein', '1rm'], config: makeConfig({ groupBy: 'protein_bucket', measure: 'estimated_1rm' }) },
  { id: 'bulk-vs-cut', label: 'Bulking vs cutting: who gains more strength?', keywords: ['bulk', 'cut', 'progression'], config: makeConfig({ mode: 'compare', cohortALabel: 'Bulk', cohortBLabel: 'Cut', filtersA: [{ field: 'users.nutrition_phase', op: '=', value: 'bulk' }], filtersB: [{ field: 'users.nutrition_phase', op: '=', value: 'cut' }], groupBy: 'frequency_bucket', measure: 'progression_rate' }) },
  { id: 'stress-progression', label: 'Does stress slow strength gains?', keywords: ['stress', 'highstress', 'lowstress', 'progression'], config: makeConfig({ mode: 'compare', cohortALabel: 'Low stress', cohortBLabel: 'High stress', filtersA: [{ field: 'users.stress_level', op: '=', value: 'low' }], filtersB: [{ field: 'users.stress_level', op: '=', value: 'high' }], groupBy: 'frequency_bucket', measure: 'progression_rate' }) },
  { id: 'home-vs-commercial', label: 'Home gym vs commercial gym progression?', keywords: ['homegym', 'commercialgym', 'progression'], config: makeConfig({ mode: 'compare', cohortALabel: 'Home', cohortBLabel: 'Commercial', filtersA: [{ field: 'users.gym_type', op: '=', value: 'home' }], filtersB: [{ field: 'users.gym_type', op: '=', value: 'commercial' }], groupBy: 'frequency_bucket', measure: 'progression_rate' }) },
  { id: 'beginner-frequency', label: 'What training frequency is best for beginners?', keywords: ['beginner', 'frequency', 'progression'], config: makeConfig({ filtersA: [{ field: 'users.experience_level', op: '=', value: 'beginner' }], groupBy: 'frequency_bucket', measure: 'progression_rate' }) },
  { id: 'bench-frequency', label: 'How does frequency affect bench press progression?', keywords: ['frequency', 'progression'], config: makeConfig({ exerciseId: 'bench_barbell', groupBy: 'frequency_bucket', measure: 'progression_rate' }) },
  { id: 'squat-progression', label: 'What drives squat progression?', keywords: ['progression'], config: makeConfig({ exerciseId: 'squat_barbell', groupBy: 'frequency_bucket', measure: 'progression_rate' }) },
  { id: 'glute-progression', label: 'What builds glutes fastest?', keywords: ['progression'], config: makeConfig({ muscle: 'Glutes', groupBy: 'equipment_type', measure: 'progression_rate' }) },
  { id: 'rest-volume', label: 'Does resting longer mean more volume per set?', keywords: ['rest', 'volume'], config: makeConfig({ groupBy: 'frequency_bucket', measure: 'set_rest_seconds' }) },
  { id: 'rir-reps', label: 'How does RIR discipline relate to reps per set?', keywords: ['rir', 'rep'], config: makeConfig({ groupBy: 'rir_use', measure: 'set_reps' }) },
]

// Shown in the "couldn't understand" fallback — a broad, beginner-friendly spread.
export const POPULAR_PRESET_IDS = [
  'frequency-progression',
  'protein-strength',
  'sleep-gains',
  'split-progression',
  'training-to-failure',
  'cardio-strength',
]
