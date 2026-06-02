import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Sheet } from '../ui/Sheet.jsx'
import { PROGRESS_CARD, PROGRESS_BORDER, PROGRESS_TEXT, PROGRESS_MUTED } from '../../lib/progressTheme.js'

const MEASUREMENTS = [
  { key: 'arm_cm', label: 'Arms', color: '#a855f7' },
  { key: 'chest_cm', label: 'Chest', color: '#ef4444' },
  { key: 'waist_cm', label: 'Waist', color: '#fb923c' },
  { key: 'thigh_cm', label: 'Thighs', color: '#22c55e' },
  { key: 'calf_cm', label: 'Calves', color: '#3b82f6' },
]

export default function BodyTab({ resource, lifestyle, supplements, onLog, onRetry }) {
  const [logOpen, setLogOpen] = useState(false)
  const history = useMemo(() => sortHistory(resource.data?.history || [], 'desc'), [resource.data])
  const ascending = useMemo(() => sortHistory(resource.data?.history || [], 'asc'), [resource.data])

  const bwSeries = useMemo(() => ascending
    .filter(h => h.bodyweight_kg != null)
    .map(h => ({ date: h.date, bw: h.bodyweight_kg })), [ascending])

  // Lifestyle logs come newest-first from the API; reverse for time-series charts.
  const logsAsc = useMemo(() => [...(lifestyle?.data || [])].sort((a, b) => a.date.localeCompare(b.date)), [lifestyle])
  const sleepSeries = useMemo(() => logsAsc.filter(l => l.sleep_duration != null).map(l => ({ date: l.date, sleep: l.sleep_duration })), [logsAsc])
  const caloriesSeries = useMemo(() => logsAsc.filter(l => l.calories != null).map(l => ({ date: l.date, calories: l.calories })), [logsAsc])
  const proteinBwSeries = useMemo(() => {
    // Bodyweight entries sorted ascending by date, for nearest-date lookup.
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

  if (resource.loading && !resource.data) return <Skeleton />
  if (resource.error && !resource.data) return <ErrorState message={resource.error} onRetry={onRetry} />

  return (
    <div className="space-y-4">
      {resource.error && <InlineWarning message={resource.error} onRetry={onRetry} />}

      <Card>
        {bwCurrent ? (
          <div className="flex items-baseline justify-between">
            <div>
              <div className="font-serif font-bold" style={{ color: PROGRESS_TEXT, fontSize: '2.5rem', lineHeight: 1 }}>{bwCurrent.bodyweight_kg} <span className="text-lg font-sans">kg</span></div>
              <div className="text-xs uppercase tracking-wider mt-1" style={{ color: PROGRESS_MUTED }}>Bodyweight</div>
            </div>
            {bwDelta != null && (
              <div className="text-right">
                <div className="text-sm font-mono font-semibold" style={{ color: bwDelta >= 0 ? '#a86c1f' : '#5a7a90' }}>
                  {bwDelta >= 0 ? '+' : ''}{bwDelta.toFixed(1)}kg
                </div>
                <div className="text-xs" style={{ color: PROGRESS_MUTED }}>since {bwStartMonth}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm" style={{ color: PROGRESS_MUTED }}>No bodyweight logged yet.</div>
        )}
      </Card>

      {bwSeries.length > 1 && (
        <Card>
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: PROGRESS_MUTED }}>Bodyweight trend</div>
          <div style={{ width: '100%', height: 140 }}>
            <ResponsiveContainer>
              <LineChart data={bwSeries} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: PROGRESS_MUTED }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: PROGRESS_MUTED }} axisLine={false} tickLine={false} width={40} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip contentStyle={{ background: PROGRESS_CARD, border: `1px solid ${PROGRESS_BORDER}`, borderRadius: 8, fontSize: 12 }} />
                <Line dataKey="bw" type="monotone" stroke={PROGRESS_TEXT} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {sleepSeries.length >= 1 ? (
        <Card>
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: PROGRESS_MUTED }}>Sleep duration</div>
          <div style={{ width: '100%', height: 140 }}>
            <ResponsiveContainer>
              <LineChart data={sleepSeries} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: PROGRESS_MUTED }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: PROGRESS_MUTED }} axisLine={false} tickLine={false} width={40} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip contentStyle={{ background: PROGRESS_CARD, border: `1px solid ${PROGRESS_BORDER}`, borderRadius: 8, fontSize: 12 }} />
                <Line dataKey="sleep" name="Sleep (h)" type="monotone" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : (
        <ChartEmpty title="Sleep duration" message="No sleep duration logs recorded yet. Data will appear here once entered in your Check-in tab." />
      )}

      {caloriesSeries.length >= 1 ? (
        <Card>
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: PROGRESS_MUTED }}>Calorie intake</div>
          <div style={{ width: '100%', height: 140 }}>
            <ResponsiveContainer>
              <LineChart data={caloriesSeries} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: PROGRESS_MUTED }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: PROGRESS_MUTED }} axisLine={false} tickLine={false} width={48} domain={['dataMin - 100', 'dataMax + 100']} />
                <Tooltip contentStyle={{ background: PROGRESS_CARD, border: `1px solid ${PROGRESS_BORDER}`, borderRadius: 8, fontSize: 12 }} />
                <Line dataKey="calories" name="Calories" type="monotone" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : (
        <ChartEmpty title="Calorie intake" message="No calorie logs recorded yet. Data will appear here once entered in your Check-in tab." />
      )}

      {proteinBwSeries.length >= 1 ? (
        <Card>
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: PROGRESS_MUTED }}>Protein &amp; bodyweight</div>
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer>
              <LineChart data={proteinBwSeries} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: PROGRESS_MUTED }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="protein" tick={{ fontSize: 10, fill: PROGRESS_MUTED }} axisLine={false} tickLine={false} width={36} domain={[0, 'dataMax + 20']} />
                <YAxis yAxisId="bw" orientation="right" tick={{ fontSize: 10, fill: PROGRESS_MUTED }} axisLine={false} tickLine={false} width={36} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip content={<ProteinTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="protein" dataKey="protein_g" name="Protein (g)" type="monotone" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line yAxisId="bw" dataKey="bw" name="Bodyweight (kg)" type="monotone" stroke={PROGRESS_TEXT} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : (
        <ChartEmpty title="Protein & bodyweight" message="No protein or bodyweight logs recorded yet. Data will appear here once entered in your Check-in tab." />
      )}

      {parsedSupplements.length > 0 && (
        <Card>
          <div className="text-xs uppercase tracking-wider mb-3" style={{ color: PROGRESS_MUTED }}>Current supplements</div>
          <div className="space-y-1.5">
            {parsedSupplements.map(s => {
              const detail = [s.amount != null && `${s.amount}${s.unit || ''}`, s.frequency && human(s.frequency)].filter(Boolean).join(' · ')
              return (
                <div key={s.key} className="flex items-center justify-between text-sm">
                  <span style={{ color: PROGRESS_TEXT }}>{human(s.key)}</span>
                  {detail && <span className="text-xs font-mono" style={{ color: PROGRESS_MUTED }}>{detail}</span>}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Card>
        <div className="text-xs uppercase tracking-wider mb-3" style={{ color: PROGRESS_MUTED }}>Measurements</div>
        <div className="space-y-2">
          {MEASUREMENTS.map(m => {
            const latest = latestOf(history, m.key)
            const d = deltaOf(ascending, m.key)
            return (
              <div key={m.key} className="flex items-center justify-between py-2 pl-3 rounded-lg" style={{ borderLeft: `3px solid ${m.color}`, background: 'rgba(0,0,0,0.02)' }}>
                <div className="font-medium text-sm" style={{ color: PROGRESS_TEXT }}>{m.label}</div>
                <div className="flex items-center gap-3">
                  <div className="font-mono tabular-nums text-sm" style={{ color: PROGRESS_TEXT }}>{latest?.[m.key] != null ? `${latest[m.key]}cm` : '-'}</div>
                  {d != null && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: d >= 0 ? 'rgba(168,108,31,0.15)' : 'rgba(90,122,144,0.15)', color: d >= 0 ? '#a86c1f' : '#5a7a90' }}>
                      {d >= 0 ? '+' : ''}{d.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <button onClick={() => setLogOpen(true)} className="w-full mt-3 py-2.5 rounded-xl text-sm font-medium" style={{ background: PROGRESS_TEXT, color: PROGRESS_CARD }}>
          Log new measurement
        </button>
      </Card>

      <LogMeasurementSheet open={logOpen} onClose={() => setLogOpen(false)} onSave={async (payload) => { await onLog(payload); setLogOpen(false) }} />
    </div>
  )
}

function ProteinTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload || {}
  return (
    <div style={{ background: PROGRESS_CARD, border: `1px solid ${PROGRESS_BORDER}`, borderRadius: 8, fontSize: 12, padding: '6px 10px', color: PROGRESS_TEXT }}>
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

function Card({ children }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: PROGRESS_CARD, border: `1px solid ${PROGRESS_BORDER}` }}>
      {children}
    </div>
  )
}

function ChartEmpty({ title, message }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wider mb-3" style={{ color: PROGRESS_MUTED }}>{title}</div>
      <div className="rounded-xl py-10 px-4 text-center text-sm backdrop-blur" style={{ background: 'rgba(0,0,0,0.04)', border: `1px dashed ${PROGRESS_BORDER}`, color: PROGRESS_MUTED }}>
        {message}
      </div>
    </Card>
  )
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
        {error && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'rgba(168,50,50,0.12)', color: '#fca5a5' }}>{error}</div>}
        <button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </Sheet>
  )
}

function Row({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-gray-300 flex-1">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-28 bg-gray-800 border border-gray-700 focus:border-indigo-600 rounded-lg px-3 py-2 text-white font-mono tabular-nums text-right outline-none"
      />
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
      <div className="h-24 rounded-2xl animate-pulse" style={{ background: PROGRESS_CARD }} />
      <div className="h-40 rounded-2xl animate-pulse" style={{ background: PROGRESS_CARD }} />
      <div className="h-64 rounded-2xl animate-pulse" style={{ background: PROGRESS_CARD }} />
    </div>
  )
}
