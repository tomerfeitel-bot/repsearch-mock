import { useMemo, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { STYLE1 as P } from '../../../lib/conceptStyles.js'
import { LIFT_SERIES, PR_LIST, BODY_SERIES, MEASUREMENTS, HISTORY_DAYS, SPLIT_COLORS, WEEK_SESSIONS } from '../../../lib/conceptMockData.js'
import { IconTrend, fmtDelta } from './_shared.jsx'

const TABS = ['History', 'Lifts', 'Records', 'Body']

// Clinic · light analytics. One teal accent on the active tab, the live figure,
// and the chart's primary line. Greens carry chart series only.
export default function Style1Progress() {
  const [tab, setTab] = useState('Lifts')
  return (
    <div className="concept-focus min-h-screen pb-28" style={{ background: P.bg, color: P.text, fontFamily: 'Inter, system-ui, sans-serif', '--cf': P.accent }}>
      <header className="sticky top-0 z-20 px-4 pt-4 pb-2" style={{ background: P.bg, borderBottom: `1px solid ${P.border}` }}>
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        <div className="mt-3 flex gap-1 p-1 rounded-xl" style={{ background: P.surfaceAlt, border: `1px solid ${P.border}` }}>
          {TABS.map(t => {
            const on = tab === t
            return (
              <button key={t} onClick={() => setTab(t)} aria-pressed={on}
                className="flex-1 h-9 rounded-lg text-sm font-semibold transition-colors motion-reduce:transition-none"
                style={on ? { background: P.surface, color: P.text, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' } : { color: P.textMuted }}>
                {t}
              </button>
            )
          })}
        </div>
      </header>

      <div className="px-4 pt-4">
        {tab === 'History' && <History />}
        {tab === 'Lifts' && <Lifts />}
        {tab === 'Records' && <Records />}
        {tab === 'Body' && <Body />}
      </div>
    </div>
  )
}

function Card({ children, className = '' }) {
  return <div className={`rounded-2xl p-4 ${className}`} style={{ background: P.surface, border: `1px solid ${P.border}` }}>{children}</div>
}
function SectionLabel({ children }) {
  return <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: P.textMuted }}>{children}</div>
}

function Lifts() {
  const [split, setSplit] = useState('Push')
  const [metric, setMetric] = useState('topSet')
  const rows = useMemo(() => LIFT_SERIES.map(d => ({ date: d.date, value: metric === 'reps' ? d.reps : d.topSet })), [metric])
  const start = rows[0].value, current = rows[rows.length - 1].value
  const gain = Math.round((current - start) * 10) / 10
  const unit = metric === 'reps' ? '' : ' kg'

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {['Push', 'Pull', 'Legs'].map(s => {
          const on = split === s
          return (
            <button key={s} onClick={() => setSplit(s)} aria-pressed={on}
              className="h-9 px-4 rounded-full text-sm font-semibold whitespace-nowrap transition-colors motion-reduce:transition-none"
              style={on ? { background: P.text, color: P.surface } : { background: P.surface, color: P.textMuted, border: `1px solid ${P.border}` }}>
              {s}
            </button>
          )
        })}
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Bench Press</div>
            <div className="text-xs" style={{ color: P.textMuted }}>{split} · top working set</div>
          </div>
          <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: P.surfaceAlt, border: `1px solid ${P.border}` }}>
            {[['topSet', 'Top set'], ['reps', 'Reps']].map(([k, l]) => (
              <button key={k} onClick={() => setMetric(k)} aria-pressed={metric === k}
                className="h-7 px-2.5 rounded-md text-xs font-semibold transition-colors motion-reduce:transition-none"
                style={metric === k ? { background: P.accent, color: P.accentInk } : { color: P.textMuted }}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ width: '100%', height: 210 }} className="mt-3">
          <ResponsiveContainer>
            <LineChart data={rows} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} width={42} domain={['dataMin - 4', 'dataMax + 4']} />
              <Tooltip contentStyle={{ background: P.surface, border: `1px solid ${P.borderStrong}`, borderRadius: 10, fontSize: 12, color: P.text }} />
              <Line dataKey="value" type="monotone" stroke={P.chartA} strokeWidth={2.5} dot={{ r: 2.5, fill: P.chartA }} activeDot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Summary as an inline strip, not a stat-hero block */}
        <div className="mt-2 flex items-center gap-4 pt-3 text-sm" style={{ borderTop: `1px solid ${P.border}` }}>
          <span style={{ color: P.textMuted }}>Start <b className="font-mono tabular-nums" style={{ color: P.text }}>{start}{unit}</b></span>
          <span style={{ color: P.textMuted }}>Now <b className="font-mono tabular-nums" style={{ color: P.text }}>{current}{unit}</b></span>
          <span className="ml-auto inline-flex items-center gap-1 font-semibold font-mono tabular-nums"
            style={{ color: gain >= 0 ? P.positive : P.negative }}>
            <IconTrend size={15} /> {fmtDelta(gain, unit)}
          </span>
        </div>
      </Card>
    </div>
  )
}

function History() {
  const lead = new Date(2026, 4, 1).getDay() // blank cells before day 1
  return (
    <div className="space-y-3">
      <Card>
        <SectionLabel>May · training calendar</SectionLabel>
        <div className="grid grid-cols-7 gap-1.5">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-semibold" style={{ color: P.textMuted }}>{d}</div>
          ))}
          {Array.from({ length: lead }).map((_, i) => <div key={`b${i}`} />)}
          {HISTORY_DAYS.map(d => {
            const c = d.split ? SPLIT_COLORS[d.split] : null
            return (
              <div key={d.day} className="aspect-square rounded-md flex items-center justify-center text-[10px] font-mono"
                title={d.split ? `${d.split} · day ${d.day}` : `Rest · day ${d.day}`}
                style={{ background: c ? `${c}26` : P.surfaceAlt, color: c || P.textMuted, border: c ? `1px solid ${c}66` : `1px solid ${P.border}` }}>
                {d.day}
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 pt-3" style={{ borderTop: `1px solid ${P.border}` }}>
          {Object.entries(SPLIT_COLORS).filter(([k]) => k !== 'Other').map(([k, c]) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-xs" style={{ color: P.textMuted }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} /> {k}
            </span>
          ))}
        </div>
      </Card>

      <Card>
        <SectionLabel>Sessions per week</SectionLabel>
        <div style={{ width: '100%', height: 150 }}>
          <ResponsiveContainer>
            <BarChart data={WEEK_SESSIONS} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
              <Tooltip cursor={{ fill: P.surfaceAlt }} contentStyle={{ background: P.surface, border: `1px solid ${P.borderStrong}`, borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="sessions" radius={[4, 4, 0, 0]} fill={P.chartA} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

function Records() {
  return (
    <div className="space-y-2.5">
      <SectionLabel>Personal records</SectionLabel>
      {PR_LIST.map(pr => {
        const c = SPLIT_COLORS[pr.split] || P.textMuted
        return (
          <div key={pr.id} className="rounded-2xl p-3.5 flex items-center gap-3" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c }} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{pr.exercise}</div>
              <div className="text-xs" style={{ color: P.textMuted }}>{pr.muscle} · {pr.daysAgo}d ago</div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold tabular-nums">{pr.weight}<span className="text-xs" style={{ color: P.textMuted }}>kg × {pr.reps}</span></div>
              <div className="text-[11px] font-mono" style={{ color: P.textMuted }}>e1RM {pr.e1rm}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Body() {
  const start = BODY_SERIES[0].bw, current = BODY_SERIES[BODY_SERIES.length - 1].bw
  const delta = Math.round((current - start) * 10) / 10
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-end justify-between">
          <div>
            <SectionLabel>Bodyweight</SectionLabel>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono tabular-nums">{current}</span>
              <span className="text-sm" style={{ color: P.textMuted }}>kg</span>
              <span className="text-sm font-semibold font-mono" style={{ color: delta <= 0 ? P.positive : P.text }}>{fmtDelta(delta, ' kg')}</span>
            </div>
          </div>
        </div>
        <div style={{ width: '100%', height: 130 }} className="mt-2">
          <ResponsiveContainer>
            <LineChart data={BODY_SERIES} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} width={40} domain={['dataMin - 0.6', 'dataMax + 0.6']} />
              <Tooltip contentStyle={{ background: P.surface, border: `1px solid ${P.borderStrong}`, borderRadius: 10, fontSize: 12 }} />
              <Line dataKey="bw" type="monotone" stroke={P.chartB} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div>
        <SectionLabel>Measurements</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5">
          {MEASUREMENTS.map(m => (
            <div key={m.key} className="rounded-2xl p-3" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
              <div className="text-xs" style={{ color: P.textMuted }}>{m.key}</div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-lg font-bold font-mono tabular-nums">{m.current}</span>
                <span className="text-[10px]" style={{ color: P.textMuted }}>cm</span>
                <span className="ml-auto text-xs font-semibold font-mono" style={{ color: m.delta >= 0 ? P.positive : P.negative }}>{fmtDelta(m.delta)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
