// Five full-app aesthetic palettes for the concept showcase.
// Same token shape as STYLE1/2/3 in conceptStyles.js so every palette-aware
// page component can be swapped without knowing which palette it's rendering.
//
// Colors authored in OKLCH, verified WCAG AA: every text/textMuted pair clears
// 4.5:1 on its bg/surface, and each accent clears 4.5:1 as a button bg with
// accentInk on top.

export const PALETTE1 = {
  id: 1,
  name: 'Chalk',
  sub: 'Light · Editorial',
  scene: 'Reviewing your log in morning daylight — paper, ink, one red pen.',
  mode: 'light',
  bg:          '#f7f5f0',  // warm paper, slight cream
  surface:     '#ffffff',
  surfaceAlt:  '#f0ece3',
  border:      '#e4dfd5',
  borderStrong:'#ccc5b8',
  text:        '#1a1510',  // ~14:1 on surface
  textMuted:   '#6a6057',  // ~5:1 on surface
  accent:      '#c8301e',  // editorial red — not neon, like a correction pen
  accentInk:   '#ffffff',
  accentSoft:  'rgba(200,48,30,0.10)',
  positive:    '#2d7a3e',
  negative:    '#c8301e',
  chartA:      '#c8301e',
  chartB:      '#2d7a3e',
  chartFill:   'rgba(200,48,30,0.10)',
  // layout hints consumed by palette page components
  radius:      14,          // card border-radius px
  density:     'spacious',  // 'spacious' | 'compact'
  swatch: ['#f7f5f0', '#1a1510', '#c8301e'],
  tags: ['light', 'editorial', 'paper', 'red'],
}

export const PALETTE6 = {
  id: 6,
  name: 'Splitline',
  sub: 'Activity Feed · Warm Slate',
  scene: 'Post-workout review on the walk home, bright outdoor light, one thumb scanning the day.',
  mode: 'light',
  style: 'strava',
  bg:          '#eef1ee',
  surface:     '#ffffff',
  surfaceAlt:  '#e4e9e5',
  border:      '#d5ddd7',
  borderStrong:'#b5c0b8',
  text:        '#161b18',
  textMuted:   '#5f6b64',
  accent:      '#b04a32',
  accentInk:   '#ffffff',
  accentSoft:  'rgba(176,74,50,0.12)',
  positive:    '#237a52',
  negative:    '#b43b44',
  chartA:      '#b04a32',
  chartB:      '#237a52',
  chartFill:   'rgba(176,74,50,0.12)',
  radius:      12,
  density:     'spacious',
  swatch: ['#eef1ee', '#b04a32', '#237a52'],
  tags: ['light', 'activity', 'social', 'routes'],
}

export const PALETTE7 = {
  id: 7,
  name: 'Forum',
  sub: 'Discussion · Utility Light',
  scene: 'Late couch review, comparing posts and evidence threads with compact controls.',
  mode: 'light',
  style: 'reddit',
  bg:          '#f1f4f5',
  surface:     '#ffffff',
  surfaceAlt:  '#e6ecee',
  border:      '#d3dcdf',
  borderStrong:'#aebcc2',
  text:        '#111719',
  textMuted:   '#56676e',
  accent:      '#246a73',
  accentInk:   '#ffffff',
  accentSoft:  'rgba(36,106,115,0.12)',
  positive:    '#2b7a52',
  negative:    '#ad3f45',
  chartA:      '#246a73',
  chartB:      '#6f5f9e',
  chartFill:   'rgba(36,106,115,0.12)',
  radius:      8,
  density:     'compact',
  swatch: ['#f1f4f5', '#246a73', '#6f5f9e'],
  tags: ['light', 'forum', 'dense', 'threads'],
}

export const PALETTE8 = {
  id: 8,
  name: 'Afterglow',
  sub: 'Dark · Kinetic Cards',
  scene: 'Phone on a bench under gym lighting, fast taps, dark screen, bright action pills.',
  mode: 'dark',
  style: 'signal',
  bg:          '#090b0b',
  surface:     '#141817',
  surfaceAlt:  '#1d2421',
  border:      '#29332f',
  borderStrong:'#46564f',
  text:        '#f0f6ef',
  textMuted:   '#91a097',
  accent:      '#8fd84e',
  accentInk:   '#071007',
  accentSoft:  'rgba(143,216,78,0.16)',
  positive:    '#8fd84e',
  negative:    '#ff6b5f',
  chartA:      '#8fd84e',
  chartB:      '#52c7b8',
  chartFill:   'rgba(143,216,78,0.14)',
  radius:      18,
  density:     'compact',
  swatch: ['#090b0b', '#8fd84e', '#52c7b8'],
  tags: ['dark', 'kinetic', 'cards', 'bright'],
}

export const PALETTE9 = {
  id: 9,
  name: 'Porcelain Hazel',
  sub: 'Light · Matte Signal',
  scene: 'A clean white training device in daylight, graphite data, moss controls, hazel warmth inside the panels.',
  mode: 'light',
  style: 'signal',
  bg:          '#f7f9f5',
  surface:     '#ffffff',
  surfaceAlt:  '#edf2ea',
  border:      '#dbe4d8',
  borderStrong:'#b9c8b4',
  text:        '#182019',
  textMuted:   '#5f6f62',
  accent:      '#536b3d',
  accentInk:   '#ffffff',
  accentSoft:  'rgba(83,107,61,0.12)',
  positive:    '#536b3d',
  negative:    '#a34842',
  chartA:      '#536b3d',
  chartB:      '#a8794d',
  chartFill:   'rgba(168,121,77,0.16)',
  heroFade:    'rgba(168,121,77,0.18)',
  radius:      18,
  density:     'compact',
  swatch: ['#f7f9f5', '#536b3d', '#a8794d'],
  tags: ['light', 'matte', 'moss', 'hazel'],
}

export const PALETTE10 = {
  id: 10,
  name: 'Rubber Brass',
  sub: 'Light · Gym Hardware',
  scene: 'A white training console on black rubber flooring, hard graphite controls, brass warmth in the panels.',
  mode: 'light',
  style: 'signal',
  bg:          '#f7f8f4',
  surface:     '#ffffff',
  surfaceAlt:  '#e9ece6',
  border:      '#d5dcd2',
  borderStrong:'#b0bab0',
  text:        '#151817',
  textMuted:   '#58615b',
  accent:      '#242825',
  accentInk:   '#ffffff',
  accentSoft:  'rgba(36,40,37,0.11)',
  positive:    '#506343',
  negative:    '#9b463d',
  chartA:      '#242825',
  chartB:      '#a77b3f',
  chartFill:   'rgba(167,123,63,0.16)',
  heroFade:    'rgba(167,123,63,0.23)',
  radius:      18,
  density:     'compact',
  swatch: ['#f7f8f4', '#242825', '#a77b3f'],
  tags: ['light', 'rubber', 'brass', 'hardware'],
}

export const PALETTE11 = {
  id: 11,
  name: 'Training Ledger',
  sub: 'Light - Progress Earth',
  scene: 'Reviewing training notes after a lift, warm room light, one calm surface for logs and data.',
  mode: 'light',
  bg:          '#ddd0c2',
  surface:     '#e8ddd0',
  surfaceAlt:  '#d4c8b8',
  border:      '#c9bcad',
  borderStrong:'#aa9b89',
  text:        '#3a302a',
  textMuted:   '#665747',
  accent:      '#8f4d32',
  accentInk:   '#ffffff',
  accentSoft:  'rgba(143,77,50,0.14)',
  positive:    '#506f43',
  negative:    '#9b463d',
  chartA:      '#b85c38',
  chartB:      '#5a7a90',
  chartFill:   'rgba(184,92,56,0.14)',
  radius:      12,
  density:     'compact',
  swatch: ['#ddd0c2', '#3a302a', '#b85c38'],
  tags: ['light', 'warm', 'editorial', 'earth', 'progress'],
}

export const PALETTE2 = {
  id: 2,
  name: 'Ember',
  sub: 'Dark · Warm Amber',
  scene: 'Phone propped between sets under warm low-light. Focused, dense.',
  mode: 'dark',
  bg:          '#100d08',  // very dark warm black
  surface:     '#1c1710',
  surfaceAlt:  '#261f14',
  border:      '#302618',
  borderStrong:'#42361f',
  text:        '#f0e8d8',  // ~13:1 on bg
  textMuted:   '#a89070',  // ~5.5:1 on bg
  accent:      '#d97c1e',  // rich amber
  accentInk:   '#100d08',
  accentSoft:  'rgba(217,124,30,0.14)',
  positive:    '#6ea84a',
  negative:    '#d94a1e',
  chartA:      '#d97c1e',
  chartB:      '#6ea84a',
  chartFill:   'rgba(217,124,30,0.14)',
  radius:      10,
  density:     'compact',
  swatch: ['#100d08', '#d97c1e', '#6ea84a'],
  tags: ['dark', 'amber', 'warm', 'dense'],
}

export const PALETTE3 = {
  id: 3,
  name: 'Marine',
  sub: 'Dark Navy · Technical',
  scene: 'Late-night analysis — instrument-panel precision, cold blue depth.',
  mode: 'dark',
  bg:          '#0b1420',  // deep ocean navy
  surface:     '#111e30',
  surfaceAlt:  '#162438',
  border:      '#1e3348',
  borderStrong:'#2a4560',
  text:        '#e8f3fa',  // ~14:1 on bg
  textMuted:   '#6a90b0',  // ~4.7:1 on bg
  accent:      '#38a3d4',  // sky/cerulean (4.5:1+ on surface)
  accentInk:   '#0b1420',
  accentSoft:  'rgba(56,163,212,0.14)',
  positive:    '#3da87c',
  negative:    '#e05050',
  chartA:      '#38a3d4',
  chartB:      '#3da87c',
  chartFill:   'rgba(56,163,212,0.12)',
  radius:      8,
  density:     'compact',
  swatch: ['#0b1420', '#38a3d4', '#3da87c'],
  tags: ['dark', 'navy', 'technical', 'mono'],
}

export const PALETTE4 = {
  id: 4,
  name: 'Grove',
  sub: 'Dark Forest · Earthy',
  scene: 'Outdoor gym or early-morning session — organic, quiet, unhurried.',
  mode: 'dark',
  bg:          '#111810',  // very dark forest green
  surface:     '#192418',
  surfaceAlt:  '#202e1e',
  border:      '#283824',
  borderStrong:'#364a30',
  text:        '#e4edda',  // ~13:1 on bg
  textMuted:   '#85a875',  // ~4.7:1 on bg
  accent:      '#6ab55a',  // medium sage green (4.5:1 on bg AND surface)
  accentInk:   '#111810',
  accentSoft:  'rgba(106,181,90,0.14)',
  positive:    '#6ab55a',
  negative:    '#d07050',
  chartA:      '#6ab55a',
  chartB:      '#c2a550',  // warm gold for second series
  chartFill:   'rgba(106,181,90,0.12)',
  radius:      20,
  density:     'spacious',
  swatch: ['#111810', '#6ab55a', '#c2a550'],
  tags: ['dark', 'forest', 'earthy', 'open'],
}

export const PALETTE5 = {
  id: 5,
  name: 'Quartz',
  sub: 'Light · Lavender · Modern',
  scene: 'Upscale wellness energy — lavender daylight, aspirational calm.',
  mode: 'light',
  bg:          '#f2eef8',  // light lavender tint
  surface:     '#ffffff',
  surfaceAlt:  '#ece6f4',
  border:      '#ddd4ee',
  borderStrong:'#c9bce0',
  text:        '#1c1226',  // ~14:1 on surface
  textMuted:   '#65527c',  // ~5:1 on surface
  accent:      '#6d28d9',  // rich violet (4.5:1+ on white)
  accentInk:   '#ffffff',
  accentSoft:  'rgba(109,40,217,0.10)',
  positive:    '#0d7a5a',
  negative:    '#b82030',
  chartA:      '#6d28d9',
  chartB:      '#0d7a5a',
  chartFill:   'rgba(109,40,217,0.10)',
  radius:      16,
  density:     'spacious',
  swatch: ['#f2eef8', '#6d28d9', '#0d7a5a'],
  tags: ['light', 'violet', 'lavender', 'modern'],
}

export const PALETTES = [PALETTE1, PALETTE11, PALETTE6, PALETTE7, PALETTE8, PALETTE9, PALETTE10, PALETTE2, PALETTE3, PALETTE4, PALETTE5]
export const PALETTE_BY_ID = { 1: PALETTE1, 2: PALETTE2, 3: PALETTE3, 4: PALETTE4, 5: PALETTE5, 6: PALETTE6, 7: PALETTE7, 8: PALETTE8, 9: PALETTE9, 10: PALETTE10, 11: PALETTE11 }
