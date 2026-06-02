import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { PROGRESS_CARD, PROGRESS_BORDER, PROGRESS_TEXT, PROGRESS_MUTED, splitColor } from '../../lib/progressTheme.js'

const SPLITS = ['Push', 'Pull', 'Legs', 'Other']
const DEFAULT_METRICS = [
  { key: 'top_set', label: 'Top set' },
  { key: 'reps', label: 'Reps' },
]

export default function LiftsTab({ resource, query, highlight = [], onQueryChange, onRetry }) {
  const navigate = useNavigate()
  const data = resource.data || {}
  const exercises = useMemo(() => data.exercises || [], [data.exercises])
  const selectedExercise = query.exercise_id
  const selected = exercises.find(e => e.id === selectedExercise)
  const [split, setSplit] = useState('Push')

  const exercisesInSplit = useMemo(() => exercises.filter(ex => (ex.split || 'Other') === split), [exercises, split])
  const chartRows = useMemo(() => (data.series || []).map(point => ({ ...point, value: Number(point.value) })), [data.series])

  function selectSplit(next) {
    if (next === split) return
    setSplit(next)
    const first = exercises.find(ex => (ex.split || 'Other') === next)
    onQueryChange({ exercise_id: first ? first.id : '' })
  }

  useEffect(() => {
    if (highlight.length && exercises.length) {
      const target = exercises.find(ex => highlight.includes(ex.id))
      if (target) {
        setSplit(target.split || 'Other')
        if (target.id !== selectedExercise) onQueryChange({ exercise_id: target.id })
      }
    }
  }, [highlight, exercises, selectedExercise, onQueryChange])

  useEffect(() => {
    if (!selectedExercise && exercisesInSplit.length) onQueryChange({ exercise_id: exercisesInSplit[0].id })
  }, [selectedExercise, exercisesInSplit, onQueryChange])

  if (resource.loading && !data.exercises) return <Skeleton />
  if (resource.error && !data.exercises) return <ErrorState message={resource.error} onRetry={onRetry} />

  const stats = data.stats
  const valueSuffix = query.metric === 'reps' ? ' reps' : 'kg'

  return (
    <div className="space-y-4">
      {resource.error && <InlineWarning message={resource.error} onRetry={onRetry} />}

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {SPLITS.map(s => (
          <button
            key={s}
            onClick={() => selectSplit(s)}
            className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
            style={{
              background: split === s ? splitColor(s) : 'transparent',
              color: split === s ? '#fff' : PROGRESS_TEXT,
              border: `1.5px solid ${split === s ? splitColor(s) : PROGRESS_BORDER}`,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {exercisesInSplit.length === 0 ? (
        <Card><Empty>No official-library lifts logged for {split} yet.</Empty></Card>
      ) : (
        <>
          <div className="flex gap-1.5 flex-wrap">
            {exercisesInSplit.map(ex => (
              <button
                key={ex.id}
                onClick={() => onQueryChange({ exercise_id: ex.id })}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={{
                  background: selectedExercise === ex.id ? PROGRESS_TEXT : 'transparent',
                  color: selectedExercise === ex.id ? PROGRESS_CARD : PROGRESS_TEXT,
                  border: `1px solid ${selectedExercise === ex.id ? PROGRESS_TEXT : PROGRESS_BORDER}`,
                }}
              >
                {ex.name}
              </button>
            ))}
          </div>

          <Card>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider" style={{ color: PROGRESS_MUTED }}>Selected lift</div>
                <div className="font-semibold truncate" style={{ color: PROGRESS_TEXT }}>{selected?.name || 'Choose a lift'}</div>
              </div>
              <button
                onClick={() => selectedExercise && navigate(`/progress?tab=compare&seed=${encodeURIComponent(selectedExercise)}`)}
                disabled={!selectedExercise}
                className="px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap disabled:opacity-40"
                style={{ border: `1px solid ${PROGRESS_BORDER}`, color: PROGRESS_TEXT }}
              >
                Compare this lift →
              </button>
            </div>

            <div className="flex gap-1.5 mb-3">
              {DEFAULT_METRICS.map(metric => (
                <button
                  key={metric.key}
                  onClick={() => onQueryChange({ metric: metric.key })}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    background: query.metric === metric.key ? PROGRESS_TEXT : 'transparent',
                    color: query.metric === metric.key ? PROGRESS_CARD : PROGRESS_TEXT,
                    border: `1px solid ${query.metric === metric.key ? PROGRESS_TEXT : PROGRESS_BORDER}`,
                  }}
                >
                  {metric.label}
                </button>
              ))}
            </div>

            <div style={{ width: '100%', height: 230 }}>
              {resource.loading ? (
                <Empty>Loading lift chart...</Empty>
              ) : chartRows.length > 0 ? (
                <ResponsiveContainer>
                  <LineChart data={chartRows} margin={{ top: 12, right: 4, left: -16, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: PROGRESS_MUTED }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: PROGRESS_MUTED }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip content={query.metric === 'reps' ? <RepsTooltip /> : undefined} contentStyle={{ background: PROGRESS_CARD, border: `1px solid ${PROGRESS_BORDER}`, borderRadius: 8, fontSize: 12 }} />
                    <Line dataKey="value" name={metricLabel(query.metric)} type="monotone" stroke={splitColor(split)} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Empty>No lift data for this selection yet.</Empty>
              )}
            </div>
          </Card>

          {stats && (
            <div className="grid grid-cols-3 gap-2">
              <StatBox label="Start" value={`${stats.start}${valueSuffix}`} />
              <StatBox label="Current" value={`${stats.current}${valueSuffix}`} />
              <StatBox label="Gain" value={`${stats.gain >= 0 ? '+' : ''}${stats.gain}${valueSuffix}`} accent={stats.gain >= 0 ? splitColor(split) : '#a83232'} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function RepsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const point = payload.find(item => item.value != null)?.payload
  if (!point) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs shadow-sm" style={{ background: PROGRESS_CARD, border: `1px solid ${PROGRESS_BORDER}`, color: PROGRESS_TEXT }}>
      <div className="font-semibold">{point.value} reps · {point.weight_kg} kg</div>
      <div style={{ color: PROGRESS_MUTED }}>{formatSetType(point.set_type)} · {label}</div>
    </div>
  )
}

function metricLabel(metric) {
  return DEFAULT_METRICS.find(m => m.key === metric)?.label || metric
}

function formatSetType(value) {
  return String(value || 'working')
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
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

function StatBox({ label, value, accent }) {
  return (
    <div className="rounded-2xl p-3 text-center" style={{ background: PROGRESS_CARD, border: `1px solid ${PROGRESS_BORDER}` }}>
      <div className="text-xs uppercase tracking-wider" style={{ color: PROGRESS_MUTED }}>{label}</div>
      <div className="text-lg font-bold font-mono tabular-nums mt-1" style={{ color: accent || PROGRESS_TEXT }}>{value}</div>
    </div>
  )
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
      <div className="h-10 rounded-2xl animate-pulse" style={{ background: PROGRESS_CARD }} />
      <div className="h-80 rounded-2xl animate-pulse" style={{ background: PROGRESS_CARD }} />
      <div className="h-20 rounded-2xl animate-pulse" style={{ background: PROGRESS_CARD }} />
    </div>
  )
}
