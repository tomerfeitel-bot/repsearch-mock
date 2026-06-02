import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { STYLES, STYLE_BY_ID } from '../lib/conceptStyles.js'
import Style1Progress from '../components/concepts/cohesive/Style1Progress.jsx'
import Style1Community from '../components/concepts/cohesive/Style1Community.jsx'
import Style2Progress from '../components/concepts/cohesive/Style2Progress.jsx'
import Style2Community from '../components/concepts/cohesive/Style2Community.jsx'
import Style3Progress from '../components/concepts/cohesive/Style3Progress.jsx'
import Style3Community from '../components/concepts/cohesive/Style3Community.jsx'

const VIEWS = {
  1: { Progress: Style1Progress, Community: Style1Community },
  2: { Progress: Style2Progress, Community: Style2Community },
  3: { Progress: Style3Progress, Community: Style3Community },
}

// One style shown across BOTH pages, so cohesion is judged directly. Two toggles:
// which style (1/2/3) and which page (Progress/Community). The active style's own
// accent tints the switcher so flipping styles is itself a preview of the palette.
export default function ConceptCohesive() {
  const [params] = useSearchParams()
  const initial = Number(params.get('style'))
  const [styleId, setStyleId] = useState(STYLE_BY_ID[initial] ? initial : 1)
  const [page, setPage] = useState('Progress')

  const style = STYLE_BY_ID[styleId]
  const View = VIEWS[styleId][page]

  return (
    <div className="relative min-h-screen">
      <div className="concept-focus fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(8,10,11,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)', '--cf': 'rgba(255,255,255,0.7)' }}>
        <div className="flex items-center gap-2 px-3 h-11">
          <Link to="/concepts" className="text-[11px] font-medium shrink-0" style={{ color: 'rgba(255,255,255,0.45)' }}>← Hub</Link>

          {/* Style switcher */}
          <div className="flex gap-1 flex-1 min-w-0" role="tablist" aria-label="Style">
            {STYLES.map(s => {
              const on = s.id === styleId
              return (
                <button key={s.id} role="tab" aria-selected={on} onClick={() => setStyleId(s.id)}
                  className="flex-1 min-w-0 h-7 rounded-md text-[11px] font-bold truncate px-2 transition-colors motion-reduce:transition-none"
                  style={on
                    ? { background: s.accent, color: s.accentInk }
                    : { color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {s.id}. {s.name}
                </button>
              )
            })}
          </div>

          {/* Page toggle */}
          <div className="flex gap-0.5 p-0.5 rounded-md shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
            {['Progress', 'Community'].map(pg => {
              const on = page === pg
              return (
                <button key={pg} aria-pressed={on} onClick={() => setPage(pg)}
                  className="h-6 px-2.5 rounded text-[11px] font-semibold transition-colors motion-reduce:transition-none"
                  style={on ? { background: style.accent, color: style.accentInk } : { color: 'rgba(255,255,255,0.5)' }}>
                  {pg}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="pt-11">
        <View />
      </div>
    </div>
  )
}
