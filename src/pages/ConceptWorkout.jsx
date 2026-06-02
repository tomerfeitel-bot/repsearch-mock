import { useState } from 'react'
import { Link } from 'react-router-dom'
import ConceptW1 from '../components/concepts/workout/ConceptW1.jsx'
import ConceptW2 from '../components/concepts/workout/ConceptW2.jsx'
import ConceptW3 from '../components/concepts/workout/ConceptW3.jsx'

const CONCEPTS = [
  { id: 1, name: 'Field Notes', sub: 'Earthy · Logbook' },
  { id: 2, name: 'Command', sub: 'Teal · Terminal' },
  { id: 3, name: 'Focus', sub: 'Minimal · One-at-a-time' },
]

export default function ConceptWorkout() {
  const [active, setActive] = useState(1)

  return (
    <div className="relative min-h-screen">
      {/* Switcher bar — always on top */}
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
              className="flex-1 flex flex-col items-center py-0.5 rounded-md transition-all text-center"
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

      {/* Concept content — padded past switcher */}
      <div className="pt-10">
        {active === 1 && <ConceptW1 />}
        {active === 2 && <ConceptW2 />}
        {active === 3 && <ConceptW3 />}
      </div>
    </div>
  )
}
