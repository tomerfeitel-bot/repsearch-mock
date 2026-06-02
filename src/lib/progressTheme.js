// Warm earth palette for the Progress page only.
export const PROGRESS_BG = '#ddd0c2'
export const PROGRESS_CARD = '#e8ddd0'
export const PROGRESS_BORDER = '#d4c8b8'
export const PROGRESS_TEXT = '#3a302a'
export const PROGRESS_MUTED = '#7a6b5c'

// Split day to hex used for calendar tiles, PR list left-border, and chips.
export const SPLIT_COLORS = {
  Push: '#b85c38',
  Pull: '#5a7a90',
  Legs: '#6a8a5a',
  Upper: '#9c6f3a',
  Lower: '#6a8a5a',
  'Full Body': '#7c6a92',
  Chest: '#b85c38',
  Back: '#5a7a90',
  Shoulders: '#c4914a',
  Arms: '#8e6a6a',
  Other: '#9b8c7d',
}

export function splitColor(day) {
  return SPLIT_COLORS[day] || SPLIT_COLORS.Other
}
