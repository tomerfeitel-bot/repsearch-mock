// Shared design tokens for the three cohesive concept styles.
// Each style object is the single source of color for BOTH its Progress and
// Community components — importing the same object is what guarantees the two
// pages look like one product (the whole point of this exploration).
//
// Tokens were authored in OKLCH and checked for WCAG AA: every `text`/`textMuted`
// pair clears 4.5:1 on its intended `bg`/`surface`, and each `accent` clears
// 4.5:1 as a button background with `accentInk` on top. The pale source-image
// hues (mint, sage) live only in `chartFill`/`chart*` — never as text.

export const STYLE1 = {
  id: 1,
  name: 'Clinic',
  sub: 'Light · Analytical',
  scene: 'Reviewing training data later on a bright couch — calm, precise.',
  mode: 'light',
  // surfaces — cool off-white, tinted a hair toward teal, never cream
  bg: '#eef2f3',
  surface: '#ffffff',
  surfaceAlt: '#f6f9fa',
  border: '#dbe3e5',
  borderStrong: '#c3cfd2',
  // ink
  text: '#16242a',       // ~13:1 on surface
  textMuted: '#516269',  // ~5.4:1 on surface
  // accent — deepened teal so white text passes on a filled button
  accent: '#0e7490',
  accentInk: '#ffffff',
  accentSoft: '#dcecf0', // tint for selected backgrounds
  // semantic deltas
  positive: '#2f7d4f',
  negative: '#bd463e',
  // chart roles (graphical — 3:1 territory)
  chartA: '#0e7490',
  chartB: '#4f9e57',
  chartFill: 'rgba(127,217,176,0.22)',
  // hub preview strip
  swatch: ['#eef2f3', '#0e7490', '#7fd9b0'],
  tags: ['light', 'teal', 'clinical'],
}

export const STYLE2 = {
  id: 2,
  name: 'Terrarium',
  sub: 'Warm dark · Gold',
  scene: 'Mid-workout in a dim gym, phone propped, glancing between sets.',
  mode: 'dark',
  bg: '#1b2017',
  surface: '#252b1d',
  surfaceAlt: '#2e3525',
  border: '#3a4230',
  borderStrong: '#4a5440',
  text: '#e8e3d3',       // ~12:1 on bg
  textMuted: '#b1ad96',  // ~6.1:1 on bg
  accent: '#c4841a',     // Inca Gold — the single "red-equivalent" accent
  accentInk: '#1b2017',
  accentSoft: 'rgba(196,132,26,0.16)',
  positive: '#8fb24f',
  negative: '#df8460',
  chartA: '#c4841a',
  chartB: '#9a9b7a',
  chartFill: 'rgba(196,132,26,0.16)',
  swatch: ['#1b2017', '#c4841a', '#9a9b7a'],
  tags: ['dark', 'moss', 'gold'],
}

export const STYLE3 = {
  id: 3,
  name: 'Ledger',
  sub: 'Cool dark · Steel',
  scene: 'Late-night focused log review — instrument-panel precision.',
  mode: 'dark',
  bg: '#0e0f11',
  surface: '#161719',
  surfaceAlt: '#1d1f22',
  border: '#2a2d31',
  borderStrong: '#3a3e44',
  text: '#f1f4f6',       // ~16:1 on bg
  textMuted: '#9aa1a8',  // ~6.4:1 on bg
  accent: '#5f8fa6',     // restrained steel-cyan, used sparingly (<8%)
  accentInk: '#0e0f11',
  accentSoft: 'rgba(95,143,166,0.16)',
  positive: '#5fa37f',
  negative: '#b86a6a',
  chartA: '#5f8fa6',
  chartB: '#8a93a0',
  chartFill: 'rgba(95,143,166,0.14)',
  swatch: ['#0e0f11', '#5f8fa6', '#8a93a0'],
  tags: ['dark', 'graphite', 'steel'],
}

export const STYLES = [STYLE1, STYLE2, STYLE3]
export const STYLE_BY_ID = { 1: STYLE1, 2: STYLE2, 3: STYLE3 }

// "Pulse" — modern Reddit-style Community concept. Two rounds of user feedback shaped
// this palette: (1) lower the key — the page was "too bright", so the base is now a
// dim greige (teal-grey) and white cards LIFT off it for depth instead of a flat white
// snowfield; (2) deepen the signature — the pale mint read as washed/monochrome, so the
// one accent is now a richer, less-bright teal (green→teal→blue) used as a SOLID fill
// where the Reddit reference uses orange (active sort pill, upvoted vote pill, FAB).
// White text rides those deep fills (`onAccent`); the pale mint is demoted to soft
// `GRAD_SOFT` tints only, carrying a deep-teal ink (`onGrad`). The neutral text ramp is
// deepened and tinted toward teal (not flat grey) so body copy pops on white.
export const MODERN = {
  // surfaces — dim greige base, white cards lift off it (depth without glare)
  bg: '#dde3e4',
  surface: '#ffffff',
  surfaceAlt: '#eef3f3',
  border: '#d3dcdc',
  borderStrong: '#bcc8c9',
  // text ramp — deepened + teal-tinted (no flat neutral grey)
  ink: '#11222a',        // ~17:1 on surface
  muted: '#33474f',      // ~8.3:1 on surface — secondary text that pops
  faint: '#5f7178',      // ~4.7:1 on surface — tertiary only

  // the signature: a deep, slightly-mixed teal (green → teal → blue). Solid fill; white rides it.
  gradFrom: '#1f7d6c',
  gradVia: '#16778a',
  gradTo: '#236d92',
  onAccent: '#ffffff',   // text/icons on the deep fills (verified ≥4.5:1 on every stop)
  onGrad: '#0f494a',     // deep-teal ink for text on the pale GRAD_SOFT tints (≥7:1)

  // solid accent for accent-coloured text/icons sitting directly on the neutral surface
  accentDeep: '#11697a', // ~6:1 on white

  // soft, near-neutral elevation — no colour glow
  shadowSoft: '0 1px 2px rgba(16,32,38,0.05), 0 14px 26px -16px rgba(16,32,38,0.20)',
  shadowLift: '0 8px 22px -10px rgba(16,32,38,0.32)',

  // semantic
  positive: '#2f7d4f',
  negative: '#bd463e',

  // per-element gradient recipes — deliberately different stop brightness per surface so each
  // accent area fades its own way (dark forest→slate→marine for CTA, darker marine→teal→black-teal
  // for vote, vivid mint→ocean→blue for FAB, asymmetric alpha for the soft wash)
  g: {
    ctaBg: 'linear-gradient(118deg,#124c43,#0d4f67,#153d68)', ctaInk: '#ffffff',
    voteBg: 'linear-gradient(205deg,#153d68,#0c4555,#0a2d2d)', voteInk: '#ffffff',
    fabBg: 'linear-gradient(50deg,#2fb09a,#1aaac8,#2690c0)', fabInk: '#ffffff',
    softBg: 'linear-gradient(135deg,#1f7d6c40,#16778a1c,#236d923c)', softInk: '#0f494a',
  },

  // identity
  id: 'teal',
  label: 'Tidewater',
  // hub preview strip mirrors the deep blend
  swatch: ['#1f7d6c', '#16778a', '#236d92'],
  tags: ['reddit', 'modern', 'teal'],
}

// "Terrarium" — second Pulse palette, from the moss/sage/gold Pantone set (Terrarium Moss,
// Winter Moss, Sage, Moss Gray, Inca Gold). Vivid and warm where the teal palette is cool.
// Toggleable against MODERN in the feed for side-by-side comparison. Same token shape so the
// components are palette-agnostic. Two ink strategies coexist: white rides the DARK moss/olive
// CTA + vote fills (every under-text stop kept ≥4.5:1 on white), while the FAB leans into the
// VIVID sage→gold→moss blend and carries a dark olive ink (large icon, ≥3:1). The bright gold
// and sage live on the FAB, soft tints, and hero accents so the palette reads vivid, not muddy.
export const MODERN_MOSS = {
  // surfaces — dim moss-grey base (a light Moss Gray, the palette's own neutral — not warm cream),
  // white cards lift off it exactly like the teal concept for a fair comparison
  bg: '#dcded0',
  surface: '#ffffff',
  surfaceAlt: '#eef0e4',
  border: '#d2d4c2',
  borderStrong: '#bbbda6',
  // text ramp — deep olive ink, tinted toward moss (not flat grey)
  ink: '#22241a',        // ~16:1 on surface
  muted: '#45483a',      // secondary that pops on white
  faint: '#6b6d5b',      // tertiary only

  // signature stops (vivid moss → sage → gold) — see `g` for how each surface mixes them
  gradFrom: '#566032',
  gradVia: '#8a8b55',
  gradTo: '#b9781f',
  onAccent: '#ffffff',
  onGrad: '#33351c',     // deep olive ink for text on the pale soft tints

  // accent text/icons on neutral surface — a deep Inca-gold-brown
  accentDeep: '#7d5111',

  shadowSoft: '0 1px 2px rgba(34,36,22,0.05), 0 14px 26px -16px rgba(34,36,22,0.22)',
  shadowLift: '0 8px 22px -10px rgba(34,36,22,0.34)',

  positive: '#5b7d2f',
  negative: '#bd463e',

  // per-element gradient recipes — deliberately different angles AND stop orders per surface
  g: {
    // CTA / active sort pill: moss → olive → deep gold, white ink (dark-dominant)
    ctaBg: 'linear-gradient(118deg,#515a2c,#4a5230,#6e4f14)', ctaInk: '#ffffff',
    // vote pill: gold → moss → winter-moss, reversed angle so it fades the other way
    voteBg: 'linear-gradient(205deg,#6e4f14,#4f5a2e,#41412b)', voteInk: '#ffffff',
    // FAB: VIVID sage → inca gold → light moss-sage, low angle, dark olive ink (large icon;
    // every stop kept light enough for the dark ink to clear 3:1)
    fabBg: 'linear-gradient(50deg,#9a9a55,#c47f1b,#7c8146)', fabInk: '#22241a',
    // soft tint: warm gold→sage→moss wash for badges/banners, deep olive ink
    softBg: 'linear-gradient(135deg,#c47f1b2b,#8a8b5520,#5663302b)', softInk: '#33351c',
  },

  id: 'moss',
  label: 'Terrarium',
  swatch: ['#566032', '#b9781f', '#8a8b55'],
  tags: ['terrarium', 'moss', 'gold'],
}

// Convenience: the blended-accent gradient as a CSS string.
export function modernGradient(angle = 120) {
  return `linear-gradient(${angle}deg, ${MODERN.gradFrom}, ${MODERN.gradVia}, ${MODERN.gradTo})`
}
