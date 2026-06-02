import { useState, useEffect, useRef, useCallback } from 'react'
import { initWorkout, freshSet } from '../../../lib/conceptMockData.js'
import { muscleColor } from '../../../lib/musclePalette.js'

// Palette — earthy Pantone
const P = {
  bg: '#2a3520',
  surface: '#354227',
  surfaceBright: '#405030',
  border: '#4d6038',
  borderDim: '#3d4f2c',
  text: '#e6ddd0',
  textMuted: '#9a9b7a',
  textDim: '#6b6e52',
  accent: '#c4841a',
  accentText: '#f5d9a0',
  accentDim: '#8a5c12',
  done: '#3d4a2a',
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
  const m = Math.floor(sec / 60)
  const s = String(sec % 60).padStart(2, '0')
  return `${m}:${s}`
}

export default function ConceptW1() {
  const [workout, setWorkout] = useState(() => initWorkout())
  const [elapsed, setElapsed] = useState('')
  const [finishOpen, setFinishOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(new Set())
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
    const next = !set.done
    updateSet(exIdx, setIdx, { done: next })
    if (next) startRest(90)
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

  function toggleCollapse(idx) {
    setCollapsed(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n })
  }

  const totalSets = workout.exercises.reduce((a, ex) => a + ex.sets.length, 0)
  const doneSets = workout.exercises.reduce((a, ex) => a + ex.sets.filter(s => s.done).length, 0)

  return (
    <div className="min-h-screen pb-32" style={{ background: P.bg, color: P.text }}>
      {/* Header */}
      <header className="sticky top-10 z-20 px-4 pt-4 pb-3" style={{ background: P.bg + 'f5', borderBottom: `1px solid ${P.border}` }}>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium" style={{ color: P.textMuted }}>Active workout</div>
            <h1 className="text-xl font-bold leading-tight truncate">{workout.name}</h1>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs tabular-nums font-mono" style={{ color: P.textMuted }}>{elapsed}</div>
            <div className="text-xs" style={{ color: P.textDim }}>{doneSets}/{totalSets} sets</div>
          </div>
          <button
            onClick={() => setFinishOpen(true)}
            className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
            style={{ background: P.accent, color: '#1a1000' }}
          >
            Finish
          </button>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: P.border }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%`, background: P.accent }}
          />
        </div>
      </header>

      {/* Exercise list */}
      <div className="px-4 pt-4 space-y-3">
        {workout.exercises.map((ex, exIdx) => {
          const isCollapsed = collapsed.has(exIdx)
          const exDone = ex.sets.filter(s => s.done).length
          const mc = muscleColor(ex.primary_muscle)
          return (
            <div key={ex.id} className="rounded-2xl overflow-hidden" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
              {/* Exercise header */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                onClick={() => toggleCollapse(exIdx)}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: mc }} />
                <span className="flex-1 font-semibold text-sm leading-tight">{ex.exerciseName}</span>
                <span className="text-xs font-mono" style={{ color: P.textMuted }}>{exDone}/{ex.sets.length}</span>
                <span className="text-xs" style={{ color: P.textDim }}>{isCollapsed ? '▼' : '▲'}</span>
              </button>

              {!isCollapsed && (
                <div className="px-4 pb-3">
                  {/* Table header */}
                  <div className="grid grid-cols-[28px_1fr_1fr_56px_36px] gap-1 mb-1.5 px-1">
                    {['#', 'kg', 'reps', 'RIR', ''].map((h, i) => (
                      <div key={i} className="text-[10px] font-semibold text-center uppercase tracking-wide" style={{ color: P.textDim }}>{h}</div>
                    ))}
                  </div>

                  {/* Set rows */}
                  <div className="space-y-1.5">
                    {ex.sets.map((set, setIdx) => (
                      <SetRow
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
                    className="mt-2.5 w-full py-2 rounded-xl text-xs font-semibold transition-colors"
                    style={{ color: P.accent, background: P.surfaceBright, border: `1px solid ${P.borderDim}` }}
                  >
                    + Add set
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Rest timer */}
      {timer.active && (
        <RestTimerPill timer={timer} onDismiss={dismissRest} accent={P.accent} />
      )}

      {/* Finish modal */}
      {finishOpen && (
        <FinishModal
          doneSets={doneSets}
          totalSets={totalSets}
          elapsed={elapsed}
          onClose={() => setFinishOpen(false)}
          onConfirm={() => { setWorkout(initWorkout()); setFinishOpen(false) }}
        />
      )}
    </div>
  )
}

function SetRow({ set, setIdx, onUpdate, onToggleDone, onRemove }) {
  const bg = set.done ? P.done : P.surfaceBright
  const border = set.done ? P.accentDim : P.borderDim
  return (
    <div
      className="grid grid-cols-[28px_1fr_1fr_56px_36px] gap-1 items-center rounded-xl px-1 py-1.5 transition-colors"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <span className="text-center text-xs font-mono tabular-nums" style={{ color: set.done ? P.accentText : P.textMuted }}>{setIdx + 1}</span>
      <input
        type="text"
        inputMode="decimal"
        value={set.weight}
        onChange={e => onUpdate({ weight: e.target.value })}
        placeholder="—"
        className="w-full text-center text-sm font-bold bg-transparent outline-none rounded-lg py-0.5"
        style={{ color: set.done ? P.accentText : P.text }}
      />
      <input
        type="text"
        inputMode="numeric"
        value={set.reps}
        onChange={e => onUpdate({ reps: e.target.value })}
        placeholder="—"
        className="w-full text-center text-sm font-bold bg-transparent outline-none rounded-lg py-0.5"
        style={{ color: set.done ? P.accentText : P.text }}
      />
      <input
        type="text"
        inputMode="numeric"
        value={set.rir}
        onChange={e => onUpdate({ rir: e.target.value })}
        placeholder="—"
        className="w-full text-center text-sm bg-transparent outline-none rounded-lg py-0.5"
        style={{ color: set.done ? P.accentText : P.textMuted }}
      />
      <button
        onClick={onToggleDone}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold transition-all"
        style={set.done
          ? { background: P.accent, color: '#1a1000' }
          : { background: P.border, color: P.textDim }
        }
        aria-label={set.done ? 'Mark undone' : 'Mark done'}
      >
        {set.done ? '✓' : '○'}
      </button>
    </div>
  )
}

function RestTimerPill({ timer, onDismiss, accent }) {
  const pct = timer.remaining / timer.total
  const r = 16
  const circ = 2 * Math.PI * r
  const dash = pct * circ

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-2xl"
      style={{ background: P.surface, border: `1px solid ${P.border}` }}>
      <svg width="40" height="40" className="shrink-0 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke={P.border} strokeWidth="3" />
        <circle
          cx="20" cy="20" r={r} fill="none" stroke={accent} strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 1s linear' }}
        />
      </svg>
      <div>
        <div className="text-xs font-medium" style={{ color: P.textMuted }}>Rest</div>
        <div className="text-2xl font-bold tabular-nums font-mono leading-none" style={{ color: accent }}>
          {String(Math.floor(timer.remaining / 60)).padStart(1, '0')}:{String(timer.remaining % 60).padStart(2, '0')}
        </div>
      </div>
      <button onClick={onDismiss} className="ml-2 text-xs px-3 py-1.5 rounded-xl" style={{ color: P.textMuted, background: P.surfaceBright }}>
        Skip
      </button>
    </div>
  )
}

function FinishModal({ doneSets, totalSets, elapsed, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-2xl p-6 space-y-5" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
        <div className="w-10 h-1 rounded-full mx-auto" style={{ background: P.border }} />
        <h2 className="text-xl font-bold text-center">Finish workout?</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[['Time', elapsed], ['Sets done', `${doneSets}/${totalSets}`], ['Exercises', '4']].map(([l, v]) => (
            <div key={l} className="rounded-xl py-3" style={{ background: P.surfaceBright }}>
              <div className="text-xl font-bold">{v}</div>
              <div className="text-xs mt-0.5" style={{ color: P.textMuted }}>{l}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="py-3 rounded-xl text-sm font-semibold" style={{ background: P.surfaceBright, color: P.textMuted }}>Keep going</button>
          <button onClick={onConfirm} className="py-3 rounded-xl text-sm font-bold" style={{ background: P.accent, color: '#1a1000' }}>Save workout</button>
        </div>
      </div>
    </div>
  )
}
