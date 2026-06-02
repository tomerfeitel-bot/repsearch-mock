import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Sheet } from '../ui/Sheet.jsx'
import { PROGRESS_CARD, PROGRESS_BORDER, PROGRESS_TEXT, PROGRESS_MUTED, splitColor } from '../../lib/progressTheme.js'

export default function HistoryTab({ summary, history, onRetry }) {
  const workouts = useMemo(() => Array.isArray(history.data) ? history.data : [], [history.data])
  const data = summary.data || {}
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [selectedDate, setSelectedDate] = useState(null)

  const monthLabel = new Date(cursor.y, cursor.m).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const monthWorkouts = useMemo(() => {
    const ym = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`
    return workouts.filter(w => w.date && w.date.startsWith(ym))
  }, [workouts, cursor])
  const workoutsByDate = useMemo(() => groupByDate(workouts), [workouts])
  const monthGrid = useMemo(() => buildMonthGrid(cursor.y, cursor.m, workoutsByDate), [cursor, workoutsByDate])
  const selectedWorkouts = selectedDate ? workoutsByDate.get(selectedDate) || [] : []
  const loading = history.loading || summary.loading
  const error = history.error || summary.error

  if (loading && workouts.length === 0) return <Skeleton />
  if (error && workouts.length === 0) return <ErrorState message={error} onRetry={onRetry} />

  return (
    <div className="space-y-4">
      {error && <InlineWarning message={error} onRetry={onRetry} />}

      <div className="grid grid-cols-3 gap-2">
        <StatBox label="This month" value={data.sessionsThisMonth ?? monthWorkouts.length} />
        <StatBox label="This week" value={data.trainingDaysThisWeek ?? 0} />
        <StatBox label="Last workout" value={formatShortDate(data.lastWorkout?.date)} small />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCursor(prev => shiftMonth(prev, -1))} className="w-9 h-9 text-sm rounded-full" style={{ color: PROGRESS_MUTED, border: `1px solid ${PROGRESS_BORDER}` }}>{'<'}</button>
          <div className="font-semibold" style={{ color: PROGRESS_TEXT }}>{monthLabel}</div>
          <button onClick={() => setCursor(prev => shiftMonth(prev, 1))} className="w-9 h-9 text-sm rounded-full" style={{ color: PROGRESS_MUTED, border: `1px solid ${PROGRESS_BORDER}` }}>{'>'}</button>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-center text-[10px] uppercase tracking-wider" style={{ color: PROGRESS_MUTED }}>{d}</div>
          ))}
          {monthGrid.map((cell, i) => (
            <button
              key={i}
              onClick={() => cell.date && cell.count > 0 && setSelectedDate(cell.date)}
              disabled={!cell.date || cell.count === 0}
              className="aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-mono transition-transform active:scale-95 disabled:active:scale-100 relative"
              style={{
                background: cell.color || (cell.inMonth ? 'rgba(0,0,0,0.04)' : 'transparent'),
                color: cell.color ? '#fff' : (cell.inMonth ? PROGRESS_TEXT : 'transparent'),
                opacity: cell.inMonth ? 1 : 0,
              }}
            >
              <span>{cell.day || ''}</span>
              {cell.count > 1 && <span className="absolute bottom-1 text-[9px] font-bold">{cell.count}</span>}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="text-xs uppercase tracking-wider mb-3" style={{ color: PROGRESS_MUTED }}>Sessions per week</div>
        <div style={{ width: '100%', height: 140 }}>
          <ResponsiveContainer>
            <BarChart data={data.weeklySessions || []}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: PROGRESS_MUTED }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                contentStyle={{ background: PROGRESS_CARD, border: `1px solid ${PROGRESS_BORDER}`, borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="count" fill={PROGRESS_TEXT} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {workouts.length === 0 && (
        <Card><Empty>No workouts logged yet.</Empty></Card>
      )}

      <DaySheet
        date={selectedDate}
        workouts={selectedWorkouts}
        onClose={() => setSelectedDate(null)}
      />
    </div>
  )
}

function DaySheet({ date, workouts, onClose }) {
  const navigate = useNavigate()
  const [openId, setOpenId] = useState(null)

  function saveTemplate(workout) {
    navigate(`/templates/new?workout=${encodeURIComponent(workout.id)}`)
  }

  return (
    <Sheet open={!!date} onClose={() => { setOpenId(null); onClose() }} title={date ? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}>
      <div className="p-4 space-y-3">
        {workouts.map(workout => {
          const expanded = openId === workout.id
          const exercises = groupExercises(workout.sets || [])
          return (
            <div key={workout.id} className="rounded-xl p-3" style={{ background: PROGRESS_CARD, border: `1px solid ${PROGRESS_BORDER}` }}>
              <button className="w-full text-left" onClick={() => setOpenId(expanded ? null : workout.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate" style={{ color: PROGRESS_TEXT }}>{workout.workout_day || 'Workout'}</div>
                    <div className="text-xs mt-0.5" style={{ color: PROGRESS_MUTED }}>
                      {workout.exercise_count || exercises.length} exercises - {workout.set_count || (workout.sets || []).length} sets
                    </div>
                  </div>
                  <div className="text-xs font-mono shrink-0" style={{ color: PROGRESS_MUTED }}>{workout.duration_min || 0}min</div>
                </div>
              </button>
              {expanded && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: PROGRESS_BORDER }}>
                  <ol className="space-y-1 text-sm" style={{ color: PROGRESS_TEXT }}>
                    {exercises.map((e, i) => (
                      <li key={e.id} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate"><span className="font-mono" style={{ color: PROGRESS_MUTED }}>{i + 1}.</span> {e.name}</span>
                        <span className="text-xs shrink-0" style={{ color: PROGRESS_MUTED }}>{e.sets} sets</span>
                      </li>
                    ))}
                  </ol>
                  <button
                    onClick={() => saveTemplate(workout)}
                    className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: PROGRESS_TEXT, color: PROGRESS_CARD }}
                  >
                    Save as template
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}

function groupExercises(sets) {
  const map = new Map()
  for (const set of sets) {
    if (!map.has(set.exercise_id)) map.set(set.exercise_id, { id: set.exercise_id, name: set.exercise_name || set.exercise_id, sets: 0 })
    map.get(set.exercise_id).sets += 1
  }
  return [...map.values()]
}

function groupByDate(workouts) {
  const map = new Map()
  for (const workout of workouts) {
    if (!map.has(workout.date)) map.set(workout.date, [])
    map.get(workout.date).push(workout)
  }
  return map
}

function buildMonthGrid(year, monthIdx, workoutsByDate) {
  const first = new Date(year, monthIdx, 1)
  const last = new Date(year, monthIdx + 1, 0)
  const cells = []
  for (let i = 0; i < first.getDay(); i += 1) cells.push({ inMonth: false })
  for (let day = 1; day <= last.getDate(); day += 1) {
    const iso = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const workouts = workoutsByDate.get(iso) || []
    cells.push({
      inMonth: true,
      day,
      date: iso,
      count: workouts.length,
      color: workouts.length ? splitColor(workouts[0].workout_day) : null,
    })
  }
  while (cells.length % 7 !== 0) cells.push({ inMonth: false })
  return cells
}

function shiftMonth({ y, m }, by) {
  const next = new Date(y, m + by, 1)
  return { y: next.getFullYear(), m: next.getMonth() }
}

function formatShortDate(date) {
  if (!date) return '-'
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function Card({ children }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: PROGRESS_CARD, border: `1px solid ${PROGRESS_BORDER}` }}>
      {children}
    </div>
  )
}

function StatBox({ label, value, small }) {
  return (
    <div className="rounded-2xl p-3 text-center" style={{ background: PROGRESS_CARD, border: `1px solid ${PROGRESS_BORDER}` }}>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: PROGRESS_MUTED }}>{label}</div>
      <div className={`${small ? 'text-base' : 'text-2xl'} font-bold font-mono tabular-nums mt-1`} style={{ color: PROGRESS_TEXT }}>{value}</div>
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
      <div className="h-20 rounded-2xl animate-pulse" style={{ background: PROGRESS_CARD }} />
      <div className="h-64 rounded-2xl animate-pulse" style={{ background: PROGRESS_CARD }} />
      <div className="h-32 rounded-2xl animate-pulse" style={{ background: PROGRESS_CARD }} />
    </div>
  )
}
