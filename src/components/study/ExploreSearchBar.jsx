import { useMemo, useRef, useState } from 'react'
import { describeConfig, parseQuery } from '../../lib/queryParser.js'
import {
  STUDY_ACCENT,
  STUDY_ACCENT_FAINT,
  STUDY_BORDER,
  STUDY_BORDER_STRONG,
  STUDY_CARD,
  STUDY_MUTED,
  STUDY_TEXT,
} from '../../lib/researchTheme.js'

// Natural-language entry point for the Explore tab. Parses the question locally
// (see lib/queryParser.js) and, on selection, fills + runs the explorer via onSelect.
export default function ExploreSearchBar({ onSelect }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [interpreted, setInterpreted] = useState('')
  const blurTimer = useRef(null)

  const result = useMemo(() => parseQuery(query), [query])

  function choose(config, interpretation) {
    if (!config) return
    setInterpreted(interpretation)
    setOpen(false)
    onSelect(config)
  }

  function chooseTop() {
    if (result.config) {
      choose(result.config, result.interpretation)
    } else if (result.suggestions[0]) {
      choose(result.suggestions[0].config, describeConfig(result.suggestions[0].config))
    }
  }

  function clear() {
    setQuery('')
    setInterpreted('')
    setOpen(false)
  }

  function handleFocus() {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setOpen(true)
  }

  function handleBlur() {
    blurTimer.current = setTimeout(() => setOpen(false), 150)
  }

  const showDropdown = open && query.trim().length > 0

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-2xl px-3" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER_STRONG}` }}>
        <span aria-hidden style={{ color: STUDY_MUTED }}>⌕</span>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); chooseTop() } }}
          placeholder="Ask a question, e.g. 'does protein matter for gains?'"
          className="w-full bg-transparent py-3 text-sm outline-none"
          style={{ color: STUDY_TEXT }}
        />
        {query && (
          <button type="button" onClick={clear} className="shrink-0 px-1 text-base leading-none" style={{ color: STUDY_MUTED }} aria-label="Clear search">×</button>
        )}
      </div>

      {interpreted && !showDropdown && (
        <p className="mt-2 px-1 text-xs" style={{ color: STUDY_MUTED }}>
          Interpreted as: <span style={{ color: STUDY_ACCENT }}>{interpreted}</span> — edit below to refine.
        </p>
      )}

      {showDropdown && (
        <div
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl"
          style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER_STRONG}`, boxShadow: '0 12px 32px rgba(0,0,0,0.45)' }}
        >
          {result.config && (
            <button
              type="button"
              onMouseDown={() => choose(result.config, result.interpretation)}
              className="block w-full px-4 py-3 text-left"
              style={{ borderBottom: `1px solid ${STUDY_BORDER}`, background: STUDY_ACCENT_FAINT }}
            >
              <span className="block text-[10px] font-semibold uppercase tracking-widest" style={{ color: STUDY_ACCENT }}>
                {result.status === 'confident' ? 'Run this' : 'Closest match'}
              </span>
              <span className="mt-1 block text-sm" style={{ color: STUDY_TEXT }}>{result.interpretation}</span>
            </button>
          )}

          {result.status === 'unknown' && (
            <p className="px-4 pt-3 text-xs leading-relaxed" style={{ color: STUDY_MUTED }}>
              Couldn't turn that into a query — try one of these:
            </p>
          )}

          {(result.status === 'unknown' ? result.popular : result.suggestions).length > 0 && (
            <div>
              {result.config && result.suggestions.length > 0 && (
                <p className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: STUDY_MUTED }}>Or try</p>
              )}
              {(result.status === 'unknown' ? result.popular : result.suggestions).map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onMouseDown={() => choose(preset.config, describeConfig(preset.config))}
                  className="block w-full px-4 py-3 text-left text-sm"
                  style={{ color: STUDY_TEXT, borderTop: `1px solid ${STUDY_BORDER}` }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
