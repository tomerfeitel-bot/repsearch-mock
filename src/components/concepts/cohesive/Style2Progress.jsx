import { useMemo, useState } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { STYLE2 as P } from '../../../lib/conceptStyles.js'
import { LIFT_SERIES, PR_LIST, BODY_SERIES, MEASUREMENTS, HISTORY_DAYS, SPLIT_COLORS, WEEK_SESSIONS } from '../../../lib/conceptMockData.js'
import { IconTrend, fmtDelta } from './_shared.jsx'

const TABS = ['History', 'Lifts', 'Records', 'Body']

// Terrarium · warm dark analytics. Underline tabs, gold area fills. Inca Gold is
// the single accent; sage carries the secondary chart series only.
export default function Style2Progress() {
  const [tab, setTab] = useState('Lifts')
  return (
    <div className="concept-focus min-h-screen pb-28" style={{ background: P.bg, color: P.text, fontFamily: 'Inter, system-ui, sans-serif', '--cf': P.accent }}>
      <header className="sticky top-0 z-20 px-4 pt-4" style={{ background: P.bg, borderBottom: `1px solid ${P.border}` }}>
        <h1 className="text-xl font-bold tracking-tight">Progress</h1>
        <nav className="mt-3 flex gap-5" role="tablist">
          {TABS.map(t => {
            const on = tab === t
            return (
              <button key={t} role="tab" aria-selected={on} onClick={() => setTab(t)}
                className="relative pb-2.5 text-sm font-semibold transition-colors motion-reduce:transition-none"
                style={{ color: on ? P.text : P.textMuted }}>
                {t}
                {on && <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full" style={{ background: P.accent }} />}
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

function Panel({ children }) {
  return <div className="rounded-2xl p-4" style={{ background: P.surface, border: `1px solid ${P.border}` }}>{children}</div>
}
function Label({ children }) {
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {['Push', 'Pull', 'Legs'].map(s => (
            <button key={s} onClick={() => setSplit(s)} aria-pressed={split === s}
              className="h-8 px-3 rounded-md text-xs font-semibold transition-colors motion-reduce:transition-none"
              style={split === s ? { background: P.accent, color: P.accentInk } : { color: P.textMuted, border: `1px solid ${P.border}` }}>{s}</button>
          ))}
        </div>
        <div className="flex gap-0.5 p-0.5 rounded-md" style={{ background: P.surfaceAlt }}>
          {[['topSet', 'Top'], ['reps', 'Reps']].map(([k, l]) => (
            <button key={k} onClick={() => setMetric(k)} aria-pressed={metric === k}
              className="h-7 px-2.5 rounded text-xs font-semibold transition-colors motion-reduce:transition-none"
              style={metric === k ? { background: P.surface, color: P.accent } : { color: P.textMuted }}>{l}</button>
          ))}
        </div>
      </div>

      <Panel>
        <div className="flex items-baseline justify-between">
          <div className="text-sm font-semibold">Bench Press · {split}</div>
          <span className="inline-flex items-center gap-1 text-sm font-bold font-mono tabular-nums" style={{ color: gain >= 0 ? P.accent : P.negative }}>
            <IconTrend size={15} /> {fmtDelta(gain, unit)}
          </span>
        </div>
        <div style={{ width: '100%', height: 210 }} className="mt-3">
          <ResponsiveContainer>
            <AreaChart data={rows} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="t2fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={P.accent} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={P.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} width={42} domain={['dataMin - 4', 'dataMax + 4']} />
              <Tooltip contentStyle={{ background: P.surfaceAlt, border: `1px solid ${P.borderStrong}`, borderRadius: 10, fontSize: 12, color: P.text }} />
              <Area dataKey="value" type="monotone" stroke={P.accent} strokeWidth={2.5} fill="url(#t2fill)" dot={{ r: 2.5, fill: P.accent }} activeDot={{ r: 4 }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex items-center gap-4 pt-3 text-sm" style={{ borderTop: `1px solid ${P.border}` }}>
          <span style={{ color: P.textMuted }}>Start <b className="font-mono tabular-nums" style={{ color: P.text }}>{start}{unit}</b></span>
          <span style={{ color: P.textMuted }}>Now <b className="font-mono tabular-nums" style={{ color: P.text }}>{current}{unit}</b></span>
        </div>
      </Panel>
    </div>
  )
}

function History() {
  const lead = new Date(2026, 4, 1).getDay()
  return (
    <div className="space-y-3">
      <Panel>
        <Label>May · training calendar</Label>
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
                style={{ background: c ? `${c}33` : P.surfaceAlt, color: c ? P.text : P.textMuted, border: c ? `1px solid ${c}` : `1px solid ${P.border}` }}>
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
      </Panel>

      <Panel>
        <Label>Sessions per week</Label>
        <div style={{ width: '100%', height: 150 }}>
          <ResponsiveContainer>
            <BarChart data={WEEK_SESSIONS} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
              <Tooltip cursor={{ fill: P.surfaceAlt }} contentStyle={{ background: P.surfaceAlt, border: `1px solid ${P.borderStrong}`, borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="sessions" radius={[4, 4, 0, 0]} fill={P.accent} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  )
}

function Records() {
  return (
    <div className="space-y-2.5">
      <Label>Personal records</Label>
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
              <div className="text-[11px] font-mono" style={{ color: P.accent }}>e1RM {pr.e1rm}</div>
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
      <Panel>
        <Label>Bodyweight</Label>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold font-mono tabular-nums">{current}</span>
          <span className="text-sm" style={{ color: P.textMuted }}>kg</span>
          <span className="text-sm font-semibold font-mono" style={{ color: P.accent }}>{fmtDelta(delta, ' kg')}</span>
        </div>
        <div style={{ width: '100%', height: 130 }} className="mt-2">
          <ResponsiveContainer>
            <AreaChart data={BODY_SERIES} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="t2bw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={P.chartB} stopOpacity={0.26} />
                  <stop offset="100%" stopColor={P.chartB} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} width={40} domain={['dataMin - 0.6', 'dataMax + 0.6']} />
              <Tooltip contentStyle={{ background: P.surfaceAlt, border: `1px solid ${P.borderStrong}`, borderRadius: 10, fontSize: 12 }} />
              <Area dataKey="bw" type="monotone" stroke={P.chartB} strokeWidth={2.5} fill="url(#t2bw)" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div>
        <Label>Measurements</Label>
        <div className="grid grid-cols-2 gap-2.5">
          {MEASUREMENTS.map(m => (
            <div key={m.key} className="rounded-2xl p-3" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
              <div className="text-xs" style={{ color: P.textMuted }}>{m.key}</div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-lg font-bold font-mono tabular-nums">{m.current}</span>
                <span className="text-[10px]" style={{ color: P.textMuted }}>cm</span>
                <span className="ml-auto text-xs font-semibold font-mono" style={{ color: m.delta >= 0 ? P.accent : P.negative }}>{fmtDelta(m.delta)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
