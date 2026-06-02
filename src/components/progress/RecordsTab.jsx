import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PROGRESS_CARD, PROGRESS_BORDER, PROGRESS_TEXT, PROGRESS_MUTED, splitColor } from '../../lib/progressTheme.js'

const PIN_STORAGE_KEY = 'repsearch.progress.pinnedLifts'

export default function RecordsTab({ resource, onRetry }) {
  const navigate = useNavigate()
  const data = resource.data || {}
  const records = useMemo(() => data.records || [], [data.records])
  const defaultPins = useMemo(() => data.defaultPins || [], [data.defaultPins])
  const [pinned, setPinned] = useState(() => readPins())
  // True once the user has any stored selection — including an intentional empty list.
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

  if (resource.loading && !resource.data) return <Skeleton />
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
    <div className="space-y-4">
      {resource.error && <InlineWarning message={resource.error} onRetry={onRetry} />}

      {records.length === 0 ? (
        <Card><Empty>No personal records yet. Log working sets to start building records.</Empty></Card>
      ) : (
        <>
          <div>
            <div className="text-xs uppercase tracking-wider mb-2 px-1" style={{ color: PROGRESS_MUTED }}>Pinned lifts</div>
            {pinnedRecords.length ? (
              <div className="grid grid-cols-2 gap-2">
                {pinnedRecords.map(record => (
                  <PinnedCard key={record.exercise_id} record={record} onOpen={() => openLift(record)} onUnpin={() => togglePin(record.exercise_id)} />
                ))}
              </div>
            ) : (
              <Card><Empty>Pin the lifts you care about most.</Empty></Card>
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider mb-2 px-1" style={{ color: PROGRESS_MUTED }}>All records</div>
            <div className="space-y-2">
              {[...pinnedRecords, ...unpinnedRecords].map(record => {
                const pinnedNow = pinned.includes(record.exercise_id)
                return (
                  <div
                    key={record.exercise_id}
                    className="rounded-xl p-3 pl-4 flex items-center justify-between"
                    style={{ background: PROGRESS_CARD, borderLeft: `4px solid ${splitColor(splitFor(record))}`, border: `1px solid ${PROGRESS_BORDER}`, borderLeftWidth: 4 }}
                  >
                    <button className="min-w-0 flex-1 text-left" onClick={() => openLift(record)}>
                      <div className="font-medium truncate" style={{ color: PROGRESS_TEXT }}>{record.exercise_name}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: PROGRESS_MUTED }}>{record.primary_muscle || ''} - {record.date}</div>
                    </button>
                    <div className="font-mono tabular-nums text-right shrink-0 ml-2">
                      <div className="font-bold" style={{ color: PROGRESS_TEXT }}>{record.weight_kg}kg</div>
                      <div className="text-xs" style={{ color: PROGRESS_MUTED }}>x {record.reps}</div>
                    </div>
                    <button
                      onClick={() => togglePin(record.exercise_id)}
                      className="ml-3 w-8 h-8 rounded-full text-xs font-bold"
                      style={{ border: `1px solid ${PROGRESS_BORDER}`, color: pinnedNow ? PROGRESS_CARD : PROGRESS_TEXT, background: pinnedNow ? PROGRESS_TEXT : 'transparent' }}
                      aria-label={pinnedNow ? 'Unpin lift' : 'Pin lift'}
                    >
                      {pinnedNow ? '-' : '+'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function PinnedCard({ record, onOpen, onUnpin }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: PROGRESS_CARD, border: `1px solid ${PROGRESS_BORDER}` }}>
      <button className="w-full text-left" onClick={onOpen}>
        <div className="text-[10px] uppercase tracking-wider" style={{ color: PROGRESS_MUTED }}>{record.primary_muscle || 'Record'}</div>
        <div className="font-semibold truncate mt-1" style={{ color: PROGRESS_TEXT }}>{record.exercise_name}</div>
        <div className="mt-3 font-mono font-bold" style={{ color: PROGRESS_TEXT, fontSize: '1.8rem', lineHeight: 1 }}>
          {record.weight_kg}<span className="text-base ml-1">kg</span>
        </div>
        <div className="text-xs mt-1" style={{ color: PROGRESS_MUTED }}>x {record.reps} - est. {record.estimated_1rm}kg</div>
      </button>
      <button onClick={onUnpin} className="mt-3 text-xs font-semibold" style={{ color: PROGRESS_MUTED }}>Unpin</button>
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

function Card({ children }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: PROGRESS_CARD, border: `1px solid ${PROGRESS_BORDER}` }}>
      {children}
    </div>
  )
}

function Empty({ children }) {
  return <div className="text-center py-8 text-sm" style={{ color: PROGRESS_MUTED }}>{children}</div>
}

function InlineWarning({ message, onRetry }) {
  return (
    <div className="rounded-xl p-3 flex items-center justify-between gap-3 text-sm" style={{ background: PROGRESS_CARD, border: `1px solid ${PROGRESS_BORDER}`, color: PROGRESS_MUTED }}>
      <span>{message}</span>
      <button className="font-semibold" style={{ color: PROGRESS_TEXT }} onClick={onRetry}>Retry</button>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <Card>
      <div className="text-center py-8">
        <div className="text-sm" style={{ color: PROGRESS_MUTED }}>{message}</div>
        <button onClick={onRetry} className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: PROGRESS_TEXT, color: PROGRESS_CARD }}>Try again</button>
      </div>
    </Card>
  )
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="h-40 rounded-2xl animate-pulse" style={{ background: PROGRESS_CARD }} />
      <div className="h-64 rounded-2xl animate-pulse" style={{ background: PROGRESS_CARD }} />
    </div>
  )
}
