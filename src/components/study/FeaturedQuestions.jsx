import { STUDY_CARD, STUDY_BORDER, STUDY_BORDER_STRONG, STUDY_TEXT, STUDY_MUTED, STUDY_ACCENT } from '../../lib/researchTheme.js'

export default function FeaturedQuestions({ questions, onSelect }) {
  if (!questions?.length) {
    return (
      <div className="rounded-xl p-6 text-center text-sm" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}`, color: STUDY_MUTED }}>
        Featured questions are loading.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {questions.map(q => (
        <button
          key={q.id}
          onClick={() => onSelect(q)}
          className="text-left rounded-xl p-4 transition-colors hover:border-current"
          style={{
            background: STUDY_CARD,
            border: `1px solid ${STUDY_BORDER}`,
            color: STUDY_TEXT,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = STUDY_BORDER_STRONG }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = STUDY_BORDER }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: STUDY_ACCENT }}>
              {q.type === 'compare' ? 'Cohort comparison' : 'Single population'}
            </span>
          </div>
          <h3
            className="font-serif text-xl leading-tight mb-1"
            style={{ color: STUDY_TEXT, fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {q.title}
          </h3>
          <p className="text-xs" style={{ color: STUDY_MUTED }}>{q.subtitle}</p>
        </button>
      ))}
    </div>
  )
}
