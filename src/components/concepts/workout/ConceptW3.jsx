import { useState, useEffect, useRef, useCallback } from 'react'
import { initWorkout, freshSet } from '../../../lib/conceptMockData.js'
import { muscleColor } from '../../../lib/musclePalette.js'

// Palette — Focus Mode / near-black with steel teal
const P = {
  bg: '#0d0d0d',
  surface: '#1a1a1a',
  surfaceBright: '#222222',
  border: '#2a2a2a',
  borderBright: '#3a3a3a',
  text: '#f0f0f0',
  textMuted: '#888888',
  textDim: '#444444',
  accent: '#4a8fa0',
  accentBright: '#5fb0c8',
  accentText: '#a8d8e8',
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

export default function ConceptW3() {
  const [workout, setWorkout] = useState(() => initWorkout())
  const [currentExIdx, setCurrentExIdx] = useState(0)
  const [elapsed, setElapsed] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const { timer, start: startRest, dismiss: dismissRest } = useRestTimer()

  useEffect(() => {
    setElapsed(formatElapsed(workout.startedAt))
    const id = setInterval(() => setElapsed(formatElapsed(workout.startedAt)), 1000)
    return () => clearInterval(id)
  }, [workout.startedAt])

  const ex = workout.exercises[currentExIdx]
  const totalEx = workout.exercises.length
  const totalSets = workout.exercises.reduce((a, e) => a + e.sets.length, 0)
  const doneSets = workout.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0)
  const mc = muscleColor(ex?.primary_muscle)

  function updateSet(setIdx, patch) {
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map((e, i) =>
        i !== currentExIdx ? e : {
          ...e,
          sets: e.sets.map((s, j) => j !== setIdx ? s : { ...s, ...patch }),
        }
      ),
    }))
  }

  function toggleDone(setIdx) {
    const set = ex.sets[setIdx]
    updateSet(setIdx, { done: !set.done })
    if (!set.done) startRest(90)
  }

  function addSet() {
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map((e, i) =>
        i !== currentExIdx ? e : { ...e, sets: [...e.sets, freshSet()] }
      ),
    }))
  }

  function removeSet(setIdx) {
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map((e, i) =>
        i !== currentExIdx ? e : { ...e, sets: e.sets.filter((_, j) => j !== setIdx) }
      ),
    }))
  }

  const exDone = ex?.sets.filter(s => s.done).length ?? 0
  const exTotal = ex?.sets.length ?? 0
  const allExDone = workout.exercises.map(e => e.sets.filter(s => s.done).length === e.sets.length)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: P.bg, color: P.text }}>
      {/* Progress bar - very top */}
      <div className="h-0.5 w-full" style={{ background: P.border }}>
        <div className="h-full transition-all duration-500" style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%`, background: P.accent }} />
      </div>

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <button onClick={() => setDrawerOpen(true)} className="flex flex-col gap-0.5 p-2">
          <span className="block w-4 h-0.5 rounded" style={{ background: P.textMuted }} />
          <span className="block w-4 h-0.5 rounded" style={{ background: P.textMuted }} />
          <span className="block w-3 h-0.5 rounded" style={{ background: P.textMuted }} />
        </button>
        <span className="text-xs font-medium" style={{ color: P.textMuted }}>{workout.name}</span>
        <span className="flex-1" />
        <span className="text-xs tabular-nums font-mono" style={{ color: P.textDim }}>{elapsed}</span>
        <button
          onClick={() => setFinishOpen(true)}
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
          style={{ color: P.accentText, border: `1px solid ${P.border}` }}
        >
          Finish
        </button>
      </div>

      {/* Exercise navigation */}
      <div className="flex items-center gap-4 px-4 py-2">
        <button
          onClick={() => setCurrentExIdx(i => Math.max(0, i - 1))}
          disabled={currentExIdx === 0}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-colors"
          style={{ background: P.surface, color: currentExIdx === 0 ? P.textDim : P.text }}
        >‹</button>
        <div className="flex flex-1 items-center justify-center gap-1.5">
          {workout.exercises.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentExIdx(i)}
              className="w-2 h-2 rounded-full transition-all"
              style={{ background: i === currentExIdx ? P.accent : allExDone[i] ? P.accentBright + '60' : P.border, transform: i === currentExIdx ? 'scale(1.4)' : 'scale(1)' }}
            />
          ))}
        </div>
        <button
          onClick={() => setCurrentExIdx(i => Math.min(totalEx - 1, i + 1))}
          disabled={currentExIdx === totalEx - 1}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-colors"
          style={{ background: P.surface, color: currentExIdx === totalEx - 1 ? P.textDim : P.text }}
        >›</button>
      </div>

      {/* Current exercise — takes up the bulk of the viewport */}
      <div className="flex-1 px-4 pt-4 pb-4 flex flex-col">
        {/* Exercise identity */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ background: mc }} />
            <span className="text-xs" style={{ color: P.textMuted }}>{ex?.primary_muscle} · {currentExIdx + 1}/{totalEx}</span>
          </div>
          <h2 className="text-3xl font-bold leading-tight tracking-tight">{ex?.exerciseName}</h2>
          <div className="text-sm mt-1" style={{ color: P.textMuted }}>
            {exDone} of {exTotal} sets done
          </div>
        </div>

        {/* Sets */}
        <div className="space-y-2 flex-1">
          {ex?.sets.map((set, setIdx) => (
            <FocusSetRow
              key={set.id}
              set={set}
              setIdx={setIdx}
              onUpdate={p => updateSet(setIdx, p)}
              onToggleDone={() => toggleDone(setIdx)}
              onRemove={() => removeSet(setIdx)}
            />
          ))}
          <button
            onClick={addSet}
            className="w-full py-3 rounded-2xl text-sm transition-colors"
            style={{ color: P.textMuted, border: `1px dashed ${P.border}` }}
          >
            + Add set
          </button>
        </div>
      </div>

      {/* Rest timer overlay */}
      {timer.active && (
        <div className="fixed bottom-16 inset-x-0 flex justify-center z-40 px-4">
          <div
            className="flex items-center gap-4 px-5 py-3 rounded-2xl shadow-2xl"
            style={{ background: P.surface, border: `1px solid ${P.borderBright}` }}
          >
            <div className="text-center">
              <div className="text-3xl font-bold tabular-nums leading-none" style={{ color: P.accentText }}>
                {String(Math.floor(timer.remaining / 60))}:{String(timer.remaining % 60).padStart(2, '0')}
              </div>
              <div className="text-xs mt-0.5" style={{ color: P.textMuted }}>rest</div>
            </div>
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: P.border }}>
              <div className="h-full rounded-full" style={{ width: `${(timer.remaining / timer.total) * 100}%`, background: P.accent, transition: 'width 1s linear' }} />
            </div>
            <button onClick={dismissRest} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: P.textMuted, background: P.surfaceBright }}>Skip</button>
          </div>
        </div>
      )}

      {/* Exercise drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-72 max-w-full h-full flex flex-col py-safe-top" style={{ background: P.surface }}>
            <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${P.border}` }}>
              <span className="font-semibold">{workout.name}</span>
              <button onClick={() => setDrawerOpen(false)} style={{ color: P.textMuted }}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {workout.exercises.map((e, i) => {
                const eDone = e.sets.filter(s => s.done).length
                const eCol = muscleColor(e.primary_muscle)
                return (
                  <button
                    key={e.id}
                    onClick={() => { setCurrentExIdx(i); setDrawerOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{ background: i === currentExIdx ? P.surfaceBright : 'transparent' }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: eCol }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{e.exerciseName}</div>
                      <div className="text-xs" style={{ color: P.textMuted }}>{eDone}/{e.sets.length} sets</div>
                    </div>
                    {i === currentExIdx && <span style={{ color: P.accent }}>›</span>}
                  </button>
                )
              })}
            </div>
            <div className="px-4 py-3" style={{ borderTop: `1px solid ${P.border}` }}>
              <button
                onClick={() => { setDrawerOpen(false); setFinishOpen(true) }}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ background: P.accent, color: P.bg }}
              >
                Finish workout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finish modal */}
      {finishOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/80" onClick={() => setFinishOpen(false)} />
          <div className="relative w-full max-w-md rounded-t-3xl p-6 space-y-5" style={{ background: P.surface }}>
            <div className="w-10 h-1 rounded-full mx-auto" style={{ background: P.border }} />
            <h2 className="text-2xl font-bold text-center">Finish workout?</h2>
            <div className="grid grid-cols-2 gap-3">
              {[['Time', elapsed], ['Sets done', `${doneSets}/${totalSets}`]].map(([l, v]) => (
                <div key={l} className="rounded-2xl p-4 text-center" style={{ background: P.surfaceBright }}>
                  <div className="text-2xl font-bold" style={{ color: P.accentText }}>{v}</div>
                  <div className="text-xs mt-1" style={{ color: P.textMuted }}>{l}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setFinishOpen(false)} className="py-3 rounded-xl text-sm font-semibold" style={{ background: P.surfaceBright, color: P.textMuted }}>Keep going</button>
              <button onClick={() => { setWorkout(initWorkout()); setFinishOpen(false) }} className="py-3 rounded-xl text-sm font-bold" style={{ background: P.accent, color: P.bg }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FocusSetRow({ set, setIdx, onUpdate, onToggleDone, onRemove }) {
  const isDone = set.done
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
      style={{ background: isDone ? P.surface : P.surfaceBright, border: `1px solid ${isDone ? P.accent + '40' : P.border}` }}
    >
      <span className="w-5 text-xs text-center tabular-nums font-mono" style={{ color: P.textDim }}>{setIdx + 1}</span>
      <div className="flex flex-1 items-center gap-3">
        <div className="flex-1">
          <div className="text-[10px] mb-0.5" style={{ color: P.textDim }}>kg</div>
          <input
            type="text" inputMode="decimal" value={set.weight}
            onChange={e => onUpdate({ weight: e.target.value })}
            placeholder="—"
            className="w-full text-lg font-bold bg-transparent outline-none"
            style={{ color: isDone ? P.accentText : P.text }}
          />
        </div>
        <div className="text-lg font-light" style={{ color: P.border }}>×</div>
        <div className="flex-1">
          <div className="text-[10px] mb-0.5" style={{ color: P.textDim }}>reps</div>
          <input
            type="text" inputMode="numeric" value={set.reps}
            onChange={e => onUpdate({ reps: e.target.value })}
            placeholder="—"
            className="w-full text-lg font-bold bg-transparent outline-none"
            style={{ color: isDone ? P.accentText : P.text }}
          />
        </div>
        <div className="w-12">
          <div className="text-[10px] mb-0.5" style={{ color: P.textDim }}>RIR</div>
          <input
            type="text" inputMode="numeric" value={set.rir}
            onChange={e => onUpdate({ rir: e.target.value })}
            placeholder="—"
            className="w-full text-sm bg-transparent outline-none"
            style={{ color: P.textMuted }}
          />
        </div>
      </div>
      <button
        onClick={onToggleDone}
        className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all"
        style={isDone
          ? { background: P.accent, color: P.bg }
          : { border: `2px solid ${P.border}`, color: P.textDim }
        }
      >
        {isDone ? '✓' : ''}
      </button>
    </div>
  )
}
