// Single source of truth for muscle group colors.
// Used by exercise card left-border, calendar heatmap, PR list, and volume chips.

// Hues are tuned to read as both text and a 4px accent on the light Rubber Brass
// surfaces (each clears ~4.5:1 on white) while keeping its original identity.
const PALETTE = {
  'Chest':       '#be3b30',
  'Upper Chest': '#be3b30',
  'Mid Chest':   '#be3b30',
  'Lower Chest': '#be3b30',
  'Back':        '#2563eb',
  'Lats':        '#2563eb',
  'Upper Back':  '#2563eb',
  'Lower Back':  '#2563eb',
  'Traps':       '#2563eb',
  'Shoulders':   '#b45309',
  'Front Delts': '#b45309',
  'Side Delts':  '#b45309',
  'Rear Delts':  '#b45309',
  'Biceps':      '#7c3aed',
  'Triceps':     '#7c3aed',
  'Forearms':    '#7c3aed',
  'Quads':       '#15803d',
  'Hamstrings':  '#15803d',
  'Glutes':      '#15803d',
  'Calves':      '#15803d',
  'Adductors':   '#15803d',
  'Abductors':   '#15803d',
  'Core':        '#c2410c',
  'Abs':         '#c2410c',
  'Obliques':    '#c2410c',
}

const FALLBACK = '#5b6560'

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
