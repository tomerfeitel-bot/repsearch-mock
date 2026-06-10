# RepSearch mobile (Expo)

Native iOS/Android port of the web app in `../src`. Built per `../docs/mobile-migration-plan.md` — Session 1 (foundation, auth, onboarding, tab shell) is implemented. Versioned docs: https://docs.expo.dev/versions/v54.0.0/

## Pinned to Expo SDK 54 — do not upgrade before Session 5

Sessions 1–4 are verified in **Expo Go from the App Store / Play Store**, which only supports SDK 54 (Expo stopped shipping newer SDKs to the stores as of May 2026; SDK 55+ Expo Go requires a TestFlight beta). NativeWind v4 also officially targets SDK 54. Upgrade the SDK, if desired, in Session 5 when the project moves to an EAS development build.

## Architecture

- **Auth:** Supabase Auth via `lib/supabase.ts` (session AES-encrypted into AsyncStorage, key in SecureStore). `hooks/useAuth.tsx` mirrors the web `src/hooks/useAuth.jsx` context API.
- **Data:** everything goes through the Express server (`../server`, port 3002) — same as web. `lib/api.ts` derives the dev machine's LAN IP from the Expo dev session; override with `EXPO_PUBLIC_API_URL` in `.env`.
- **Styling:** NativeWind v4 is configured (babel/metro/tailwind.config.js — the tailwind theme mirrors the web remap so classNames port verbatim), plus `lib/theme.ts` for the web's CSS-variable tokens used in inline styles.
- **Navigation:** Expo Router. Route guards live in `app/_layout.tsx` (`useSegments` watcher). Tab bar with raised workout FAB: `components/BottomNav.tsx` as a custom `tabBar`.
- **Decisions taken (per plan D-gates):** D1 RepSearch / `com.repsearch.app` (placeholder icon until Session 6). D2 hybrid backend confirmed. D4 native pickers via `components/ui/PickerSheet.tsx`.

## Commands

- `npx expo start` — dev server; scan QR with Expo Go. Run `npm run dev` in the repo root too (Express + Supabase backend).
- `npx tsc --noEmit` — typecheck.
- `npx expo export --platform ios` — CI-style bundle check without a device.

## Session-1 leftovers for later sessions

- `hooks/useWorkout.tsx` is a stub; Session 3 replaces it with the real ActiveWorkout state machine. The "test rest timer / test workout" buttons in `app/(tabs)/workout.tsx` are temporary — remove in Session 3.
- Tab screens other than the shell are placeholders.
- Custom fonts (Inter / JetBrains Mono) not loaded yet; system fonts in use.
