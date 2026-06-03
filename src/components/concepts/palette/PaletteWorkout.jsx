import { useState } from 'react'
import { IconPlus, IconBolt } from '../cohesive/_shared.jsx'

const MOCK_EXERCISES = [
  {
    id: 'e1',
    name: 'Bench Press (Barbell)',
    muscle: 'Mid Chest',
    sets: [
      { id: 's1', weight: '100', reps: '8', rir: '2', done: true },
      { id: 's2', weight: '100', reps: '8', rir: '2', done: true },
      { id: 's3', weight: '100', reps: '', rir: '', done: false },
    ],
  },
  {
    id: 'e2',
    name: 'Incline Press (Dumbbell)',
    muscle: 'Upper Chest',
    sets: [
      { id: 's4', weight: '32', reps: '10', rir: '1', done: true },
      { id: 's5', weight: '32', reps: '', rir: '', done: false },
      { id: 's6', weight: '32', reps: '', rir: '', done: false },
    ],
  },
  {
    id: 'e3',
    name: 'Tricep Pushdown (Cable)',
    muscle: 'Triceps',
    sets: [
      { id: 's7', weight: '22.5', reps: '12', rir: '', done: false },
      { id: 's8', weight: '22.5', reps: '', rir: '', done: false },
    ],
  },
]

export default function PaletteWorkout({ P }) {
  const [exercises, setExercises] = useState(MOCK_EXERCISES)
  const r = P.radius
  const isMarine = P.tags.includes('navy')
  const isEmber = P.tags.includes('amber')
  const isGrove = P.tags.includes('earthy')
  const isQuartz = P.tags.includes('lavender')

  const totalSets = exercises.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0)
  const totalVol = exercises.reduce((v, e) =>
    v + e.sets.filter(s => s.done && s.weight && s.reps)
      .reduce((s2, s) => s2 + parseFloat(s.weight) * parseInt(s.reps), 0), 0)

  function markDone(eid, sid) {
    setExercises(exs => exs.map(e => e.id !== eid ? e : {
      ...e,
      sets: e.sets.map(s => s.id !== sid ? s : { ...s, done: !s.done }),
    }))
  }

  const cardStyle = (elevated) => ({
    background: P.surface,
    border: isQuartz ? 'none' : `1px solid ${P.border}`,
    borderRadius: r,
    boxShadow: isQuartz ? '0 2px 10px rgba(109,40,217,0.08),0 1px 2px rgba(0,0,0,0.04)'
      : isEmber && elevated ? `0 4px 24px rgba(217,124,30,0.10)` : 'none',
  })

  return (
    <div className="min-h-screen pb-32" style={{ background: P.bg, color: P.text }}>
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{
        background: P.bg,
        borderBottom: isEmber ? `2px solid ${P.accent}` : `1px solid ${P.border}`,
      }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-mono mb-0.5" style={{ color: P.textMuted }}>push day · 42m</div>
            <h1 className={`text-xl font-bold tracking-tight ${isMarine ? 'font-mono' : ''}`}>Active Workout</h1>
          </div>
          <button className="h-8 px-4 text-xs font-bold rounded-full"
            style={{ background: P.accent, color: P.accentInk }}>
            Finish
          </button>
        </div>

        {/* Summary strip */}
        <div className="mt-3 flex gap-3">
          {[['Sets done', `${totalSets}`], ['Volume', `${Math.round(totalVol).toLocaleString()} kg`]].map(([l, v]) => (
            <div key={l} className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
              style={{ background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: r }}>
              <span style={{ color: P.textMuted }}>{l}</span>
              <span className="font-mono font-bold" style={{ color: P.text }}>{v}</span>
            </div>
          ))}
          {/* Rest timer pill */}
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold font-mono"
            style={{ background: P.accentSoft, color: P.accent, border: `1px solid ${P.accent}40`, borderRadius: r }}>
            <IconBolt size={13} /> 0:45
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3">
        {exercises.map(ex => (
          <ExerciseCard key={ex.id} ex={ex} P={P} r={r} isMarine={isMarine} isEmber={isEmber} cardStyle={cardStyle}
            onMarkDone={(sid) => markDone(ex.id, sid)} />
        ))}

        <button className="w-full h-11 flex items-center justify-center gap-2 text-sm font-semibold"
          style={{
            border: `1px dashed ${P.border}`,
            borderRadius: r,
            color: P.textMuted,
            background: 'transparent',
          }}>
          <IconPlus size={16} /> Add exercise
        </button>
      </div>
    </div>
  )
}

function ExerciseCard({ ex, P, r, isMarine, isEmber, cardStyle, onMarkDone }) {
  const isGrove = P.tags.includes('earthy')

  return (
    <div style={cardStyle(true)}>
      {/* Exercise header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${P.border}` }}>
        <div>
          <div className={`text-sm font-bold ${isMarine ? 'font-mono' : ''}`}>{ex.name}</div>
          <div className="text-xs mt-0.5" style={{ color: P.textMuted }}>{ex.muscle}</div>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5"
          style={{ background: P.accentSoft, color: P.accent, borderRadius: r - 4 }}>
          {ex.sets.length} sets
        </span>
      </div>

      {/* Set table */}
      <div className="px-4 py-2">
        {/* Column headers */}
        <div className="grid gap-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ gridTemplateColumns: '22px 1fr 1fr 1fr 28px', color: P.textMuted }}>
          <span>#</span>
          <span className="text-center">kg</span>
          <span className="text-center">reps</span>
          <span className="text-center">RIR</span>
          <span />
        </div>

        {ex.sets.map((s, i) => (
          <SetRow key={s.id} set={s} idx={i + 1} P={P} r={r} isMarine={isMarine}
            onDone={() => onMarkDone(s.id)} />
        ))}

        <button className="mt-2 w-full h-8 flex items-center justify-center gap-1.5 text-xs font-semibold"
          style={{ border: `1px dashed ${P.border}`, borderRadius: r - 4, color: P.textMuted }}>
          <IconPlus size={13} /> Add set
        </button>
      </div>
    </div>
  )
}

function SetRow({ set, idx, P, r, isMarine, onDone }) {
  const opacity = set.done ? 1 : 0.7
  return (
    <div className="grid gap-2 py-1.5 items-center"
      style={{
        gridTemplateColumns: '22px 1fr 1fr 1fr 28px',
        borderBottom: `1px solid ${P.border}`,
        opacity,
      }}>
      <span className="text-xs font-mono font-semibold" style={{ color: P.textMuted }}>{idx}</span>

      {[set.weight, set.reps, set.rir].map((val, j) => (
        <div key={j} className="relative">
          <input
            readOnly
            value={val || ''}
            placeholder="—"
            className="w-full text-center text-sm font-mono font-semibold bg-transparent outline-none h-8"
            style={{
              border: `1px solid ${set.done ? P.accent + '60' : P.border}`,
              borderRadius: r - 4,
              color: val ? P.text : P.textMuted,
              background: set.done ? P.accentSoft : P.surfaceAlt,
            }}
          />
        </div>
      ))}

      {/* Done checkbox */}
      <button onClick={onDone} aria-pressed={set.done}
        className="h-7 w-7 flex items-center justify-center rounded-md mx-auto"
        style={{
          background: set.done ? P.accent : 'transparent',
          border: `2px solid ${set.done ? P.accent : P.border}`,
          borderRadius: isMarine ? 4 : r - 6,
          color: set.done ? P.accentInk : P.textMuted,
        }}>
        {set.done && (
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path d="M1 4L4 7L10 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  )
}
