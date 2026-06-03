import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { IconSearch, IconPlus, IconClose } from '../cohesive/_shared.jsx'

const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Quads', 'Hamstrings', 'Triceps', 'Biceps', 'Core']

const FIELD_OPTIONS = [
  { value: 'users.experience_level', label: 'Experience level' },
  { value: 'sets.rir', label: 'RIR (reps in reserve)' },
  { value: 'exercises.equipment_type', label: 'Equipment type' },
  { value: 'users.training_frequency', label: 'Training frequency' },
  { value: 'sessions.duration_min', label: 'Session duration' },
]

const OPERATOR_OPTIONS = ['=', '≠', '<', '>', 'in']

const MOCK_RESULTS = [
  { label: 'Beginner', value: 3.2, lo: 2.8, hi: 3.6, n: 412 },
  { label: 'Intermediate', value: 5.1, lo: 4.7, hi: 5.5, n: 887 },
  { label: 'Advanced', value: 4.6, lo: 4.0, hi: 5.2, n: 234 },
  { label: 'Elite', value: 3.9, lo: 3.0, hi: 4.8, n: 78 },
]

const FEATURED_QUESTIONS = [
  { id: 'q1', q: 'Does RIR 1-2 produce more progression than RIR 3-4 on compounds?', tags: ['rir', 'progression'] },
  { id: 'q2', q: 'How does training frequency interact with experience level?', tags: ['frequency', 'experience'] },
  { id: 'q3', q: 'Is machine vs free-weight associated with different hypertrophy rates?', tags: ['equipment', 'hypertrophy'] },
]

export default function PaletteStudy({ P }) {
  const [tab, setTab] = useState('Explore')
  const [selectedMuscle, setSelectedMuscle] = useState('Chest')
  const [filters, setFilters] = useState([
    { id: 'f1', field: 'users.experience_level', op: '=', value: 'intermediate' },
  ])
  const [hasResult, setHasResult] = useState(true)
  const r = P.radius
  const isMarine = P.tags.includes('navy')
  const isEmber = P.tags.includes('amber')
  const isGrove = P.tags.includes('earthy')
  const isQuartz = P.tags.includes('lavender')

  const cardStyle = {
    background: P.surface,
    border: isQuartz ? 'none' : `1px solid ${P.border}`,
    borderRadius: r,
    boxShadow: isQuartz ? '0 2px 10px rgba(109,40,217,0.08),0 1px 2px rgba(0,0,0,0.04)'
      : isEmber ? `0 4px 24px rgba(217,124,30,0.08)` : 'none',
  }

  function addFilter() {
    setFilters(f => [...f, { id: `f${Date.now()}`, field: 'sets.rir', op: '=', value: '' }])
  }
  function removeFilter(id) {
    setFilters(f => f.filter(x => x.id !== id))
  }

  if (P.style === 'strava') {
    return (
      <div className="min-h-screen pb-28" style={{ background: P.bg, color: P.text }}>
        <header className="px-4 pt-5 pb-3">
          <div className="flex items-end justify-between">
            <div><div className="text-xs font-semibold" style={{ color: P.textMuted }}>Population research</div><h1 className="text-2xl font-black tracking-tight">Study</h1></div>
            <div className="text-right"><div className="text-2xl font-black font-mono">4.2k</div><div className="text-[10px]" style={{ color: P.textMuted }}>athletes</div></div>
          </div>
          <StudyTabs P={P} r={r} tab={tab} setTab={setTab} />
        </header>
        <StudyBody tab={tab} P={P} r={r} cardStyle={cardStyle} isGrove={isGrove} selectedMuscle={selectedMuscle} setSelectedMuscle={setSelectedMuscle} filters={filters} addFilter={addFilter} removeFilter={removeFilter} hasResult={hasResult} setHasResult={setHasResult} />
      </div>
    )
  }

  if (P.style === 'reddit') {
    return (
      <div className="min-h-screen pb-28" style={{ background: P.bg, color: P.text }}>
        <header className="sticky top-0 z-20 px-3 pt-3 pb-2" style={{ background: P.bg, borderBottom: `1px solid ${P.border}` }}>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center font-black" style={{ background: P.accent, color: P.accentInk }}>S</div>
            <div><h1 className="text-lg font-black">r/studybench</h1><p className="text-[11px]" style={{ color: P.textMuted }}>query builder · saved evidence</p></div>
          </div>
          <StudyTabs P={P} r={r} tab={tab} setTab={setTab} />
        </header>
        <StudyBody tab={tab} P={P} r={r} cardStyle={cardStyle} isGrove={isGrove} selectedMuscle={selectedMuscle} setSelectedMuscle={setSelectedMuscle} filters={filters} addFilter={addFilter} removeFilter={removeFilter} hasResult={hasResult} setHasResult={setHasResult} compact />
      </div>
    )
  }

  if (P.style === 'signal') {
    return (
      <div className="min-h-screen pb-28" style={{ background: P.bg, color: P.text }}>
        <header className="px-4 pt-5 pb-3">
          <div className="p-3" style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: r }}>
            <div className="rounded-2xl p-4" style={{ background: `linear-gradient(135deg, ${P.surfaceAlt}, ${P.heroFade || 'rgba(143,216,78,0.18)'})` }}>
              <div className="text-xs font-bold" style={{ color: P.accent }}>RESEARCH ENGINE</div>
              <h1 className="mt-2 text-2xl font-black">Study Console</h1>
              <p className="mt-1 text-xs" style={{ color: P.textMuted }}>Stack filters, compare cohorts, protect sample size.</p>
            </div>
          </div>
          <StudyTabs P={P} r={r} tab={tab} setTab={setTab} />
        </header>
        <StudyBody tab={tab} P={P} r={r} cardStyle={cardStyle} isGrove={isGrove} selectedMuscle={selectedMuscle} setSelectedMuscle={setSelectedMuscle} filters={filters} addFilter={addFilter} removeFilter={removeFilter} hasResult={hasResult} setHasResult={setHasResult} />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: P.bg, color: P.text }}>
      <header className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{
        background: P.bg,
        borderBottom: isEmber ? `2px solid ${P.accent}` : `1px solid ${P.border}`,
      }}>
        <div className="flex items-baseline justify-between mb-3">
          <h1 className={`text-2xl font-bold tracking-tight ${isMarine ? 'font-mono' : ''}`}>Study</h1>
          <span className="text-xs font-mono" style={{ color: P.textMuted }}>4.2k users · 210k sessions</span>
        </div>
        <div className="flex gap-1 p-1" style={{ background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: r + 2 }}>
          {['For You', 'Explore', 'Evidence'].map(t => {
            const on = tab === t
            return (
              <button key={t} onClick={() => setTab(t)} aria-pressed={on}
                className="flex-1 h-8 text-xs font-semibold transition-colors"
                style={{
                  borderRadius: r,
                  background: on ? P.accent : 'transparent',
                  color: on ? P.accentInk : P.textMuted,
                }}>
                {t}
              </button>
            )
          })}
        </div>
      </header>

      <div className="px-4 pt-4">
        {tab === 'For You' && <ForYouTab P={P} r={r} cardStyle={cardStyle} />}
        {tab === 'Explore' && (
          <ExploreTab P={P} r={r} cardStyle={cardStyle} isGrove={isGrove}
            selectedMuscle={selectedMuscle} setSelectedMuscle={setSelectedMuscle}
            filters={filters} addFilter={addFilter} removeFilter={removeFilter}
            hasResult={hasResult} setHasResult={setHasResult} />
        )}
        {tab === 'Evidence' && <EvidenceTab P={P} cardStyle={cardStyle} />}
      </div>
    </div>
  )
}

function StudyTabs({ P, r, tab, setTab }) {
  return (
    <div className="mt-3 flex gap-1 p-1" style={{ background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: r + 2 }}>
      {['For You', 'Explore', 'Evidence'].map(t => {
        const on = tab === t
        return (
          <button key={t} onClick={() => setTab(t)} aria-pressed={on}
            className="flex-1 h-8 text-xs font-semibold transition-colors"
            style={{ borderRadius: r, background: on ? P.accent : 'transparent', color: on ? P.accentInk : P.textMuted }}>
            {t}
          </button>
        )
      })}
    </div>
  )
}

function StudyBody({ tab, P, r, cardStyle, isGrove, selectedMuscle, setSelectedMuscle, filters, addFilter, removeFilter, hasResult, setHasResult, compact }) {
  return (
    <div className={`${compact ? 'px-2 pt-2' : 'px-4 pt-4'}`}>
      {tab === 'For You' && <ForYouTab P={P} r={r} cardStyle={cardStyle} />}
      {tab === 'Explore' && (
        <ExploreTab P={P} r={r} cardStyle={cardStyle} isGrove={isGrove}
          selectedMuscle={selectedMuscle} setSelectedMuscle={setSelectedMuscle}
          filters={filters} addFilter={addFilter} removeFilter={removeFilter}
          hasResult={hasResult} setHasResult={setHasResult} />
      )}
      {tab === 'Evidence' && <EvidenceTab P={P} cardStyle={cardStyle} />}
    </div>
  )
}

function SectionLabel({ P, isGrove, children }) {
  return (
    <div className={`text-xs font-semibold mb-2 ${isGrove ? 'uppercase tracking-widest' : 'uppercase tracking-wide'}`}
      style={{ color: P.textMuted }}>{children}</div>
  )
}

function ForYouTab({ P, r, cardStyle }) {
  const isGrove = P.tags.includes('earthy')
  return (
    <div className="space-y-4">
      <div>
        <SectionLabel P={P} isGrove={isGrove}>Featured questions</SectionLabel>
        <div className="space-y-2">
          {FEATURED_QUESTIONS.map(q => (
            <div key={q.id} className="p-3.5" style={cardStyle}>
              <p className="text-sm font-medium leading-snug">{q.q}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {q.tags.map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 font-semibold"
                    style={{ background: P.accentSoft, color: P.accent, borderRadius: r - 6 }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ExploreTab({ P, r, cardStyle, isGrove, selectedMuscle, setSelectedMuscle, filters, addFilter, removeFilter, hasResult, setHasResult }) {
  return (
    <div className="space-y-3">
      {/* Exercise picker */}
      <div style={cardStyle} className="p-4">
        <SectionLabel P={P} isGrove={isGrove}>Muscle group</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {MUSCLES.map(m => {
            const on = selectedMuscle === m
            return (
              <button key={m} onClick={() => setSelectedMuscle(m)}
                className="h-8 px-3 text-xs font-semibold"
                style={{
                  borderRadius: r * 2,
                  background: on ? P.accent : P.surfaceAlt,
                  color: on ? P.accentInk : P.textMuted,
                  border: on ? 'none' : `1px solid ${P.border}`,
                }}>
                {m}
              </button>
            )
          })}
        </div>

        {/* Selected exercise */}
        <div className="mt-3 flex items-center gap-2 px-3 h-9"
          style={{ background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: r - 2 }}>
          <IconSearch size={14} style={{ color: P.textMuted }} />
          <span className="text-sm" style={{ color: P.textMuted }}>Bench Press (Barbell)</span>
          <span className="ml-auto text-xs px-1.5 py-0.5"
            style={{ background: P.accentSoft, color: P.accent, borderRadius: r - 6 }}>selected</span>
        </div>
      </div>

      {/* Filter builder */}
      <div style={cardStyle} className="p-4">
        <SectionLabel P={P} isGrove={isGrove}>Cohort filters</SectionLabel>
        <div className="space-y-2">
          {filters.map((f) => (
            <FilterRow key={f.id} filter={f} P={P} r={r}
              onRemove={() => removeFilter(f.id)} />
          ))}
        </div>
        <button onClick={addFilter}
          className="mt-2 w-full h-8 flex items-center justify-center gap-1.5 text-xs font-semibold"
          style={{ border: `1px dashed ${P.border}`, borderRadius: r - 4, color: P.textMuted }}>
          <IconPlus size={13} /> Add filter
        </button>
      </div>

      {/* Group by + measure */}
      <div className="grid grid-cols-2 gap-2">
        {[['Group by', 'Experience level'], ['Measure', 'Progression rate']].map(([l, v]) => (
          <div key={l} className="p-3" style={cardStyle}>
            <div className="text-xs mb-1" style={{ color: P.textMuted }}>{l}</div>
            <div className="text-sm font-semibold truncate">{v}</div>
          </div>
        ))}
      </div>

      {/* Run button */}
      <button onClick={() => setHasResult(true)}
        className="w-full h-11 font-semibold text-sm"
        style={{
          background: P.tags.includes('lavender') ? 'linear-gradient(120deg,#6d28d9,#4c1d95)' : P.accent,
          color: P.accentInk,
          borderRadius: r,
        }}>
        Run query
      </button>

      {/* Results chart */}
      {hasResult && (
        <div style={cardStyle} className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: P.textMuted }}>
            Progression rate by experience · {MOCK_RESULTS.reduce((n, d) => n + d.n, 0)} athletes
          </div>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <BarChart data={MOCK_RESULTS} margin={{ top: 10, right: 6, left: -12, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: P.textMuted }} axisLine={false} tickLine={false} width={32} />
                <Tooltip
                  contentStyle={{ background: P.surface, border: `1px solid ${P.borderStrong}`, borderRadius: r, fontSize: 11 }}
                  formatter={(v) => [v.toFixed(1) + '%', 'Rate']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {MOCK_RESULTS.map((_, i) => (
                    <Cell key={i} fill={P.chartA} opacity={0.7 + i * 0.1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-3 flex-wrap text-xs" style={{ color: P.textMuted }}>
            {MOCK_RESULTS.map(d => (
              <span key={d.label} className="font-mono">{d.label}: n={d.n}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FilterRow({ filter, P, r, onRemove }) {
  return (
    <div className="flex items-center gap-1.5">
      {/* Field */}
      <select
        defaultValue={filter.field}
        className="flex-1 h-8 px-2 text-xs bg-transparent outline-none appearance-none"
        style={{ border: `1px solid ${P.border}`, borderRadius: r - 4, color: P.text, background: P.surfaceAlt }}>
        {FIELD_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Operator */}
      <select
        defaultValue={filter.op}
        className="w-12 h-8 text-center text-xs bg-transparent outline-none appearance-none font-mono"
        style={{ border: `1px solid ${P.border}`, borderRadius: r - 4, color: P.text, background: P.surfaceAlt }}>
        {OPERATOR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>

      {/* Value */}
      <input
        defaultValue={filter.value}
        placeholder="value"
        className="w-24 h-8 px-2 text-xs bg-transparent outline-none"
        style={{ border: `1px solid ${P.border}`, borderRadius: r - 4, color: P.text, background: P.surfaceAlt }}
      />

      <button onClick={onRemove} className="h-8 w-8 flex items-center justify-center shrink-0"
        style={{ color: P.textMuted }}>
        <IconClose size={13} />
      </button>
    </div>
  )
}

function EvidenceTab({ P, cardStyle }) {
  const saved = [
    { q: 'Does RIR 1-2 produce more progression than RIR 3-4 on compounds?', result: '5.1% vs 3.7% · n=1,201', saved: '2d ago' },
    { q: 'How does training frequency interact with experience level?', result: '4–5×/wk optimal for intermediate · n=887', saved: '5d ago' },
  ]
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: P.textMuted }}>
        Saved questions ({saved.length})
      </div>
      {saved.map((s, i) => (
        <div key={i} className="p-3.5" style={cardStyle}>
          <p className="text-sm font-medium leading-snug">{s.q}</p>
          <div className="mt-2 flex items-center justify-between text-xs" style={{ color: P.textMuted }}>
            <span className="font-mono">{s.result}</span>
            <span>{s.saved}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
