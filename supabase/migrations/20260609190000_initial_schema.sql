create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  username text unique not null,
  created_at timestamptz not null default now(),
  onboarded integer default 0,
  is_private integer default 0,
  bio text default '',
  experience_level text,
  goal text,
  split_type text,
  split_days_json text,
  training_age_years real,
  training_started_at text,
  gym_type text,
  gender text,
  age_range text,
  date_of_birth text,
  country_region text,
  enhancement_status text,
  height_cm real,
  bodyweight_kg real,
  arm_cm real,
  chest_cm real,
  waist_cm real,
  thigh_cm real,
  calf_cm real,
  body_metrics_measured_at text,
  sleep_hours real,
  stress_level text,
  nutrition_phase text,
  protein_consistency text,
  protein_g_per_kg real,
  protein_g real,
  creatine_use text,
  supplements_json text,
  ethnic_background_json text,
  injury_limitations text,
  preferred_units text default 'kg',
  research_opt_in integer default 0,
  job_title text,
  physical_labor_level text,
  sport_primary text,
  sport_volume_per_week text,
  sport_sessions_per_week real,
  vo2_max real,
  avg_daily_steps integer,
  race_distance text,
  public_fields_json text default '[]',
  split_frequency_type text default 'fixed',
  split_frequency_value text default ''
);

create table if not exists public.exercises (
  id text primary key,
  name text not null,
  primary_muscle text not null,
  secondary_muscle text,
  movement_pattern text,
  equipment_type text,
  force_vector text,
  bilateral integer default 1
);

create table if not exists public.custom_exercises (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  primary_muscle text not null,
  secondary_muscle text,
  movement_pattern text,
  equipment_type text,
  force_vector text,
  bilateral integer default 1,
  created_at timestamptz not null
);

create table if not exists public.workouts (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null,
  date text not null,
  duration_min integer,
  start_time text,
  notes text default '',
  visibility text default 'private',
  program_id text,
  template_id text,
  workout_split_type text,
  workout_day text,
  session_effort text,
  feel_rating integer,
  adherence text,
  substitutions_note text,
  soreness_note text,
  run_classification text default 'exact'
);

create table if not exists public.sets (
  id text primary key,
  workout_id text not null references public.workouts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  exercise_id text not null,
  set_number integer,
  weight_kg real,
  reps integer,
  rir integer,
  failure integer default 0,
  rom_category text,
  tempo_tag text,
  intensity_technique text,
  machine_brand text,
  machine_model text,
  equipment_type text,
  set_type text default 'working',
  session_position integer,
  session_set_order integer,
  rest_seconds integer,
  pain_flag integer default 0,
  variation_details text,
  set_notes text,
  planned_exercise_id text,
  template_set_id text,
  substitution_for text
);

create table if not exists public.daily_log (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  date text not null,
  created_at timestamptz not null,
  sleep_duration real,
  sleep_quality integer,
  nutrition_quality integer,
  calories integer,
  hydration integer,
  bodyweight_kg real,
  subjective_energy integer,
  stress_level integer,
  illness_flag integer default 0,
  notes text,
  protein_g_per_kg real,
  protein_g real,
  unique(user_id, date)
);

create table if not exists public.activity_log (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  date text not null,
  created_at timestamptz not null,
  activity_type text,
  duration_min integer,
  intensity integer,
  notes text
);

create table if not exists public.body_metrics_history (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  date text not null,
  created_at timestamptz not null,
  bodyweight_kg real,
  arm_cm real,
  chest_cm real,
  waist_cm real,
  thigh_cm real,
  calf_cm real
);

create table if not exists public.prs (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  exercise_id text not null,
  weight_kg real,
  reps integer,
  date text,
  set_id text
);

create table if not exists public.follows (
  follower_id uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  primary key (follower_id, following_id)
);

create table if not exists public.posts (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null,
  title text default '',
  body text default '',
  attachment_type text,
  attachment_id text,
  study_feature_json text,
  score integer default 0,
  comment_count integer default 0,
  visibility text default 'public',
  created_at timestamptz not null
);

create table if not exists public.post_labels (
  post_id text not null references public.posts(id) on delete cascade,
  label text not null,
  primary key (post_id, label)
);

create table if not exists public.post_votes (
  post_id text not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  value integer not null,
  primary key (post_id, user_id)
);

create table if not exists public.saved_posts (
  post_id text not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null,
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id text primary key,
  post_id text not null references public.posts(id) on delete cascade,
  parent_id text,
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  score integer default 0,
  created_at timestamptz not null
);

create table if not exists public.comment_votes (
  comment_id text not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  value integer not null,
  primary key (comment_id, user_id)
);

create table if not exists public.reactions (
  id text primary key,
  workout_id text not null references public.workouts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reaction text not null,
  created_at timestamptz not null,
  unique(workout_id, user_id, reaction)
);

create table if not exists public.feed_posts (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  source_type text not null,
  source_id text not null,
  caption text default '',
  visibility text default 'public',
  created_at timestamptz not null,
  unique(user_id, source_type, source_id)
);

create table if not exists public.active_workouts (
  user_id uuid primary key references public.users(id) on delete cascade,
  state_json text not null,
  updated_at timestamptz not null
);

create table if not exists public.workout_templates (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text default '',
  visibility text default 'private',
  status text default 'final',
  source_workout_id text,
  workout_split_type text,
  workout_day text,
  strictness text default 'adapt',
  source_template_id text,
  created_at timestamptz not null,
  usage_count integer default 0
);

create table if not exists public.template_exercises (
  id text primary key,
  template_id text not null references public.workout_templates(id) on delete cascade,
  exercise_id text not null,
  sort_order integer
);

create table if not exists public.template_sets (
  id text primary key,
  template_exercise_id text not null references public.template_exercises(id) on delete cascade,
  target_reps text,
  target_weight_kg real,
  target_rir integer,
  target_rep_range text,
  set_type text default 'working',
  rom_category text,
  tempo_tag text,
  intensity_technique text,
  rest_seconds integer,
  failure integer default 0,
  variation_details text
);

create table if not exists public.programs (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text default '',
  weeks integer default 1,
  visibility text default 'public',
  status text default 'final',
  strictness text default 'adapt',
  is_open_ended integer default 1,
  checkpoint_weeks integer default 6,
  source_program_id text,
  creator_verified integer default 0,
  created_at timestamptz not null
);

create table if not exists public.program_blocks (
  id text primary key,
  program_id text not null references public.programs(id) on delete cascade,
  name text not null,
  description text default '',
  sort_order integer default 0,
  repeat_behavior text default 'repeat'
);

create table if not exists public.program_workouts (
  id text primary key,
  program_id text not null references public.programs(id) on delete cascade,
  template_id text not null,
  block_id text,
  week_number integer default 1,
  day_number integer default 1,
  sort_order integer default 0,
  session_label text,
  session_note text,
  optional integer default 0,
  timing_preset text default 'after_1_rest_day',
  timing_min_hours integer,
  timing_ideal_hours integer,
  timing_max_hours integer
);

create table if not exists public.program_enrollments (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  program_id text not null references public.programs(id) on delete cascade,
  status text default 'active',
  started_at timestamptz not null,
  completed_at timestamptz,
  minimum_weeks_ack integer default 0,
  expected_minimum_weeks integer default 6,
  unique(program_id, user_id)
);

create table if not exists public.user_program_phase (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  program_id text not null,
  week_number integer default 1,
  block_id text,
  sequence_position integer default 0,
  next_session_id text,
  next_suggested_at timestamptz,
  timing_status text default 'on_track',
  adaptation_decision text,
  started_at timestamptz not null,
  updated_at timestamptz not null,
  unique(user_id, program_id)
);

create table if not exists public.user_exercise_profile (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  exercise_id text not null,
  week text not null,
  total_sessions integer default 0,
  weeks_of_data integer default 0,
  avg_weekly_frequency real,
  avg_session_position real,
  avg_reps real,
  avg_weight_kg real,
  estimated_1rm real,
  progression_rate real,
  rir_logging_rate real,
  typical_equipment text,
  qualified integer default 0,
  top_set_pct_change real,
  logged_1rm real,
  improvement_frequency real,
  recovery_volume_tolerance real,
  updated_at timestamptz not null,
  unique(user_id, exercise_id, week)
);

create table if not exists public.user_systemic_profile (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  week text not null,
  avg_sleep_duration real,
  avg_sleep_quality real,
  sleep_variance real,
  avg_nutrition_quality real,
  avg_stress real,
  total_cardio_minutes integer,
  total_cardio_load real,
  running_load real,
  cycling_load real,
  swimming_load real,
  other_cardio_load real,
  bodyweight_trend real,
  data_completeness_score real,
  training_consistency real,
  updated_at timestamptz not null,
  unique(user_id, week)
);

create table if not exists public.findings (
  id text primary key,
  discovered_at timestamptz not null,
  title text not null,
  query_json text not null,
  effect_size real,
  n integer,
  significance real,
  surprising integer default 0
);

create table if not exists public.research_saved_questions (
  id text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  label text not null,
  mode text not null default 'single',
  query_json text not null,
  evidence_status text default 'Not enough',
  qualified_users integer default 0,
  matched_users integer default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create or replace function public.hot_rank(score integer, created_at timestamptz)
returns double precision
language sql
stable
as $$
  select (coalesce(score, 0) + 1)::double precision
       / power(greatest(0, extract(epoch from (now() - created_at)) / 3600) + 2, 1.5)
$$;

create index if not exists idx_workouts_user_date on public.workouts(user_id, date);
create index if not exists idx_sets_workout on public.sets(workout_id);
create index if not exists idx_sets_user_exercise on public.sets(user_id, exercise_id);
create index if not exists idx_daily_log_user_date on public.daily_log(user_id, date);
create index if not exists idx_activity_log_user_date on public.activity_log(user_id, date);
create index if not exists idx_body_metrics_user_date on public.body_metrics_history(user_id, date);
create index if not exists idx_prs_user_exercise on public.prs(user_id, exercise_id);
create index if not exists idx_prs_set on public.prs(set_id);
create index if not exists idx_follows_following on public.follows(following_id);
create index if not exists idx_reactions_workout on public.reactions(workout_id);
create index if not exists idx_feed_posts_source on public.feed_posts(source_type, source_id);
create index if not exists idx_feed_posts_user_created on public.feed_posts(user_id, created_at);
create index if not exists idx_workout_templates_user on public.workout_templates(user_id);
create index if not exists idx_template_exercises_template on public.template_exercises(template_id);
create index if not exists idx_template_sets_exercise on public.template_sets(template_exercise_id);
create index if not exists idx_program_blocks_program on public.program_blocks(program_id);
create index if not exists idx_program_workouts_program on public.program_workouts(program_id);
create index if not exists idx_program_workouts_template on public.program_workouts(template_id);
create index if not exists idx_program_enrollments_program on public.program_enrollments(program_id);
create index if not exists idx_workouts_program on public.workouts(program_id);
create index if not exists idx_uep_user_week on public.user_exercise_profile(user_id, week);
create index if not exists idx_uep_exercise_week on public.user_exercise_profile(exercise_id, week);
create index if not exists idx_usp_user_week on public.user_systemic_profile(user_id, week);
create index if not exists idx_findings_query on public.findings(query_json);
create index if not exists idx_research_saved_user_updated on public.research_saved_questions(user_id, updated_at);
create index if not exists idx_posts_visibility_created on public.posts(visibility, created_at);
create index if not exists idx_posts_user on public.posts(user_id);
create index if not exists idx_posts_kind on public.posts(kind);
create index if not exists idx_post_labels_label on public.post_labels(label);
create index if not exists idx_post_votes_post on public.post_votes(post_id);
create index if not exists idx_saved_posts_user on public.saved_posts(user_id, created_at);
create index if not exists idx_comments_post on public.comments(post_id);
create index if not exists idx_comments_parent on public.comments(parent_id);
create index if not exists idx_comment_votes_comment on public.comment_votes(comment_id);

alter table public.users enable row level security;
alter table public.workouts enable row level security;
alter table public.sets enable row level security;
alter table public.daily_log enable row level security;
alter table public.activity_log enable row level security;
alter table public.body_metrics_history enable row level security;
alter table public.prs enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.research_saved_questions enable row level security;
