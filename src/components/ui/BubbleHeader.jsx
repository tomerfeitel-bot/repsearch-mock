// Bubble header — the "Rubber Brass" concept's signature page header: a white
// card wrapping a rounded hero panel with a diagonal surfaceAlt -> brass gradient.
// Carries a small uppercase label, a big title, an optional action, and optional
// rounded stat pills. Theme-driven via the CSS variables in index.css.
//
// Pass `children` to render fully custom hero content (e.g. a big metric);
// otherwise the title / subtitle / pills composition is used.
export default function BubbleHeader({
  label,
  title,
  subtitle,
  action,
  pills,
  children,
  sticky = true,
  className = '',
}) {
  return (
    <header
      className={
        (sticky ? 'sticky top-0 z-20 ' : '') +
        'px-4 safe-pt-3 pb-3 ' +
        className
      }
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="p-3"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
        }}
      >
        <div
          className="rounded-2xl p-4 flex flex-col justify-between gap-3"
          style={{
            background:
              'linear-gradient(135deg, var(--surface-alt), var(--hero-fade))',
            minHeight: 108,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            {label && (
              <span
                className="text-[11px] font-bold uppercase tracking-wide"
                style={{ color: 'var(--accent)' }}
              >
                {label}
              </span>
            )}
            {action && <div className="-mt-1 shrink-0">{action}</div>}
          </div>

          <div className="min-w-0">
            {children || (
              <>
                {title && (
                  <h1
                    className="text-2xl font-black tracking-tight truncate"
                    style={{ color: 'var(--text)' }}
                  >
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
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
      className="h-8 px-4 text-xs font-bold rounded-full transition-colors disabled:opacity-40"
      style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
      {...props}
    >
      {children}
    </button>
  )
}
