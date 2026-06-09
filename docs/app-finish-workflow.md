# RepSearch Finish Workflow

This is the master checklist for getting RepSearch from promising app to finished enough to launch. It is written as an operating workflow, not a feature wish list.

A **decision gate** means the work cannot move past that point until the choice is researched, decided, and written down.

## Locked Decisions

- Backend migration happens before public beta.
- Backend provider is chosen during the backend audit.
- Account ownership is individual for now.
- Basic moderation is required before public beta.
- Public waitlist beta is the beta target.
- Full test suite is required before public beta.
- Full launch audit is required.
- Design review happens repeatedly after major feature passes.
- Exercise Library content must be complete before beta.
- The 3D model must map all primary muscles before beta.
- App name must be finalized before TestFlight.
- Better app icon direction must be chosen before TestFlight.
- Integrations are optional for users and researched separately.
- Banner ads are post-beta.
- Age/geography, data rights, environment strategy, admin tooling, notifications, seeded content, and platform path remain decision gates.

## 1. Current-State Audit

Audit the app as it exists now. The goal is to know what is real, what is prototype-only, and what is blocking beta.

- Audit Community, Workout, Progress, Study, Profile, Exercise Library, 3D model, auth, backend, database, routing, and dead/concept surfaces.
- Decide platform path: native rewrite, native wrapper, or web/PWA beta.
- Decide backend migration target after listing requirements.
- Decide launch age/geography scope with legal/privacy context.
- Decide environment strategy: development, staging/test, production.
- Finalize the app name before TestFlight/App Store setup.
- Find and choose better app icons as part of the pre-TestFlight design identity pass.

## 2. Core Product Completion

Finish the app surfaces that define RepSearch before focusing on launch mechanics.

- Finalize Study Explorer and Evidence behavior.
- Create an Explorer explanation page that teaches users what the Explorer does, how to build a question, how to read evidence, and what the results can and cannot claim.
- Complete Exercise Library, including all exercise content, media, and instructions.
- Finalize 3D model so every primary muscle maps correctly.
- Add 3D model to other useful app surfaces.
- Finalize Progress Compare and Records around population/social comparison.
- Polish Community plan mode.
- Add Community spaces for advice, problems, feedback, open discussion, and prebuilt plans/templates.
- Decide seeded content approach before public beta.
- Finalize onboarding/questionnaire flow so the app collects the profile data needed for training, privacy, and research without overwhelming new users.
- Finalize daily check-ins so they are useful, lightweight, and tied to research/progress value.
- Run repeated design/UX review gates after major feature passes.

## 3. Backend, Scalability, and Data Model

The backend must be reliable before real users trust it with training and health-adjacent data.

- Migrate backend before beta, with provider choice as a decision gate.
- Validate the full data model end-to-end: accounts, workouts, sets, PRs, programs, templates, social, research profiles, saved studies, public/private data, questionnaire data, and daily check-ins.
- Add production database setup, migrations, backups, restore plan, secrets, deploy process, and monitoring.
- Add a scalability audit:
  - Can workout logging, feeds, Study queries, Progress comparisons, records, and social features stay fast as users grow?
  - Are indexes, pagination, query limits, aggregation jobs, and connection pooling handled?
  - Are expensive research/population queries precomputed or safely limited?
  - Is there a plan for spikes, storage growth, backup recovery, and cost growth?
- Decide admin tooling: basic admin panel vs scripts/manual tools.

## 4. Accounts, Operations, and Observability

Set up the boring-but-critical accounts and tools that let the app run like a real product.

- Create required individual-owner accounts: Apple Developer, Google Play, backend/hosting, domain/DNS, support email/form, analytics, crash reporting, performance monitoring, and live status/uptime monitoring.
- Add crash reporting.
- Add event analytics.
- Add performance monitoring.
- Add uptime/API monitoring so you know if the app or backend is down.
- Define key events for onboarding, questionnaire completion, daily check-ins, workout logging, Study, Progress, Community, plans/templates, errors, integrations, retention, and beta feedback.
- Create support email/form plus bug/feedback tracker.
- Decide notification scope after platform decision.

## 5. Security and Privacy

Security means users cannot access data they should not see, production secrets are protected, and private training/health-adjacent data stays safe.

- Run a security audit before public beta:
  - Auth safety, password/reset flow, token/session handling, secrets, rate limits, route permissions, admin protection, dependency scanning, and API validation.
  - Confirm users cannot access another user's private workouts, body data, questionnaire data, daily check-ins, saved studies, private profile fields, drafts, or account data.
  - Confirm public/private visibility is enforced by backend rules, not only UI.
- Add a privacy/data-rights decision gate:
  - Decide account deletion, data export, research opt-out, research withdrawal, consent history, and how deleted/withdrawn data affects aggregates.
- Write/review privacy policy, terms, research consent, health-data disclaimers, analytics/ad disclosures, and permission copy.

## 6. Community Safety

Public beta needs enough safety tooling that users can post without creating unmanageable risk.

- Basic moderation required before public beta:
  - Report content/users.
  - Block or mute users.
  - Delete own posts/comments where appropriate.
  - Admin review path for reports.
- Decide content rules, public/private behavior, abuse handling, and escalation process.
- Make sure public beta can operate safely without directly editing the database by hand.

## 7. Testing and Audit

Testing proves the app works. The audit proves it is ready for real users.

- Build full test suite before public beta.
- Cover core flows: register/login, onboarding, questionnaire, daily check-ins, workout logging, active workout restore, finish/share workout, Progress, Study, Explorer explanation page, Exercise Library/model, Community feed/posts/comments/plans, profile/privacy, and backend permissions.
- Run full launch audit:
  - Product completeness.
  - UX/design.
  - Backend/data.
  - Scalability.
  - Security/privacy.
  - Legal/store readiness.
  - Observability.
  - Integrations.
  - Support/moderation.

## 8. External Integrations

Integrations can make RepSearch more useful, but they are optional for users and should not block beta if manual logging works.

- Research HealthKit, Health Connect, Fitbit/wearables, and workout-app imports like Hevy/Strong.
- For each integration, decide value, complexity, permissions, failure states, sync behavior, data mapping, privacy wording, and store-review risk.
- Build only the integrations that are worth the complexity.

## 9. Public Waitlist Beta

Public waitlist beta should happen in waves so problems are found before everyone is invited.

- Public waitlist beta requires production backend, monitoring, support, moderation, test suite, legal/privacy gates, security audit, and scalability audit.
- App name and app icon direction must be finalized before TestFlight/public beta distribution.
- Invite in waves.
- Define stop/go criteria after each wave.
- Collect feedback and bugs through support channel/tracker.
- Keep banner ads out of beta.

## 10. Monetization, Legal, and Store Launch

Store launch should happen only after beta proves the app is stable and safe.

- Banner ads are post-beta.
- Before ads: choose ad network, consent flow, placement rules, performance limits, and privacy/store disclosure updates.
- Complete store accounts, app listings, screenshots, permission descriptions, age rating, privacy labels, TestFlight/internal testing, Play Store testing, and final submission checks.
- Launch only after beta issues, legal/security checks, production monitoring, and app-store requirements are complete.

## 11. Live Operations After Launch

Finishing the app does not end at launch. Once users are live, monitoring becomes an ongoing product responsibility.

- Monitor uptime, API errors, crashes, slow pages, failed requests, database health, storage growth, and backend costs.
- Monitor security alerts, dependency vulnerabilities, suspicious traffic, failed login spikes, and admin access.
- Monitor user-facing product health: onboarding completion, questionnaire completion, daily check-in usage, workout completion, Study usage, Community activity, retention, and support volume.
- Review support tickets, bug reports, crash reports, and analytics on a regular schedule.
- Keep a rollback and incident-response plan so production problems can be handled quickly.
