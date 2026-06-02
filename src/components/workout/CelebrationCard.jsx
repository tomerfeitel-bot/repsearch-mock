import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { muscleColor } from '../../lib/musclePalette.js'

export default function CelebrationCard({ visible, prsHit = [], summary, onDone, onViewProgress, onSaveTemplate, onSharePost }) {
  const rootRef = useRef(null)

  useEffect(() => {
    if (!visible) return
    const el = rootRef.current
    if (!el) return
    gsap.fromTo(el,
      { scale: 0.96, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.3, ease: 'power2.out' },
    )
  }, [visible])

  if (!visible) return null

  const hasPR = prsHit.length > 0
  const directGroups = summary?.muscleBreakdown?.directGroups || []
  const secondary = summary?.muscleBreakdown?.secondary || []

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur flex items-center justify-center p-4">
      <div ref={rootRef} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl shadow-black/70">
        <div className="border-b border-gray-800 px-4 py-4">
          <div className="text-xs uppercase tracking-wider text-indigo-300 font-semibold">{hasPR ? 'PRs hit' : 'Session complete'}</div>
          <h2 className="mt-1 text-2xl font-bold text-white">Post-workout summary</h2>
        </div>

        <div className="space-y-4 p-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            <Stat label="Min" value={summary?.durationMin || 0} />
            <Stat label="Sets" value={summary?.workingSetCount || 0} />
            <Stat label="Volume" value={summary?.volume || 0} />
            <Stat label="Adh" value={summary?.adherence == null ? '-' : `${summary.adherence}%`} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Panel label="Exercises" value={summary?.exerciseCount || 0} />
            <Panel label="Planned vs done" value={`${summary?.completedPlannedSets || 0}/${summary?.plannedSets || 0}`} />
          </div>

          {hasPR && (
            <section className="space-y-2">
              <SectionTitle>PRs</SectionTitle>
              {prsHit.map((pr, i) => (
                <div key={i} className="rounded-xl border border-indigo-700/50 bg-indigo-600/15 px-3 py-2">
                  <div className="text-sm text-indigo-200 font-medium">{pr.exercise_name || pr.exercise_id}</div>
                  <div className="font-mono tabular-nums text-white">{pr.weight_kg}kg x {pr.reps}</div>
                </div>
              ))}
            </section>
          )}

          {summary?.removedExercises?.length > 0 && (
            <section className="space-y-2">
              <SectionTitle>Removed</SectionTitle>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                {summary.removedExercises.map(ex => ex.exerciseName || ex.exerciseId).join(', ')}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <SectionTitle>Muscle breakdown</SectionTitle>
            {directGroups.length === 0 ? (
              <div className="rounded-xl border border-gray-800 bg-gray-900 px-3 py-3 text-sm text-gray-500">No working sets to count.</div>
            ) : directGroups.map(group => (
              <div key={group.group} className="rounded-xl border border-gray-800 bg-gray-900 px-3 py-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white" style={{ color: muscleColor(group.group) }}>{group.group}</div>
                  <div className="font-mono tabular-nums text-sm text-gray-300">{group.total} sets</div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {group.specific.map(row => (
                    <div key={row.muscle} className="flex justify-between rounded-lg bg-gray-950 px-2 py-1 text-xs">
                      <span className="text-gray-400">{row.muscle}</span>
                      <span className="font-mono text-gray-200">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {secondary.length > 0 && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 px-3 py-3">
                <div className="mb-2 text-xs uppercase tracking-wider text-gray-500 font-semibold">Also hit</div>
                <div className="flex flex-wrap gap-1.5">
                  {secondary.map(row => (
                    <span key={row.muscle} className="rounded-full border border-gray-700 bg-gray-950 px-2 py-1 text-xs text-gray-300">
                      {row.muscle} <span className="font-mono">{row.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button onClick={onViewProgress} className="rounded-xl bg-indigo-600 px-3 py-3 text-sm font-semibold text-white">
              View progress
            </button>
            <button onClick={onSaveTemplate} className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-3 text-sm font-semibold text-gray-200">
              Save template
            </button>
            <button onClick={onSharePost} className="rounded-xl border border-indigo-700/50 bg-indigo-600/15 px-3 py-3 text-sm font-semibold text-indigo-200">
              Share to feed
            </button>
            <button onClick={onDone} className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-3 text-sm font-semibold text-gray-200">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-900 px-2 py-3">
      <div className="truncate font-mono tabular-nums text-lg font-bold text-white">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
    </div>
  )
}

function Panel({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 px-3 py-3">
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-1 font-mono tabular-nums text-lg font-semibold text-white">{value}</div>
    </div>
  )
}

function SectionTitle({ children }) {
  return <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{children}</div>
}
