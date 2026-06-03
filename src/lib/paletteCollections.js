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

export const PALETTES = [PALETTE1, PALETTE2, PALETTE3, PALETTE4, PALETTE5]
export const PALETTE_BY_ID = { 1: PALETTE1, 2: PALETTE2, 3: PALETTE3, 4: PALETTE4, 5: PALETTE5 }
