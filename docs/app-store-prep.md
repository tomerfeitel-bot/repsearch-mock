# RepSearch — App Store / Google Play Prep (Session 6)

> Status: D5 (store listing) and D6 (privacy wording) approved as the baseline
> on 2026-06-11. The text is yours legally — edit this file freely before
> submitting; nothing here is wired into the build.

## App identity (D1, locked)

| | |
|---|---|
| Name | RepSearch |
| iOS bundle ID | `com.repsearch.app` |
| Android package | `com.repsearch.app` |
| Version | 1.0.0 (build numbers managed remotely by EAS, `autoIncrement`) |

## Store listing (D5 — draft)

**Subtitle / short description (30 chars):** Evidence-based lifting log

**Description (both stores):**

> RepSearch is a workout logger built around evidence, not bro-science.
>
> LOG — A fast, thumb-first workout logger: rest timer with haptics, RIR,
> tempo, ROM and pain flags per set, templates and multi-week programs with
> auto-progression.
>
> STUDY — Ask real questions of aggregated, anonymized training data ("Do
> longer rests grow my squat faster?") and get charts, not opinions. Compare
> your numbers against cohorts like you.
>
> TRACK — Progress charts for every lift, bodyweight, sleep and nutrition
> trends, records, and a training calendar.
>
> SHARE — A community feed for finished workouts, programs, templates and
> study findings. Follow lifters, discuss results, save plans you like.
>
> Your training data stays yours: research participation is opt-in,
> per-field privacy toggles control what others see, and your account can be
> deleted (with all data) from inside the app.

**Keywords (iOS, 100 chars):**
`workout,log,lifting,gym,hypertrophy,strength,program,tracker,evidence,research`

**Category:** Health & Fitness · **Secondary (iOS):** Social Networking

**Age rating:** 12+ / "Teen"-equivalent (user-generated content; no ads, no
gambling, no mature themes). Answer "Yes" only to: Unrestricted user-generated
content → mitigated per below.

**⚠️ UGC review risk (Apple Guideline 1.2):** the app has a public feed but no
report-content / block-user feature yet. Apple frequently rejects UGC apps for
this. Either add report/block before submission or be prepared for a rejection
cycle. (Flagged, not built — out of Session 6 scope unless you ask.)

**Screenshots checklist (per store: 6.7" + 6.1" iPhone; phone + 7"/10" tablet
optional on Play):**
1. Active workout (sets, rest pill) 2. Celebration card (PRs)
3. Progress Lifts chart 4. Study query result chart
5. Community feed 6. Program builder
Take them in the EAS dev/preview build (charts need Skia), light status bar,
seeded demo account — `npx expo start`, then device screenshots.

## Privacy (D6 — draft)

**Health-data disclosure (App Store privacy label "Health & Fitness" +
onboarding/research-consent copy):**

> RepSearch stores the fitness data you log — workouts, bodyweight, body
> measurements, sleep, calorie and protein estimates — to power your history
> and charts. This data is linked to your account and is private by default.
> Per-field visibility toggles control what other users can see. If you opt
> in to research, your training data is included in aggregated, anonymized
> community statistics only — it is never shown, sold, or shared in a form
> that identifies you. You can withdraw research opt-in at any time, and
> deleting your account permanently deletes all of your data.

**Apple privacy "nutrition label" / Google Data safety answers:**

| Data | Collected? | Linked to identity | Tracking | Purpose |
|---|---|---|---|---|
| Email address | Yes | Yes | No | Account/auth |
| Username, profile bio | Yes | Yes | No | App functionality, visible to others |
| Health & fitness (workouts, bodyweight, measurements, sleep, nutrition) | Yes | Yes | No | App functionality; opt-in anonymized research |
| User content (posts, comments) | Yes | Yes | No | App functionality, visible to others |
| Identifiers / advertising data / location / contacts | No | — | — | — |

No third-party ads, no tracking SDKs, no data sale. Data processor: Supabase
(auth + Postgres) plus the RepSearch API server.

**Privacy policy:** both stores require a public HTTPS URL. Draft text lives in
`docs/privacy-policy.md`; host it (e.g. GitHub Pages) and put the URL in App
Store Connect + Play Console.

## Build & submission pipeline

Done in this session: `app.json` production config (v1.0.0, runtimeVersion
`appVersion` policy, iOS Privacy Manifest required-reason APIs, encryption
export exemption), `eas.json` channels (development/preview/production),
`expo-updates` installed for OTA, HTTPS enforced in release builds
(`lib/api.ts` throws unless `EXPO_PUBLIC_API_URL` is https).

Remaining steps that need YOUR Expo/Apple/Google accounts (in order):

1. `npm i -g eas-cli && eas login` (Expo account)
2. `cd mobile && eas init` — creates the EAS project, writes `projectId` into `app.json`
3. `eas update:configure` — writes the `updates.url` for OTA
4. Deploy the Express server + Supabase env somewhere HTTPS, then set
   `EXPO_PUBLIC_API_URL` in `eas.json` `preview`/`production` `env` (release
   builds refuse to run without it)
5. ⚠️ The first dev build exists (confirmed 2026-06-11) but the Session 5
   chart screens were never verified on it — open Progress (all 4 tabs) and
   Study (run a query) in the dev build BEFORE moving to TestFlight. Then
   `eas build --profile preview` for shareable installs.
6. `eas build --profile production --platform ios && eas submit -p ios`
   (Apple Developer account, $99/yr) → TestFlight → final on-device /verify:
   register → onboard → log workout → finish → post → charts → study query
7. Play: `eas build --profile production --platform android && eas submit -p android`

## Known leftovers (deliberate)

- `sharePost` still shares plain text — there is no deployed web URL to deep
  link to yet. Wire universal links (`applinks:` + `intentFilters`) once a
  domain exists.
- App icon/splash: decided 2026-06-11 — ship TestFlight with the Expo
  placeholder; real art comes later. To swap: drop a 1024×1024 `icon.png`,
  the Android adaptive set, and `splash-icon.png` into
  `mobile/assets/images/` (same filenames) and rebuild.
- Custom fonts (Inter/JetBrains Mono) still not bundled; system fonts ship in v1.
