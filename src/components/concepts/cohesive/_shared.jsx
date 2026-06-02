// Shared primitives for the cohesive-style concepts: stroke-based icons (1.8px,
// matching the app's BottomNav) and a couple of tiny formatting helpers.
// Color is never baked in here — icons inherit `currentColor` so each style's
// tokens drive them.

function Svg({ size = 18, children, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  )
}

export const IconChevron = ({ open, ...p }) => (
  <Svg {...p} style={{ transition: 'transform 180ms ease', transform: open ? 'rotate(180deg)' : 'none', ...(p.style || {}) }}>
    <polyline points="6 9 12 15 18 9" />
  </Svg>
)
export const IconUp = (p) => <Svg {...p}><polyline points="18 15 12 9 6 15" /></Svg>
export const IconDown = (p) => <Svg {...p}><polyline points="6 9 12 15 18 15" /></Svg>
export const IconComment = (p) => <Svg {...p}><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 20l1.9-5.7a8.5 8.5 0 1 1 16.1-2.8z" /></Svg>
export const IconBookmark = ({ filled, ...p }) => <Svg {...p}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill={filled ? 'currentColor' : 'none'} /></Svg>
export const IconTrophy = (p) => <Svg {...p}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></Svg>
export const IconSearch = (p) => <Svg {...p}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></Svg>
export const IconPlus = (p) => <Svg {...p}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Svg>
export const IconTrend = (p) => <Svg {...p}><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></Svg>
export const IconActivity = (p) => <Svg {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Svg>
export const IconClose = (p) => <Svg {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Svg>
export const IconRuler = (p) => <Svg {...p}><path d="M3 8l13-5 5 5-13 13-5-5z" /><path d="M9 6l1.5 1.5M12 5l2 2M7 9l1.5 1.5M10 12l1.5 1.5" /></Svg>
export const IconShare = (p) => <Svg {...p}><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></Svg>
export const IconMore = (p) => <Svg {...p}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></Svg>
export const IconCaret = (p) => <Svg {...p}><polyline points="6 9 12 15 18 9" /></Svg>
export const IconHome = (p) => <Svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" /></Svg>
export const IconGrid = (p) => <Svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Svg>
export const IconChat = (p) => <Svg {...p}><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 20l1.9-5.7a8.5 8.5 0 1 1 16.1-2.8z" /></Svg>
export const IconUser = (p) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></Svg>
export const IconBolt = (p) => <Svg {...p}><polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2" /></Svg>

export const REACTIONS = [
  { key: 'respect', emoji: '💪', label: 'Respect' },
  { key: 'fire', emoji: '🔥', label: 'Fire' },
  { key: 'strong', emoji: '🏆', label: 'PR' },
]

export function fmtDelta(n, unit = '') {
  const s = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${s}${Math.abs(n)}${unit}`
}

export function compactScore(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`
}
