// System ground/surface tokens (DESIGN.md) for the Progress page.
export const PROGRESS_BG = '#08090a'
export const PROGRESS_CARD = '#141615'
export const PROGRESS_BORDER = '#363c37'
export const PROGRESS_TEXT = '#f3f5f1'
export const PROGRESS_MUTED = '#aab3ab'

// The "Dark Jewel" expressive palette (DESIGN.md). Each hue has a `fill` (bars,
// dots, calendar tiles — can be deeper) and an `ink` (text / thin lines on black
// — lifted for legibility). `tint` is the fill at ~15% alpha, for chart area
// fills and bar backgrounds ONLY.
export const JEWEL = {
  brass:    { fill: '#d59a3a', ink: '#e8c074', tint: 'rgba(213,154,58,0.15)' },
  rust:     { fill: '#d3623a', ink: '#ea9670', tint: 'rgba(211,98,58,0.15)' },
  moss:     { fill: '#74ab47', ink: '#abd283', tint: 'rgba(116,171,71,0.15)' },
  pine:     { fill: '#2ba395', ink: '#6fcab8', tint: 'rgba(43,163,149,0.15)' },
  steel:    { fill: '#3f93cc', ink: '#87bce8', tint: 'rgba(63,147,204,0.15)' },
  amethyst: { fill: '#9a64b8', ink: '#c6a0e0', tint: 'rgba(154,100,184,0.15)' },
}

// Categorical series order — used when a chart plots multiple series so they read
// as one curated family rather than rainbow vomit.
export const JEWEL_SERIES = [JEWEL.pine, JEWEL.brass, JEWEL.steel, JEWEL.rust, JEWEL.amethyst, JEWEL.moss]

// Semantic (locked, DESIGN.md): positive = green (moss ink), negative = clay
// (rust ink). On the dark ground use the *ink* values so they stay legible.
export const POSITIVE_INK = JEWEL.moss.ink
export const NEGATIVE_INK = JEWEL.rust.ink

// Progress identity accent — a cool steel "instrument" tint that gives the
// dashboard its own room without going loud (the section is informative-but-
// restrained; the charts carry the real color).
export const PROGRESS_WASH = JEWEL.steel.fill
export const PROGRESS_ACCENT = JEWEL.steel.ink

// Split day to hex (Dark Jewel fills) used for calendar tiles, lift lines, and
// split dots. Distinguishable per split, reads on the dark ground.
export const SPLIT_COLORS = {
  Push: JEWEL.rust.fill,
  Pull: JEWEL.steel.fill,
  Legs: JEWEL.moss.fill,
  Upper: JEWEL.brass.fill,
  Lower: JEWEL.moss.fill,
  'Full Body': JEWEL.amethyst.fill,
  Chest: JEWEL.rust.fill,
  Back: JEWEL.steel.fill,
  Shoulders: JEWEL.brass.fill,
  Arms: JEWEL.pine.fill,
  Other: '#7f897f',
}

export function splitColor(day) {
  return SPLIT_COLORS[day] || SPLIT_COLORS.Other
}

// Body measurement → jewel hue (each tracked part keeps the same color across
// the dot, line, and delta so the eye learns it once).
export const MEASUREMENT_COLORS = {
  arm_cm: JEWEL.amethyst,
  chest_cm: JEWEL.rust,
  waist_cm: JEWEL.brass,
  thigh_cm: JEWEL.moss,
  calf_cm: JEWEL.steel,
}
