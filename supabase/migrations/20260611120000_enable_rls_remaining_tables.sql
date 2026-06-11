-- All data access goes through the Express server (DATABASE_URL, table owner,
-- bypasses RLS). The Supabase anon key ships inside the web/mobile bundles, so
-- every table left without RLS was fully readable AND writable through the
-- auto-generated REST API. Enable RLS (with no policies = deny-all via the API)
-- on every table the initial migration missed.

alter table public.exercises enable row level security;
alter table public.custom_exercises enable row level security;
alter table public.follows enable row level security;
alter table public.post_labels enable row level security;
alter table public.post_votes enable row level security;
alter table public.saved_posts enable row level security;
alter table public.comment_votes enable row level security;
alter table public.reactions enable row level security;
alter table public.feed_posts enable row level security;
alter table public.active_workouts enable row level security;
alter table public.workout_templates enable row level security;
alter table public.template_exercises enable row level security;
alter table public.template_sets enable row level security;
alter table public.programs enable row level security;
alter table public.program_blocks enable row level security;
alter table public.program_workouts enable row level security;
alter table public.program_enrollments enable row level security;
alter table public.user_program_phase enable row level security;
alter table public.user_exercise_profile enable row level security;
alter table public.user_systemic_profile enable row level security;
alter table public.findings enable row level security;
