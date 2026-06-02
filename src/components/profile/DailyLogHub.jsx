import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api.js'

const STRESS_OPTIONS = [{ label: 'Low', value: 1 }, { label: 'Moderate', value: 2 }, { label: 'High', value: 3 }]
const ENERGY_OPTIONS = [1, 2, 3, 4, 5]
const GOAL_OPTIONS = ['strength', 'hypertrophy', 'fat_loss', 'general_fitness', 'sport_performance']
const NUTRITION_OPTIONS = ['bulk', 'cut', 'maintenance']
const SUPPLEMENT_OPTIONS = [
  'creatine', 'protein_powder', 'pre_workout', 'caffeine', 'beta_alanine', 'citrulline',
  'electrolytes', 'multivitamin', 'vitamin_d', 'omega_3', 'magnesium', 'ashwagandha', 'bcaa_eaa',
]
const SUPPLEMENT_UNITS = ['g', 'mg', 'IU', 'mL', 'caps']
const SUPPLEMENT_FREQUENCY = ['daily', 'training_days', 'weekly', 'occasionally']

function today() {
  return new Date().toISOString().slice(0, 10)
}

function parseArray(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw !== 'string' || !raw) return []
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a : [] } catch { return [] }
}

function normalizeSupplements(raw) {
  return parseArray(raw)
    .map(s => (typeof s === 'string' ? { key: s } : s))
    .filter(s => s && s.key)
    .map(s => ({ key: s.key, amount: s.amount ?? null, unit: s.unit ?? null, frequency: s.frequency ?? null }))
}

export default function DailyLogHub({ user, updateUser, refresh, toast }) {
  const date = today()
  const [daily, setDaily] = useState({ sleep_duration: '', calories: '', protein_g: '', stress_level: null, subjective_energy: null })
  const [body, setBody] = useState({ bodyweight_kg: '', arm_cm: '', chest_cm: '', waist_cm: '', thigh_cm: '', calf_cm: '' })
  const [savingDaily, setSavingDaily] = useState(false)

  // Privacy: which widget keys are public. Persisted immediately on toggle.
  const [publicFields, setPublicFields] = useState(() => parseArray(user.public_fields_json))

  // Occasionally changes (auto-saved on change)
  const [goal, setGoal] = useState(user.goal || '')
  const [nutritionPhase, setNutritionPhase] = useState(user.nutrition_phase || '')
  const [supplements, setSupplements] = useState(() => normalizeSupplements(user.supplements_json))
  const [occasionalStatus, setOccasionalStatus] = useState('')

  const [research, setResearch] = useState(!!Number(user.research_opt_in))

  useEffect(() => {
    let cancelled = false
    api.get(`/daily-log/${date}`).then(res => {
      if (cancelled || !res.log) return
      const l = res.log
      setDaily({
        sleep_duration: l.sleep_duration ?? '',
        calories: l.calories ?? '',
        protein_g: l.protein_g ?? '',
        stress_level: l.stress_level ?? null,
        subjective_energy: l.subjective_energy ?? null,
      })
    }).catch(() => { /* no log yet is fine */ })
    return () => { cancelled = true }
  }, [date])

  // Prefill body snapshot from the user record.
  useEffect(() => {
    setBody({
      bodyweight_kg: user.bodyweight_kg ?? '',
      arm_cm: user.arm_cm ?? '',
      chest_cm: user.chest_cm ?? '',
      waist_cm: user.waist_cm ?? '',
      thigh_cm: user.thigh_cm ?? '',
      calf_cm: user.calf_cm ?? '',
    })
  }, [user.bodyweight_kg, user.arm_cm, user.chest_cm, user.waist_cm, user.thigh_cm, user.calf_cm])

  const variableCount = useMemo(() => {
    const tracked = [daily.sleep_duration, daily.calories, daily.protein_g, daily.stress_level, daily.subjective_energy,
      body.bodyweight_kg, body.arm_cm, body.chest_cm, body.waist_cm, body.thigh_cm, body.calf_cm]
    return tracked.filter(v => v !== '' && v !== null && v !== undefined).length
  }, [daily, body])

  async function togglePrivacy(key) {
    const next = publicFields.includes(key) ? publicFields.filter(k => k !== key) : [...publicFields, key]
    setPublicFields(next)
    try {
      const data = await api.patch('/profile', { public_fields_json: JSON.stringify(next) })
      updateUser(data.user)
    } catch (err) {
      setPublicFields(publicFields) // revert
      toast(err.message || 'Failed to update privacy', 'error')
    }
  }

  async function saveDaily() {
    setSavingDaily(true)
    try {
      const logPayload = { date }
      for (const k of ['sleep_duration', 'calories', 'protein_g', 'stress_level', 'subjective_energy']) {
        if (daily[k] !== '' && daily[k] !== null && daily[k] !== undefined) logPayload[k] = Number(daily[k])
      }
      await api.post('/daily-log', logPayload)

      const bodyPayload = {}
      for (const k of Object.keys(body)) {
        if (body[k] !== '' && body[k] !== null && body[k] !== undefined) bodyPayload[k] = Number(body[k])
      }
      if (Object.keys(bodyPayload).length) {
        bodyPayload.date = date
        await api.post('/body-metrics', bodyPayload)
      }
      await refresh()
      toast('Check-in saved', 'success')
    } catch (err) {
      toast(err.message || 'Failed to save check-in', 'error')
    } finally {
      setSavingDaily(false)
    }
  }

  async function persistOccasional(next) {
    const g = next.goal ?? goal
    const phase = next.nutritionPhase ?? nutritionPhase
    const sups = next.supplements ?? supplements
    setOccasionalStatus('saving')
    try {
      const data = await api.patch('/profile', {
        goal: g || null,
        nutrition_phase: phase || null,
        supplements_json: JSON.stringify(sups),
      })
      updateUser(data.user)
      setOccasionalStatus('saved')
    } catch (err) {
      setOccasionalStatus('')
      toast(err.message || 'Failed to save', 'error')
    }
  }

  function changeGoal(v) {
    setGoal(v)
    persistOccasional({ goal: v })
  }
  function changeNutrition(v) {
    setNutritionPhase(v)
    persistOccasional({ nutritionPhase: v })
  }
  function toggleSupplement(s) {
    const next = supplements.some(x => x.key === s)
      ? supplements.filter(x => x.key !== s)
      : [...supplements, { key: s, amount: null, unit: null, frequency: null }]
    setSupplements(next)
    persistOccasional({ supplements: next })
  }
  function updateSupplementField(key, field, value) {
    const next = supplements.map(x => (x.key === key ? { ...x, [field]: value } : x))
    setSupplements(next)
    persistOccasional({ supplements: next })
  }

  async function toggleResearch() {
    const next = !research
    setResearch(next)
    try {
      const data = await api.patch('/profile', { research_opt_in: next ? 1 : 0 })
      updateUser(data.user)
    } catch (err) {
      setResearch(!next)
      toast(err.message || 'Failed to update research opt-in', 'error')
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Check-in */}
      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle>Today's check-in</SectionTitle>
          <span className="text-[11px] font-mono text-gray-500">{date}</span>
        </div>

        <Row label="Sleep" privacyKey="sleep" publicFields={publicFields} onTogglePrivacy={togglePrivacy}>
          <Stepper value={daily.sleep_duration} step={0.25} min={0} max={16} suffix="h" onChange={v => setDaily(d => ({ ...d, sleep_duration: v }))} />
        </Row>

        <Row label="Calories" privacyKey="nutrition" publicFields={publicFields} onTogglePrivacy={togglePrivacy}>
          <Stepper value={daily.calories} step={50} min={0} max={12000} onChange={v => setDaily(d => ({ ...d, calories: v }))} />
        </Row>

        <Row label="Protein (g)" privacyKey="nutrition" publicFields={publicFields} onTogglePrivacy={togglePrivacy} hidePrivacy>
          <Stepper value={daily.protein_g} step={5} min={0} max={800} suffix="g" onChange={v => setDaily(d => ({ ...d, protein_g: v }))} />
        </Row>

        <div className="mt-4">
          <Label>Stress level</Label>
          <Segmented options={STRESS_OPTIONS} value={daily.stress_level} onChange={v => setDaily(d => ({ ...d, stress_level: v }))} />
        </div>

        <div className="mt-4">
          <Label>Energy</Label>
          <Segmented options={ENERGY_OPTIONS.map(v => ({ label: String(v), value: v }))} value={daily.subjective_energy} onChange={v => setDaily(d => ({ ...d, subjective_energy: v }))} />
        </div>

        <div className="mt-5 pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <Label>Body measurements</Label>
            <PrivacyToggle active={publicFields.includes('measurements')} onClick={() => togglePrivacy('measurements')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MiniInput label="Bodyweight (kg)" value={body.bodyweight_kg} onChange={v => setBody(b => ({ ...b, bodyweight_kg: v }))} />
            <MiniInput label="Arms (cm)" value={body.arm_cm} onChange={v => setBody(b => ({ ...b, arm_cm: v }))} />
            <MiniInput label="Chest (cm)" value={body.chest_cm} onChange={v => setBody(b => ({ ...b, chest_cm: v }))} />
            <MiniInput label="Waist (cm)" value={body.waist_cm} onChange={v => setBody(b => ({ ...b, waist_cm: v }))} />
            <MiniInput label="Thighs (cm)" value={body.thigh_cm} onChange={v => setBody(b => ({ ...b, thigh_cm: v }))} />
            <MiniInput label="Calves (cm)" value={body.calf_cm} onChange={v => setBody(b => ({ ...b, calf_cm: v }))} />
          </div>
        </div>

        <button disabled={savingDaily} onClick={saveDaily} className="mt-5 w-full min-h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-60 text-sm font-semibold text-white transition">
          {savingDaily ? 'Saving...' : 'Save check-in'}
        </button>
      </Card>

      {/* Occasionally changes */}
      <Card>
        <div className="flex items-center gap-2">
          <SectionTitle>Occasionally changes</SectionTitle>
          <SaveStatus status={occasionalStatus} />
        </div>
        <div className="space-y-4">
          <div>
            <Label>Goal</Label>
            <Select value={goal} onChange={changeGoal} options={GOAL_OPTIONS} />
          </div>
          <div>
            <Label>Nutrition phase</Label>
            <Select value={nutritionPhase} onChange={changeNutrition} options={NUTRITION_OPTIONS} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>Supplements</Label>
              <PrivacyToggle active={publicFields.includes('supplements')} onClick={() => togglePrivacy('supplements')} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {SUPPLEMENT_OPTIONS.map(s => {
                const on = supplements.some(x => x.key === s)
                return (
                  <button
                    key={s}
                    onClick={() => toggleSupplement(s)}
                    className={'px-3 py-1.5 rounded-full text-xs font-medium transition touch-manipulation ' + (on ? 'bg-indigo-600 text-white' : 'bg-gray-950 border border-gray-800 text-gray-400 hover:text-gray-200')}
                  >
                    {human(s)}
                  </button>
                )
              })}
            </div>
            {supplements.length > 0 && (
              <div className="mt-3 space-y-2">
                {supplements.map(s => (
                  <SupplementRow
                    key={s.key}
                    supplement={s}
                    onUpdate={(field, value) => updateSupplementField(s.key, field, value)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Research banner */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">Citizen-science research</div>
            <p className="mt-1 text-xs text-gray-300 leading-relaxed">
              {research
                ? `You are contributing ${variableCount} variable${variableCount === 1 ? '' : 's'} to anonymous fitness research.`
                : 'Opt in to contribute your anonymized metrics to the strength-training study.'}
            </p>
          </div>
          <button onClick={toggleResearch} className={'shrink-0 w-11 h-6 rounded-full p-0.5 transition-colors ' + (research ? 'bg-indigo-600' : 'bg-gray-700')}>
            <span className={'block w-5 h-5 rounded-full bg-white transition-transform ' + (research ? 'translate-x-5' : '')} />
          </button>
        </div>
      </div>
    </div>
  )
}

function Card({ children }) {
  return <section className="rounded-2xl bg-gray-900 border border-gray-800 p-4">{children}</section>
}

function SectionTitle({ children }) {
  return <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{children}</h2>
}

function Label({ children }) {
  return <div className="text-xs uppercase tracking-wider text-gray-500">{children}</div>
}

function Row({ label, privacyKey, publicFields, onTogglePrivacy, hidePrivacy, children }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-gray-200">{label}</span>
        {!hidePrivacy && <PrivacyToggle active={publicFields.includes(privacyKey)} onClick={() => onTogglePrivacy(privacyKey)} />}
      </div>
      {children}
    </div>
  )
}

function PrivacyToggle({ active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={active ? 'Public' : 'Private'}
      title={active ? 'Public — shown on your Athlete Card' : 'Private'}
      className={'shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition ' + (active ? 'bg-indigo-600/20 text-indigo-300' : 'bg-gray-800 text-gray-500')}
    >
      {active ? (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      )}
    </button>
  )
}

function SaveStatus({ status }) {
  if (!status) return null
  return (
    <span className={'text-[11px] font-medium transition-colors ' + (status === 'saving' ? 'text-gray-500' : 'text-indigo-400')}>
      {status === 'saving' ? 'Saving…' : 'Saved'}
    </span>
  )
}

function Stepper({ value, onChange, step = 1, min = -Infinity, max = Infinity, suffix = '' }) {
  const num = value === '' || value === null || value === undefined ? null : Number(value)
  const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0
  function clamp(n) {
    const bounded = Math.min(max, Math.max(min, n))
    return decimals ? Number(bounded.toFixed(decimals)) : bounded
  }
  function bump(dir) {
    onChange(clamp((num ?? 0) + dir * step))
  }
  function handleBlur() {
    if (value === '' || value === null || value === undefined) return
    const n = Number(value)
    onChange(Number.isFinite(n) ? clamp(n) : '')
  }
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => bump(-1)} className="w-8 h-8 rounded-lg bg-gray-950 border border-gray-800 text-gray-300 hover:text-white active:scale-95 transition touch-manipulation">−</button>
      <div className="w-20 text-center">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          step={step}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          onBlur={handleBlur}
          className="w-full bg-transparent text-center font-mono tabular-nums text-base text-white focus:outline-none touch-manipulation"
        />
        {suffix && num != null && <span className="text-[10px] text-gray-500">{suffix}</span>}
      </div>
      <button onClick={() => bump(1)} className="w-8 h-8 rounded-lg bg-gray-950 border border-gray-800 text-gray-300 hover:text-white active:scale-95 transition touch-manipulation">+</button>
    </div>
  )
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="mt-2 grid gap-1 rounded-xl bg-gray-950 border border-gray-800 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(o => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={'min-h-9 rounded-lg text-sm font-semibold transition ' + (value === o.value ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className="mt-1 w-full min-h-11 rounded-xl bg-gray-950 border border-gray-800 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <option value="">Not set</option>
      {options.map(o => <option key={o} value={o}>{human(o)}</option>)}
    </select>
  )
}

function SupplementRow({ supplement, onUpdate }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 min-w-0 truncate text-sm text-gray-300">{human(supplement.key)}</span>
      <input
        type="number"
        inputMode="decimal"
        value={supplement.amount ?? ''}
        placeholder="Amt"
        onChange={e => onUpdate('amount', e.target.value === '' ? null : Number(e.target.value))}
        className="w-16 min-h-10 rounded-lg bg-gray-950 border border-gray-800 px-2 text-sm text-white text-center font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <select
        value={supplement.unit ?? ''}
        onChange={e => onUpdate('unit', e.target.value || null)}
        className="w-16 min-h-10 rounded-lg bg-gray-950 border border-gray-800 px-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">—</option>
        {SUPPLEMENT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
      <select
        value={supplement.frequency ?? ''}
        onChange={e => onUpdate('frequency', e.target.value || null)}
        className="w-28 min-h-10 rounded-lg bg-gray-950 border border-gray-800 px-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">Freq</option>
        {SUPPLEMENT_FREQUENCY.map(f => <option key={f} value={f}>{human(f)}</option>)}
      </select>
    </div>
  )
}

function MiniInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-[11px] text-gray-500">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full min-h-10 rounded-lg bg-gray-950 border border-gray-800 px-3 text-sm text-white font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </label>
  )
}

function human(value) {
  return String(value).replaceAll('_', ' ')
}
