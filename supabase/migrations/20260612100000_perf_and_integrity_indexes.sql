-- Production-readiness pass (2026-06-12): indexes the audit found missing.
--
-- 1) Research set-level queries (queryEngine "set" measures/axes) filter
--    sets by exercise across ALL opted-in users — only (user_id, exercise_id)
--    and (workout_id) existed, so these were full-table scans.
create index if not exists idx_sets_exercise on public.sets(exercise_id);

-- 2) The global feed filters workouts by visibility before sorting; without
--    this every request walked the whole workouts table.
create index if not exists idx_workouts_visibility_created on public.workouts(visibility, created_at);

-- 3) Active-program lookup (GET /programs/active/next) runs on every Workout
--    tab open and filtered program_enrollments by user_id with no index
--    (the unique key starts with program_id).
create index if not exists idx_program_enrollments_user on public.program_enrollments(user_id);

-- 4) ON DELETE CASCADE from users(id) needs an index on each referencing
--    column or account deletion degrades to sequential scans per table.
create index if not exists idx_comments_user on public.comments(user_id);
create index if not exists idx_post_votes_user on public.post_votes(user_id);
create index if not exists idx_comment_votes_user on public.comment_votes(user_id);
create index if not exists idx_reactions_user on public.reactions(user_id);
create index if not exists idx_programs_user on public.programs(user_id);
create index if not exists idx_custom_exercises_user on public.custom_exercises(user_id);
