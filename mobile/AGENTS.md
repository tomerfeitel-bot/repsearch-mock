# RepSearch mobile (Expo)

Native iOS/Android port of the web app in `../src`. Built per `../docs/mobile-migration-plan.md` — Sessions 1 (foundation, auth, onboarding, tab shell), 2 (community & social screens), 3 (workout logger), 4 (profile, builders, settings), and 5 (Progress + Study charts) are implemented. Versioned docs: https://docs.expo.dev/versions/v54.0.0/

## Expo SDK 54, now with an EAS dev-build requirement for charts

Sessions 1–4 are verified in **Expo Go from the App Store / Play Store**, which only supports SDK 54 (Expo stopped shipping newer SDKs to the stores as of May 2026). NativeWind v4 also officially targets SDK 54; `babel-preset-expo` stays pinned `~54.x` (the v56 preset breaks Hermes bytecode on RN 0.81). Session 5 added `victory-native` + `@shopify/react-native-skia` + `expo-dev-client`: **Skia has no native module in Expo Go**, so charts need an EAS development build (`eas.json` has the `development` profile). Everything chart-shaped goes through `components/charts/index.tsx`, which lazily `require`s the Skia-importing `ChartKit.tsx` only outside Expo Go and renders a "needs the dev build" notice inside it — so Expo Go still runs the whole app minus chart plots. An SDK upgrade is now unblocked (dev build, not store Expo Go) but deferred to Session 6 if wanted.

## Architecture

- **Auth:** Supabase Auth via `lib/supabase.ts` (session AES-encrypted into AsyncStorage, key in SecureStore). `hooks/useAuth.tsx` mirrors the web `src/hooks/useAuth.jsx` context API.
- **Data:** everything goes through the Express server (`../server`, port 3002) — same as web. `lib/api.ts` derives the dev machine's LAN IP from the Expo dev session; override with `EXPO_PUBLIC_API_URL` in `.env`.
- **Styling:** NativeWind v4 is configured (babel/metro/tailwind.config.js — the tailwind theme mirrors the web remap so classNames port verbatim), plus `lib/theme.ts` for the web's CSS-variable tokens used in inline styles.
- **Navigation:** Expo Router. Route guards live in `app/_layout.tsx` (`useSegments` watcher). Tab bar with raised workout FAB: `components/BottomNav.tsx` as a custom `tabBar`.
- **Decisions taken (per plan D-gates):** D1 RepSearch / `com.repsearch.app` (placeholder icon until Session 6). D2 hybrid backend confirmed. D3 builders are full-screen pushes (`app/templates/builder/[id].tsx`, `app/programs/builder/[id].tsx`). D4 native pickers via `components/ui/PickerSheet.tsx`.

## Commands

- `npx expo start` — dev server; scan QR with Expo Go. Run `npm run dev` in the repo root too (Express + Supabase backend).
- `npx tsc --noEmit` — typecheck.
- `npx expo export --platform ios` — CI-style bundle check without a device.

## Workout logger (Session 3)

- `hooks/useWorkout.tsx` is the full port of `src/hooks/useWorkout.jsx`: server autosave (1s debounce to `PUT /active-workout`), AsyncStorage fallback copy + newer-local-copy restore, pinned research values, finish/discard, rest timer. `localStorage` reads became async AsyncStorage hydration effects. ToastProvider must stay ABOVE WorkoutProvider in `app/_layout.tsx` (the hook toasts save errors).
- Screens/components live in `components/workout/`: `StartScreen` (projected-next hero, split/program workspace, history), `ActiveWorkout` (header totals + FlatList; audit "Fix" uses `scrollToIndex`), `ExerciseCard`/`SetRow` (mini research controls; long-press a checkmark for the set action sheet; selects/rest are PickerSheets per D4), `AddExerciseSheet` (200ms-debounced search), `FinishSheet`, `CelebrationCard` (Reanimated ZoomIn). Shared audit/summary builders: `lib/workoutSummary.ts`.
- All "start workout" entry points are wired: StartScreen, PlansTab templates + program next-session, PostDetail template attachment (foreign templates are copied first, same as web), PostComposer "+ Create new workout". Replace-active-workout confirms use ConfirmSheet. Celebration "Share to feed" deep-links `/community?shareWorkout=<id>`; StartScreen "Find Plans" deep-links `/community?tab=plans`.

## Profile, builders & settings (Session 4)

- **Builders are full-screen pushes (D3):** `app/templates/builder/[id].tsx` and `app/programs/builder/[id].tsx`; `id="new"` creates a draft (template: optionally `?workout=<id>` to prefill from a saved workout) then `router.replace`s itself with the real id. Both autosave drafts on a 900ms debounce. TemplateBuilder reuses the Session-3 `ExerciseCard` in `planning` mode with `TEMPLATE_RESEARCH_FIELDS`.
- **Return flows use `router.navigate` (not replace/push)** so finishing a builder pops back to the waiting screen and delivers params: TemplateBuilder "Save" → `returnTo` + `&createdTemplate=<id>`. ProgramBuilder's "Create a new template" pushes TemplateBuilder with `returnTo=/programs/builder/<id>?addToBlock=<n>`; on return the new template is appended to that block and persisted. PostComposer "+ Create new" uses `returnTo=/community?compose=<kind>` (reopens the composer).
- **Profile tab** (`app/(tabs)/profile.tsx`) ports `src/pages/Profile.jsx`: Profile/Plans/Check-in tabs under FlatHeader, `ProfileSummary` with the Edit-profile sheet (all EDIT_GROUPS fields; selects are PickerSheets, dates are native datetimepickers), gear sheet (units, private toggle, sign out, delete account). Check-in is `components/profile/DailyLogHub.tsx`. Note: the web's delete-account password prompt was dropped — since the Supabase migration the server deletes without verifying a password, so mobile uses a danger ConfirmSheet instead.
- `PlansTab` reloads quietly on every screen focus (`useFocusEffect`) so plans saved in a pushed builder appear when popping back; the web got this for free from page remounts.

## Progress & Study charts (Session 5)

- **Chart kit:** `components/charts/ChartKit.tsx` is the ONLY module importing `victory-native`/Skia. It exposes `LineSeriesChart` (multi-series, dual-axis via `rightAxis`, `connectMissingData` = Recharts `connectNulls`), `BarsChart` (per-bar color/opacity = Recharts `<Cell>`, optional SD error whiskers), and `GroupedBarsChart` (cohort compare + dashed "your bucket" reference line). Hover tooltips became press readouts: `useChartPressState` → `matchedIndex` mirrored to React state, rendered as a bubble over the plot. Axis fonts use Skia `matchFont` (system monospace) until the Session-6 font pass.
- **Progress** (`app/(tabs)/progress.tsx`, `components/progress/`): Overview (split-colored calendar + sessions/week bars + day sheet → "Save as template"), Lifts (single-lift line + Compare mode with up to 3 series, PickerSheet selects, native date pickers), Body (bodyweight/sleep/calories/protein dual-axis lines + measurement log sheet), Records (pins in AsyncStorage under `repsearch.progress.pinnedLifts`). Web URL params became route params (`tab`, `highlight`, `seed`) consumed once then cleared via `router.setParams`; tab swaps stay local state.
- **Study** (`app/(tabs)/study.tsx`, `components/study/`, pure logic in `lib/studyState.ts` + full `lib/researchTheme.ts`): For You (poster wall — plain-View TrendMotif, works in Expo Go), Explore (5-step builder + `lib/queryParser.js`/`queryLexicon.js` natural-language search, verbatim JS copies), Evidence (saved questions + 2-study comparison), Library (**D7: exercise list only — search + 14 group accordions + video links; the web's 3D MuscleModel was explicitly not ported**). The web Study.jsx's `ConceptLab`/`LegacyExplore` dead code was not ported.
- **Known divergence:** the search bar infers `targetType` from a parsed config (web leaves it undefined and `stateToPayload` silently drops the exercise/muscle scope — looks like a live web bug).
- FlatHeader gained `tabsMaxHeight` for Study's two-line mode switch (default 48 clips it).

## Hardening & store prep (Session 6)

- **Release builds require `EXPO_PUBLIC_API_URL` and it must be https** — `lib/api.ts` resolves the base lazily and throws (surfaced as a toast on first request) in non-`__DEV__` builds otherwise. The LAN-IP derivation is dev-only.
- **Deep-link params are constrained**: `lib/navParams.ts` `internalPath()` gates the builders' `returnTo` (internal `/...` paths only), and route params that reach API paths (`username`, post/template/program/workout ids) are `encodeURIComponent`-wrapped at the call sites. A `/security-review` of the whole branch found no findings above these defense-in-depth items.
- `app.json`: v1.0.0, `runtimeVersion` policy `appVersion`, iOS Privacy Manifest required-reason entries, `ITSAppUsesNonExemptEncryption=false`. `eas.json`: development/preview/production profiles with matching update channels. `expo-updates` (~29.0.18) is installed for OTA; `eas init` + `eas update:configure` still pending (needs the owner's Expo login — see `../docs/app-store-prep.md` for the full pipeline + D5/D6 store metadata and `../docs/privacy-policy.md`).

## Moderation (UGC safety, 2026-06-12)

Apple Guideline 1.2 set, all enforced by the server (`server/routes/moderation.js` + block filters in posts/public/feed/programs/templates routes): report post (⋯ on PostCard / PostDetail top bar), report comment ("Report" on comment rows), report user (⋯ on the public-profile header), block/unblock (same menus; manager in Profile → gear → Blocked users), delete own posts/comments. `hooks/useModeration.ts` + `components/community/ModerationSheets.tsx` (ReportSheet / PostMenuSheet / BlockedUsersSheet). Blocked users vanish in both directions; a profile that blocked you renders as private. Admin review is the WEB app's `/admin` page (gated by `ADMIN_EMAILS` in `server/.env`). E2E: `npm run check:moderation` in `server/`.

## Leftovers / deferred

- `sharePost` (PostCard) shares plain text — nothing is deployed, so there is no post URL. Swap to a universal link once a domain exists.
- App icon/splash stay placeholder for TestFlight (decided in Session 6); swap files in `assets/images/` to replace.
- Custom fonts (Inter / JetBrains Mono) not loaded yet; `lib/theme.ts` exports `monoFont` (system monospace) for numerals meanwhile.
- The web Study page's radial background gradient is flattened to `STUDY_BG` (no expo-linear-gradient dependency); polish later if wanted.
- The web `src/components/community/FeedCard.jsx` is dead code (nothing imports it); its planned double-tap heart lives on mobile `PostCard` instead (double-tap = upvote + Reanimated heart burst).

## Windows gotcha: typed-routes corruption while the dev server runs

expo-router's typed-routes **watch handler** has a Windows path bug (`path.relative` yields `..\` prefixes that dodge its `../` guard): creating/renaming `.ts(x)` files while `expo start` is running pollutes `.expo/types/router.d.ts` with non-route files (e.g. `/../lib/timeAgo`) and drops new `[param]` routes, breaking `npx tsc --noEmit`. Runtime routing is unaffected (Metro's own context handles Windows fine — verified in the exported bundle). Fix: restart `expo start` (startup does a clean full-directory regeneration) and re-run tsc.
