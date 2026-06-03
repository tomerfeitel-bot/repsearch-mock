import { useState } from 'react'
import { Sheet } from '../ui/Sheet.jsx'

const EFFORT = [
  { v: 'easy', label: 'Easy' },
  { v: 'moderate', label: 'Moderate' },
  { v: 'hard', label: 'Hard' },
  { v: 'all_out', label: 'All-out' },
]

export default function FinishSheet({ open, onClose, onSave, saving, error = '', audit, summary, onJumpToItem }) {
  const [notes, setNotes] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [effort, setEffort] = useState(null)
  const [feel, setFeel] = useState(null)
  const criticalCount = audit?.criticalCount || 0
  const warningCount = audit?.warningCount || 0

  function handleSave() {
    if (saving || criticalCount > 0) return
    onSave({
      notes: notes.trim(),
      visibility,
      session_effort: effort,
      feel_rating: feel,
      adherence: summary?.adherence != null ? `${summary.adherence}%` : null,
    })
  }

  return (
    <Sheet open={open} onClose={onClose} title="Finish workout">
      <div className="p-4 space-y-5">
        <Field label="Notes">
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How did it go?"
            className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-600 text-gray-100 py-3 px-4 rounded-2xl outline-none resize-none"
          />
        </Field>
        <Field label="Visibility">
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: 'private', label: 'Private' },
              { v: 'public', label: 'Public' },
            ].map(o => (
              <button
                key={o.v}
                onClick={() => setVisibility(o.v)}
                className={
                  'px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ' +
                  (visibility === o.v ? 'bg-indigo-600/15 border-indigo-500 text-indigo-200' : 'bg-gray-900 border-gray-800 text-gray-300')
                }
              >
                {o.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Session effort">
          <div className="grid grid-cols-4 gap-2">
            {EFFORT.map(o => (
              <button
                key={o.v}
                onClick={() => setEffort(o.v)}
                className={
                  'px-2 py-2 rounded-xl text-xs font-medium border transition-colors ' +
                  (effort === o.v ? 'bg-indigo-600/15 border-indigo-500 text-indigo-200' : 'bg-gray-900 border-gray-800 text-gray-400')
                }
              >
                {o.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label={`Feel rating - ${feel ?? 'not rated'}`}>
          <input
            type="range"
            min={1}
            max={10}
            value={feel ?? 7}
            onChange={e => setFeel(Number(e.target.value))}
            className={'w-full accent-indigo-500 ' + (feel == null ? 'opacity-60' : '')}
          />
        </Field>
        <FinishAudit audit={audit} onJumpToItem={onJumpToItem} />
        {summary && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-3">
            <div className="mb-3 text-xs uppercase tracking-wider text-gray-500 font-semibold">Preview</div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <MiniStat label="Min" value={summary.durationMin} />
              <MiniStat label="Sets" value={summary.workingSetCount} />
              <MiniStat label="Volume" value={summary.volume} />
              <MiniStat label="Adh" value={summary.adherence == null ? '-' : `${summary.adherence}%`} />
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 whitespace-pre-line">
            {error}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving || criticalCount > 0}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all"
        >
          {saving ? 'Saving...' : criticalCount > 0 ? 'Fix critical issues' : warningCount > 0 ? 'Save anyway' : 'Save workout'}
        </button>
      </div>
    </Sheet>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{label}</label>
      {children}
    </div>
  )
}

function FinishAudit({ audit, onJumpToItem }) {
  const items = audit?.items || []
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
        Audit clean. Ready to save.
      </div>
    )
  }
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Finish audit</div>
        <div className="text-xs text-gray-400">
          {audit.criticalCount ? `${audit.criticalCount} critical` : 'No critical'} - {audit.warningCount} warning{audit.warningCount === 1 ? '' : 's'}
        </div>
      </div>
      <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
        {items.map((item, idx) => {
          const critical = item.severity === 'critical'
          return (
            <div key={`${item.title}-${idx}`} className={'rounded-xl border px-3 py-2 ' + (critical ? 'border-red-500/40 bg-red-500/10' : 'border-amber-500/30 bg-amber-500/10')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className={'text-sm font-semibold ' + (critical ? 'text-red-200' : 'text-amber-100')}>{item.title}</div>
                  <div className="mt-0.5 text-xs text-gray-300">{item.label ? `${item.label}: ` : ''}{item.detail}</div>
                </div>
                {item.exerciseId && (
                  <button
                    type="button"
                    onClick={() => onJumpToItem?.(item)}
                    className="shrink-0 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-xs font-semibold text-gray-300"
                  >
                    Fix
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-950 px-2 py-2">
      <div className="truncate font-mono tabular-nums text-sm font-semibold text-gray-100">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
    </div>
  )
}
