import { useEffect, useState } from 'react'

// Faint grain so the wash reads as textured pigment, not a flat fill. Inline
// feTurbulence SVG data-URI; kept very low opacity so it only breaks up the
// gradient banding without becoming visible noise.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")"

// Direction-based collapse: scrolling DOWN tucks the sub-nav away; scrolling UP
// brings it back *from anywhere* in the list (not just at the top), so tabs +
// search are always one swipe away. A small delta guards against jitter; near
// the very top it's always expanded. This is a discrete target (collapsed bool),
// so the region animates the transition (see `.collapse-region` in index.css)
// rather than tracking the finger frame-by-frame.
const EXPAND_AT = 8        // always expanded at/above this scroll position
const MIN_COLLAPSE_Y = 64  // don't collapse until scrolled past the header zone
const DELTA = 6            // ignore sub-pixel/jitter scrolls

function useDirectionalCollapse() {
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (y <= EXPAND_AT) { setCollapsed(false); lastY = y; return }
      const dy = y - lastY
      if (Math.abs(dy) < DELTA) return
      if (dy > 0 && y > MIN_COLLAPSE_Y) setCollapsed(true)
      else if (dy < 0) setCollapsed(false)
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return collapsed
}

// Flat header — the de-bubbled page shelf (DESIGN.md, Tier 1). The title sits as
// large bold type directly on the page background (no card, no gradient panel);
// the primary action holds the top-right slot. Pronounced by scale, not
// packaging. Sticky so the identity + action stay reachable.
//
// `wash` (a hue, e.g. 'var(--azure)') paints a full-bleed atmospheric gradient
// *behind* the header that fades into the page background — the old textured
// header color without re-bubbling it into a panel.
//
// The `tabs` slot (sub-nav) collapses away on scroll-down and animates back on
// scroll-up; the title row and right-hand action cluster stay put throughout.
// `bg` sets the header fill (default = page ground; a section can pass a solid
// brand color for a committed colored header). `titleColor` overrides the title
// ink — needed when `bg` is a light brand color and white-ish text would fail.
export default function FlatHeader({ title, action, tabs, wash, bg = 'var(--bg)', titleColor = 'var(--text)', className = '' }) {
  const collapsed = useDirectionalCollapse()
  return (
    <header
      className={'relative sticky top-0 z-20 ' + className}
      style={{ background: bg }}
    >
      {wash && (
        <span
          aria-hidden="true"
          className="collapse-wash pointer-events-none absolute inset-x-0 top-0 bottom-0 -z-0"
          style={{
            opacity: collapsed ? 0 : 1,
            background:
              `linear-gradient(160deg, color-mix(in srgb, ${wash} 48%, transparent) 0%, ` +
              `color-mix(in srgb, ${wash} 18%, transparent) 52%, transparent 100%), ` +
              GRAIN,
          }}
        />
      )}
      <div className="relative z-10 flex items-center justify-between gap-3 px-4 safe-pt-3 pb-3 min-w-0">
        <h1 className="text-display font-extrabold truncate" style={{ color: titleColor }}>{title}</h1>
        {action && <div className="shrink-0 flex items-center gap-1.5">{action}</div>}
      </div>
      {tabs && (
        <div
          className="collapse-region relative z-10 grid"
          style={{ gridTemplateRows: collapsed ? '0fr' : '1fr', opacity: collapsed ? 0 : 1 }}
        >
          <div style={{ overflow: 'hidden', minHeight: 0 }}>{tabs}</div>
        </div>
      )}
    </header>
  )
}

// Solid graphite pill action, matching the app's primary-action language.
export function FlatAction({ children, ...props }) {
  return (
    <button
      type="button"
      className="h-9 px-5 text-sm font-bold rounded-full transition-transform active:scale-95 disabled:opacity-40"
      style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
      {...props}
    >
      {children}
    </button>
  )
}

// Header-right icon button (search etc.) — matches the action cluster sizing.
export function FlatIconAction({ children, active = false, ...props }) {
  return (
    <button
      type="button"
      className="grid h-9 w-9 place-items-center rounded-full transition-colors active:scale-95"
      style={active
        ? { background: 'var(--surface-alt)', color: 'var(--text)', border: '1px solid var(--border-strong)' }
        : { color: 'var(--text-muted)', border: '1px solid transparent' }}
      {...props}
    >
      {children}
    </button>
  )
}
