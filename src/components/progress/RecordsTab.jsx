import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PROGRESS_TEXT, PROGRESS_MUTED, PROGRESS_BORDER, splitColor } from '../../lib/progressTheme.js'
import { Section, DataRow, Empty, Skeleton, ErrorState, InlineWarning } from './ui.jsx'

const PIN_STORAGE_KEY = 'repsearch.progress.pinnedLifts'

export default function RecordsTab({ resource, onRetry }) {
  const navigate = useNavigate()
  const data = resource.data || {}
  const records = useMemo(() => data.records || [], [data.records])
  const defaultPins = useMemo(() => data.defaultPins || [], [data.defaultPins])
  const [pinned, setPinned] = useState(() => readPins())
  const [initialized, setInitialized] = useState(() => localStorage.getItem(PIN_STORAGE_KEY) !== null)

  useEffect(() => {
    if (initialized || !defaultPins.length) return
    if (pinned.length === 0) setPinned(defaultPins.slice(0, 4))
    setInitialized(true)
  }, [defaultPins, pinned.length, initialized])

  useEffect(() => {
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinned))
  }, [pinned])

  const recordByExercise = useMemo(() => new Map(records.map(record => [record.exercise_id, record])), [records])
  const pinnedRecords = pinned.map(id => recordByExercise.get(id)).filter(Boolean)
  const unpinnedRecords = records.filter(record => !pinned.includes(record.exercise_id))

  if (resource.loading && !resource.data) return <Skeleton blocks={[140, 260]} />
  if (resource.error && !resource.data) return <ErrorState message={resource.error} onRetry={onRetry} />

  function togglePin(exerciseId) {
    setPinned(prev => prev.includes(exerciseId)
      ? prev.filter(id => id !== exerciseId)
      : [...prev, exerciseId].slice(0, 6))
  }

  function openLift(record) {
    navigate(`/progress?tab=lifts&highlight=${encodeURIComponent(record.exercise_id)}`)
  }

  return (
    <div className="space-y-5">
      {resource.error && <InlineWarning message={resource.error} onRetry={onRetry} />}

      {records.length === 0 ? (
        <Empty>No personal records yet. Log working sets to start building records.</Empty>
      ) : (
        <>
          <Section title="Pinned lifts" caption="Your headline one-rep records, color-coded by split." divider={false}>
            {pinnedRecords.length ? (
              <div className="grid grid-cols-2 gap-x-4">
                {pinnedRecords.map(record => (
                  <PinnedStat key={record.exercise_id} record={record} onOpen={() => openLift(record)} onUnpin={() => togglePin(record.exercise_id)} />
                ))}
              </div>
            ) : (
              <Empty>Pin the lifts you care about most.</Empty>
            )}
          </Section>

          <Section title="All records">
            <div>
              {[...pinnedRecords, ...unpinnedRecords].map(record => {
                const pinnedNow = pinned.includes(record.exercise_id)
                return (
                  <DataRow
                    key={record.exercise_id}
                    dot={splitColor(splitFor(record))}
                    label={record.exercise_name}
                    sub={`${record.primary_muscle || ''}${record.primary_muscle ? ' · ' : ''}${record.date}`}
                    onClick={() => openLift(record)}
                    trailing={
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right font-mono tabular-nums">
                          <div className="font-bold text-sm" style={{ color: PROGRESS_TEXT }}>{record.weight_kg}kg</div>
                          <div className="text-[11px]" style={{ color: PROGRESS_MUTED }}>× {record.reps}</div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePin(record.exercise_id) }}
                          className="w-8 h-8 rounded-full text-sm font-bold transition-colors"
                          style={pinnedNow
                            ? { background: 'var(--emerald)', color: 'var(--on-emerald)', border: '1px solid var(--emerald)' }
                            : { border: `1px solid ${PROGRESS_BORDER}`, color: PROGRESS_MUTED }}
                          aria-label={pinnedNow ? `Unpin ${record.exercise_name}` : `Pin ${record.exercise_name}`}
                        >
                          {pinnedNow ? '−' : '+'}
                        </button>
                      </div>
                    }
                  />
                )
              })}
            </div>
          </Section>
        </>
      )}
    </div>
  )
}

function PinnedStat({ record, onOpen, onUnpin }) {
  return (
    <div className="py-3" style={{ borderTop: `1px solid ${PROGRESS_BORDER}` }}>
      <button className="w-full text-left" onClick={onOpen}>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: PROGRESS_MUTED }}>
          <span className="h-2 w-2 rounded-full" style={{ background: splitColor(splitFor(record)) }} />
          {record.primary_muscle || 'Record'}
        </div>
        <div className="font-semibold truncate mt-1.5" style={{ color: PROGRESS_TEXT }}>{record.exercise_name}</div>
        <div className="mt-2 font-mono font-bold tabular-nums" style={{ color: PROGRESS_TEXT, fontSize: '1.9rem', lineHeight: 1 }}>
          {record.weight_kg}<span className="text-base ml-1 font-medium" style={{ color: PROGRESS_MUTED }}>kg</span>
        </div>
        <div className="text-[11px] mt-1 font-mono tabular-nums" style={{ color: PROGRESS_MUTED }}>× {record.reps} · est. {record.estimated_1rm}kg</div>
      </button>
      <button onClick={onUnpin} className="mt-2 text-[11px] font-semibold" style={{ color: PROGRESS_MUTED }}>Unpin</button>
    </div>
  )
}

function readPins() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PIN_STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

const MUSCLE_TO_SPLIT = {
  Chest: 'Push', 'Upper Chest': 'Push', 'Mid Chest': 'Push', 'Lower Chest': 'Push',
  Shoulders: 'Push', 'Front Delts': 'Push', 'Side Delts': 'Push', Triceps: 'Push',
  Back: 'Pull', Lats: 'Pull', 'Upper Back': 'Pull', 'Lower Back': 'Pull', Traps: 'Pull',
  'Rear Delts': 'Pull', Biceps: 'Pull', Forearms: 'Pull',
  Quads: 'Legs', Hamstrings: 'Legs', Glutes: 'Legs', Calves: 'Legs',
}

function splitFor(record) {
  return MUSCLE_TO_SPLIT[record.primary_muscle] || 'Other'
}
