# AGENTS.md -- RepSearch v2

## Project
Mobile-first PWA fitness tracker. Differentiator: population-level fitness research powered by real opt-in user data. Average users log workouts; advanced users contribute to and explore real fitness science via a flexible cross-variable research engine.

## Reference repo (read-only)
Older version exists at `C:\Users\gilad\repsearch`. May be read for proven patterns: exercise seed data, JWT auth, weekly batch aggregation, UI primitives. Do NOT copy from it: pages (Feed, Onboarding, Auth, Profile, ActiveWorkout, Progress, Templates, Programs, Research, Insights), Puter integration, AI features, the concepts folder. The reference's research engine has 5 rigid endpoints -- they are superseded by our flexible /query + /compare-cohorts.

## Stack -- do not change without asking
React 19 + Router 7 + Vite + Tailwind 3 + Recharts + GSAP. JavaScript only. No TypeScript.
Express 4 + node-sqlite3-wasm + JWT + bcryptjs + node-cron + cors.
SQLite file at `server/repsearch.db`. Schema in `server/db.js`. No ORM.
Vite proxies /api -> :3001.

## Architecture
Monorepo (root frontend + `server/` backend, separate npm packages). State = custom hooks in `src/hooks/` + Toast Context. API calls via `src/lib/api.js`. Routes by domain in `server/routes/`. All DB access parameterized.

## UI/UX north stars
- Workout logging UX = Hevy. Compact set rows, tap-checkmark satisfaction, ghosted previous-performance hints, rest timer pill, mid-workout floating bar above nav, dynamic exercise reorder by first-set timestamp.
- Social feed UX = Strava. Activity-first, big-number hierarchy, one-tap kudos + double-tap reaction, achievement badges, no autoplay/stories/engagement loops.
- Study page = research tool tone. Restrained palette (one accent), monospace numbers, headline-style featured questions, no celebrations.
- Progress page = warm editorial palette (beige + cream + earth tones for splits).
- Progressive disclosure: simplest UI first, complexity on tap. Beginners see weight x reps; power users pin advanced fields.
- Hierarchy: one hero number per card. Secondary dim. Tertiary collapsed.
- Reward every tap within 100ms. Every empty state has copy. Every async has skeleton + error Toast.
- Mobile-first 412px. Tap targets >= 44px. Card padding ~16px. Indigo (#6366f1) = brand only.

## What NOT to do
No TypeScript. No ORM. No Redux/Zustand. No Puter. No AI features. No machine photo identification. No comments explaining WHAT code does -- only non-obvious WHY. No documentation files unless explicitly asked. No new files unless necessary. Do not use the `impeccable` skill unless the user explicitly asks for it by name.

## Research engine philosophy
The differentiator. Every data-collection decision asks: "does this enable a research question we couldn't answer otherwise?" Flexible /query endpoint supports stacked filters (users + user_systemic_profile + user_exercise_profile + exercises) + group-by + measure. Enforces minimum cohort size (n >= 10 standard, n >= 30 for lifestyle correlations). Whitelist every column and operator. Never interpolate user input into SQL.

## Verification
Before declaring any task done: `npm run dev`, open the affected screen at http://localhost:5173, walk the flow end-to-end. Type checking and tests verify code correctness, not feature correctness.
