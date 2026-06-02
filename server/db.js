const { Database } = require('node-sqlite3-wasm')
const path = require('path')
const { EXERCISES_SEED } = require('./exercisesSeed')

const db = new Database(path.join(__dirname, 'repsearch.db'))

db.exec(`PRAGMA journal_mode=WAL;`)
db.exec(`PRAGMA foreign_keys=ON;`)

// Reddit-style time-decayed ranking, usable directly in ORDER BY so the feed can
// paginate "hot" in SQL. Mirrors the JS formula in routes/posts.js. Not marked
// deterministic — it depends on the current time.
db.function('hot_rank', (score, createdAt) => {
  const ageHours = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 3600000)
  return (score + 1) / Math.pow(ageHours + 2, 1.5)
})

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    onboarded INTEGER DEFAULT 0,
    is_private INTEGER DEFAULT 0,
    bio TEXT DEFAULT '',
    experience_level TEXT,
    goal TEXT,
    split_type TEXT,
    split_days_json TEXT,
    training_age_years REAL,
    training_started_at TEXT,
    gym_type TEXT,
    gender TEXT,
    age_range TEXT,
    date_of_birth TEXT,
    country_region TEXT,
    enhancement_status TEXT,
    height_cm REAL,
    bodyweight_kg REAL,
    arm_cm REAL,
    chest_cm REAL,
    waist_cm REAL,
    thigh_cm REAL,
    calf_cm REAL,
    body_metrics_measured_at TEXT,
    sleep_hours REAL,
    stress_level TEXT,
    nutrition_phase TEXT,
    protein_consistency TEXT,
    protein_g_per_kg REAL,
    creatine_use TEXT,
    supplements_json TEXT,
    ethnic_background_json TEXT,
    injury_limitations TEXT,
    preferred_units TEXT DEFAULT 'kg',
    research_opt_in INTEGER DEFAULT 0,
    job_title TEXT,
    physical_labor_level TEXT,
    sport_primary TEXT,
    sport_volume_per_week TEXT,
    sport_sessions_per_week REAL,
    vo2_max REAL,
    avg_daily_steps INTEGER,
    race_distance TEXT
  );

  CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    date TEXT NOT NULL,
    duration_min INTEGER,
    start_time TEXT,
    notes TEXT DEFAULT '',
    visibility TEXT DEFAULT 'private',
    program_id TEXT,
    template_id TEXT,
    workout_split_type TEXT,
    workout_day TEXT,
    session_effort TEXT,
    feel_rating INTEGER,
    adherence TEXT,
    substitutions_note TEXT,
    soreness_note TEXT,
    run_classification TEXT DEFAULT 'exact'
  );

  CREATE TABLE IF NOT EXISTS sets (
    id TEXT PRIMARY KEY,
    workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL,
    set_number INTEGER,
    weight_kg REAL,
    reps INTEGER,
    rir INTEGER,
    failure INTEGER DEFAULT 0,
    rom_category TEXT,
    tempo_tag TEXT,
    intensity_technique TEXT,
    machine_brand TEXT,
    machine_model TEXT,
    equipment_type TEXT,
    set_type TEXT DEFAULT 'working',
    session_position INTEGER,
    session_set_order INTEGER,
    rest_seconds INTEGER,
    pain_flag INTEGER DEFAULT 0,
    variation_details TEXT,
    set_notes TEXT,
    planned_exercise_id TEXT,
    template_set_id TEXT,
    substitution_for TEXT
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    primary_muscle TEXT NOT NULL,
    secondary_muscle TEXT,
    movement_pattern TEXT,
    equipment_type TEXT,
    force_vector TEXT,
    bilateral INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS custom_exercises (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    primary_muscle TEXT NOT NULL,
    secondary_muscle TEXT,
    movement_pattern TEXT,
    equipment_type TEXT,
    force_vector TEXT,
    bilateral INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS daily_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    sleep_duration REAL,
    sleep_quality INTEGER,
    nutrition_quality INTEGER,
    calories INTEGER,
    hydration INTEGER,
    bodyweight_kg REAL,
    subjective_energy INTEGER,
    stress_level INTEGER,
    illness_flag INTEGER DEFAULT 0,
    notes TEXT,
    UNIQUE(user_id, date)
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    activity_type TEXT,
    duration_min INTEGER,
    intensity INTEGER,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS body_metrics_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    bodyweight_kg REAL,
    arm_cm REAL,
    chest_cm REAL,
    waist_cm REAL,
    thigh_cm REAL,
    calf_cm REAL
  );

  CREATE TABLE IF NOT EXISTS prs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL,
    weight_kg REAL,
    reps INTEGER,
    date TEXT,
    set_id TEXT
  );

  CREATE TABLE IF NOT EXISTS follows (
    follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (follower_id, following_id)
  );

  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    title TEXT DEFAULT '',
    body TEXT DEFAULT '',
    attachment_type TEXT,
    attachment_id TEXT,
    study_feature_json TEXT,
    score INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    visibility TEXT DEFAULT 'public',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS post_labels (
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    PRIMARY KEY (post_id, label)
  );

  CREATE TABLE IF NOT EXISTS post_votes (
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    value INTEGER NOT NULL,
    PRIMARY KEY (post_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS saved_posts (
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (post_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    parent_id TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comment_votes (
    comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    value INTEGER NOT NULL,
    PRIMARY KEY (comment_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS reactions (
    id TEXT PRIMARY KEY,
    workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(workout_id, user_id, reaction)
  );

  CREATE TABLE IF NOT EXISTS feed_posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    caption TEXT DEFAULT '',
    visibility TEXT DEFAULT 'public',
    created_at TEXT NOT NULL,
    UNIQUE(user_id, source_type, source_id)
  );

  CREATE TABLE IF NOT EXISTS active_workouts (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workout_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    visibility TEXT DEFAULT 'private',
    status TEXT DEFAULT 'final',
    source_workout_id TEXT,
    workout_split_type TEXT,
    workout_day TEXT,
    strictness TEXT DEFAULT 'adapt',
    source_template_id TEXT,
    created_at TEXT NOT NULL,
    usage_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS template_exercises (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL,
    sort_order INTEGER
  );

  CREATE TABLE IF NOT EXISTS template_sets (
    id TEXT PRIMARY KEY,
    template_exercise_id TEXT NOT NULL REFERENCES template_exercises(id) ON DELETE CASCADE,
    target_reps TEXT,
    target_weight_kg REAL,
    target_rir INTEGER,
    target_rep_range TEXT,
    set_type TEXT DEFAULT 'working',
    rom_category TEXT,
    tempo_tag TEXT,
    intensity_technique TEXT,
    rest_seconds INTEGER,
    failure INTEGER DEFAULT 0,
    variation_details TEXT
  );

  CREATE TABLE IF NOT EXISTS programs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    weeks INTEGER DEFAULT 1,
    visibility TEXT DEFAULT 'public',
    status TEXT DEFAULT 'final',
    strictness TEXT DEFAULT 'adapt',
    is_open_ended INTEGER DEFAULT 1,
    checkpoint_weeks INTEGER DEFAULT 6,
    source_program_id TEXT,
    creator_verified INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS program_blocks (
    id TEXT PRIMARY KEY,
    program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    repeat_behavior TEXT DEFAULT 'repeat'
  );

  CREATE TABLE IF NOT EXISTS program_workouts (
    id TEXT PRIMARY KEY,
    program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL,
    block_id TEXT,
    week_number INTEGER DEFAULT 1,
    day_number INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    session_label TEXT,
    session_note TEXT,
    optional INTEGER DEFAULT 0,
    timing_preset TEXT DEFAULT 'after_1_rest_day',
    timing_min_hours INTEGER,
    timing_ideal_hours INTEGER,
    timing_max_hours INTEGER
  );

  CREATE TABLE IF NOT EXISTS program_enrollments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    started_at TEXT NOT NULL,
    completed_at TEXT,
    minimum_weeks_ack INTEGER DEFAULT 0,
    expected_minimum_weeks INTEGER DEFAULT 6,
    UNIQUE(program_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS user_program_phase (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id TEXT NOT NULL,
    week_number INTEGER DEFAULT 1,
    block_id TEXT,
    sequence_position INTEGER DEFAULT 0,
    next_session_id TEXT,
    next_suggested_at TEXT,
    timing_status TEXT DEFAULT 'on_track',
    adaptation_decision TEXT,
    started_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, program_id)
  );

  CREATE TABLE IF NOT EXISTS user_exercise_profile (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL,
    week TEXT NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    weeks_of_data INTEGER DEFAULT 0,
    avg_weekly_frequency REAL,
    avg_session_position REAL,
    avg_reps REAL,
    avg_weight_kg REAL,
    estimated_1rm REAL,
    progression_rate REAL,
    rir_logging_rate REAL,
    typical_equipment TEXT,
    qualified INTEGER DEFAULT 0,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, exercise_id, week)
  );

  CREATE TABLE IF NOT EXISTS user_systemic_profile (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week TEXT NOT NULL,
    avg_sleep_duration REAL,
    avg_sleep_quality REAL,
    sleep_variance REAL,
    avg_nutrition_quality REAL,
    avg_stress REAL,
    total_cardio_minutes INTEGER,
    total_cardio_load REAL,
    running_load REAL,
    cycling_load REAL,
    swimming_load REAL,
    other_cardio_load REAL,
    bodyweight_trend REAL,
    data_completeness_score REAL,
    training_consistency REAL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, week)
  );

  CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY,
    discovered_at TEXT NOT NULL,
    title TEXT NOT NULL,
    query_json TEXT NOT NULL,
    effect_size REAL,
    n INTEGER,
    significance REAL,
    surprising INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS research_saved_questions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'single',
    query_json TEXT NOT NULL,
    evidence_status TEXT DEFAULT 'Not enough',
    qualified_users INTEGER DEFAULT 0,
    matched_users INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_sets_workout ON sets(workout_id);
  CREATE INDEX IF NOT EXISTS idx_sets_user_exercise ON sets(user_id, exercise_id);
  CREATE INDEX IF NOT EXISTS idx_daily_log_user_date ON daily_log(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_activity_log_user_date ON activity_log(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_body_metrics_user_date ON body_metrics_history(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_prs_user_exercise ON prs(user_id, exercise_id);
  CREATE INDEX IF NOT EXISTS idx_prs_set ON prs(set_id);
  CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
  CREATE INDEX IF NOT EXISTS idx_reactions_workout ON reactions(workout_id);
  CREATE INDEX IF NOT EXISTS idx_feed_posts_source ON feed_posts(source_type, source_id);
  CREATE INDEX IF NOT EXISTS idx_feed_posts_user_created ON feed_posts(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_workout_templates_user ON workout_templates(user_id);
  CREATE INDEX IF NOT EXISTS idx_template_exercises_template ON template_exercises(template_id);
  CREATE INDEX IF NOT EXISTS idx_template_sets_exercise ON template_sets(template_exercise_id);
  CREATE INDEX IF NOT EXISTS idx_program_blocks_program ON program_blocks(program_id);
  CREATE INDEX IF NOT EXISTS idx_program_workouts_program ON program_workouts(program_id);
  CREATE INDEX IF NOT EXISTS idx_program_workouts_template ON program_workouts(template_id);
  CREATE INDEX IF NOT EXISTS idx_program_enrollments_program ON program_enrollments(program_id);
  CREATE INDEX IF NOT EXISTS idx_workouts_program ON workouts(program_id);
  CREATE INDEX IF NOT EXISTS idx_uep_user_week ON user_exercise_profile(user_id, week);
  CREATE INDEX IF NOT EXISTS idx_uep_exercise_week ON user_exercise_profile(exercise_id, week);
  CREATE INDEX IF NOT EXISTS idx_usp_user_week ON user_systemic_profile(user_id, week);
  CREATE INDEX IF NOT EXISTS idx_findings_query ON findings(query_json);
  CREATE INDEX IF NOT EXISTS idx_research_saved_user_updated ON research_saved_questions(user_id, updated_at);
`)

db.exec(`
  DELETE FROM feed_posts
   WHERE source_type = 'workout'
     AND NOT EXISTS (SELECT 1 FROM workouts w WHERE w.id = feed_posts.source_id);
  DELETE FROM feed_posts
   WHERE source_type = 'pr'
     AND NOT EXISTS (SELECT 1 FROM prs p WHERE p.id = feed_posts.source_id);
  DELETE FROM prs
   WHERE set_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM sets s WHERE s.id = prs.set_id);
  DELETE FROM feed_posts
   WHERE source_type = 'pr'
     AND NOT EXISTS (SELECT 1 FROM prs p WHERE p.id = feed_posts.source_id);
`)

function hasColumn(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all([]).some(c => c.name === column)
}

function addColumn(table, column, definition) {
  if (!hasColumn(table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

;[
  ['training_started_at', 'TEXT'],
  ['protein_g_per_kg', 'REAL'],
  ['supplements_json', 'TEXT'],
  ['ethnic_background_json', 'TEXT'],
  ['job_title', 'TEXT'],
  ['physical_labor_level', 'TEXT'],
  ['sport_sessions_per_week', 'REAL'],
  ['vo2_max', 'REAL'],
  ['avg_daily_steps', 'INTEGER'],
  ['public_fields_json', "TEXT DEFAULT '[]'"],
  ['split_frequency_type', "TEXT DEFAULT 'fixed'"],
  ['split_frequency_value', "TEXT DEFAULT ''"],
].forEach(([column, definition]) => addColumn('users', column, definition))

;[
  ['protein_g_per_kg', 'REAL'],
  ['protein_g', 'REAL'],
].forEach(([column, definition]) => addColumn('daily_log', column, definition))

;[
  ['set_type', "TEXT DEFAULT 'working'"],
  ['failure', 'INTEGER DEFAULT 0'],
  ['rom_category', 'TEXT'],
  ['tempo_tag', 'TEXT'],
  ['intensity_technique', 'TEXT'],
  ['machine_brand', 'TEXT'],
  ['machine_model', 'TEXT'],
  ['equipment_type', 'TEXT'],
  ['session_position', 'INTEGER'],
  ['session_set_order', 'INTEGER'],
  ['rest_seconds', 'INTEGER'],
  ['pain_flag', 'INTEGER DEFAULT 0'],
  ['variation_details', 'TEXT'],
  ['set_notes', 'TEXT'],
  ['planned_exercise_id', 'TEXT'],
  ['template_set_id', 'TEXT'],
  ['substitution_for', 'TEXT'],
].forEach(([column, definition]) => addColumn('sets', column, definition))

;[
  ['run_classification', "TEXT DEFAULT 'exact'"],
].forEach(([column, definition]) => addColumn('workouts', column, definition))

;[
  ['top_set_pct_change', 'REAL'],
  ['logged_1rm', 'REAL'],
  ['improvement_frequency', 'REAL'],
  ['recovery_volume_tolerance', 'REAL'],
].forEach(([column, definition]) => addColumn('user_exercise_profile', column, definition))

;[
  ['status', "TEXT DEFAULT 'final'"],
  ['strictness', "TEXT DEFAULT 'adapt'"],
  ['source_template_id', 'TEXT'],
].forEach(([column, definition]) => addColumn('workout_templates', column, definition))

;[
  ['target_rep_range', 'TEXT'],
  ['rom_category', 'TEXT'],
  ['tempo_tag', 'TEXT'],
  ['intensity_technique', 'TEXT'],
  ['rest_seconds', 'INTEGER'],
  ['failure', 'INTEGER DEFAULT 0'],
  ['variation_details', 'TEXT'],
].forEach(([column, definition]) => addColumn('template_sets', column, definition))

;[
  ['strictness', "TEXT DEFAULT 'adapt'"],
  ['source_program_id', 'TEXT'],
  ['status', "TEXT DEFAULT 'final'"],
  ['is_open_ended', 'INTEGER DEFAULT 1'],
  ['checkpoint_weeks', 'INTEGER DEFAULT 6'],
].forEach(([column, definition]) => addColumn('programs', column, definition))

;[
  ['minimum_weeks_ack', 'INTEGER DEFAULT 0'],
  ['expected_minimum_weeks', 'INTEGER DEFAULT 6'],
].forEach(([column, definition]) => addColumn('program_enrollments', column, definition))

;[
  ['block_id', 'TEXT'],
  ['session_label', 'TEXT'],
  ['session_note', 'TEXT'],
  ['optional', 'INTEGER DEFAULT 0'],
  ['timing_preset', "TEXT DEFAULT 'after_1_rest_day'"],
  ['timing_min_hours', 'INTEGER'],
  ['timing_ideal_hours', 'INTEGER'],
  ['timing_max_hours', 'INTEGER'],
].forEach(([column, definition]) => addColumn('program_workouts', column, definition))

;[
  ['block_id', 'TEXT'],
  ['sequence_position', 'INTEGER DEFAULT 0'],
  ['next_session_id', 'TEXT'],
  ['next_suggested_at', 'TEXT'],
  ['timing_status', "TEXT DEFAULT 'on_track'"],
  ['adaptation_decision', 'TEXT'],
].forEach(([column, definition]) => addColumn('user_program_phase', column, definition))

// Comments were workout-scoped before the unified posts model. On older dev DBs the
// table still carries workout_id NOT NULL and lacks post_id; rebuild it to the new
// post-based shape. Safe to drop — comments were never on real user data.
if (hasColumn('comments', 'workout_id') && !hasColumn('comments', 'post_id')) {
  db.exec(`
    DROP TABLE IF EXISTS comments;
    CREATE TABLE comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      parent_id TEXT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `)
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_posts_visibility_created ON posts(visibility, created_at);
  CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
  CREATE INDEX IF NOT EXISTS idx_posts_kind ON posts(kind);
  CREATE INDEX IF NOT EXISTS idx_post_labels_label ON post_labels(label);
  CREATE INDEX IF NOT EXISTS idx_post_votes_post ON post_votes(post_id);
  CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON saved_posts(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
  CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
  CREATE INDEX IF NOT EXISTS idx_comment_votes_comment ON comment_votes(comment_id);
`)

const upsertExercise = db.prepare(`
  INSERT INTO exercises (id, name, primary_muscle, secondary_muscle, movement_pattern, equipment_type, force_vector, bilateral)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    primary_muscle = excluded.primary_muscle,
    secondary_muscle = excluded.secondary_muscle,
    movement_pattern = excluded.movement_pattern,
    equipment_type = excluded.equipment_type,
    force_vector = excluded.force_vector,
    bilateral = excluded.bilateral
`)
db.exec('BEGIN')
try {
  EXERCISES_SEED.forEach(ex => {
    upsertExercise.run([
      ex.id, ex.name, ex.primary_muscle, ex.secondary_muscle ?? null,
      ex.movement_pattern, ex.equipment_type, ex.force_vector, ex.bilateral ? 1 : 0,
    ])
  })
  db.exec('COMMIT')
} catch (err) {
  db.exec('ROLLBACK')
  throw err
}
console.log(`Synced ${EXERCISES_SEED.length} exercises`)

function runQuery(sql, params = []) {
  return db.prepare(sql).run(params)
}

function getOne(sql, params = []) {
  return db.prepare(sql).get(params)
}

function getAll(sql, params = []) {
  return db.prepare(sql).all(params)
}

module.exports = { db, runQuery, getOne, getAll }
