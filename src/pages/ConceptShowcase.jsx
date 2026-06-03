import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PALETTES, PALETTE_BY_ID } from '../lib/paletteCollections.js'
import PaletteCommunity from '../components/concepts/palette/PaletteCommunity.jsx'
import PaletteProgress from '../components/concepts/palette/PaletteProgress.jsx'
import PaletteWorkout from '../components/concepts/palette/PaletteWorkout.jsx'
import PaletteStudy from '../components/concepts/palette/PaletteStudy.jsx'
import PaletteProfile from '../components/concepts/palette/PaletteProfile.jsx'

const PAGES = [
  { id: 'community', label: 'Community', Component: PaletteCommunity },
  { id: 'workout',   label: 'Workout',   Component: PaletteWorkout   },
  { id: 'progress',  label: 'Progress',  Component: PaletteProgress  },
  { id: 'study',     label: 'Study',     Component: PaletteStudy     },
  { id: 'profile',   label: 'Profile',   Component: PaletteProfile   },
]

export default function ConceptShowcase() {
  const { paletteId } = useParams()
  const palette = PALETTE_BY_ID[Number(paletteId)] ?? PALETTES[0]
  const [pageId, setPageId] = useState('community')
  const [pid, setPid] = useState(palette.id)

  const activePalette = PALETTE_BY_ID[pid]
  const activePage = PAGES.find(p => p.id === pageId) ?? PAGES[0]
  const { Component } = activePage

  return (
    <div className="relative min-h-screen">
      {/* Fixed top bar */}
      <div
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(8,10,11,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Row 1: back + palette switcher */}
        <div className="flex items-center gap-2 px-3 pt-2 pb-1">
          <Link to="/concepts" className="text-[11px] font-medium shrink-0" style={{ color: 'rgba(255,255,255,0.45)' }}>
            ← Hub
          </Link>
          <div className="flex gap-1 flex-1 overflow-x-auto no-scrollbar">
            {PALETTES.map(p => {
              const on = p.id === pid
              return (
                <button
                  key={p.id}
                  onClick={() => setPid(p.id)}
                  aria-pressed={on}
                  className="shrink-0 h-7 px-2.5 rounded-md text-[11px] font-bold whitespace-nowrap transition-colors"
                  style={on
                    ? { background: p.accent, color: p.accentInk }
                    : { color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
                  }
                >
                  {p.id}. {p.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Row 2: page switcher */}
        <div className="flex gap-0 px-3 pb-2">
          <div className="flex gap-0.5 p-0.5 rounded-md w-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
            {PAGES.map(pg => {
              const on = pg.id === pageId
              return (
                <button
                  key={pg.id}
                  onClick={() => setPageId(pg.id)}
                  aria-pressed={on}
                  className="flex-1 h-7 rounded text-[11px] font-semibold transition-colors"
                  style={on
                    ? { background: activePalette.accent, color: activePalette.accentInk }
                    : { color: 'rgba(255,255,255,0.45)' }
                  }
                >
                  {pg.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="pt-[72px]">
        <Component P={activePalette} />
      </div>
    </div>
  )
}
