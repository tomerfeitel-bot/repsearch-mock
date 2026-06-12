-- Community moderation (2026-06-12): the App Store Guideline 1.2 (UGC) minimum.
-- user_blocks = mutual invisibility between two users; reports = user-filed
-- flags on posts/comments/users with an admin review status. comments.deleted
-- soft-deletes mid-thread comments without re-rooting replies; users.banned
-- locks an account out of every authenticated route.
-- All access goes through the Express server (table owner, bypasses RLS);
-- RLS is enabled with no policies so the anon REST API stays deny-all.

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null,
  primary key (blocker_id, blocked_id)
);
create index if not exists idx_user_blocks_blocked on public.user_blocks(blocked_id);

create table if not exists public.reports (
  id text primary key,
  reporter_id uuid not null references public.users(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  -- Content owner at report time; the report survives content removal so the
  -- admin can still act on the account.
  target_user_id uuid references public.users(id) on delete cascade,
  reason text not null,
  details text default '',
  -- Snapshot of the reported text so review works even after deletion.
  excerpt text default '',
  status text not null default 'open',
  created_at timestamptz not null,
  reviewed_at timestamptz,
  resolution_note text default '',
  unique (reporter_id, target_type, target_id)
);
create index if not exists idx_reports_status_created on public.reports(status, created_at);

alter table public.comments add column if not exists deleted integer default 0;
alter table public.users add column if not exists banned integer default 0;

alter table public.user_blocks enable row level security;
alter table public.reports enable row level security;
