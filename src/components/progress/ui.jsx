// Progress dashboard primitives (DESIGN.md Tier 2). The generic floating
// bordered card is retired here: structure separates with space, hairlines, and
// type hierarchy. These are the shared content units every Progress tab composes
// from — Section (a titled block), StatTile (one earned number, gridded),
// DataRow (one quantitative record), ChartBlock (the color hero), plus the
// shared empty / error / loading states.
import {
  PROGRESS_BORDER, PROGRESS_TEXT, PROGRESS_MUTED, PROGRESS_CARD, PROGRESS_ACCENT,
} from '../../lib/progressTheme.js'

const HAIR = PROGRESS_BORDER

// A de-bubbled titled block: a small label row (title left, optional action
// right), an optional one-line insight caption, then content. No box — sections
// are told apart by space + a leading hairline, not nested containers.
export function Section({ title, caption, action, children, divider = true, className = '' }) {
  return (
    <section className={className} style={divider ? { borderTop: `1px solid ${HAIR}`, paddingTop: 18 } : undefined}>
      {(title || action) && (
        <div className="flex items-end justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: PROGRESS_MUTED }}>{title}</h2>
            {caption && <p className="text-[13px] mt-1 leading-snug" style={{ color: PROGRESS_TEXT }}>{caption}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

// Gridded stat tiles. One number (mono + tabular) and a plain label, separated by
// thin rules — no nested boxes, no gradient accents. Color comes only from data /
// semantic meaning, passed via `color`.
export function StatRow({ children, cols = 3 }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      {children}
    </div>
  )
}

export function StatTile({ label, value, unit, sub, color, first }) {
  return (
    <div className="px-3 first:pl-0 py-1" style={first ? undefined : { borderLeft: `1px solid ${HAIR}` }}>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold font-mono tabular-nums leading-none" style={{ color: color || PROGRESS_TEXT }}>{value}</span>
        {unit && <span className="text-sm font-medium" style={{ color: color || PROGRESS_MUTED }}>{unit}</span>}
      </div>
      <div className="text-[11px] uppercase tracking-wide mt-1.5" style={{ color: PROGRESS_MUTED }}>{label}</div>
      {sub && <div className="text-[11px] font-mono tabular-nums mt-0.5" style={{ color: PROGRESS_MUTED }}>{sub}</div>}
    </div>
  )
}

// A signed delta, colored by meaning (green up / clay down by default; pass an
// explicit `color` for metrics where direction isn't good-or-bad).
export function Delta({ value, unit = '', digits = 1, color, className = '' }) {
  if (value == null) return null
  const sign = value >= 0 ? '+' : ''
  return (
    <span className={'font-mono tabular-nums text-sm font-semibold ' + className} style={{ color }}>
      {sign}{value.toFixed(digits)}{unit}
    </span>
  )
}

// A full-bleed quantitative row: a label (optionally with a leading color dot),
// the number mono + right-aligned, hairline-separated, ≥44px target.
export function DataRow({ dot, label, sub, value, valueColor, trailing, onClick, as = 'div' }) {
  const Tag = onClick ? 'button' : as
  return (
    <Tag
      onClick={onClick}
      className={'w-full flex items-center gap-3 py-2.5 text-left transition-colors ' + (onClick ? 'active:opacity-70' : '')}
      style={{ borderTop: `1px solid ${HAIR}`, minHeight: 44 }}
    >
      {dot && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: dot }} />}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium truncate" style={{ color: PROGRESS_TEXT }}>{label}</span>
        {sub && <span className="block text-[11px] mt-0.5 truncate" style={{ color: PROGRESS_MUTED }}>{sub}</span>}
      </span>
      {value != null && (
        <span className="font-mono tabular-nums text-sm font-semibold shrink-0" style={{ color: valueColor || PROGRESS_TEXT }}>{value}</span>
      )}
      {trailing}
    </Tag>
  )
}

// The Chart Block — the analytical payoff and primary color carrier. Titled, a
// caption that states the insight (not a legend dump), and the plot inside a
// media-rounded surface (rounding is allowed on media). Color is allowed to be
// loud here.
export function ChartBlock({ title, caption, height = 150, action, children }) {
  return (
    <Section title={title} caption={caption} action={action}>
      <div className="rounded-2xl px-3 pt-3 pb-2" style={{ background: PROGRESS_CARD, border: `1px solid ${HAIR}` }}>
        <div style={{ width: '100%', height }}>{children}</div>
      </div>
    </Section>
  )
}

// Shared recharts axis + tooltip styling so every chart reads identically.
export const axisTick = { fontSize: 10, fill: PROGRESS_MUTED }
export const tooltipStyle = { background: '#0d0f0e', border: `1px solid ${HAIR}`, borderRadius: 10, fontSize: 12, color: PROGRESS_TEXT }
export const gridStroke = 'rgba(255,255,255,0.05)'

export function Empty({ children, className = '' }) {
  return <div className={'text-center py-8 text-sm ' + className} style={{ color: PROGRESS_MUTED }}>{children}</div>
}

export function ChartEmpty({ title, message }) {
  return (
    <Section title={title}>
      <div className="rounded-2xl py-10 px-4 text-center text-sm" style={{ background: 'rgba(255,255,255,0.02)', border: `1px dashed ${HAIR}`, color: PROGRESS_MUTED }}>
        {message}
      </div>
    </Section>
  )
}

export function InlineWarning({ message, onRetry }) {
  return (
    <div className="rounded-xl p-3 flex items-center justify-between gap-3 text-sm" style={{ background: PROGRESS_CARD, border: `1px solid ${HAIR}`, color: PROGRESS_MUTED }}>
      <span>{message}</span>
      <button className="font-semibold" style={{ color: PROGRESS_ACCENT }} onClick={onRetry}>Retry</button>
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="text-center py-12">
      <div className="text-sm" style={{ color: PROGRESS_MUTED }}>{message}</div>
      <button onClick={onRetry} className="mt-3 px-5 py-2.5 rounded-full text-sm font-bold" style={{ background: 'var(--emerald)', color: 'var(--on-emerald)' }}>Try again</button>
    </div>
  )
}

export function Skeleton({ blocks = [80, 220, 140] }) {
  return (
    <div className="space-y-4">
      {blocks.map((h, i) => (
        <div key={i} className="rounded-2xl animate-pulse" style={{ height: h, background: 'rgba(255,255,255,0.03)' }} />
      ))}
    </div>
  )
}

// Mode switch (DESIGN.md Tier 1) — a framed segmented control, visually heavier
// than pills, for switching between different tools/workspaces (Single vs
// Compare). Active uses the brand-green selection language.
export function ModeSwitch({ options, value, onChange, ariaLabel }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="inline-flex rounded-xl p-1 gap-1" style={{ background: PROGRESS_CARD, border: `1px solid ${HAIR}` }}>
      {options.map(o => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className="px-4 py-1.5 rounded-lg text-sm font-bold transition-colors"
            style={active
              ? { background: 'var(--emerald)', color: 'var(--on-emerald)' }
              : { background: 'transparent', color: PROGRESS_MUTED }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// Filter chip — solid fill when active (chips are solid everywhere, DESIGN.md).
// `accent` is the active fill (defaults to the brand green selection color).
export function Chip({ active, onClick, accent = 'var(--emerald)', onAccent = 'var(--on-emerald)', size = 'md', children }) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
  return (
    <button
      onClick={onClick}
      className={'rounded-full font-semibold whitespace-nowrap transition-colors ' + pad}
      style={active
        ? { background: accent, color: onAccent, border: `1px solid ${accent}` }
        : { background: 'transparent', color: PROGRESS_TEXT, border: `1px solid ${HAIR}` }}
    >
      {children}
    </button>
  )
}

// Primary action — the app-wide emerald brand button (matches Workout/Community).
export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={'rounded-full text-sm font-bold transition-transform active:scale-95 disabled:opacity-40 ' + className}
      style={{ background: 'var(--emerald)', color: 'var(--on-emerald)' }}
      {...props}
    >
      {children}
    </button>
  )
}
