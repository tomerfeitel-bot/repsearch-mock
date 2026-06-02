import { useMemo, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { STYLE3 as P } from '../../../lib/conceptStyles.js'
import { LIFT_SERIES, PR_LIST, BODY_SERIES, MEASUREMENTS, HISTORY_DAYS, SPLIT_COLORS, WEEK_SESSIONS } from '../../../lib/conceptMockData.js'
import { IconTrend, fmtDelta } from './_shared.jsx'

const TABS = ['History', 'Lifts', 'Records', 'Body']

// Ledger · cool dark analytics. Dense, mono numerals, stepped lines. Steel is the
// single accent; the secondary chart series stays achromatic slate.
export default function Style3Progress() {
  const [tab, setTab] = useState('Lifts')
  return (
    <div className="concept-focus min-h-screen pb-28" style={{ background: P.bg, color: P.text, fontFamily: 'Inter, system-ui, sans-serif', '--cf': P.accent }}>
      <header className="sticky top-0 z-20 px-4 pt-4 pb-0" style={{ background: P.bg, borderBottom: `1px solid ${P.border}` }}>
        <h1 className="text-lg font-bold tracking-tight">Progress</h1>
        <nav className="mt-3 flex" role="tablist">
          {TABS.map(t => {
            const on = tab === t
            return (
              <button key={t} role="tab" aria-selected={on} onClick={() => setTab(t)}
                className="px-3 pb-2.5 text-xs font-mono uppercase tracking-wide transition-colors motion-reduce:transition-none"
                style={{ color: on ? P.accent : P.textMuted, borderBottom: `2px solid ${on ? P.accent : 'transparent'}` }}>
                {t}
              </button>
            )
          })}
        </nav>
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

function Frame({ children, title }) {
  return (
    <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${P.border}` }}>
      {title && <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wide" style={{ color: P.textMuted, background: P.surfaceAlt, borderBottom: `1px solid ${P.border}` }}>{title}</div>}
      <div className="p-3.5" style={{ background: P.surface }}>{children}</div>
    </div>
  )
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex">
          {['Push', 'Pull', 'Legs'].map(s => (
            <button key={s} onClick={() => setSplit(s)} aria-pressed={split === s}
              className="h-8 px-3 text-xs font-mono uppercase tracking-wide transition-colors motion-reduce:transition-none"
              style={{ color: split === s ? P.accent : P.textMuted, borderBottom: `2px solid ${split === s ? P.accent : P.border}` }}>{s}</button>
          ))}
        </div>
        <div className="flex rounded-md overflow-hidden" style={{ border: `1px solid ${P.border}` }}>
          {[['topSet', 'TOP'], ['reps', 'REPS']].map(([k, l]) => (
            <button key={k} onClick={() => setMetric(k)} aria-pressed={metric === k}
              className="h-8 px-2.5 text-[11px] font-mono transition-colors motion-reduce:transition-none"
              style={metric === k ? { background: P.accentSoft, color: P.accent } : { color: P.textMuted }}>{l}</button>
          ))}
        </div>
      </div>

      <Frame title={`bench_press · ${split.toLowerCase()}`}>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-2xl font-bold font-mono tabular-nums">{current}<span className="text-sm" style={{ color: P.textMuted }}>{unit}</span></span>
          <span className="inline-flex items-center gap-1 text-sm font-bold font-mono tabular-nums" style={{ color: gain >= 0 ? P.accent : P.negative }}>
            <IconTrend size={15} /> {fmtDelta(gain, unit)}
          </span>
        </div>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <LineChart data={rows} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: P.textMuted }} axisLine={{ stroke: P.border }} tickLine={false} width={42} domain={['dataMin - 4', 'dataMax + 4']} />
              <Tooltip contentStyle={{ background: P.surfaceAlt, border: `1px solid ${P.borderStrong}`, borderRadius: 6, fontSize: 12, color: P.text }} />
              <Line dataKey="value" type="stepAfter" stroke={P.accent} strokeWidth={2} dot={{ r: 2, fill: P.accent }} activeDot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex gap-5 pt-2.5 text-xs font-mono" style={{ borderTop: `1px solid ${P.border}`, color: P.textMuted }}>
          <span>start <b style={{ color: P.text }}>{start}{unit}</b></span>
          <span>now <b style={{ color: P.text }}>{current}{unit}</b></span>
        </div>
      </Frame>
    </div>
  )
}

function History() {
  const lead = new Date(2026, 4, 1).getDay()
  return (
    <div className="space-y-3">
      <Frame title="may · training calendar">
        <div className="grid grid-cols-7 gap-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-mono" style={{ color: P.textMuted }}>{d}</div>
          ))}
          {Array.from({ length: lead }).map((_, i) => <div key={`b${i}`} />)}
          {HISTORY_DAYS.map(d => {
            const c = d.split ? SPLIT_COLORS[d.split] : null
            return (
              <div key={d.day} className="aspect-square rounded-sm flex items-center justify-center text-[10px] font-mono"
                title={d.split ? `${d.split} · day ${d.day}` : `Rest · day ${d.day}`}
                style={{ background: c ? `${c}2e` : P.surfaceAlt, color: c || P.textMuted, border: `1px solid ${c ? `${c}59` : P.border}` }}>
                {d.day}
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 pt-3" style={{ borderTop: `1px solid ${P.border}` }}>
          {Object.entries(SPLIT_COLORS).filter(([k]) => k !== 'Other').map(([k, c]) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-xs font-mono" style={{ color: P.textMuted }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} /> {k.toLowerCase()}
            </span>
          ))}
        </div>
      </Frame>

      <Frame title="sessions / week">
        <div style={{ width: '100%', height: 150 }}>
          <ResponsiveContainer>
            <BarChart data={WEEK_SESSIONS} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
              <Tooltip cursor={{ fill: P.surfaceAlt }} contentStyle={{ background: P.surfaceAlt, border: `1px solid ${P.borderStrong}`, borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="sessions" radius={[2, 2, 0, 0]} fill={P.accent} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Frame>
    </div>
  )
}

function Records() {
  return (
    <Frame title="personal records">
      <div className="space-y-px">
        {PR_LIST.map((pr, i) => {
          const c = SPLIT_COLORS[pr.split] || P.textMuted
          return (
            <div key={pr.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: i ? `1px solid ${P.border}` : 'none' }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{pr.exercise}</div>
                <div className="text-[11px] font-mono" style={{ color: P.textMuted }}>{pr.muscle.toLowerCase()} · {pr.daysAgo}d</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold tabular-nums text-sm">{pr.weight}<span style={{ color: P.textMuted }}>×{pr.reps}</span></div>
                <div className="text-[11px] font-mono" style={{ color: P.accent }}>e1rm {pr.e1rm}</div>
              </div>
            </div>
          )
        })}
      </div>
    </Frame>
  )
}

function Body() {
  const start = BODY_SERIES[0].bw, current = BODY_SERIES[BODY_SERIES.length - 1].bw
  const delta = Math.round((current - start) * 10) / 10
  return (
    <div className="space-y-3">
      <Frame title="bodyweight">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums">{current}</span>
          <span className="text-xs font-mono" style={{ color: P.textMuted }}>kg</span>
          <span className="text-sm font-semibold font-mono" style={{ color: delta <= 0 ? P.accent : P.text }}>{fmtDelta(delta, ' kg')}</span>
        </div>
        <div style={{ width: '100%', height: 120 }} className="mt-2">
          <ResponsiveContainer>
            <LineChart data={BODY_SERIES} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} width={40} domain={['dataMin - 0.6', 'dataMax + 0.6']} />
              <Tooltip contentStyle={{ background: P.surfaceAlt, border: `1px solid ${P.borderStrong}`, borderRadius: 6, fontSize: 12 }} />
              <Line dataKey="bw" type="monotone" stroke={P.chartB} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Frame>

      <Frame title="measurements">
        <div className="space-y-px">
          {MEASUREMENTS.map((m, i) => (
            <div key={m.key} className="flex items-center justify-between py-2 text-sm" style={{ borderTop: i ? `1px solid ${P.border}` : 'none' }}>
              <span style={{ color: P.textMuted }}>{m.key}</span>
              <span className="flex items-baseline gap-2 font-mono tabular-nums">
                <b>{m.current}</b>
                <span className="text-[10px]" style={{ color: P.textMuted }}>cm</span>
                <span className="w-12 text-right font-semibold" style={{ color: m.delta >= 0 ? P.accent : P.negative }}>{fmtDelta(m.delta)}</span>
              </span>
            </div>
          ))}
        </div>
      </Frame>
    </div>
  )
}
