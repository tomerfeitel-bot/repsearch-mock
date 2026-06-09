// Shared categorical hue palette. One place so every marker/tag/chart across the
// app reads as one colored system instead of ad-hoc Tailwind colors.
//
// Register discipline (DESIGN.md round 6 — two-tier chrome): color is SEMANTIC,
// not decoration. SOLID brand green carries the *active/selected* state; quiet
// markers use a colored DOT + neutral label (never a soft-tint pill). These hues
// categorize (topic, kind, series); they are not sprinkled for variety.
//
// The set is the harmonized, green-anchored jewel palette: the brand emerald is
// the lead member; the rest spread evenly around it at a consistent jewel tone.
// `fill` = the saturated value for dots / chart bars; `ink` = the lightened value
// for text / thin lines on the dark canvas (>=4.5:1 on --bg #08090a); `tint` =
// `fill` at low alpha, reserved for chart area-fills + hover bg only.

// `fill` = the SOLID chip background; `on` = the text on that fill (white, except
// amber which is light → dark text); `ink` = the vibrant text value for the rare
// place a hue is text on the dark ground (kept for reuse). All contrast-verified.
export const BUBBLE_HUES = [
  { key: 'green',  fill: '#0B7A43', on: '#ffffff', ink: '#34BE73', text: '#34BE73', tint: 'rgba(11, 122, 67, 0.16)' },
  { key: 'teal',   fill: '#007661', on: '#ffffff', ink: '#44BFA5', text: '#44BFA5', tint: 'rgba(0, 118, 97, 0.16)' },
  { key: 'blue',   fill: '#2D6DA5', on: '#ffffff', ink: '#5CABF2', text: '#5CABF2', tint: 'rgba(45, 109, 165, 0.16)' },
  { key: 'violet', fill: '#7B5AAE', on: '#ffffff', ink: '#B38EF1', text: '#B38EF1', tint: 'rgba(123, 90, 174, 0.16)' },
  { key: 'berry',  fill: '#AB4477', on: '#ffffff', ink: '#EA7AAE', text: '#EA7AAE', tint: 'rgba(171, 68, 119, 0.16)' },
  { key: 'amber',  fill: '#B48226', on: '#0c0c0c', ink: '#F2B036', text: '#F2B036', tint: 'rgba(180, 130, 38, 0.16)' },
]

const HUE_BY_KEY = BUBBLE_HUES.reduce((m, h) => ({ ...m, [h.key]: h }), {})

// Fixed semantic roles. CONVERSATION/FILTER point at the brand GREEN — it is the
// app's accent (primary action + active selection), no longer brass.
export const CONVERSATION = HUE_BY_KEY.green
export const FILTER = HUE_BY_KEY.green
export const INFO = HUE_BY_KEY.blue
export const POSITIVE = HUE_BY_KEY.green

// Deterministic hash so a given topic label always maps to the same hue across
// the feed and the thread (stable categorization, not random color).
export function hueForLabel(label = '') {
  const s = String(label)
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return BUBBLE_HUES[Math.abs(h) % BUBBLE_HUES.length]
}

// Marker treatment (DESIGN.md round 6): SOLID colored chips (the direction the
// brand green set) — a saturated `fill` with contrasting `on` text, one hue per
// category. Not a grayed same-hue tint behind same-hue text.
export function labelStyle(label) {
  const h = hueForLabel(label)
  return { background: h.fill, color: h.on }
}
