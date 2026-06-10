// Pill tabs — the "Rubber Brass" segmented control: a soft container holding
// smoothly rounded segments. Active = solid graphite with light ink; inactive =
// transparent with muted ink. Theme-driven via the CSS variables in index.css.
//
// `tabs` accepts strings or { value, label } objects. Set `scroll` when there
// are enough tabs that equal-width segments would crowd (they become a
// horizontally scrollable row instead).
export default function PillTabs({
  tabs,
  value,
  onChange,
  scroll = false,
  className = '',
  ariaLabel,
  // Active-segment fill. Defaults to the light graphite accent (the original
  // sub-nav look); inactive segments stay muted. Pass a hex to scope a tab row to
  // a surface's own hue. `accentInk` is the label color on the active segment.
  accent = 'var(--accent)',
  accentInk = 'var(--accent-ink)',
}) {
  const items = tabs.map(t => (typeof t === 'string' ? { value: t, label: t } : t))

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={
        'flex gap-1 p-1 ' +
        (scroll ? 'overflow-x-auto no-scrollbar ' : '') +
        className
      }
      style={{
        background: 'var(--surface-alt)',
        border: '1px solid var(--border)',
        borderRadius: 'calc(var(--radius) + 2px)',
      }}
    >
      {items.map(t => {
        const on = value === t.value
        return (

          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.value)}
            className={
              'h-8 text-xs font-semibold transition-colors truncate ' +
              (scroll ? 'flex-none px-4 ' : 'flex-1 min-w-0 px-2 ')
            }
            style={{
              borderRadius: 'calc(var(--radius) - 4px)',
              background: on ? accent : 'transparent',
              color: on ? accentInk : 'var(--text-muted)',
            }}
          >
            {t.label}
          </button>

        )
      })}
    </div>
  )
}
