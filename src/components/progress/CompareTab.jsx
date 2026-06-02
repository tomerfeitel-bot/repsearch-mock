import { useEffect, useMemo, useRef, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { nanoid } from '../../lib/nanoid.js'
import { PROGRESS_CARD, PROGRESS_BORDER, PROGRESS_TEXT, PROGRESS_MUTED } from '../../lib/progressTheme.js'

const SPLITS = ['Push', 'Pull', 'Legs', 'Other']
const COMPARE_METRICS = [
  { key: 'top_set', label: 'Top set' },
  { key: 'reps_at_weight', label: 'Reps at weight' },
  { key: 'estimated_1rm', label: 'Est. 1RM' },
  { key: 'volume', label: 'Volume' },
]
const BODY_SERIES = [
  { id: 'bodyweight_kg', name: 'Bodyweight' },
  { id: 'arm_cm', name: 'Arms' },
  { id: 'chest_cm', name: 'Chest' },
  { id: 'waist_cm', name: 'Waist' },
  { id: 'thigh_cm', name: 'Thighs' },
  { id: 'calf_cm', name: 'Calves' },
]
const SET_TYPE_OPTIONS = [
  { id: '', name: 'All set types' },
  { id: 'working', name: 'Working' },
  { id: 'backoff', name: 'Backoff' },
  { id: 'drop', name: 'Drop' },
  { id: 'amrap', name: 'AMRAP' },
  { id: 'rest_pause', name: 'Rest pause' },
  { id: 'cluster', name: 'Cluster' },
]
const ROM_OPTIONS = [
  { id: '', name: 'All ROM' },
  { id: 'full', name: 'Full ROM' },
  { id: 'partial', name: 'Partial' },
  { id: 'lengthened', name: 'Lengthened' },
  { id: 'shortened', name: 'Shortened' },
]
const GROUP_OPTIONS = [
  { id: 'session', name: 'Session' },
  { id: 'week', name: 'Week' },
  { id: 'month', name: 'Month' },
]
const LINE_COLORS = ['#b85c38', '#5a7a90', '#6a8a5a', '#7c6a92', '#c4914a']
const FILTER_KEYS = ['set_type', 'rom_category', 'equipment_type', 'split']

function makeRow(over = {}) {
  return { uid: nanoid(8), source_type: 'exercise', source_id: '', metric: 'top_set', ...over }
}

function emptyFilters() {
  return {
    set_type: { value: '', appliesTo: [] },
    rom_category: { value: '', appliesTo: [] },
    equipment_type: { value: '', appliesTo: [] },
    split: { value: '', appliesTo: [] },
  }
}

export default function CompareTab({ resource, exercises = [], muscles = [], equipment = [], seed = '', onRun }) {
  const [rows, setRows] = useState(() => (
    seed
      ? [makeRow({ source_type: 'exercise', source_id: seed })]
      : [makeRow()]
  ))
  const [filters, setFilters] = useState(emptyFilters)
  const [options, setOptions] = useState({ from: '', to: '', group_by: 'week' })
  const [warning, setWarning] = useState('')
  const autoRan = useRef(false)

  const chartData = useMemo(() => mergeCompareSeries(resource.data || []), [resource.data])

  function buildSeries(currentRows = rows, currentFilters = filters) {
    return currentRows
      .filter(row => row.source_id)
      .map((row, outIndex) => {
        const def = {
          id: `series_${outIndex}`,
          source_type: row.source_type,
          source_id: row.source_id,
          metric: row.metric,
          label: compareLabel(row, exercises, muscles),
        }
        if (row.metric === 'reps_at_weight' && row.target_weight) def.target_weight = row.target_weight
        for (const key of FILTER_KEYS) {
          const f = currentFilters[key]
          if (f.value && f.appliesTo.includes(row.uid)) def[key] = f.value
        }
        return def
      })
  }

  function run() {
    const missingWeight = rows.some(row => row.source_id && row.metric === 'reps_at_weight' && !(Number(row.target_weight) > 0))
    if (missingWeight) {
      setWarning('Enter a target weight for every "Reps at weight" series before running.')
      return
    }
    setWarning('')
    onRun(buildSeries(), cleanOptions(options))
  }

  // Auto-run once when arriving via a seeded lift and the exercise list is ready (for correct labels).
  useEffect(() => {
    if (seed && !autoRan.current && exercises.length) {
      autoRan.current = true
      onRun(buildSeries(), cleanOptions(options))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, exercises])

  function updateRow(uid, patch) {
    setWarning('')
    setRows(prev => prev.map(row => {
      if (row.uid !== uid) return row
      const next = { ...row, ...patch }
      if (patch.source_type === 'body_metric') next.metric = 'measurement'
      if (patch.source_type && patch.source_type !== row.source_type) {
        next.source_id = ''
        if (patch.source_type !== 'body_metric' && next.metric === 'measurement') next.metric = 'top_set'
      }
      return next
    }))
  }

  function addRow() {
    if (rows.length >= 3) return
    const row = makeRow()
    setRows(prev => [...prev, row])
    // Active filters apply to all series by default — include the new one.
    setFilters(prev => {
      const next = { ...prev }
      for (const key of FILTER_KEYS) {
        if (next[key].value) next[key] = { ...next[key], appliesTo: [...next[key].appliesTo, row.uid] }
      }
      return next
    })
  }

  function removeRow(uid) {
    if (rows.length <= 1) return
    setRows(prev => prev.filter(row => row.uid !== uid))
    setFilters(prev => {
      const next = { ...prev }
      for (const key of FILTER_KEYS) {
        next[key] = { ...next[key], appliesTo: next[key].appliesTo.filter(id => id !== uid) }
      }
      return next
    })
  }

  function setFilterValue(key, value) {
    setFilters(prev => ({
      ...prev,
      [key]: { value, appliesTo: value ? rows.map(r => r.uid) : [] },
    }))
  }

  function toggleFilterSeries(key, uid) {
    setFilters(prev => {
      const f = prev[key]
      const appliesTo = f.appliesTo.includes(uid)
        ? f.appliesTo.filter(id => id !== uid)
        : [...f.appliesTo, uid]
      return { ...prev, [key]: { ...f, appliesTo } }
    })
  }

  function updateOption(key, value) {
    setOptions(prev => ({ ...prev, [key]: value }))
  }

  const filterDefs = useMemo(() => ([
    { key: 'set_type', label: 'Set type', options: SET_TYPE_OPTIONS },
    { key: 'rom_category', label: 'ROM', options: ROM_OPTIONS },
    { key: 'equipment_type', label: 'Equipment', options: [{ id: '', name: 'All equipment' }, ...equipment] },
    { key: 'split', label: 'Split', options: [{ id: '', name: 'All splits' }, ...SPLITS.map(s => ({ id: s, name: s }))] },
  ]), [equipment])

  return (
    <div className="space-y-4">
      {resource.error && <InlineWarning message={resource.error} onRetry={run} />}

      <Card>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-xs uppercase tracking-wider" style={{ color: PROGRESS_MUTED }}>Compare</div>
            <div className="font-semibold" style={{ color: PROGRESS_TEXT }}>Graph 1–3 series from your data</div>
          </div>
          <button onClick={run} className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: PROGRESS_TEXT, color: PROGRESS_CARD }}>
            Run
          </button>
        </div>

        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={row.uid} className="flex items-start gap-2">
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                <select value={row.source_type} onChange={e => updateRow(row.uid, { source_type: e.target.value })} className="rounded-lg px-2 py-2 text-xs" style={controlStyle()}>
                  <option value="exercise">Exercise</option>
                  <option value="muscle">Muscle group</option>
                  <option value="split">Split</option>
                  <option value="body_metric">Body</option>
                </select>
                <select value={row.source_id} onChange={e => updateRow(row.uid, { source_id: e.target.value })} className="rounded-lg px-2 py-2 text-xs" style={controlStyle()}>
                  <option value="">Choose</option>
                  {sourceOptions(row.source_type, exercises, muscles).map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                <select value={row.metric} onChange={e => updateRow(row.uid, { metric: e.target.value })} className="rounded-lg px-2 py-2 text-xs" style={controlStyle()}>
                  {(row.source_type === 'body_metric' ? [{ key: 'measurement', label: 'Measurement' }] : COMPARE_METRICS).map(metric => (
                    <option key={metric.key} value={metric.key}>{metric.label}</option>
                  ))}
                </select>
                {row.metric === 'reps_at_weight' ? (
                  <input
                    type="number"
                    inputMode="decimal"
                    value={row.target_weight || ''}
                    onChange={e => updateRow(row.uid, { target_weight: e.target.value })}
                    placeholder="Target kg"
                    className="rounded-lg px-2 py-2 text-xs outline-none"
                    style={controlStyle()}
                  />
                ) : (
                  <div className="hidden md:block" />
                )}
              </div>
              <button
                onClick={() => removeRow(row.uid)}
                disabled={rows.length <= 1}
                aria-label={`Remove series ${index + 1}`}
                className="shrink-0 w-9 h-9 rounded-lg text-sm font-bold disabled:opacity-30"
                style={{ border: `1px solid ${PROGRESS_BORDER}`, color: PROGRESS_TEXT }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {rows.length < 3 && (
          <button onClick={addRow} className="mt-2 text-xs font-semibold" style={{ color: PROGRESS_TEXT }}>+ Add series</button>
        )}

        {warning && (
          <div className="mt-2 text-xs font-medium" style={{ color: '#a83232' }}>{warning}</div>
        )}

        {/* Per-series filters: pick a value, then toggle which series it applies to. */}
        <div className="mt-4 space-y-3">
          <div className="text-[10px] uppercase tracking-wider" style={{ color: PROGRESS_MUTED }}>Filters (optional)</div>
          {filterDefs.map(def => {
            const f = filters[def.key]
            return (
              <div key={def.key} className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] w-16 shrink-0" style={{ color: PROGRESS_MUTED }}>{def.label}</span>
                <select value={f.value} onChange={e => setFilterValue(def.key, e.target.value)} className="rounded-lg px-2 py-1.5 text-xs" style={controlStyle()}>
                  {def.options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
                {f.value && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px]" style={{ color: PROGRESS_MUTED }}>applies to</span>
                    {rows.map((row, i) => {
                      const on = f.appliesTo.includes(row.uid)
                      return (
                        <button
                          key={row.uid}
                          onClick={() => toggleFilterSeries(def.key, row.uid)}
                          className="px-2 py-1 rounded-full text-[10px] font-semibold"
                          style={{
                            background: on ? PROGRESS_TEXT : 'transparent',
                            color: on ? PROGRESS_CARD : PROGRESS_MUTED,
                            border: `1px solid ${on ? PROGRESS_TEXT : PROGRESS_BORDER}`,
                          }}
                        >
                          S{i + 1}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Global time controls — shared across all series. Blank dates = all time. */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Field label="From">
            <input type="date" value={options.from} onChange={e => updateOption('from', e.target.value)} className="w-full rounded-lg px-2 py-2 text-xs outline-none" style={controlStyle()} />
          </Field>
          <Field label="To">
            <input type="date" value={options.to} onChange={e => updateOption('to', e.target.value)} className="w-full rounded-lg px-2 py-2 text-xs outline-none" style={controlStyle()} />
          </Field>
          <Field label="Group">
            <select value={options.group_by} onChange={e => updateOption('group_by', e.target.value)} className="w-full rounded-lg px-2 py-2 text-xs" style={controlStyle()}>
              {GROUP_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </Field>
        </div>

        <div className="mt-4" style={{ width: '100%', height: 240 }}>
          {resource.loading ? (
            <Empty>Loading comparison...</Empty>
          ) : chartData.rows.length ? (
            <ResponsiveContainer>
              <LineChart data={chartData.rows} margin={{ top: 12, right: 4, left: -16, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: PROGRESS_MUTED }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: PROGRESS_MUTED }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background: PROGRESS_CARD, border: `1px solid ${PROGRESS_BORDER}`, borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: PROGRESS_MUTED }} />
                {chartData.lines.map((line, i) => (
                  <Line key={line.key} dataKey={line.key} name={line.label} type="monotone" stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty>Select a series and tap Run.</Empty>
          )}
        </div>
      </Card>
    </div>
  )
}

function mergeCompareSeries(series) {
  const dates = new Map()
  const lines = []
  for (const item of series) {
    const key = item.id
    lines.push({ key, label: item.label })
    for (const point of item.points || []) {
      const row = dates.get(point.date) || { date: point.date }
      row[key] = point.value
      dates.set(point.date, row)
    }
  }
  return { rows: [...dates.values()].sort((a, b) => a.date.localeCompare(b.date)), lines }
}

function metricLabel(metric) {
  if (metric === 'measurement') return 'Measurement'
  return COMPARE_METRICS.find(m => m.key === metric)?.label || metric
}

function sourceOptions(type, exercises, muscles) {
  if (type === 'body_metric') return BODY_SERIES
  if (type === 'muscle') return muscles
  if (type === 'split') return SPLITS.map(split => ({ id: split, name: split }))
  return exercises
}

function compareLabel(row, exercises, muscles) {
  const source = sourceOptions(row.source_type, exercises, muscles).find(item => item.id === row.source_id)
  return `${source?.name || row.source_id} - ${metricLabel(row.metric)}`
}

function cleanOptions(options) {
  return Object.fromEntries(Object.entries(options).filter(([, value]) => value !== ''))
}

function controlStyle() {
  return { background: 'rgba(0,0,0,0.04)', color: PROGRESS_TEXT, border: `1px solid ${PROGRESS_BORDER}` }
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block mb-1 text-[10px] uppercase tracking-wider" style={{ color: PROGRESS_MUTED }}>{label}</span>
      {children}
    </label>
  )
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
