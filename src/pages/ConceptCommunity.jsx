import { useState } from 'react'
import { Link } from 'react-router-dom'
import ConceptC1 from '../components/concepts/community/ConceptC1.jsx'
import ConceptC2 from '../components/concepts/community/ConceptC2.jsx'
import ConceptC3 from '../components/concepts/community/ConceptC3.jsx'

const CONCEPTS = [
  { id: 1, name: 'The Board', sub: 'Light · Reddit-clean' },
  { id: 2, name: 'The Digest', sub: 'Dark · Editorial' },
  { id: 3, name: 'Stream', sub: 'Dark · Social' },
]

export default function ConceptCommunity() {
  const [active, setActive] = useState(1)

  return (
    <div className="relative min-h-screen">
      {/* Switcher bar */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center gap-2 px-3 h-10"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Link to="/concepts" className="text-[11px] font-medium mr-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          ← Hub
        </Link>
        <div className="flex gap-1 flex-1">
          {CONCEPTS.map(c => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className="flex-1 flex flex-col items-center py-0.5 rounded-md transition-all"
              style={active === c.id
                ? { background: 'rgba(255,255,255,0.12)', color: '#ffffff' }
                : { color: 'rgba(255,255,255,0.35)' }
              }
            >
              <span className="text-[10px] font-bold">{c.id}. {c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="pt-10">
        {active === 1 && <ConceptC1 />}
        {active === 2 && <ConceptC2 />}
        {active === 3 && <ConceptC3 />}
      </div>
    </div>
  )
}
