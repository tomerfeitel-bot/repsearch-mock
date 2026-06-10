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
- Social feed UX = content-first poster feed (Community layout governed by `DESIGN.md`): graph-as-hero full-bleed items, one-tap kudos, achievement badges, no autoplay/stories/engagement loops.
- Study page = research tool tone. Restrained surface, monospace numbers, headline-style featured questions, no celebrations.
- Progress page = dashboard: stat tiles + chart blocks, earth-toned splits from the Dark Jewel palette.
- Progressive disclosure: simplest UI first, complexity on tap. Beginners see weight x reps; power users pin advanced fields.
- Hierarchy: one hero number per unit/tile. Secondary dim. Tertiary collapsed.
- Reward every tap within 100ms. Every empty state has copy. Every async has skeleton + error Toast.
- Mobile-first 412px. Tap targets >= 44px. Content padding ~16px. See `DESIGN.md` for the de-bubble law (structure via space + hairlines, not stacked cards).

## What NOT to do
No TypeScript. No ORM. No Redux/Zustand. No Puter. No AI features. No machine photo identification. No comments explaining WHAT code does -- only non-obvious WHY. No documentation files unless explicitly asked. No new files unless necessary. Never use the `impeccable` skill unless the user explicitly asks for it by name. Do not invoke it proactively, as part of any other task, or as a follow-up suggestion.

## Research engine philosophy
The differentiator. Every data-collection decision asks: "does this enable a research question we couldn't answer otherwise?" Flexible /query endpoint supports stacked filters (users + user_systemic_profile + user_exercise_profile + exercises) + group-by + measure. Enforces minimum cohort size (n >= 10 standard, n >= 30 for lifestyle correlations). Whitelist every column and operator. Never interpolate user input into SQL.

## Verification
Before declaring any task done: `npm run dev`, open the affected screen at http://localhost:5173, walk the flow end-to-end. Type checking and tests verify code correctness, not feature correctness.

## Design Context
Register: **product** — design serves the task, not the brand.
Personality: Serious · Precise · Communal. Speaks like a knowledgeable training partner, not a marketing coach.
Palette: dark "gym hardware" — deep near-neutral black ground `#08090a`, dark surfaces `#141615`, light graphite accent, brass signature `#d59a3a`. Expressive color is the "Dark Jewel" set. Defined in `src/index.css` (:root tokens) and `tailwind.config.js` (gray/accent ramps).
Type: Inter (sans) + JetBrains Mono (mono), fixed rem scale `micro` (11px) → `display` (24px), ~1.12–1.2 ratio.
Full strategic brief: see `PRODUCT.md`. **Visual system: see `DESIGN.md`** (the source of truth for tiers, color, the de-bubble law, and per-tab direction).
