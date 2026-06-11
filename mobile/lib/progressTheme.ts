// Port of src/lib/progressTheme.js — system ground/surface tokens plus the
// "Dark Jewel" expressive palette for the Progress dashboard.
export const PROGRESS_BG = '#08090a';
export const PROGRESS_CARD = '#141615';
export const PROGRESS_BORDER = '#363c37';
export const PROGRESS_TEXT = '#f3f5f1';
export const PROGRESS_MUTED = '#aab3ab';

// Each hue has a `fill` (bars, dots, calendar tiles — can be deeper) and an
// `ink` (text / thin lines on black — lifted for legibility). `tint` is the
// fill at ~15% alpha, for chart area fills and bar backgrounds ONLY.
export type Jewel = { fill: string; ink: string; tint: string };

export const JEWEL: Record<string, Jewel> = {
  brass: { fill: '#d59a3a', ink: '#e8c074', tint: 'rgba(213,154,58,0.15)' },
  rust: { fill: '#d3623a', ink: '#ea9670', tint: 'rgba(211,98,58,0.15)' },
  moss: { fill: '#74ab47', ink: '#abd283', tint: 'rgba(116,171,71,0.15)' },
  pine: { fill: '#2ba395', ink: '#6fcab8', tint: 'rgba(43,163,149,0.15)' },
  steel: { fill: '#3f93cc', ink: '#87bce8', tint: 'rgba(63,147,204,0.15)' },
  amethyst: { fill: '#9a64b8', ink: '#c6a0e0', tint: 'rgba(154,100,184,0.15)' },
};

// Categorical series order — used when a chart plots multiple series.
export const JEWEL_SERIES = [JEWEL.pine, JEWEL.brass, JEWEL.steel, JEWEL.rust, JEWEL.amethyst, JEWEL.moss];

// Semantic (locked): positive = green (moss ink), negative = clay (rust ink).
export const POSITIVE_INK = JEWEL.moss.ink;
export const NEGATIVE_INK = JEWEL.rust.ink;

// Progress identity accent — a cool steel "instrument" tint.
export const PROGRESS_WASH = JEWEL.steel.fill;
export const PROGRESS_ACCENT = JEWEL.steel.ink;

// Split day to hex (Dark Jewel fills) for calendar tiles, lift lines, split dots.
export const SPLIT_COLORS: Record<string, string> = {
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
};

export function splitColor(day?: string | null): string {
  return SPLIT_COLORS[day || ''] || SPLIT_COLORS.Other;
}

// Body measurement → jewel hue (consistent across dot, line, and delta).
export const MEASUREMENT_COLORS: Record<string, Jewel> = {
  arm_cm: JEWEL.amethyst,
  chest_cm: JEWEL.rust,
  waist_cm: JEWEL.brass,
  thigh_cm: JEWEL.moss,
  calf_cm: JEWEL.steel,
};
