# RepSearch mobile (Expo)

Native iOS/Android port of the web app in `../src`. Built per `../docs/mobile-migration-plan.md` — Sessions 1 (foundation, auth, onboarding, tab shell), 2 (community & social screens), 3 (workout logger), and 4 (profile, builders, settings) are implemented. Versioned docs: https://docs.expo.dev/versions/v54.0.0/

## Pinned to Expo SDK 54 — do not upgrade before Session 5

Sessions 1–4 are verified in **Expo Go from the App Store / Play Store**, which only supports SDK 54 (Expo stopped shipping newer SDKs to the stores as of May 2026; SDK 55+ Expo Go requires a TestFlight beta). NativeWind v4 also officially targets SDK 54. Upgrade the SDK, if desired, in Session 5 when the project moves to an EAS development build.

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

## Leftovers / stubs for later sessions

- PostComposer "Create new" for **study** posts still toasts (the study explorer is Session 5).
- `sharePost` (PostCard) shares plain text — nothing is deployed, so there is no post URL. Swap to a universal link in Session 6.
- Study post attachments render the compact bar-row preview in both the feed and the thread; the full Victory/Skia chart variant is Session 5 (dev build).
- Study/Progress tab screens are placeholders (CelebrationCard "View progress" lands on the placeholder until Session 5). Custom fonts (Inter / JetBrains Mono) not loaded yet; `lib/theme.ts` exports `monoFont` (system monospace) for numerals meanwhile.
- The web `src/components/community/FeedCard.jsx` is dead code (nothing imports it); its planned double-tap heart lives on mobile `PostCard` instead (double-tap = upvote + Reanimated heart burst).

## Windows gotcha: typed-routes corruption while the dev server runs

expo-router's typed-routes **watch handler** has a Windows path bug (`path.relative` yields `..\` prefixes that dodge its `../` guard): creating/renaming `.ts(x)` files while `expo start` is running pollutes `.expo/types/router.d.ts` with non-route files (e.g. `/../lib/timeAgo`) and drops new `[param]` routes, breaking `npx tsc --noEmit`. Runtime routing is unaffected (Metro's own context handles Windows fine — verified in the exported bundle). Fix: restart `expo start` (startup does a clean full-directory regeneration) and re-run tsc.
