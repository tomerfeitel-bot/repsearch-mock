// Rubber Brass palette (light "gym hardware") for the Progress page.
export const PROGRESS_BG = '#f7f8f4'
export const PROGRESS_CARD = '#ffffff'
export const PROGRESS_BORDER = '#d5dcd2'
export const PROGRESS_TEXT = '#151817'
export const PROGRESS_MUTED = '#58615b'

// Split day to hex used for calendar tiles, PR list left-border, and chips.
// Tuned to read on white as both a fill and a small text/border accent.
export const SPLIT_COLORS = {
  Push: '#b04a2a',
  Pull: '#3f6f88',
  Legs: '#4f7a3f',
  Upper: '#a06a1f',
  Lower: '#4f7a3f',
  'Full Body': '#6a4f86',
  Chest: '#b04a2a',
  Back: '#3f6f88',
  Shoulders: '#a06a1f',
  Arms: '#9b463d',
  Other: '#6f655a',
}

export function splitColor(day) {
  return SPLIT_COLORS[day] || SPLIT_COLORS.Other
}
