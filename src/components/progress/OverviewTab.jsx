import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { Sheet } from '../ui/Sheet.jsx'
import {
  PROGRESS_TEXT, PROGRESS_MUTED, PROGRESS_BORDER, PROGRESS_ACCENT, splitColor,
} from '../../lib/progressTheme.js'
import {
  Section, StatRow, StatTile, ChartBlock, DataRow, Empty, Skeleton, ErrorState, InlineWarning,
  axisTick, tooltipStyle, PrimaryButton,
} from './ui.jsx'

// The splits that actually appear on the calendar, for the color legend.
const LEGEND_SPLITS = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body']

export default function OverviewTab({ summary, history, onRetry }) {
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

  const weekly = data.weeklySessions || []
  const weekAvg = weekly.length ? weekly.reduce((s, w) => s + w.count, 0) / weekly.length : 0
  const peak = weekly.reduce((m, w) => Math.max(m, w.count), 0)
  const splitsThisMonth = useMemo(() => {
    const set = new Set(monthWorkouts.map(w => w.workout_day).filter(Boolean))
    return LEGEND_SPLITS.filter(s => set.has(s))
  }, [monthWorkouts])

  if (loading && workouts.length === 0) return <Skeleton blocks={[64, 300, 180]} />
  if (error && workouts.length === 0) return <ErrorState message={error} onRetry={onRetry} />

  return (
    <div className="space-y-5">
      {error && <InlineWarning message={error} onRetry={onRetry} />}

      {/* Headline cadence — three earned numbers, gridded, no boxes. */}
      <StatRow cols={3}>
        <StatTile first label="This month" value={data.sessionsThisMonth ?? monthWorkouts.length} sub="sessions" />
        <StatTile label="This week" value={data.trainingDaysThisWeek ?? 0} sub="days trained" />
        <StatTile label="Last" value={formatShortDate(data.lastWorkout?.date)} sub={data.lastWorkout?.workout_day || '—'} />
      </StatRow>

      {/* Calendar — full-bleed under a hairline, color encodes the split. */}
      <Section
        title="Training calendar"
        action={
          <div className="flex items-center gap-1">
            <NavBtn onClick={() => setCursor(prev => shiftMonth(prev, -1))} label="Previous month">‹</NavBtn>
            <span className="text-sm font-semibold tabular-nums px-1 min-w-[7.5rem] text-center" style={{ color: PROGRESS_TEXT }}>{monthLabel}</span>
            <NavBtn onClick={() => setCursor(prev => shiftMonth(prev, 1))} label="Next month">›</NavBtn>
          </div>
        }
      >
        <div className="grid grid-cols-7 gap-1.5">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-[10px] uppercase tracking-wider pb-1" style={{ color: PROGRESS_MUTED }}>{d}</div>
          ))}
          {monthGrid.map((cell, i) => {
            const active = cell.count > 0
            return (
              <button
                key={i}
                onClick={() => cell.date && active && setSelectedDate(cell.date)}
                disabled={!cell.date || !active}
                className="aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-mono tabular-nums transition-transform active:scale-90 disabled:active:scale-100 relative"
                style={{
                  background: active ? cell.color : (cell.inMonth ? 'rgba(255,255,255,0.03)' : 'transparent'),
                  color: active ? '#fff' : (cell.inMonth ? PROGRESS_MUTED : 'transparent'),
                  fontWeight: active ? 700 : 400,
                  opacity: cell.inMonth ? 1 : 0,
                }}
              >
                <span>{cell.day || ''}</span>
                {cell.count > 1 && <span className="absolute bottom-0.5 right-1 text-[9px] font-bold">×{cell.count}</span>}
              </button>
            )
          })}
        </div>
        {splitsThisMonth.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3">
            {splitsThisMonth.map(s => (
              <span key={s} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: PROGRESS_MUTED }}>
                <span className="h-2 w-2 rounded-full" style={{ background: splitColor(s) }} />{s}
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Cadence trend — sequential quantity, single-hue bars, insight caption. */}
      {weekly.length > 0 && (
        <ChartBlock
          title="Sessions per week"
          caption={`Averaging ${weekAvg.toFixed(1)} sessions a week over the last ${weekly.length} weeks.`}
          height={140}
        >
          <ResponsiveContainer>
            <BarChart data={weekly} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={tooltipStyle} labelStyle={{ color: PROGRESS_MUTED }} />
              <Bar dataKey="count" name="Sessions" radius={[4, 4, 0, 0]}>
                {weekly.map((w, i) => (
                  <Cell key={i} fill={PROGRESS_ACCENT} fillOpacity={peak ? 0.4 + 0.6 * (w.count / peak) : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBlock>
      )}

      {workouts.length === 0 && <Empty>No workouts logged yet.</Empty>}

      <DaySheet date={selectedDate} workouts={selectedWorkouts} onClose={() => setSelectedDate(null)} />
    </div>
  )
}

function NavBtn({ onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-full text-base transition-colors"
      style={{ color: PROGRESS_MUTED, border: `1px solid ${PROGRESS_BORDER}` }}
    >
      {children}
    </button>
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
      <div className="p-4">
        {workouts.map(workout => {
          const expanded = openId === workout.id
          const exercises = groupExercises(workout.sets || [])
          return (
            <div key={workout.id}>
              <DataRow
                dot={splitColor(workout.workout_day)}
                label={workout.workout_day || 'Workout'}
                sub={`${workout.exercise_count || exercises.length} exercises · ${workout.set_count || (workout.sets || []).length} sets`}
                value={`${workout.duration_min || 0}min`}
                valueColor={PROGRESS_MUTED}
                onClick={() => setOpenId(expanded ? null : workout.id)}
              />
              {expanded && (
                <div className="pl-5 pb-3 pt-1">
                  <ol className="space-y-1.5 text-sm" style={{ color: PROGRESS_TEXT }}>
                    {exercises.map((e, i) => (
                      <li key={e.id} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate"><span className="font-mono" style={{ color: PROGRESS_MUTED }}>{i + 1}.</span> {e.name}</span>
                        <span className="text-xs font-mono shrink-0" style={{ color: PROGRESS_MUTED }}>{e.sets} sets</span>
                      </li>
                    ))}
                  </ol>
                  <PrimaryButton onClick={() => saveTemplate(workout)} className="mt-3 w-full py-2.5">Save as template</PrimaryButton>
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
  if (!date) return '—'
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
