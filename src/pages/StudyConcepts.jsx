import { ConceptLab } from './Study.jsx'
import { STUDY_BG, STUDY_BORDER, STUDY_MUTED, STUDY_TEXT } from '../lib/researchTheme.js'

export default function StudyConcepts() {
  return (
    <div className="min-h-screen pb-28" style={{ background: STUDY_BG, color: STUDY_TEXT }}>
      <header
        className="px-4 pb-3 safe-pt-4"
        style={{ background: 'rgba(13, 17, 23, 0.96)', borderBottom: `1px solid ${STUDY_BORDER}` }}
      >
        <h1 className="text-xl font-bold tracking-tight">Study Explorer Concepts</h1>
        <p className="text-xs" style={{ color: STUDY_MUTED }}>Prototype space only. Production Study stays separate.</p>
      </header>
      <main className="px-4 py-5">
        <ConceptLab />
      </main>
    </div>
  )
}
