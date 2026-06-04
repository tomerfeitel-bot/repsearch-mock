import { useEffect, useRef } from 'react'

// Bubble header — the "Rubber Brass" concept's signature page header: a white
// card wrapping a rounded hero panel with a diagonal surfaceAlt -> brass gradient.
// Carries a small uppercase label, a big title, an optional action, and optional
// rounded stat pills. Theme-driven via the CSS variables in index.css.
//
// Pass `children` to render fully custom hero content (e.g. a big metric);
// otherwise the title / subtitle / pills composition is used.
//
// As the page scrolls, the hero collapses *continuously* into a compact sticky
// bar: the eyebrow label, subtitle and pills fade and squeeze away while the
// title stays at one fixed size and the panel padding tightens. The collapse is
// linked directly to scroll position so it tracks the finger, not a timed
// transition that snaps at a threshold.

// Collapse maps scrollY linearly onto a 0 -> 1 progress between EXPAND_AT and
// COLLAPSE_AT. Because progress is a pure function of scrollY (no hysteresis
// state), it can't oscillate the way a two-layout threshold swap does — every
// scroll position resolves to exactly one header shape.
const EXPAND_AT = 8
const COLLAPSE_AT = 104

// Writes the 0 -> 1 collapse progress to a CSS custom property on the header.
// Driving the layout through a CSS var keeps React out of the per-frame path:
// the browser interpolates everything via calc(), so the title bar tightens
// with scroll and nothing re-renders. The handler only reads scrollY and writes
// one custom property (no layout read, no rAF), so it stays cheap on every
// scroll event and doesn't freeze when rAF is throttled (backgrounded tabs).
function useCollapseProgress() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const apply = () => {
      const y = window.scrollY
      const p = Math.min(1, Math.max(0, (y - EXPAND_AT) / (COLLAPSE_AT - EXPAND_AT)))
      el.style.setProperty('--collapse', String(p))
    }
    apply()
    window.addEventListener('scroll', apply, { passive: true })
    return () => window.removeEventListener('scroll', apply)
  }, [])
  return ref
}

// Collapsible chrome (eyebrow, subtitle, pills): squeezes its height to zero and
// fades out as collapse runs 0 -> 1. overflow:hidden clips during the squeeze;
// overflow-anchor:none stops the shrinking row from yanking scroll position.
const collapsible = (maxH, fadeBy = 1) => ({
  maxHeight: `calc((1 - var(--collapse)) * ${maxH})`,
  opacity: `calc(1 - var(--collapse) / ${fadeBy})`,
  overflow: 'hidden',
  overflowAnchor: 'none',
})

export default function BubbleHeader({
  label,
  title,
  subtitle,
  action,
  pills,
  children,
  sticky = true,
  floating = false,
  className = '',
}) {
  const ref = useCollapseProgress()
  const hasExtra = Boolean(children || subtitle || (pills && pills.length > 0))

  return (
    <header
      ref={ref}
      className={
        (sticky ? 'sticky top-0 z-20 ' : '') +
        'px-4 safe-pt-3 pb-3 ' +
        className
      }
      style={{ '--collapse': 0, background: floating ? 'transparent' : 'var(--bg)' }}
    >
      <div
        className="p-3"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: floating ? '0 16px 32px -24px rgba(21, 24, 23, 0.42)' : undefined,
        }}
      >
        <div
          className="rounded-2xl flex flex-col justify-center px-4"
          style={{
            background:
              'linear-gradient(135deg, var(--surface-alt), var(--hero-fade))',
            // Vertical padding tightens 16px -> 10px; min-height melts to 0 so
            // the panel ends up hugging the single title line when collapsed.
            paddingTop: 'calc(1rem - var(--collapse) * 0.375rem)',
            paddingBottom: 'calc(1rem - var(--collapse) * 0.375rem)',
            minHeight: 'calc((1 - var(--collapse)) * 108px)',
          }}
        >
          {label && (
            <div style={{ ...collapsible('2rem', 0.55), marginBottom: 'calc((1 - var(--collapse)) * 0.5rem)' }}>
              <span
                className="text-micro font-bold uppercase tracking-wide"
                style={{ color: 'var(--accent)' }}
              >
                {label}
              </span>
            </div>
          )}

          {/* Title row stays at one fixed size through the whole collapse. The
              action rides alongside it so it never reflows or disappears. */}
          <div className="flex items-center justify-between gap-3 min-w-0">
            {title && (
              <h1
                className="text-display font-extrabold truncate"
                style={{ color: 'var(--text)' }}
              >
                {title}
              </h1>
            )}
            {action && <div className="shrink-0">{action}</div>}
          </div>

          {hasExtra && (
            <div style={{ ...collapsible('8rem'), marginTop: 'calc((1 - var(--collapse)) * 0.5rem)' }}>
              {children || (
                <>
                  {subtitle && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {subtitle}
                    </p>
                  )}
                  {pills && pills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {pills.map((p, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 rounded-full text-xs font-bold font-mono"
                          style={{ background: 'var(--accent-soft)', color: 'var(--text)' }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

// Convenience action button styled as the concept's solid graphite pill.
export function BubbleAction({ children, ...props }) {
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
