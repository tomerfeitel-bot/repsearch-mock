import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  PROGRESS_TEXT, PROGRESS_MUTED, splitColor, POSITIVE_INK, NEGATIVE_INK,
} from '../../lib/progressTheme.js'
import {
  Section, StatRow, StatTile, ChartBlock, Chip, Empty, Skeleton, ErrorState, InlineWarning,
  axisTick, tooltipStyle, gridStroke, PrimaryButton,
} from './ui.jsx'

const SPLITS = ['Push', 'Pull', 'Legs', 'Other']
const DEFAULT_METRICS = [
  { key: 'top_set', label: 'Top set' },
  { key: 'reps', label: 'Reps' },
]

export default function LiftsTab({ resource, query, highlight = [], onQueryChange, onRetry, onCompare }) {
  const navigate = useNavigate()
  const data = resource.data || {}
  const exercises = useMemo(() => data.exercises || [], [data.exercises])
  const selectedExercise = query.exercise_id
  const selected = exercises.find(e => e.id === selectedExercise)
  const [split, setSplit] = useState('Push')

  const exercisesInSplit = useMemo(() => exercises.filter(ex => (ex.split || 'Other') === split), [exercises, split])
  const chartRows = useMemo(() => (data.series || []).map(point => ({ ...point, value: Number(point.value) })), [data.series])
  const hue = splitColor(split)

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

  if (resource.loading && !data.exercises) return <Skeleton blocks={[40, 240, 64]} />
  if (resource.error && !data.exercises) return <ErrorState message={resource.error} onRetry={onRetry} />

  const stats = data.stats
  const valueSuffix = query.metric === 'reps' ? '' : 'kg'
  const gainColor = stats ? (stats.gain >= 0 ? POSITIVE_INK : NEGATIVE_INK) : undefined
  const gainPct = stats && stats.start ? Math.round((stats.gain / stats.start) * 100) : null

  return (
    <div className="space-y-5">
      {resource.error && <InlineWarning message={resource.error} onRetry={onRetry} />}

      {/* Split selector — active chip carries the split's own hue. */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {SPLITS.map(s => (
          <Chip key={s} active={split === s} accent={splitColor(s)} onAccent="#fff" onClick={() => selectSplit(s)}>{s}</Chip>
        ))}
      </div>

      {exercisesInSplit.length === 0 ? (
        <Empty>No official-library lifts logged for {split} yet.</Empty>
      ) : (
        <>
          <div className="flex gap-1.5 flex-wrap">
            {exercisesInSplit.map(ex => (
              <Chip key={ex.id} size="sm" active={selectedExercise === ex.id} accent={hue} onAccent="#fff" onClick={() => onQueryChange({ exercise_id: ex.id })}>
                {ex.name}
              </Chip>
            ))}
          </div>

          <ChartBlock
            title={selected?.name || 'Selected lift'}
            caption={stats
              ? `${stats.gain >= 0 ? 'Up' : 'Down'} ${Math.abs(stats.gain)}${valueSuffix}${gainPct != null ? ` (${gainPct >= 0 ? '+' : ''}${gainPct}%)` : ''} since you started tracking — ${metricLabel(query.metric).toLowerCase()}.`
              : 'Pick a lift to see its progression.'}
            height={230}
            action={
              <div className="flex gap-1.5">
                {DEFAULT_METRICS.map(metric => (
                  <Chip key={metric.key} size="sm" active={query.metric === metric.key} accent={hue} onAccent="#fff" onClick={() => onQueryChange({ metric: metric.key })}>
                    {metric.label}
                  </Chip>
                ))}
              </div>
            }
          >
            {resource.loading ? (
              <Empty>Loading lift chart…</Empty>
            ) : chartRows.length > 0 ? (
              <ResponsiveContainer>
                <LineChart data={chartRows} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={query.metric === 'reps' ? <RepsTooltip /> : undefined} contentStyle={tooltipStyle} labelStyle={{ color: PROGRESS_MUTED }} />
                  <Line dataKey="value" name={metricLabel(query.metric)} type="monotone" stroke={hue} strokeWidth={2.5} dot={{ r: 3, fill: hue }} activeDot={{ r: 5 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty>No lift data for this selection yet.</Empty>
            )}
          </ChartBlock>

          {stats && (
            <StatRow cols={3}>
              <StatTile first label="Start" value={stats.start} unit={valueSuffix} />
              <StatTile label="Current" value={stats.current} unit={valueSuffix} />
              <StatTile label="Gain" value={`${stats.gain >= 0 ? '+' : ''}${stats.gain}`} unit={valueSuffix} color={gainColor} sub={gainPct != null ? `${gainPct >= 0 ? '+' : ''}${gainPct}%` : undefined} />
            </StatRow>
          )}

          <Section title={null} divider>
            <PrimaryButton
              onClick={() => selectedExercise && onCompare?.(selectedExercise)}
              disabled={!selectedExercise}
              className="w-full py-3"
            >
              Compare this lift against your data →
            </PrimaryButton>
          </Section>
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
    <div className="rounded-lg px-3 py-2 text-xs" style={tooltipStyle}>
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
