# Backend Operations Runbook

How RepSearch's backend is run, separated, backed up, and watched. Written for the owner — every step here is either a one-time account task or a copy-paste command.

## Architecture (current, verified 2026-06-12)

- **Supabase** provides Postgres (the only database) and Auth (sign-up/login, JWT tokens). RLS is enabled on every table with no policies, so the anon key that ships in the apps can do nothing against the database directly — it is only used for Auth.
- **Express server** (`server/`) is the only thing that reads/writes data. It connects to Supabase Postgres through the transaction pooler (port 6543) using `DATABASE_URL`, verifies every request's token against Supabase Auth, and enforces all visibility/ownership rules. It also runs the weekly research batch (Mondays 03:00 server time).
- Clients (web `src/`, mobile `mobile/`) talk to Supabase only for Auth and to the Express server for everything else.

This split is coherent: keep it. Do not give clients database access or add Supabase RLS policies that open tables — the server is the gatekeeper.

## Environment separation

Right now there is **one** Supabase project used for everything. Before real users:

1. Create a **second Supabase project** named `repsearch-prod` (keep the current one as dev).
2. Apply all migrations in `supabase/migrations/` to it (see Migrations below).
3. Run `node server/seed.js` once against it (with prod `DATABASE_URL` in the env) to load the exercise library.
4. Deploy the Express server with the prod project's values in its environment (see `server/.env.example`). Never point a deployed server at the dev project.
5. Staging is optional at this scale; if wanted, it's a third project set up the same way.

Rule of thumb: **dev data and prod data never live in the same project**, and the prod service-role key exists only in the deployed server's secret store.

## Migrations

Schema lives in `supabase/migrations/*.sql`, applied in filename order. Each file is idempotent (`if not exists`). To apply to any project:

- With the Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`.
- Without the CLI: open the project's SQL Editor in the Supabase dashboard and paste each new migration file, oldest first.

Never edit a migration that has already been applied to prod — add a new file.

## Backups and restore

- Supabase paid plans include daily automated backups; **Pro adds Point-in-Time Recovery (PITR)**. Before public beta, upgrade the prod project to Pro and enable PITR — body-measurement and workout data is not re-creatable by users.
- Restore drill (do this once before beta): Dashboard → Database → Backups → restore the latest backup into a new project, point a local server at it, confirm a workout you logged appears. Write down how long it took.
- The exercise library can always be re-seeded from `server/exercisesSeed.js`; user data cannot.

## Secrets

- `server/.env` is gitignored; `mobile/.env` is committed but contains only the publishable anon key (safe by design).
- Secrets that must stay server-side: `DATABASE_URL` (contains the DB password), `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_BATCH_TOKEN`.
- If the service-role key or DB password ever leaks: Supabase dashboard → Settings → API → rotate the key, and Settings → Database → reset password; update the deployed server's env.

## Deployment

The server is a single Node process (`npm start` in `server/`). Any Node host works (Railway, Render, Fly.io). Requirements:

- Set every variable from `server/.env.example`; production additionally needs `ADMIN_BATCH_TOKEN`, `CORS_ORIGIN` (the web app's origin), and `TRUST_PROXY=1` if the host puts a proxy in front (they all do).
- The mobile app needs the deployed URL in `EXPO_PUBLIC_API_URL` (https — release builds refuse http).
- One instance is enough for beta. The weekly cron runs inside the process; if you ever run two instances, only one may run the batch (set up then).

## Monitoring (minimum viable)

- **Uptime:** point a free pinger (UptimeRobot or similar) at `GET /api/health` — it returns `{ ok: true, exercises: N }` and exercises must be > 0. Alert on non-200.
- **Errors:** the server logs every 5xx with `[api]` prefix; the host's log view + alert on error-rate is the beta-level answer. Add Sentry when convenient (one `Sentry.init` + the Express handler).
- **Database:** Supabase dashboard → Reports shows connections, slow queries, disk. Glance weekly during beta.
- **Batch:** Monday's cron logs `[batch] Recomputed profiles for N users in Xms (Y failures)` — check after the first Monday in prod.

## Capacity notes (as hardened 2026-06-12)

- DB pool: 10 connections per process (`DATABASE_POOL_MAX`), 15s client-side query timeout, all multi-step writes in real transactions.
- Feeds and post lists are capped at limit ≤ 50, offset ≤ 500; research preview/scan fan-out capped at 24 axes; research queries enforce cohort minimums (≥10, ≥30 for lifestyle axes) server-side.
- The expensive research aggregates read precomputed weekly profile tables (`user_exercise_profile`, `user_systemic_profile`), not raw sets, except the explicitly set-level measures. If those ever get slow, the fix is precomputing set-level aggregates in the weekly batch — not raising timeouts.
