import { useState, useEffect, useRef, useCallback } from 'react'
import { initWorkout, freshSet } from '../../../lib/conceptMockData.js'
import { muscleColor } from '../../../lib/musclePalette.js'

// Palette — Command / blue-green teal
const P = {
  bg: '#080f14',
  surface: '#0d1921',
  surfaceBright: '#112130',
  active: '#0d2535',
  border: '#1a3040',
  borderBright: '#2a4a60',
  text: '#c8e0dc',
  textMuted: '#5a8a9a',
  textDim: '#2e5a6a',
  accent: '#72d0c0',
  accentDim: '#3a8a9a',
  negative: '#e05a5a',
}

function useRestTimer() {
  const [timer, setTimer] = useState({ active: false, remaining: 90, total: 90 })
  const ref = useRef(null)
  const start = useCallback((sec = 90) => {
    clearInterval(ref.current)
    setTimer({ active: true, remaining: sec, total: sec })
    ref.current = setInterval(() => {
      setTimer(prev => {
        if (prev.remaining <= 1) { clearInterval(ref.current); return { ...prev, active: false, remaining: 0 } }
        return { ...prev, remaining: prev.remaining - 1 }
      })
    }, 1000)
  }, [])
  const dismiss = useCallback(() => { clearInterval(ref.current); setTimer(prev => ({ ...prev, active: false })) }, [])
  useEffect(() => () => clearInterval(ref.current), [])
  return { timer, start, dismiss }
}

function formatElapsed(startedAt) {
  const sec = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

export default function ConceptW2() {
  const [workout, setWorkout] = useState(() => initWorkout())
  const [elapsed, setElapsed] = useState('')
  const [finishOpen, setFinishOpen] = useState(false)
  const { timer, start: startRest, dismiss: dismissRest } = useRestTimer()

  useEffect(() => {
    setElapsed(formatElapsed(workout.startedAt))
    const id = setInterval(() => setElapsed(formatElapsed(workout.startedAt)), 1000)
    return () => clearInterval(id)
  }, [workout.startedAt])

  function updateSet(exIdx, setIdx, patch) {
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) =>
        i !== exIdx ? ex : {
          ...ex,
          sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, ...patch }),
        }
      ),
    }))
  }

  function toggleDone(exIdx, setIdx) {
    const set = workout.exercises[exIdx].sets[setIdx]
    updateSet(exIdx, setIdx, { done: !set.done })
    if (!set.done) startRest(90)
  }

  function addSet(exIdx) {
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) =>
        i !== exIdx ? ex : { ...ex, sets: [...ex.sets, freshSet()] }
      ),
    }))
  }

  function removeSet(exIdx, setIdx) {
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) =>
        i !== exIdx ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) }
      ),
    }))
  }

  const totalSets = workout.exercises.reduce((a, ex) => a + ex.sets.length, 0)
  const doneSets = workout.exercises.reduce((a, ex) => a + ex.sets.filter(s => s.done).length, 0)

  return (
    <div className="min-h-screen pb-32 font-mono" style={{ background: P.bg, color: P.text }}>
      {/* Header bar */}
      <header className="sticky top-10 z-20 flex items-center gap-4 px-4 py-2.5" style={{ background: P.bg, borderBottom: `1px solid ${P.border}` }}>
        <span className="text-xs" style={{ color: P.accentDim }}>▶</span>
        <span className="flex-1 text-sm font-bold tracking-tight">{workout.name.toUpperCase()}</span>
        <span className="text-sm tabular-nums" style={{ color: P.textMuted }}>{elapsed}</span>
        <span className="text-xs tabular-nums" style={{ color: P.textDim }}>{doneSets}/{totalSets}</span>
        <button
          onClick={() => setFinishOpen(true)}
          className="px-3 py-1.5 rounded text-xs font-bold tracking-wide transition-colors"
          style={{ border: `1px solid ${P.accent}`, color: P.accent }}
        >
          DONE
        </button>
      </header>

      {/* Rest timer bar */}
      {timer.active && (
        <div className="sticky top-[calc(2.5rem+41px)] z-10 flex items-center gap-3 px-4 py-2" style={{ background: P.surfaceBright, borderBottom: `1px solid ${P.border}` }}>
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: P.border }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${(timer.remaining / timer.total) * 100}%`, background: P.accent, transition: 'width 1s linear' }}
            />
          </div>
          <span className="text-xs tabular-nums shrink-0" style={{ color: P.accent }}>
            {String(Math.floor(timer.remaining / 60)).padStart(1)}:{String(timer.remaining % 60).padStart(2, '0')}
          </span>
          <button onClick={dismissRest} className="text-xs" style={{ color: P.textDim }}>✕</button>
        </div>
      )}

      {/* Exercises */}
      <div className="px-4 pt-5 space-y-6">
        {workout.exercises.map((ex, exIdx) => {
          const mc = muscleColor(ex.primary_muscle)
          const exDone = ex.sets.filter(s => s.done).length
          return (
            <div key={ex.id}>
              {/* Exercise header */}
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-xs font-bold tabular-nums" style={{ color: P.textDim }}>{String(exIdx + 1).padStart(2, '0')}</span>
                <div>
                  <h2 className="text-base font-bold tracking-tight leading-none">{ex.exerciseName.toUpperCase()}</h2>
                  <div className="mt-0.5 text-xs flex items-center gap-2" style={{ color: P.textMuted }}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: mc }} />
                    <span>{ex.primary_muscle}</span>
                    <span style={{ color: P.textDim }}>·</span>
                    <span>{exDone}/{ex.sets.length} sets</span>
                  </div>
                </div>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[20px_16px_1fr_1fr_52px_32px] gap-2 items-center mb-1 px-2">
                {['', '#', 'kg', 'reps', 'RIR', ''].map((h, i) => (
                  <div key={i} className="text-[9px] uppercase tracking-widest text-center" style={{ color: P.textDim }}>{h}</div>
                ))}
              </div>

              {/* Set rows */}
              <div className="space-y-1">
                {ex.sets.map((set, setIdx) => (
                  <CommandSetRow
                    key={set.id}
                    set={set}
                    setIdx={setIdx}
                    onUpdate={p => updateSet(exIdx, setIdx, p)}
                    onToggleDone={() => toggleDone(exIdx, setIdx)}
                    onRemove={() => removeSet(exIdx, setIdx)}
                  />
                ))}
              </div>

              <button
                onClick={() => addSet(exIdx)}
                className="mt-2 w-full py-1.5 rounded text-xs transition-colors"
                style={{ color: P.textDim, border: `1px dashed ${P.border}` }}
              >
                + set
              </button>
            </div>
          )
        })}
      </div>

      {/* Finish modal */}
      {finishOpen && (
        <FinishModal elapsed={elapsed} doneSets={doneSets} totalSets={totalSets} onClose={() => setFinishOpen(false)} onConfirm={() => { setWorkout(initWorkout()); setFinishOpen(false) }} />
      )}
    </div>
  )
}

function CommandSetRow({ set, setIdx, onUpdate, onToggleDone, onRemove }) {
  const isDone = set.done
  return (
    <div
      className="grid grid-cols-[20px_16px_1fr_1fr_52px_32px] gap-2 items-center px-2 py-1.5 rounded transition-colors"
      style={{ background: isDone ? P.active : 'transparent', borderLeft: `2px solid ${isDone ? P.accent : P.border}` }}
    >
      {/* Status dot */}
      <span className="flex items-center justify-center">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: isDone ? P.accent : P.textDim }} />
      </span>
      {/* Set number */}
      <span className="text-[10px] tabular-nums text-right" style={{ color: P.textDim }}>{setIdx + 1}</span>
      {/* Weight */}
      <input
        type="text" inputMode="decimal" value={set.weight}
        onChange={e => onUpdate({ weight: e.target.value })}
        placeholder="0"
        className="w-full text-center text-sm tabular-nums bg-transparent outline-none"
        style={{ color: isDone ? P.accent : P.text }}
      />
      {/* Reps */}
      <input
        type="text" inputMode="numeric" value={set.reps}
        onChange={e => onUpdate({ reps: e.target.value })}
        placeholder="0"
        className="w-full text-center text-sm tabular-nums bg-transparent outline-none"
        style={{ color: isDone ? P.accent : P.text }}
      />
      {/* RIR */}
      <input
        type="text" inputMode="numeric" value={set.rir}
        onChange={e => onUpdate({ rir: e.target.value })}
        placeholder="—"
        className="w-full text-center text-xs tabular-nums bg-transparent outline-none"
        style={{ color: P.textMuted }}
      />
      {/* Done toggle */}
      <button
        onClick={onToggleDone}
        className="text-sm leading-none flex items-center justify-center"
        style={{ color: isDone ? P.accent : P.textDim }}
      >
        {isDone ? '✓' : '○'}
      </button>
    </div>
  )
}

function FinishModal({ elapsed, doneSets, totalSets, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl p-6 font-mono space-y-5" style={{ background: P.surface, border: `1px solid ${P.borderBright}` }}>
        <div className="text-xs" style={{ color: P.accentDim }}>// WORKOUT_COMPLETE</div>
        <div className="space-y-2">
          {[['session.elapsed', elapsed], ['sets.completed', `${doneSets}/${totalSets}`], ['exercises', '4']].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between">
              <span className="text-xs" style={{ color: P.textMuted }}>{k}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: P.accent }}>{v}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button onClick={onClose} className="py-2.5 rounded text-xs" style={{ border: `1px solid ${P.border}`, color: P.textMuted }}>ABORT</button>
          <button onClick={onConfirm} className="py-2.5 rounded text-xs font-bold" style={{ background: P.accent, color: P.bg }}>COMMIT</button>
        </div>
      </div>
    </div>
  )
}
