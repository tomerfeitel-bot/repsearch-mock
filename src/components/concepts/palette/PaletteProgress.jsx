import { useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { LIFT_SERIES, PR_LIST, BODY_SERIES, MEASUREMENTS, HISTORY_DAYS, SPLIT_COLORS, WEEK_SESSIONS } from '../../../lib/conceptMockData.js'
import { IconTrend, fmtDelta } from '../cohesive/_shared.jsx'

const TABS = ['Lifts', 'History', 'Records', 'Body']

export default function PaletteProgress({ P }) {
  const [tab, setTab] = useState('Lifts')
  const r = P.radius
  const mono = P.density === 'compact' || P.tags.includes('mono')
  const font = mono ? 'font-mono' : ''

  return (
    <div className="min-h-screen pb-28" style={{ background: P.bg, color: P.text }}>
      <header className="sticky top-0 z-20 px-4 pt-4 pb-2" style={{ background: P.bg, borderBottom: `1px solid ${P.border}` }}>
        <h1 className={`text-2xl font-bold tracking-tight ${font}`}>Progress</h1>
        <div className="mt-3 flex gap-1 p-1" style={{ background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: r + 4 }}>
          {TABS.map(t => {
            const on = tab === t
            return (
              <button key={t} onClick={() => setTab(t)} aria-pressed={on}
                className="flex-1 h-9 text-sm font-semibold transition-colors"
                style={on
                  ? { background: P.mode === 'light' ? P.surface : P.surface, color: P.text, borderRadius: r, boxShadow: P.mode === 'light' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', border: P.mode === 'light' ? `1px solid ${P.border}` : 'none' }
                  : { color: P.textMuted, borderRadius: r }}>
                {t}
              </button>
            )
          })}
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3">
        {tab === 'Lifts' && <Lifts P={P} r={r} font={font} />}
        {tab === 'History' && <History P={P} r={r} />}
        {tab === 'Records' && <Records P={P} r={r} />}
        {tab === 'Body' && <Body P={P} r={r} font={font} />}
      </div>
    </div>
  )
}

function Card({ P, r, children, className = '' }) {
  const isQuartz = P.mode === 'light' && P.tags.includes('modern')
  return (
    <div className={`p-4 ${className}`} style={{
      background: P.surface,
      border: isQuartz ? 'none' : `1px solid ${P.border}`,
      borderRadius: r,
      boxShadow: isQuartz ? '0 2px 10px rgba(109,40,217,0.08),0 1px 2px rgba(0,0,0,0.04)' : 'none',
    }}>
      {children}
    </div>
  )
}

function SectionLabel({ P, children }) {
  const isGrove = P.tags.includes('earthy')
  return (
    <div className={`text-xs font-semibold mb-2 ${isGrove ? 'uppercase tracking-widest' : 'uppercase tracking-wide'}`}
      style={{ color: P.textMuted }}>{children}</div>
  )
}

function Lifts({ P, r, font }) {
  const [split, setSplit] = useState('Push')
  const [metric, setMetric] = useState('topSet')
  const rows = LIFT_SERIES.map(d => ({ date: d.date, value: metric === 'reps' ? d.reps : d.topSet }))
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
              className={`h-9 px-4 text-sm font-semibold whitespace-nowrap transition-colors ${font}`}
              style={{
                borderRadius: r * 2,
                background: on ? P.accent : P.surface,
                color: on ? P.accentInk : P.textMuted,
                border: on ? 'none' : `1px solid ${P.border}`,
              }}>
              {s}
            </button>
          )
        })}
      </div>

      <Card P={P} r={r}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={`text-sm font-semibold ${font}`}>Bench Press</div>
            <div className="text-xs" style={{ color: P.textMuted }}>{split} · top working set</div>
          </div>
          <div className="flex gap-0.5 p-0.5" style={{ background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: r }}>
            {[['topSet', 'Top set'], ['reps', 'Reps']].map(([k, l]) => (
              <button key={k} onClick={() => setMetric(k)} aria-pressed={metric === k}
                className={`h-7 px-2.5 text-xs font-semibold transition-colors ${font}`}
                style={{ borderRadius: r - 2, background: metric === k ? P.accent : 'transparent', color: metric === k ? P.accentInk : P.textMuted }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ width: '100%', height: 200 }} className="mt-3">
          <ResponsiveContainer>
            <LineChart data={rows} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} width={42} domain={['dataMin - 4', 'dataMax + 4']} />
              <Tooltip contentStyle={{ background: P.surface, border: `1px solid ${P.borderStrong}`, borderRadius: r, fontSize: 12, color: P.text }} />
              <Line dataKey="value" type="monotone" stroke={P.chartA} strokeWidth={2.5} dot={{ r: 2.5, fill: P.chartA }} activeDot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 flex items-center gap-4 pt-3 text-sm" style={{ borderTop: `1px solid ${P.border}` }}>
          <span style={{ color: P.textMuted }}>Start <b className={`font-mono tabular-nums ${font}`} style={{ color: P.text }}>{start}{unit}</b></span>
          <span style={{ color: P.textMuted }}>Now <b className={`font-mono tabular-nums ${font}`} style={{ color: P.text }}>{current}{unit}</b></span>
          <span className={`ml-auto inline-flex items-center gap-1 font-semibold font-mono tabular-nums ${font}`}
            style={{ color: gain >= 0 ? P.positive : P.negative }}>
            <IconTrend size={15} /> {fmtDelta(gain, unit)}
          </span>
        </div>
      </Card>
    </div>
  )
}

function History({ P, r }) {
  const lead = new Date(2026, 4, 1).getDay()
  return (
    <div className="space-y-3">
      <Card P={P} r={r}>
        <SectionLabel P={P}>May · training calendar</SectionLabel>
        <div className="grid grid-cols-7 gap-1.5">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-semibold" style={{ color: P.textMuted }}>{d}</div>
          ))}
          {Array.from({ length: lead }).map((_, i) => <div key={`b${i}`} />)}
          {HISTORY_DAYS.map(d => {
            const c = d.split ? SPLIT_COLORS[d.split] : null
            return (
              <div key={d.day} className="aspect-square flex items-center justify-center text-[10px] font-mono"
                style={{ background: c ? `${c}26` : P.surfaceAlt, color: c || P.textMuted, border: c ? `1px solid ${c}66` : `1px solid ${P.border}`, borderRadius: Math.min(r, 8) }}>
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
      <Card P={P} r={r}>
        <SectionLabel P={P}>Sessions per week</SectionLabel>
        <div style={{ width: '100%', height: 140 }}>
          <ResponsiveContainer>
            <BarChart data={WEEK_SESSIONS} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
              <Tooltip cursor={{ fill: P.surfaceAlt }} contentStyle={{ background: P.surface, border: `1px solid ${P.borderStrong}`, borderRadius: r, fontSize: 12 }} />
              <Bar dataKey="sessions" radius={[4, 4, 0, 0]} fill={P.chartA} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

function Records({ P, r }) {
  return (
    <div className="space-y-2.5">
      <SectionLabel P={P}>Personal records</SectionLabel>
      {PR_LIST.map(pr => {
        const c = SPLIT_COLORS[pr.split] || P.textMuted
        return (
          <div key={pr.id} className="flex items-center gap-3 py-3 px-3.5"
            style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: r }}>
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

function Body({ P, r, font }) {
  const start = BODY_SERIES[0].bw, current = BODY_SERIES[BODY_SERIES.length - 1].bw
  const delta = Math.round((current - start) * 10) / 10
  return (
    <div className="space-y-3">
      <Card P={P} r={r}>
        <div className="flex items-end justify-between">
          <div>
            <SectionLabel P={P}>Bodyweight</SectionLabel>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold font-mono tabular-nums ${font}`}>{current}</span>
              <span className="text-sm" style={{ color: P.textMuted }}>kg</span>
              <span className={`text-sm font-semibold font-mono ${font}`} style={{ color: delta <= 0 ? P.positive : P.text }}>{fmtDelta(delta, ' kg')}</span>
            </div>
          </div>
        </div>
        <div style={{ width: '100%', height: 130 }} className="mt-2">
          <ResponsiveContainer>
            <LineChart data={BODY_SERIES} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} width={40} domain={['dataMin - 0.6', 'dataMax + 0.6']} />
              <Tooltip contentStyle={{ background: P.surface, border: `1px solid ${P.borderStrong}`, borderRadius: r, fontSize: 12 }} />
              <Line dataKey="bw" type="monotone" stroke={P.chartB} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div>
        <SectionLabel P={P}>Measurements</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5">
          {MEASUREMENTS.map(m => (
            <div key={m.key} className="p-3" style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: r }}>
              <div className="text-xs" style={{ color: P.textMuted }}>{m.key}</div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className={`text-lg font-bold font-mono tabular-nums ${font}`}>{m.current}</span>
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
