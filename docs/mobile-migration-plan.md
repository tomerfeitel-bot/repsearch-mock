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

## Session 2 — COMPLETE (2026-06-10)

Community & social screens are live in Expo Go (`mobile/app/(tabs)/community.tsx`, `mobile/app/post/[id].tsx`, `mobile/app/user/[username]/`). Outcomes future sessions must know:

- **Web `FeedCard.jsx` is dead code** — nothing imports it (PostCard is the live feed card). The planned double-tap heart was implemented on mobile `PostCard`: double-tap the post content = upvote + Reanimated heart burst.
- **Stubbed cross-session actions** (explanatory toasts until their session lands): template/program-session "Start workout" → Session 3 `startWorkout`; "+ New" / builder navigation → Session 4. Community accepts `?compose=<kind>` and `?shareWorkout=<id>` params for those return flows. `sharePost` shares text (no deployed URL until Session 6).
- **Study post attachments** use the compact bar-row preview everywhere (no Recharts equivalent until Session 5's charts).
- **Windows + typed routes:** editing files while `expo start` runs corrupts `.expo/types/router.d.ts` (expo-router watch-handler backslash bug) and fails `tsc`. Restart the dev server to regenerate cleanly; runtime routing is unaffected. Details in `mobile/AGENTS.md`.
- Ported libs now in `mobile/lib/`: `exercises.js` (verbatim copy), `timeAgo`, `postLabels`, `bubbleColors`, `musclePalette`, `researchTheme` (trimmed to composer needs — Session 5 extends it). Hooks: `usePosts`, `useSocial`, `useDailyCheckin` (AsyncStorage for the seen-today marker). New UI primitives: `ConfirmSheet`, `UnderlineTabs`, `FlatHeader` (directional scroll collapse via Reanimated).

---

## Session 3 — COMPLETE (2026-06-11)

The full workout logger is live in Expo Go (`mobile/app/(tabs)/workout.tsx`, `mobile/components/workout/`, real `mobile/hooks/useWorkout.tsx`). Outcomes future sessions must know:

- **No new D-gates came up.** D4 (native pickers) was applied to the logger's ROM/tempo/set-type selects and the rest picker — the web's bespoke RestWheel snap-drum became a stepper + PickerSheet.
- **`useWorkout` is the full state machine** (autosave debounce → `PUT /active-workout`, AsyncStorage fallback + newer-local-copy restore, pinned research values, finish/discard). Provider order matters: ToastProvider wraps WorkoutProvider in `app/_layout.tsx`. The Session-1 dummy-workout test buttons are gone.
- **Every Session-2 "arrives in Session 3" stub is wired**: PlansTab template Start + program next-session Start, PostDetail template attachment, PostComposer "+ Create new" workout. Foreign templates are copied to the user's library before starting (same as web). New deep link: `/community?tab=plans` (StartScreen "Find Plans").
- **Still stubbed for Session 4**: builder navigation (CreateMenu, PostComposer non-workout create, CelebrationCard "Save template" → `/templates/new?workout=<id>` on web). CelebrationCard "View progress" navigates to the Progress placeholder tab (real charts in Session 5).
- New ported libs: `mobile/lib/{nanoid,splits,researchFields,workoutSummary}.ts` (nanoid uses expo-crypto — Hermes has no global `crypto`).

---

## Session 4 — COMPLETE (2026-06-11)

Profile, builders, and settings are live in Expo Go (`mobile/app/(tabs)/profile.tsx`, `mobile/app/templates/builder/[id].tsx`, `mobile/app/programs/builder/[id].tsx`, `mobile/components/profile/DailyLogHub.tsx`). Outcomes future sessions must know:

- **D3 decided: builders are full-screen pushes.** `id="new"` creates the draft and replaces itself with the real id (the web's `/templates/new` & `/programs/new` redirector routes collapse into the `[id]` route). Cross-builder returns use `router.navigate` so the waiting screen is popped back to with updated params (`createdTemplate`/`addToBlock`), not stacked again — details in `mobile/AGENTS.md`.
- **Every remaining Session-2/3 builder stub is wired**: PlansTab "+ New" + draft rows, PostComposer "+ Create new" (template/program; study still toasts until Session 5), CelebrationCard "Save template" (`/templates/builder/new?workout=<id>`).
- **Delete account diverges from web on purpose**: since the Supabase migration the server's `DELETE /profile` ignores the password the web still asks for, so mobile uses a danger ConfirmSheet instead of a dead password prompt. (Web cleanup flagged separately.)
- `PlansTab` now refreshes on screen focus (pushed-screen returns don't remount tabs like web page navigations did).
- For Session 5: the Profile screen's "View progress" path and the Progress/Study placeholder tabs are the remaining big surfaces; `researchTheme`'s composer trim is still pending its Session-5 extension.

---

## Session 5 — COMPLETE (2026-06-11)

Progress and Study are fully ported with Victory Native XL (Skia) charts (`mobile/app/(tabs)/progress.tsx`, `mobile/app/(tabs)/study.tsx`, `mobile/components/{charts,progress,study}/`). Outcomes future sessions must know:

- **⚠️ Charts are NOT verifiable in Expo Go** — Skia's native module isn't in the store client. `expo-dev-client` + `mobile/eas.json` (development profile) are committed; the first EAS dev build is the verification step for this session. Everything else (builder forms, lists, For You posters) still runs in Expo Go: `components/charts/index.tsx` lazily requires the Skia-importing `ChartKit.tsx` only outside Expo Go (`lib/runtime.ts` `isExpoGo`) and shows a "needs the dev build" notice inside it.
- **D7 decided (new gate): Study Library ships without the web's 3D muscle model** — exercise list only (search + 14 group accordions + video links). The R3F/GLB `MuscleModel.jsx` port is deferred; treat as its own future session if wanted (needs three/@react-three/fiber native/expo-gl).
- The plan's "HistoryTab" no longer exists on web — the live tabs are Overview/Lifts/Body/Records with Compare folded into Lifts as a mode switch; mobile mirrors that. Records pins use AsyncStorage; deep links arrive as route params (`/progress?tab=lifts&highlight=<id>`, `?seed=<id>` → Compare).
- The web Study.jsx `ConceptLab`/`LegacyExplore` blocks and `FeaturedQuestions.jsx`/`FindingsRow.jsx` components are **dead code** — not ported. `queryParser.js`/`queryLexicon.js` were copied verbatim into `mobile/lib/`. `researchTheme.ts` is now the full port (Session 2's composer trim is gone).
- **Every remaining Session-2/3/4 stub is wired**: PostComposer "+ Create new" study → `/study?tab=explore`, study post attachments draw the full chart in the thread (compact bars stay in the feed), CelebrationCard "View progress" lands on real charts.
- **Web bug flagged**: the web Explore search bar's parsed configs carry no `targetType`, so `stateToPayload` silently drops the exercise/muscle scope when running from search. Mobile infers it (see `mobile/AGENTS.md`).
- Versions: victory-native 41.26.0, @shopify/react-native-skia 2.2.12 (SDK 54 pin), expo-dev-client ~6.0.21. `babel-preset-expo` stays pinned `~54.x`.
- `/code-review` was run on this session's diff per the plan; findings were fixed before commit.

---

## Session 6 — COMPLETE (2026-06-11)

Hardening & store prep are done; what remains needs the owner's accounts, not code. Outcomes:

- **`/security-review` of the whole branch: no HIGH/MEDIUM findings.** Two sub-threshold defense-in-depth items were fixed anyway: deep-link route params are now `encodeURIComponent`-wrapped before reaching API paths, and the builders' `returnTo` param is constrained to internal paths (`mobile/lib/navParams.ts`).
- **HTTPS is enforced in release builds**: `mobile/lib/api.ts` throws unless `EXPO_PUBLIC_API_URL` is set and https outside `__DEV__` (lazy, so it toasts instead of crashing at boot). The LAN-IP fallback is dev-only.
- Production config: `app.json` v1.0.0 + `runtimeVersion` (appVersion policy) + iOS Privacy Manifest + encryption-export exemption; `eas.json` development/preview/production channels; `expo-updates` ~29.0.18 installed (OTA). `eas init` / `eas update:configure` / server deployment / store submission are the owner's steps — full ordered checklist in `docs/app-store-prep.md`.
- **D5 approved**: store listing (description, keywords, Health & Fitness, 12+) baselined in `docs/app-store-prep.md`. **D6 approved**: health-data disclosure + full privacy policy in `docs/privacy-policy.md` (needs hosting at a public URL before submission). **Icon: placeholder ships in TestFlight** (owner decision; swap files in `mobile/assets/images/`).
- **⚠️ Open risks**: Session 5 charts were still unverified on the dev build at session end (verify Progress + Study in the dev build before TestFlight); no report/block feature = Apple UGC Guideline 1.2 rejection risk (deliberately not built).

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
