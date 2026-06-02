// Single source of truth for muscle group colors.
// Used by exercise card left-border, calendar heatmap, PR list, and volume chips.

const PALETTE = {
  'Chest':       '#ef4444',
  'Upper Chest': '#ef4444',
  'Mid Chest':   '#ef4444',
  'Lower Chest': '#ef4444',
  'Back':        '#3b82f6',
  'Lats':        '#3b82f6',
  'Upper Back':  '#3b82f6',
  'Lower Back':  '#3b82f6',
  'Traps':       '#3b82f6',
  'Shoulders':   '#f59e0b',
  'Front Delts': '#f59e0b',
  'Side Delts':  '#f59e0b',
  'Rear Delts':  '#f59e0b',
  'Biceps':      '#a855f7',
  'Triceps':     '#a855f7',
  'Forearms':    '#a855f7',
  'Quads':       '#22c55e',
  'Hamstrings':  '#22c55e',
  'Glutes':      '#22c55e',
  'Calves':      '#22c55e',
  'Adductors':   '#22c55e',
  'Abductors':   '#22c55e',
  'Core':        '#fb923c',
  'Abs':         '#fb923c',
  'Obliques':    '#fb923c',
}

const FALLBACK = '#6b7280'

export function muscleColor(muscle) {
  if (!muscle) return FALLBACK
  return PALETTE[muscle] || FALLBACK
}

// For aggregate volume display: collapse fine-grained muscles up to top-level groups.
const TOP_LEVEL = [
  { group: 'Chest',     match: ['Chest', 'Upper Chest', 'Mid Chest', 'Lower Chest'] },
  { group: 'Back',      match: ['Back', 'Lats', 'Upper Back', 'Lower Back', 'Traps'] },
  { group: 'Shoulders', match: ['Shoulders', 'Front Delts', 'Side Delts', 'Rear Delts'] },
  { group: 'Arms',      match: ['Biceps', 'Triceps', 'Forearms'] },
  { group: 'Legs',      match: ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Adductors', 'Abductors'] },
  { group: 'Core',      match: ['Core', 'Abs', 'Obliques'] },
]

export function topLevelGroup(muscle) {
  if (!muscle) return null
  const hit = TOP_LEVEL.find(g => g.match.includes(muscle))
  return hit ? hit.group : muscle
}

export const TOP_LEVEL_GROUPS = TOP_LEVEL.map(g => g.group)
