# RepSearch: Full Web → iOS & Android Native Migration (Expo React Native)

## How to Run Each Session

Start a **new Fable 5 chat** for each session. Use this prompt, changing only the bold parts:

> Read `docs/mobile-migration-plan.md` in the `tomerfeitel-bot/repsearch-mock` repo. Sessions **[list completed sessions, e.g. "1 and 2"]** are complete and committed to the `claude/native-mobile-feasibility-w6w9j0` branch. Execute **Session [N] — [session name from the plan]**. Follow the decision gates — stop and ask me before any choice marked with a D-number. When the session is done, commit and push to `claude/native-mobile-feasibility-w6w9j0` and tell me what to do to verify on my phone.

For Session 1, the completed sessions list is empty — just say "No previous sessions are complete yet."

---

## Session 1 — COMPLETE (2026-06-10)

The app lives in `mobile/` (see `mobile/AGENTS.md` for architecture + commands). Outcomes future sessions must know:

- **Pinned to Expo SDK 54 — do not upgrade before Session 5.** Expo stopped shipping new SDKs to the App Store/Play Store version of Expo Go (May 2026); the store version supports SDK 54 only, and NativeWind v4 officially targets SDK 54. Keep `babel-preset-expo` pinned to `~54.x` — npm pulls the v56 preset by default, which stops lowering private class fields and breaks Hermes bytecode compilation on RN 0.81.
- **D1:** "RepSearch" / `com.repsearch.app`, placeholder icon/splash until Session 6. **D2 (verified in code):** hybrid backend — Supabase Auth on the client, ALL data via the Express server (`server/`, port 3002, queries Supabase Postgres); nothing is deployed, so `mobile/lib/api.ts` auto-derives the dev machine's LAN IP. **D4:** native pickers (`PickerSheet`).
- The web `.env` / `server/.env` Supabase URLs include a `/rest/v1/` suffix that supabase-js must NOT receive; the mobile `.env` strips it. (Likely a live bug in the web/server config — flagged separately.)
- `mobile/hooks/useWorkout.tsx` is a stub and `app/(tabs)/workout.tsx` has temporary overlay-test buttons — Session 3 replaces both.

---

## Context
RepSearch is a React 19 + Vite web app (~15,000 lines, 80+ files). The backend has **already been migrated to Supabase** (Postgres + Supabase Auth), replacing the old SQLite + custom-JWT setup. This plan covers everything remaining: pre-work decisions, then building a native iOS + Android app via Expo React Native that matches the web app feature-for-feature. The backend is not rebuilt — the mobile app talks to the same Supabase project.

**Your constraints (decided):**
- **Charts:** Victory Native XL (closest to current Recharts look)
- **Testing:** Expo Go (free, QR-code preview) for early sessions → switch to an **EAS Development Build** once you create an Apple Developer account ($99/yr). Victory Native uses Skia, which does **not** run in Expo Go — so all chart work is deliberately grouped into one late session (Session 5), which is exactly where you'll need the dev build.
- **Scope:** Exact parity with the web app. Push notifications, Apple Health, offline sync are explicitly **out of scope** for v1.

The ~12 concept/design pages and the old `mockApi.js` are dropped entirely.

---

## Decision Gates — Things the Execution Sessions MUST Ask You Before Changing

These are the points where I will stop and ask you (via a question) before making the change, because they're your call, not a code decision:

| # | Decision | When it comes up | Default if you don't care |
|---|---|---|---|
| D1 | **App name, bundle ID, icon, splash screen** (e.g. `com.repsearch.app`) | Session 1, before scaffold | Use "RepSearch" + a placeholder icon, swap later |
| D2 | **Confirm Supabase architecture**: is ALL logic on Supabase now, or is a custom server (research queries, batch jobs) still running separately? The mobile app needs the right URL(s). | Session 1, first thing | Ask before writing the API client |
| D3 | **Where builders live in navigation**: TemplateBuilder/ProgramBuilder as full-screen pushes vs modal sheets (mobile UX differs from web) | Session 4 | Full-screen push (most native-feeling) |
| D4 | **Onboarding wheel-picker style**: recreate the custom spinning drum, or use the native iOS/Android wheel picker (simpler, more native) | Session 1 | Native wheel picker (less risk) |
| D5 | **App Store metadata**: description, keywords, privacy policy text, screenshots, age rating | Session 6 | Ask — these are legally yours to write |
| D6 | **Health-data privacy disclosure** wording (bodyweight, measurements are sensitive) | Session 6 | Ask before submitting |

---

## Recreate vs. Migrate — Things Cheaper to Rebuild Fresh

For these, porting the web code line-by-line is more work (and more bug-prone) than rebuilding the behavior natively. The plan **recreates** these rather than translating them:

| Component | Why recreate instead of migrate |
|---|---|
| **BottomNav.jsx** | The web version is a hand-built fixed bar with manual show/hide path logic. Expo Router's `<Tabs>` navigator gives the 5-tab + raised FAB layout natively — recreate, don't port. |
| **Sheet.jsx** | Built on `document.body.style.overflow` DOM hacks. RN's `<Modal>` does slide-up + scroll-lock natively. Rebuild on `<Modal>` / `@gorhom/bottom-sheet`. |
| **Toast.jsx** | `fixed` positioning + DOM portal. Rebuild with a root-level absolutely-positioned view; keep the same `ToastProvider` context API so callers don't change. |
| **BubbleHeader.jsx** | CSS-variable scroll trick (`--collapse`) is web-only and has no RN equivalent. Recreate the collapse with a Reanimated `useAnimatedScrollHandler` (cleaner than porting). Used on 4 screens — build once. |
| **Onboarding WheelPicker** | Bespoke snap-scroll drum. Recreate with the native picker (D4) unless you want the exact drum. |
| **"Load more" pagination** | Recreate as `FlatList` `onEndReached` auto-pagination (the native pattern) instead of porting the button. |
| **Route guards (App.jsx)** | Recreate with Expo Router's `useSegments` redirects instead of porting `<Navigate>` components. |
| **mockApi.js + concept pages** | **Delete.** Not needed (Supabase is live; concepts were dev-only). |

**Migrated mostly as-is** (copy + light edits): all custom hooks (`useWorkout`, `usePosts`, `useResearch`, `useSocial`, `useDailyCheckin`), all `src/lib` utilities (`formatTime`, `timeAgo`, `units`, `exercises`, `musclePalette`, `queryParser`, etc.), and all business logic. `useAuth` + `api.js` get rebuilt around the Supabase client (D2).

---

## Dependency Swaps (Web → Mobile)

| Web | Mobile |
|---|---|
| React Router | Expo Router (file-based) |
| `localStorage` token | Supabase session (auto-persisted via `expo-secure-store` — Keychain/Keystore) |
| Tailwind classNames | NativeWind v4 (classNames reused almost verbatim) |
| Recharts | **Victory Native XL** (Skia) |
| GSAP | React Native Reanimated v3 |
| `document` / `window` / `getBoundingClientRect` | RN Modal / `onScroll` / `measure()` |
| `navigator.vibrate` | `expo-haptics` |
| `<input type=date>` / `<select>` / `<textarea>` | datetimepicker / PickerSheet / `TextInput multiline` |
| `fixed` / `sticky` | `position:'absolute'` + `zIndex` |

---

## The Migration — 6 Fable 5 Sessions

> Each session is a separate Fable 5 chat. Run them in order. **Every session ends with a `/verify` check you do on your phone** before moving on. Sessions 1–4 run in **free Expo Go**; Sessions 5–6 need the **EAS dev build** (= the Apple Developer account).

---

### Session 1 — Foundation & Navigation Shell
**Effort: High · Model: Fable 5 (high effort) · Test: Expo Go**
**Decision gates: D1 (app identity), D2 (backend URL), D4 (picker style)**

- Scaffold the Expo project, install all dependencies, configure NativeWind + Reanimated + Expo Router
- Wire the Supabase client; rebuild `api.js` + `useAuth` around the Supabase session (token storage handled by Supabase/SecureStore automatically)
- **Recreate** shared primitives: Sheet (RN Modal), Toast, PillTabs, Avatar, Spinner, BubbleHeader (Reanimated scroll)
- **Recreate** the navigation shell: Expo Router `<Tabs>` (5 slots + raised workout FAB), route guards, global FloatingWorkoutBar + RestTimerPill overlays
- Build Auth + Onboarding screens (TextInputs, slider, datetimepicker, PickerSheet)

**You confirm on your phone:** App boots, you can register, complete onboarding, log in, log out, and see the 5-tab bar with blank placeholder screens that don't crash.

---

### Session 2 — Community & Social Screens
**Effort: High · Model: Fable 5 (high effort) · Test: Expo Go**

- Community feed (FlatList auto-pagination), FeedCard, PostCard, PlansTab
- PostComposer, DailyCheckinModal, filter sheets
- PostDetail (comment thread + reply composer with `KeyboardAvoidingView`)
- UserProfile, PublicWorkout (compare view)
- **Animation:** FeedCard double-tap heart, recreated with `GestureDetector` + Reanimated (works in Expo Go)

**You confirm on your phone:** Feed loads with all card types, reactions work, double-tap shows a heart burst, filter + compose sheets open, tapping a post opens the full thread, tapping a username opens their profile.

---

### Session 3 — Workout Screen (the big one)
**Effort: Very High · Model: Fable 5 (high effort) · Test: Expo Go**

- ActiveWorkout: sticky header with live totals, exercise list
- SetRow + all 8 mini-controls (RIR ticker, rest picker, ROM/tempo selects, failure/pain flags); `keyboardType="decimal-pad"`, long-press via `Pressable`
- ExerciseCard (collapsible, scroll-to via FlatList), AddExerciseSheet (debounced search), FinishSheet, StartScreen
- RestTimerPill with `expo-haptics`
- **Animations:** SetRow checkmark bounce + CelebrationCard entrance, recreated in Reanimated (Expo Go OK)

**You confirm on your phone:** Full workout flow — start blank workout, add exercises, enter sets, checkmark bounces, rest timer buzzes, finish, see the CelebrationCard fade in with muscle breakdown and PRs.

---

### Session 4 — Profile, Builders & Settings
**Effort: High · Model: Fable 5 (high effort) · Test: Expo Go**
**Decision gate: D3 (builders as screens vs sheets)**

- Profile screen (athlete card, stats, follow), edit-profile sheet (date/select/textarea inputs)
- DailyLogHub (daily check-in form + history), PlansTab
- TemplateBuilder + ProgramBuilder (form-heavy, auto-save; scroll-to via FlatList)
- Settings / logout action sheet

**You confirm on your phone:** Profile loads with correct stats, edit sheet saves, daily check-in submits, you can create/edit a template and a program and they save.

---

### Session 5 — Charts: Progress & Study  ⚠️ REQUIRES EAS DEV BUILD
**Effort: Very High · Model: Fable 5 (high effort) · Test: EAS Development Build (Apple Developer account needed)**

> This is the session where you switch off Expo Go. Victory Native uses Skia, which needs the dev build. Get the Apple Developer account before starting this session.

- Migrate all 6 Recharts instances to Victory Native XL (data transform `{date,value}` → `{x,y}` via `useMemo`):
  - Progress: HistoryTab (calendar + bar), LiftsTab (line), BodyTab (multi-line), RecordsTab (list), CompareTab (multi-series line)
  - Study: Study.jsx inline bar, Explorer, ResultsChart (dynamic per-bar fill; compare = grouped bars), FeaturedQuestions, FindingsRow
- `<select>` filters → PickerSheet
- **`/code-review` run after this session** (chart data transforms, Skia performance, touch tooltips)

**You confirm on your phone:** All 5 Progress tabs render real charts, tapping a point shows a tooltip, Compare runs a dual-series chart; Study featured questions load, running a query draws a bar chart, Compare mode shows grouped cohorts.

---

### Session 6 — Hardening & App Store Prep
**Effort: Medium · Model: Fable 5 · Test: EAS Dev Build → TestFlight**
**Decision gates: D5 (store metadata), D6 (privacy wording)**

- **`/security-review` run**: Supabase RLS policies, HTTPS enforcement, deep-link param safety, dependency CVEs
- `app.json` (production IDs/version), `eas.json` build profiles, app icon + splash (D1), iOS Privacy Manifest, `expo-updates` for OTA
- App Store + Google Play metadata, screenshots, privacy policy (D5/D6)
- **Final `/verify`**: full journey on a TestFlight build — register → onboard → log workout → finish → post → view charts → run study query. No debug overlays, no crashes.

---

## Session & Effort Summary

| Session | Covers | Effort | Model | Test on |
|---|---|---|---|---|
| 1 | Foundation, shell, auth, onboarding | High | Fable 5 (high) | Expo Go |
| 2 | Community & social screens | High | Fable 5 (high) | Expo Go |
| 3 | Workout screen + its animations | Very High | Fable 5 (high) | Expo Go |
| 4 | Profile, builders, settings | High | Fable 5 (high) | Expo Go |
| 5 | Progress + Study + all charts | Very High | Fable 5 (high) | **EAS dev build** |
| 6 | Security + App Store prep | Medium | Fable 5 | dev build → TestFlight |

**Skills:** `/verify` after every session · `/code-review` after Session 5 · `/security-review` in Session 6.

---

## Critical Files (reference points for execution)
- `src/App.jsx` — guard/route logic to recreate in Expo Router
- `src/hooks/useWorkout.jsx` (23KB) — audit every `localStorage`/`window.*` call
- `src/components/workout/ActiveWorkout.jsx` — most complex screen (Session 3)
- `src/components/ui/BubbleHeader.jsx` — scroll-collapse to recreate in Reanimated
- `src/components/study/ResultsChart.jsx` — Recharts→Victory template for all 6 charts
- `src/components/community/FeedCard.jsx` + `workout/CelebrationCard.jsx` — the GSAP→Reanimated animations
- `src/lib/api.js` + `src/hooks/useAuth.jsx` — rebuild around Supabase client (D2)

## Known Risks
1. **Victory Native / Skia won't run in Expo Go** — handled by grouping all charts in Session 5 (dev build). Don't attempt charts before the dev account exists.
2. **NativeWind v4 class gaps** (`backdrop-blur`, `grid`, hover states) — audit during Session 1's primitives; keep an exceptions list.
3. **BubbleHeader scroll jank** — use `useAnimatedScrollHandler` (UI thread) from the start.
4. **Builders' auto-save + ref navigation** (Session 4) — most error-prone non-chart screens; high effort flagged.
5. **Supabase architecture unknown until D2** — Session 1 must confirm whether any custom server logic still runs outside Supabase before the API client is written.
