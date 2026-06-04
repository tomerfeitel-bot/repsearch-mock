import { STUDY_CARD, STUDY_BORDER, STUDY_TEXT, STUDY_MUTED, STUDY_ACTION, STUDY_ACTION_SOFT, STUDY_ACTION_INK } from '../../lib/researchTheme.js'

export default function FindingsRow({ findings, loading, onSelect }) {
  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="flex-shrink-0 w-72 h-28 rounded-xl animate-pulse"
            style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}
          />
        ))}
      </div>
    )
  }

  if (!findings?.length) {
    return (
      <div className="rounded-xl p-6 text-center text-sm" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}`, color: STUDY_MUTED }}>
        RepSearch is still gathering data — check back as the community grows.
      </div>
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
      {findings.map(f => (
        <button
          key={f.id}
          onClick={() => onSelect(f)}
          className="flex-shrink-0 w-72 text-left rounded-xl p-4 transition-colors"
          style={{
            background: STUDY_CARD,
            border: `1px solid ${STUDY_BORDER}`,
            color: STUDY_TEXT,
          }}
        >
          {f.surprising ? (
            <span
              className="inline-block text-[10px] uppercase tracking-widest mb-2 px-2 py-0.5 rounded font-semibold"
              style={{ background: STUDY_ACTION_SOFT, color: STUDY_ACTION_INK, border: `1px solid ${STUDY_ACTION}` }}
            >
              Surprising
            </span>
          ) : (
            <span className="inline-block text-[10px] uppercase tracking-widest mb-2" style={{ color: STUDY_MUTED }}>
              Finding
            </span>
          )}
          <p className="text-sm leading-snug mb-3" style={{ color: STUDY_TEXT }}>{f.title}</p>
          <div className="font-mono text-[11px]" style={{ color: STUDY_MUTED }}>
            n={f.n} · effect {Number(f.effect_size).toFixed(2)}
          </div>
        </button>
      ))}
    </div>
  )
}
