import { Link } from 'react-router-dom'
import ConceptCModern from '../components/concepts/community/ConceptCModern.jsx'

// Standalone shell: a minimal translucent "← Hub" bar over the modern feed concept,
// matching the chrome of the other concept routes.
export default function ConceptCommunityModern() {
  return (
    <div className="relative min-h-screen">
      <div className="fixed top-0 left-0 right-0 z-[60] flex items-center h-9 px-3"
        style={{ background: 'rgba(8,10,11,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Link to="/concepts" className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>← Hub</Link>
        <span className="ml-3 text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>Pulse · Community</span>
      </div>
      <div className="pt-9">
        <ConceptCModern />
      </div>
    </div>
  )
}
