# DESIGN.md — RepSearch Design Language

> One language, very different tabs. This is the source of truth every tab
> redesign references. AGENTS.md defers to this file for the visual system.

> **For agents:** This file is design documentation and intent only.
> Do **not** make changes to application code based on this file unless
> the user explicitly asks you to implement something.

## The problem this solves
RepSearch has five surfaces doing three genuinely different jobs, but they all
render as the same skeleton — a collapsing bubble header, pill tabs, and a list
of rounded bordered cards on a gradient. The sameness flattens distinct mental
modes into one visual monotone. This document defines how each tab is allowed to
diverge **in structure and style** while the app still reads as one product.

## The five surfaces, three modes
- **Log** — Workout. A *tool*: used mid-set, one-handed, dense, fast.
- **Connect** — Community, Profile. A *stream / identity*: browse-y, expressive.
- **Analyze** — Study (population *instrument*), Progress (personal *dashboard*).

---

## Core principle: coherence lives in the bones, not the skin
Coherence is **not** "things look the same." It is "things obey the same
physics." A spreadsheet row and a social post can look nothing alike and still
feel like one app if they share grid, type rhythm, color tokens, motion, and
spacing. That shared substrate carries ~70% of the "one app" feeling invisibly —
which is exactly what frees the visible layer to diverge.

We govern this with four tiers, locked → free.

### Tier 0 — Physics (never varies)
The law. Every section, no exceptions.
- 4px spacing grid; ~16px default content padding.
- Type scale `micro`(11px) → `display`(24px), Inter (sans) + JetBrains Mono.
- All numbers are **mono + tabular** (`tabular-nums`).
- Color **tokens** + **semantic** colors (see Color).
- Motion: feedback < 100ms; the scroll-linked header collapse curve.
- Tap targets ≥ 44px.
- 18px radius family — but see the **De-bubble law** for where rounding is allowed.
- Bottom nav (position, behavior).
- Every empty state has copy; every async has a skeleton + error Toast.

### Tier 1 — Anatomy (position & behavior constant, form varies)
**Vary the fill, never the slots.** The top of every screen is a fixed shelf.
- **Header — fixed shelf, free fill.** Always top + sticky; same collapse
  physics; **identity/title top-left, primary action top-right** (fixed slots).
  Height, hero content, and richness vary freely per section (a slim Workout
  status bar vs a Study query-state header vs a Progress hero metric).
- **Sub-nav — a typed vocabulary.** If present, it always sits directly under the
  header and behaves the same way; its *form signals the kind of switch*:
  - **Pills** → 2–4 *peer views* (Community Feed/Saved/Plans, Profile tabs).
  - **Mode switch** → *different tools/workspaces*, visually heavier/framed than
    pills (Study Explore/For You/Evidence; single/compare/scan).
  - **None** → a *linear task* (Workout active session).
  - 5+ peers ⇒ regroup the content to ≤4; do **not** invent a new control.

### Tier 2 — Content units (a shared vocabulary)
A small, **named set of content jobs** the product keeps doing across its three
modes. Each unit is fixed by *what job it does* plus a few **invariants** (from
Tier 0 + the de-bubble law) that every instance obeys — those invariants are what
make a workout set and a community post rhyme. **Visual expression is NOT fixed
here**; it is decided when each surface is designed (Tier 3), so the catalog
*guides* a redesign instead of freezing the current look. A section composes from
this vocabulary; it does not invent a one-off. The generic floating bordered card
is **retired** as a default container.

> The first time a unit is realized, that realization becomes its working
> reference. **Community is built**, so its Feed Item + in-post Chart Block are the
> live reference; the others are realized as each page is redesigned.

| Unit | The job it does | Invariants (every instance, any surface) |
|---|---|---|
| **Feed Item** | one entry in a browsable stream of authored content | Full-bleed, never a floating bordered box; separated by space + a hairline; variable height; rounding only on media inside it. |
| **Data Row** | present one quantitative record so a column of them scans fast | Numbers are **mono + tabular**; no card chrome; ≥44px target; separated by space/hairline, not boxes. |
| **List Row** | a tappable line for **navigation / selection**, not data display | Clear ≥44px target; de-bubbled (no nested boxes); intent (go somewhere / choose) reads at a glance. |
| **Stat Tile** | surface a single **earned** headline number | One number, mono tabular, + a plain label; gridded. **Anti-slop: no gradient accent, no nested box, no big-number-plus-supporting-cluster template.** Color only from semantic / data meaning. |
| **Chart Block** *(elevated — the analytical payoff & primary color carrier)* | visualize data / trends — the product's differentiator | Titled + a **caption that states the insight** (not a legend dump); categorical series → the curated 6-hue jewel set, sequential → a single-hue ramp (never rainbow a quantity); media-rounded. Color is allowed to be **loud** here. |
| **Form Block** | grouped, labeled inputs for build / edit / query | Token-styled fields (system color); 4px-grid rhythm; labels + placeholders meet contrast (≥4.5:1). |
| **Sheet** *(container, not content)* | host a focused, dismissible task / detail over the current context | An overlay: backdrop + a clear dismiss, respects safe-area, scrolls internally; **composes from the catalog** (hosts a Form Block, List Rows) rather than being content itself. Entry / size / corner treatment are free per surface. |

**Not units (intentionally):** empty states and loading skeletons — those are Tier
0 law (every empty state has copy; every async has a skeleton + error Toast),
shared by every unit rather than being one of them.

### Tier 3 — Free expression
Where a surface commits to its own character. This is the *point* of the system:
Tiers 0–2 are locked precisely so this tier can diverge loudly without breaking the
app. Freedom here is in **composition, emphasis, and character — never in
primitives** (tokens, type scale, grid, header anatomy, unit invariants, and the
de-bubble law still hold). Each surface tunes five dimensions, and every dimension
has a **floor as well as a ceiling** — "free" is a mandate to commit, not a license
to be bland.

- **Density** — chosen by *use posture*. Packed when the surface is used mid-action
  (logging a set one-handed, max info per glance) → airy when it is browsed at
  leisure. *Floor:* never so sparse it under-serves the job. *Ceiling:* never so
  packed that rhythm or tap targets break.
- **The hero** — each surface elevates exactly one element type as loudest (a
  number / a graph / a headline / an input). *Floor:* every surface MUST name a
  hero — uniform weighting reads as a dump. *Ceiling:* only one; competing heroes
  are noise.
- **Colorfulness** — near-monochrome (color only from data + semantics) →
  saturated. *Floor & ceiling are relative:* the surfaces sit at **different points
  on one shared dial, placed together**, so the contrast between them carries
  identity. No surface picks its loudness alone.
- **Character / metaphor** — the felt identity (Console / Feed / Lab / Dashboard /
  Card). *Floor:* commit to one; no character is the failure. *Ceiling:* metaphor
  is **mood, not costume** — no skeuomorphic beakers, no fake terminals.
- **Motion intensity** — minimal (a tool: motion = feedback only) → expressive (a
  feed: reveals and transitions as texture). *Floor:* feedback motion is always
  present (Tier 0 law). *Ceiling:* never blocks the task; reduced-motion always
  honored.

### The two tests
Tier 3 lives in the band between two opposite failures, so it gets two checks:

**Coherence — "is this still RepSearch?"** Drop a user cold on any screen with the
nav hidden. They must instantly know:
1. **"This is RepSearch."** — Tier 0 carries this.
2. **"Where I am / how to navigate."** — Tier 1.
3. **"How to operate this."** — Tier 1 + familiar Tier-2 units.

**Distinctiveness — "is this its own room?"** Drop a user on *two* surfaces with the
nav hidden; they must be able to tell them apart. If two surfaces are
interchangeable, Tier 3 failed in the other direction.

If both hold, structure is free to diverge. The boundary is **behavioral, not
visual.**

---

## The De-bubble law (Tier 0, structural)
"The bubble look" = nested rounded floating containers everywhere (a card-header
wrapping a gradient panel, pill-in-a-pill tabs, bordered floating cards).
- **Structure separates with space + hairlines + type hierarchy**, not stacked
  bubbles.
- **Prefer full-bleed content + thin dividers** over floating bordered cards.
- **Rounding is reserved** for media corners and buttons — it is no longer the
  universal container.
- **"Pronounced" comes from type weight/scale and a bold active indicator**, not
  from a box.

---

## Color
Color plays three roles, governed differently.

**1. System color — locked (Tier 0).** The structural skeleton.
```
--bg:      #08090a   /* deep near-neutral black; the ground */
--surface: #141615   /* lifts against the deeper bg */
--border:  #363c37
--text:    #f3f5f1
--muted:   #aab3ab
```

**2. Semantic color — locked (Tier 0).** Fixed *meaning*, small reserved set,
never decorative: positive/PR (green), negative/fail (red/clay). **Active
selection / primary action = the brand green** (deep emerald, see Community color
below); brass is no longer the reflexive accent — it stays available only as one
expressive gold in the Dark Jewel set. Don't reuse a semantic color decoratively.

**3. Expressive color — one curated palette; *colorfulness* is free (Tier 3).**
Charts, topic markers, post "posters", thread accents. Two rules keep vibrancy
coherent:
- **Assigned by meaning** (topic / split / data series), never sprinkled for
  variety. The same topic is the same hue everywhere (feed → thread → study).
- **Color comes mostly from DATA** — the graph is the color hero. A post's *type*
  gets only a small marker (a dot), a notifier, not a color wash on the card.

**Colorfulness is a per-section dial.** Same palette everywhere; how *loudly* a
surface uses it varies: Workout near-monochrome (color = data + semantics only);
Community/Study posters loud; Progress informative-but-restrained.

### The "Dark Jewel" expressive palette
No neon. Neon = light **and** saturated at once (pure colored light over black).
These hold saturation but keep tone mid-dark, so they read as jeweled enamel /
mineral pigment. Each hue has a **fill** (bars, tints, dots — can be deeper) and
an **ink** (text / thin lines on black — lifted for legibility). `tint` = the
fill at ~14–16% alpha — **for graphs and data visualizations only** (chart area
fills, bar backgrounds, sparkline regions). Not for any other UI element.

| Role | fill | ink (text on black) |
|---|---|---|
| Brass / aged gold (signature) | `#d59a3a` | `#e8c074` |
| Rust / clay | `#d3623a` | `#ea9670` |
| Moss / green | `#74ab47` | `#abd283` |
| Pine / teal | `#2ba395` | `#6fcab8` |
| Steel / azure | `#3f93cc` | `#87bce8` |
| Amethyst / plum | `#9a64b8` | `#c6a0e0` |

- **Categorical** data uses the six hues (topics, splits, series).
- **Sequential** data ramps a *single* hue light→dark — never rainbow a quantity.
- This one set replaces the old `STUDY_TOPIC_STYLES` (was neon: `#7db7ff`,
  `#d7a1ff`, `#ff9f6e`, `#f08cae`) and `BUBBLE_HUES`.

**Chips, badges, and category markers — solid everywhere (Tier 0).**
Any label, marker, or chip that carries a color identity uses a **solid fill**
with a contrasting `on` text. The retired pattern — a grayed same-hue tint
behind same-hue text (the old soft-enamel pill) — is **banned app-wide**, not
just in Community. Faded / alpha coloring is **only allowed in graphs and data visualizations** —
nowhere else in the UI.

---

## Per-section direction (built one tab at a time)
Metaphors guide each tab's Tier-3 character; boldness is decided per tab.

- **Community — Feed.** Content-first poster feed; full-bleed items; the graph is
  the hero. *(Designed — see below.)*
- **Workout — Console.** Dense Data Rows; minimal status-bar header; no sub-nav in
  an active session. Near-monochrome. (The *start/opening* screen needs the most
  work.)
- **Study — Lab.** Form Block (Explore) + Chart Block (results); mode-switch nav;
  For You / Findings render as Feed-Item posters.
- **Progress — Dashboard.** Stat Tiles + Chart Blocks; regroup the 5 tabs to ≤4.
- **Profile — Card.** Identity Feed Item + Form Blocks; Stat Tiles; List Rows.

### Community (current target)
- **Header:** large bold "Community" title flush-left on the flat `#08090a`
  background (no card, no gradient panel); "+ Post" action top-right. Pronounced
  by scale.
- **Top nav:** flat **underline tabs** (Feed / Saved / Plans) — bold active label
  + thick accent underline in the section hue, edge-to-edge, divided from the feed
  by a single hairline.
- **Feed = full-bleed items** separated by whitespace + a hairline; rounding only
  on the graph/media.
- **Post anatomy (content-first), graph post top→bottom:**
  1. thin meta line — type-marker **solid colored badge** (Community marker
     family, see Community color) + time
  2. **bold headline** (the poster title, loudest element)
  3. **graph** full-width, rounded media corners only
  4. **explanation** — a 1–2 line data payoff (not a bio)
  5. quiet **byline + flat action icons on one row** — small avatar + name, then
     ♡ kudos / 💬 comment / ⤓ save (no pills, no footer bar)
- **Discussion post (no graph):** compact variant — marker+time → headline (a
  touch smaller) → 2-line text → byline+actions; tighter padding.
- **Variable height is a feature** — content sizes the item, not a fixed card.

#### Community color — committed green brand + solid colored chips
Community is the one surface that earns **Committed** (PRODUCT.md "palette before
patterns"): it commits to a brand green and a **solid-color** chip language, kept
colorful across post types so the feed reads as varied content, not a monotone.

- **Brand green (deep emerald).** `--emerald #0B7A43` (solid fill) / `--emerald-ink
  #34BE73` (vivid green for text/underline on the dark ground) / `--on-emerald
  #fff` (text on the solid fill, ≈5.4:1 — the fill is deep, so on-color text is
  **white**, not dark).
- **Solid chips are the app-wide language (see Color above).** Community is the
  first surface to fully realize this — its marker family is the live reference.
  Green is simply the brand member of this one system; `on` text is white on every
  hue except the lighter amber, which takes near-black.
  - Markers that are solid chips: post-type badge (`KIND_META`), topic labels,
    active filter chip, Plans-toggle-on, the OP badge.
  - Brand green also does the **text/accent** duty where there is no chip: the
    title, active tab + underline, search icon (vivid `--emerald-ink`).
- **Marker family (categorical, Community).** A 6-hue set re-derived in the brand
  green's OKLCH envelope so every solid chip reads as one family with the brand.
  Lives in `src/lib/bubbleColors.js` (`BUBBLE_HUES`) + `KIND_META` (PostCard).
  Every `fill`+`on` pair clears AA (≥4.5:1 small text); `ink` (used for the in-post
  hero-frame captions, colored by type) clears ≥7:1 on `#08090a`.

  | role | fill (chip) | on (text) | ink (caption) | post type |
  |---|---|---|---|---|
  | green (brand) | `#0B7A43` | `#fff` | `#34BE73` | Discussion |
  | teal | `#007661` | `#fff` | `#44BFA5` | Workout |
  | blue | `#2D6DA5` | `#fff` | `#5CABF2` | Program |
  | violet | `#7B5AAE` | `#fff` | `#B38EF1` | Template |
  | berry | `#AB4477` | `#fff` | `#EA7AAE` | Study |
  | amber | `#B48226` | `#0c0c0c` | `#F2B036` | PR |

  Topic labels hash deterministically onto this set (`hueForLabel`). Vote pill
  keeps round 2's intent: up = brand green ink, down = the blue/steel
  (`--azure-ink`).
- **Scope.** This green-brand commitment is Community's. The **Dark Jewel** set
  above still governs Study / Progress data viz (those theme files are unchanged).
