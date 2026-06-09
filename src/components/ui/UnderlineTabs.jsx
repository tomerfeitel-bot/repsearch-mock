// Flat underline tabs — the de-bubbled peer-view switcher (DESIGN.md, Tier 1).
// Replaces the pill-in-a-pill PillTabs for sections whose top nav should read as
// flat editorial tabs: a row of text labels, the active one bold + colored with a
// thick accent underline, the whole row closed by a single hairline. Pronounced
// by weight + indicator, not by a box.
export default function UnderlineTabs({
  tabs, value, onChange, accent = 'var(--brass)', ariaLabel,
  activeColor = 'var(--text)', inactiveColor = 'var(--text-muted)', borderColor = 'var(--border)',
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex items-stretch gap-6 px-4" style={{ borderBottom: '1px solid ' + borderColor }}>
      {tabs.map(t => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className="relative -mb-px pb-2.5 pt-1 text-sm font-bold transition-colors"
            style={{ color: active ? activeColor : inactiveColor }}
          >
            {t.label}
            <span
              aria-hidden="true"
              className="absolute left-0 right-0 bottom-0 rounded-full transition-opacity"
              style={{ height: 2.5, background: accent, opacity: active ? 1 : 0 }}
            />
          </button>
        )
      })}
    </div>
  )
}
