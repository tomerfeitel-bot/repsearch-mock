import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import { Sheet } from '../ui/Sheet.jsx'
import {
  PROGRESS_TEXT, PROGRESS_MUTED, PROGRESS_BORDER, JEWEL, MEASUREMENT_COLORS,
} from '../../lib/progressTheme.js'
import {
  Section, ChartBlock, DataRow, Delta, ChartEmpty, Empty, Skeleton, ErrorState, InlineWarning,
  axisTick, tooltipStyle, gridStroke, PrimaryButton,
} from './ui.jsx'

const MEASUREMENTS = [
  { key: 'arm_cm', label: 'Arms' },
  { key: 'chest_cm', label: 'Chest' },
  { key: 'waist_cm', label: 'Waist' },
  { key: 'thigh_cm', label: 'Thighs' },
  { key: 'calf_cm', label: 'Calves' },
].map(m => ({ ...m, color: MEASUREMENT_COLORS[m.key] }))

const SLEEP = JEWEL.amethyst
const CALORIES = JEWEL.brass
const PROTEIN = JEWEL.moss

export default function BodyTab({ resource, lifestyle, supplements, onLog, onRetry }) {
  const [logOpen, setLogOpen] = useState(false)
  const history = useMemo(() => sortHistory(resource.data?.history || [], 'desc'), [resource.data])
  const ascending = useMemo(() => sortHistory(resource.data?.history || [], 'asc'), [resource.data])

  const bwSeries = useMemo(() => ascending
    .filter(h => h.bodyweight_kg != null)
    .map(h => ({ date: h.date, bw: h.bodyweight_kg })), [ascending])

  const logsAsc = useMemo(() => [...(lifestyle?.data || [])].sort((a, b) => a.date.localeCompare(b.date)), [lifestyle])
  const sleepSeries = useMemo(() => logsAsc.filter(l => l.sleep_duration != null).map(l => ({ date: l.date, sleep: l.sleep_duration })), [logsAsc])
  const caloriesSeries = useMemo(() => logsAsc.filter(l => l.calories != null).map(l => ({ date: l.date, calories: l.calories })), [logsAsc])
  const proteinBwSeries = useMemo(() => {
    const bwPoints = ascending.filter(h => h.bodyweight_kg != null).map(h => ({ date: h.date, bw: h.bodyweight_kg }))
    const bwByDate = new Map(bwPoints.map(p => [p.date, p.bw]))
    const nearestBw = (date) => {
      if (bwByDate.has(date)) return bwByDate.get(date)
      let best = null
      let bestDiff = Infinity
      for (const p of bwPoints) {
        const diff = Math.abs(new Date(`${p.date}T00:00:00`) - new Date(`${date}T00:00:00`))
        if (diff < bestDiff) { bestDiff = diff; best = p.bw }
      }
      return best
    }
    return logsAsc
      .filter(l => l.protein_g != null || bwByDate.has(l.date))
      .map(l => {
        const exactBw = bwByDate.get(l.date) ?? null
        const refBw = l.protein_g != null ? nearestBw(l.date) : exactBw
        return {
          date: l.date,
          protein_g: l.protein_g ?? null,
          bw: exactBw,
          protein_per_kg: l.protein_g != null && refBw ? Number((l.protein_g / refBw).toFixed(2)) : null,
        }
      })
  }, [logsAsc, ascending])

  const parsedSupplements = useMemo(() => parseArray(supplements)
    .map(s => (typeof s === 'string' ? { key: s } : s))
    .filter(s => s && s.key), [supplements])

  const bwCurrent = latestOf(history, 'bodyweight_kg')
  const bwStart = bwSeries[0]
  const bwDelta = bwCurrent && bwStart ? (bwCurrent.bodyweight_kg - bwStart.bw) : null
  const bwStartMonth = bwStart ? new Date(`${bwStart.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short' }) : ''

  const sleepAvg = avg(sleepSeries.map(s => s.sleep))
  const calAvg = avg(caloriesSeries.map(c => c.calories))
  const proteinPerKgAvg = avg(proteinBwSeries.map(p => p.protein_per_kg).filter(v => v != null))

  if (resource.loading && !resource.data) return <Skeleton blocks={[72, 160, 200]} />
  if (resource.error && !resource.data) return <ErrorState message={resource.error} onRetry={onRetry} />

  return (
    <div className="space-y-5">
      {resource.error && <InlineWarning message={resource.error} onRetry={onRetry} />}

      {/* Hero — current bodyweight with its trend delta. */}
      <div className="flex items-end justify-between gap-3">
        {bwCurrent ? (
          <>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold font-mono tabular-nums" style={{ color: PROGRESS_TEXT, fontSize: '2.75rem', lineHeight: 1 }}>{bwCurrent.bodyweight_kg}</span>
                <span className="text-lg font-medium" style={{ color: PROGRESS_MUTED }}>kg</span>
              </div>
              <div className="text-[11px] uppercase tracking-wider mt-2" style={{ color: PROGRESS_MUTED }}>Current bodyweight</div>
            </div>
            {bwDelta != null && (
              <div className="text-right pb-1">
                <Delta value={bwDelta} unit="kg" color={PROGRESS_TEXT} />
                <div className="text-[11px] mt-0.5" style={{ color: PROGRESS_MUTED }}>since {bwStartMonth}</div>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm" style={{ color: PROGRESS_MUTED }}>No bodyweight logged yet.</div>
        )}
      </div>

      {bwSeries.length > 1 && (
        <ChartBlock title="Bodyweight trend" caption={bwDelta != null ? `${bwDelta >= 0 ? 'Up' : 'Down'} ${Math.abs(bwDelta).toFixed(1)}kg since ${bwStartMonth}.` : 'Your bodyweight over time.'} height={140}>
          <ResponsiveContainer>
            <LineChart data={bwSeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: PROGRESS_MUTED }} />
              <Line dataKey="bw" name="Bodyweight (kg)" type="monotone" stroke={PROGRESS_TEXT} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartBlock>
      )}

      {sleepSeries.length >= 1 ? (
        <ChartBlock title="Sleep duration" caption={sleepAvg != null ? `Averaging ${sleepAvg.toFixed(1)}h a night across ${sleepSeries.length} logs.` : 'Hours slept per night.'} height={140}>
          <ResponsiveContainer>
            <LineChart data={sleepSeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: PROGRESS_MUTED }} />
              <Line dataKey="sleep" name="Sleep (h)" type="monotone" stroke={SLEEP.ink} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartBlock>
      ) : (
        <ChartEmpty title="Sleep duration" message="No sleep duration logs recorded yet. Data will appear here once entered in your Check-in tab." />
      )}

      {caloriesSeries.length >= 1 ? (
        <ChartBlock title="Calorie intake" caption={calAvg != null ? `Averaging ${Math.round(calAvg).toLocaleString()} kcal a day across ${caloriesSeries.length} logs.` : 'Calories logged per day.'} height={140}>
          <ResponsiveContainer>
            <LineChart data={caloriesSeries} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} width={48} domain={['dataMin - 100', 'dataMax + 100']} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: PROGRESS_MUTED }} />
              <Line dataKey="calories" name="Calories" type="monotone" stroke={CALORIES.ink} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartBlock>
      ) : (
        <ChartEmpty title="Calorie intake" message="No calorie logs recorded yet. Data will appear here once entered in your Check-in tab." />
      )}

      {proteinBwSeries.length >= 1 ? (
        <ChartBlock title="Protein & bodyweight" caption={proteinPerKgAvg != null ? `Averaging ${proteinPerKgAvg.toFixed(2)}g protein per kg of bodyweight.` : 'Protein intake tracked against bodyweight.'} height={160}>
          <ResponsiveContainer>
            <LineChart data={proteinBwSeries} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis yAxisId="protein" tick={axisTick} axisLine={false} tickLine={false} width={36} domain={[0, 'dataMax + 20']} />
              <YAxis yAxisId="bw" orientation="right" tick={axisTick} axisLine={false} tickLine={false} width={36} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip content={<ProteinTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="protein" dataKey="protein_g" name="Protein (g)" type="monotone" stroke={PROTEIN.ink} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              <Line yAxisId="bw" dataKey="bw" name="Bodyweight (kg)" type="monotone" stroke={PROGRESS_TEXT} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartBlock>
      ) : (
        <ChartEmpty title="Protein & bodyweight" message="No protein or bodyweight logs recorded yet. Data will appear here once entered in your Check-in tab." />
      )}

      {/* Measurements — Data Rows, color-coded per body part, with change since first log. */}
      <Section title="Measurements" caption="Latest reading and total change since your first log." action={<PrimaryButton onClick={() => setLogOpen(true)} className="px-4 py-2">Log</PrimaryButton>}>
        <div>
          {MEASUREMENTS.map(m => {
            const latest = latestOf(history, m.key)
            const d = deltaOf(ascending, m.key)
            return (
              <DataRow
                key={m.key}
                dot={m.color.ink}
                label={m.label}
                value={latest?.[m.key] != null ? `${latest[m.key]}cm` : '—'}
                trailing={d != null ? <span className="ml-3 shrink-0 w-12 text-right"><Delta value={d} color={PROGRESS_MUTED} /></span> : <span className="ml-3 w-12" />}
              />
            )
          })}
        </div>
      </Section>

      {parsedSupplements.length > 0 && (
        <Section title="Current supplements">
          <div>
            {parsedSupplements.map(s => {
              const detail = [s.amount != null && `${s.amount}${s.unit || ''}`, s.frequency && human(s.frequency)].filter(Boolean).join(' · ')
              return <DataRow key={s.key} label={human(s.key)} value={detail || undefined} valueColor={PROGRESS_MUTED} />
            })}
          </div>
        </Section>
      )}

      <LogMeasurementSheet open={logOpen} onClose={() => setLogOpen(false)} onSave={async (payload) => { await onLog(payload); setLogOpen(false) }} />
    </div>
  )
}

function ProteinTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload || {}
  return (
    <div style={{ ...tooltipStyle, padding: '6px 10px' }}>
      <div style={{ color: PROGRESS_MUTED, marginBottom: 2 }}>{label}</div>
      {row.protein_g != null && (
        <div>Protein: {row.protein_g}g{row.protein_per_kg != null ? ` · ${row.protein_per_kg}g/kg` : ''}</div>
      )}
      {row.bw != null && <div>Bodyweight: {row.bw}kg</div>}
    </div>
  )
}

function human(value) {
  return String(value).replaceAll('_', ' ')
}

function avg(values) {
  if (!values.length) return null
  return values.reduce((s, v) => s + v, 0) / values.length
}

function parseArray(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw !== 'string' || !raw) return []
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a : [] } catch { return [] }
}

function latestOf(history, key) {
  return history.find(h => h[key] != null)
}

function deltaOf(ascending, key) {
  const values = ascending.filter(h => h[key] != null)
  if (values.length < 2) return null
  return values[values.length - 1][key] - values[0][key]
}

function sortHistory(history, direction) {
  const sorted = [...history].sort((a, b) => `${a.date}|${a.created_at || ''}`.localeCompare(`${b.date}|${b.created_at || ''}`))
  return direction === 'desc' ? sorted.reverse() : sorted
}

function LogMeasurementSheet({ open, onClose, onSave }) {
  const [vals, setVals] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) {
    setError('')
    setVals(prev => ({ ...prev, [k]: v }))
  }

  async function handleSave() {
    const payload = {}
    let sawInvalid = false
    for (const k of ['bodyweight_kg', ...MEASUREMENTS.map(m => m.key)]) {
      const raw = vals[k]
      if (raw === '' || raw == null) continue
      const value = Number(raw)
      if (!Number.isFinite(value) || value <= 0) {
        sawInvalid = true
        continue
      }
      payload[k] = value
    }
    if (sawInvalid) {
      setError('Measurements must be greater than 0.')
      return
    }
    if (Object.keys(payload).length === 0) {
      setError('Enter at least one measurement before saving.')
      return
    }
    setSaving(true)
    await onSave(payload)
    setSaving(false)
    setVals({})
    setError('')
  }

  return (
    <Sheet open={open} onClose={onClose} title="Log measurements">
      <div className="p-4 space-y-3">
        <Row label="Bodyweight (kg)" value={vals.bodyweight_kg ?? ''} onChange={v => set('bodyweight_kg', v)} />
        {MEASUREMENTS.map(m => (
          <Row key={m.key} label={`${m.label} (cm)`} value={vals[m.key] ?? ''} onChange={v => set(m.key, v)} />
        ))}
        {error && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'rgba(211,98,58,0.14)', color: JEWEL.rust.ink }}>{error}</div>}
        <PrimaryButton onClick={handleSave} disabled={saving} className="w-full py-3">{saving ? 'Saving…' : 'Save'}</PrimaryButton>
      </div>
    </Sheet>
  )
}

function Row({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm flex-1" style={{ color: PROGRESS_MUTED }}>{label}</label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-28 rounded-lg px-3 py-2 font-mono tabular-nums text-right outline-none"
        style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${PROGRESS_BORDER}`, color: PROGRESS_TEXT }}
      />
    </div>
  )
}
