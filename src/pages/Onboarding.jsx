import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { api } from '../lib/api.js'

const GOALS = [
  { v: 'strength', label: 'Strength', hint: 'Get stronger on the big lifts' },
  { v: 'hypertrophy', label: 'Hypertrophy', hint: 'Build muscle size' },
  { v: 'fat_loss', label: 'Fat loss', hint: 'Lean out while keeping muscle' },
  { v: 'general_fitness', label: 'General fitness', hint: 'Feel healthy and capable' },
  { v: 'sport_performance', label: 'Sport performance', hint: 'Train for a sport' },
]
const GENDERS = [
  { v: 'woman', label: 'Woman' },
  { v: 'man', label: 'Man' },
  { v: 'prefer_not_to_say', label: 'Prefer not to say' },
]
const ENHANCEMENT = [
  { v: 'natural', label: 'Natural' },
  { v: 'enhanced', label: 'Enhanced' },
  { v: 'previously_enhanced', label: 'Previously enhanced' },
  { v: 'prefer_not_to_say', label: 'Prefer not to say' },
]
const UNITS = [
  { v: 'kg', label: 'kg' },
  { v: 'lbs', label: 'lbs' },
]
const SPLITS = [
  { v: 'Upper/Lower', label: 'Upper / Lower' },
  { v: 'Push/Pull/Legs', label: 'Push / Pull / Legs' },
  { v: 'Full Body', label: 'Full Body' },
  { v: 'Bro Split', label: 'Bro Split' },
  { v: 'Custom', label: 'Custom' },
]
const STRESS = [
  { v: 'low', label: 'Low' },
  { v: 'moderate', label: 'Moderate' },
  { v: 'high', label: 'High' },
]
const NUTRITION = [
  { v: 'bulk', label: 'Bulking' },
  { v: 'cut', label: 'Cutting' },
  { v: 'maintenance', label: 'Maintenance' },
]
const GYMS = [
  { v: 'commercial', label: 'Commercial gym' },
  { v: 'home', label: 'Home gym' },
  { v: 'outdoor', label: 'Outdoor / mixed' },
]
const PHYSICAL_LABOR = [
  { v: 'sedentary', label: 'Mostly sitting' },
  { v: 'light', label: 'Light movement' },
  { v: 'moderate', label: 'On feet / active' },
  { v: 'heavy', label: 'Heavy labor' },
]
const SPORTS = [
  { v: 'none', label: 'None' },
  { v: 'running', label: 'Running' },
  { v: 'cycling', label: 'Cycling' },
  { v: 'swimming', label: 'Swimming' },
  { v: 'team_sport', label: 'Team sport' },
]
const ETHNIC_BACKGROUNDS = [
  { v: 'american_indian_alaska_native', label: 'American Indian / Alaska Native' },
  { v: 'asian', label: 'Asian' },
  { v: 'black_african_descent', label: 'Black / African descent' },
  { v: 'hispanic_latino', label: 'Hispanic / Latino' },
  { v: 'middle_eastern_north_african', label: 'Middle Eastern / North African' },
  { v: 'native_hawaiian_pacific_islander', label: 'Native Hawaiian / Pacific Islander' },
  { v: 'white_european_descent', label: 'White / European descent' },
  { v: 'prefer_not_to_say', label: 'Prefer not to say' },
]
const SUPPLEMENTS = [
  { v: 'creatine', label: 'Creatine', unit: 'g' },
  { v: 'protein_powder', label: 'Whey / protein powder', unit: 'g protein' },
  { v: 'pre_workout', label: 'Pre-workout', unit: 'servings' },
  { v: 'caffeine', label: 'Caffeine', unit: 'mg' },
  { v: 'beta_alanine', label: 'Beta-alanine', unit: 'g' },
  { v: 'citrulline', label: 'Citrulline / pump', unit: 'g' },
  { v: 'electrolytes', label: 'Electrolytes', unit: 'servings' },
  { v: 'multivitamin', label: 'Multivitamin', unit: 'servings' },
  { v: 'vitamin_d', label: 'Vitamin D', unit: 'IU' },
  { v: 'omega_3', label: 'Omega-3 / fish oil', unit: 'mg' },
  { v: 'magnesium', label: 'Magnesium', unit: 'mg' },
  { v: 'ashwagandha', label: 'Ashwagandha', unit: 'mg' },
  { v: 'bcaa_eaa', label: 'BCAAs / EAAs', unit: 'g' },
  { v: 'other', label: 'Other', unit: '' },
]
const FREQUENCIES = ['daily', 'training_days', 'weekly', 'occasionally']
const TRAINING_AGE_VALUES = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 9, 10, 11, 12]
const SLEEP_VALUES = range(0, 16, 0.25)
const KG_VALUES = range(35, 220, 1)
const LB_VALUES = range(75, 485, 1)
const CM_VALUES = range(120, 220, 1)
const IN_VALUES = range(48, 86, 1)

export default function Onboarding() {
  const { refresh } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [phase, setPhase] = useState('basics')
  const [submitting, setSubmitting] = useState(false)

  const [basics, setBasics] = useState({
    goal: '',
    gender: '',
    date_of_birth: '',
    training_age_years: 1,
    enhancement_status: '',
    bodyweight_kg: '',
    height_cm: '',
    preferred_units: 'kg',
    split_type: '',
    custom_days: '',
  })

  const [advanced, setAdvanced] = useState({
    sleep_hours: '',
    stress_level: '',
    nutrition_phase: '',
    protein_g_per_kg: '',
    supplements: {},
    ethnic_background: [],
    injury_limitations: '',
    country_region: '',
    job_title: '',
    physical_labor_level: '',
    gym_type: '',
    sport_primary: '',
    sport_sessions_per_week: '',
    race_distance: '',
    arm_cm: '',
    chest_cm: '',
    waist_cm: '',
    thigh_cm: '',
    calf_cm: '',
    vo2_max: '',
    avg_daily_steps: '',
  })

  const basicsValid = !!basics.goal &&
    !!basics.gender &&
    !!basics.date_of_birth &&
    /^\d{4}-\d{2}-\d{2}$/.test(basics.date_of_birth) &&
    basics.training_age_years !== '' &&
    !!basics.enhancement_status &&
    !!basics.preferred_units

  async function patchProfile(patch) {
    setSubmitting(true)
    try {
      await api.patch('/profile', patch)
    } catch (err) {
      toast(err.message || 'Save failed', 'error')
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  async function postAdvanced(patch) {
    setSubmitting(true)
    try {
      await api.post('/profile/advanced', patch)
    } catch (err) {
      toast(err.message || 'Save failed', 'error')
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  async function joinStudy() {
    if (!basicsValid) return
    const patch = {
      goal: basics.goal,
      gender: basics.gender,
      date_of_birth: basics.date_of_birth,
      training_started_at: trainingStartedAt(Number(basics.training_age_years)),
      training_age_years: Number(basics.training_age_years),
      enhancement_status: basics.enhancement_status,
      preferred_units: basics.preferred_units,
      research_opt_in: true,
    }
    if (basics.bodyweight_kg !== '') patch.bodyweight_kg = Number(basics.bodyweight_kg)
    if (basics.height_cm !== '') patch.height_cm = Number(basics.height_cm)
    if (basics.split_type) patch.split_type = basics.split_type
    if (basics.split_type === 'Custom' && basics.custom_days.trim()) {
      patch.split_days_json = basics.custom_days.split(',').map(d => d.trim()).filter(Boolean)
    }
    try {
      await patchProfile(patch)
      setPhase('advanced-intro')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      return
    }
  }

  async function finish() {
    await refresh()
    navigate('/community', { replace: true })
  }

  async function saveAdvanced() {
    const patch = {}
    const numericFields = ['sleep_hours', 'protein_g_per_kg', 'sport_sessions_per_week', 'arm_cm', 'chest_cm', 'waist_cm', 'thigh_cm', 'calf_cm', 'vo2_max', 'avg_daily_steps']
    for (const key of numericFields) {
      if (advanced[key] !== '') patch[key] = Number(advanced[key])
    }
    for (const key of ['stress_level', 'nutrition_phase', 'gym_type', 'sport_primary', 'physical_labor_level']) {
      if (advanced[key]) patch[key] = advanced[key]
    }
    for (const key of ['injury_limitations', 'country_region', 'job_title', 'race_distance']) {
      if (advanced[key].trim()) patch[key] = advanced[key].trim()
    }
    const supplementRows = serializeSupplements(advanced.supplements)
    if (supplementRows.length) patch.supplements_json = supplementRows
    if (advanced.ethnic_background.length) patch.ethnic_background_json = advanced.ethnic_background
    if (Object.keys(patch).length) {
      try { await postAdvanced(patch) } catch { return }
    }
    await finish()
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="mx-auto max-w-md px-5 pb-32 pt-6">
        {phase === 'basics' && (
          <BasicsForm
            data={basics}
            setData={setBasics}
            canSubmit={basicsValid}
            submitting={submitting}
            onSubmit={joinStudy}
          />
        )}
        {phase === 'advanced-intro' && (
          <AdvancedIntro onContinue={() => setPhase('advanced-form')} onSkip={finish} />
        )}
        {phase === 'advanced-form' && (
          <AdvancedForm
            basics={basics}
            data={advanced}
            setData={setAdvanced}
            onSave={saveAdvanced}
            onSkip={finish}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  )
}

function BasicsForm({ data, setData, canSubmit, submitting, onSubmit }) {
  const set = (k, v) => setData(prev => ({ ...prev, [k]: v }))
  return (
    <>
      <Header
        title="Join RepSearch"
        subtitle="Basics take about 2 minutes. Advanced details are optional and can be updated later."
      />

      <Section title="About you">
        <Field label="Main goal" required>
          <ChoiceGrid value={data.goal} onChange={v => set('goal', v)} options={GOALS} />
        </Field>
        <Field label="Gender" required note="Used for population research and kept private to your profile.">
          <ChoiceGrid value={data.gender} onChange={v => set('gender', v)} options={GENDERS} />
        </Field>
        <Field label="Date of birth" required note="Used to bucket results into age cohorts.">
          <input
            type="date"
            value={data.date_of_birth}
            onChange={e => set('date_of_birth', e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className={inputClass()}
          />
        </Field>
      </Section>

      <Section title="Training">
        <Field label="Training age" required note="Choose the closest amount of consistent strength training.">
          <TrainingAgeSlider value={data.training_age_years} onChange={v => set('training_age_years', v)} />
        </Field>
        <Field label="Training category" required note="Private profile field used to avoid mixing incomparable research cohorts.">
          <ChoiceGrid value={data.enhancement_status} onChange={v => set('enhancement_status', v)} options={ENHANCEMENT} />
        </Field>
        <Field label="Preferred units" required>
          <Segmented value={data.preferred_units} options={UNITS} onChange={v => set('preferred_units', v)} />
        </Field>
        <Field label="Split type" note="Optional. Intended program structure helps early research before logs accumulate.">
          <ChoiceGrid value={data.split_type} onChange={v => set('split_type', data.split_type === v ? '' : v)} options={SPLITS} />
          {data.split_type === 'Custom' && (
            <input
              type="text"
              value={data.custom_days}
              onChange={e => set('custom_days', e.target.value)}
              placeholder="e.g. Push, Pull, Legs, Upper, Lower"
              className={inputClass('mt-3')}
            />
          )}
        </Field>
      </Section>

      <Section title="Body stats">
        <p className="text-sm text-gray-500">Optional. These improve bodyweight-relative benchmarks and can be changed later.</p>
        <div className="grid grid-cols-2 gap-3">
          <WheelMetric
            label="Bodyweight"
            value={data.bodyweight_kg}
            unitMode={data.preferred_units}
            metricUnit="kg"
            values={data.preferred_units === 'lbs' ? LB_VALUES : KG_VALUES}
            displayValue={data.preferred_units === 'lbs' ? kgToLb(data.bodyweight_kg) : data.bodyweight_kg}
            toMetric={v => data.preferred_units === 'lbs' ? lbToKg(v) : v}
            onChange={v => set('bodyweight_kg', v)}
            onClear={() => set('bodyweight_kg', '')}
          />
          <WheelMetric
            label="Height"
            value={data.height_cm}
            unitMode={data.preferred_units === 'lbs' ? 'ft/in' : 'cm'}
            metricUnit="cm"
            values={data.preferred_units === 'lbs' ? IN_VALUES : CM_VALUES}
            displayValue={data.preferred_units === 'lbs' ? cmToIn(data.height_cm) : data.height_cm}
            displayLabel={v => data.preferred_units === 'lbs' ? formatFeet(v) : String(v)}
            toMetric={v => data.preferred_units === 'lbs' ? inToCm(v) : v}
            onChange={v => set('height_cm', v)}
            onClear={() => set('height_cm', '')}
          />
        </div>
      </Section>

      <Section title="Join the study">
        <div className="space-y-4 rounded-2xl border border-indigo-500/30 bg-indigo-600/10 p-4 text-gray-300">
          <p className="text-sm leading-relaxed">
            RepSearch is a citizen-science strength-training database. Your anonymized workout data helps answer real questions.
          </p>
          <ul className="space-y-2 pl-5 text-sm text-gray-400 list-disc">
            <li>Which split actually builds the most muscle?</li>
            <li>Does running hurt squat progress?</li>
            <li>How do sleep and nutrition affect strength?</li>
          </ul>
          <p className="text-xs leading-relaxed text-gray-500">
            You can opt out any time from Settings. RepSearch only shows population-level results across cohorts.
          </p>
        </div>
      </Section>

      <FooterBar onNext={onSubmit} nextLabel="Join the study" canNext={canSubmit} submitting={submitting} />
    </>
  )
}

function AdvancedIntro({ onContinue, onSkip }) {
  return (
    <>
      <div className="pt-12 space-y-6">
        <div className="inline-block rounded-full bg-indigo-600/15 px-3 py-1 text-xs font-medium text-indigo-300">
          Optional baseline
        </div>
        <h1 className="text-3xl font-bold text-gray-100">Add the context that makes the research sharper.</h1>
        <p className="text-gray-400 leading-relaxed">
          These are current baseline values: sleep, nutrition, supplements, cardio, and measurements change over time and can be updated later.
        </p>
      </div>
      <FooterBar
        onNext={onContinue}
        nextLabel="Add advanced details"
        secondary={<button onClick={onSkip} className="px-4 py-3 text-sm text-gray-400 hover:text-gray-200">Skip</button>}
      />
    </>
  )
}

function AdvancedForm({ basics, data, setData, onSave, onSkip, submitting }) {
  const set = (k, v) => setData(prev => ({ ...prev, [k]: v }))
  const proteinUnit = basics.preferred_units === 'lbs' ? 'g/lb' : 'g/kg'
  const showRace = ['running', 'cycling', 'swimming'].includes(data.sport_primary)

  function setSupplement(key, patch) {
    setData(prev => ({ ...prev, supplements: { ...prev.supplements, [key]: { ...(prev.supplements[key] || {}), ...patch } } }))
  }

  function toggleSupplement(key) {
    setData(prev => {
      const next = { ...prev.supplements }
      if (next[key]) delete next[key]
      else next[key] = { amount: '', unit: SUPPLEMENTS.find(s => s.v === key)?.unit || '', frequency: 'daily', name: '' }
      return { ...prev, supplements: next }
    })
  }

  return (
    <>
      <Header title="Advanced details" subtitle="Skip any field. These baseline values can be updated later." />

      <Section title="Lifestyle">
        <Field label="Average sleep">
          <WheelPicker
            value={data.sleep_hours}
            values={SLEEP_VALUES}
            labelFor={formatSleep}
            onChange={v => set('sleep_hours', v)}
            onClear={() => set('sleep_hours', '')}
          />
        </Field>
        <Field label="Stress level">
          <Pills value={data.stress_level} onChange={v => set('stress_level', v)} options={STRESS} />
        </Field>
        <Field label="Nutrition phase">
          <Pills value={data.nutrition_phase} onChange={v => set('nutrition_phase', v)} options={NUTRITION} />
        </Field>
        <Field label={`Protein intake (${proteinUnit})`}>
          <NumberField
            value={proteinDisplay(data.protein_g_per_kg, basics.preferred_units)}
            onChange={v => set('protein_g_per_kg', proteinToKg(v, basics.preferred_units))}
            placeholder={basics.preferred_units === 'lbs' ? 'e.g. 0.8' : 'e.g. 1.6'}
            suffix={proteinUnit}
          />
        </Field>
      </Section>

      <Section title="Supplements">
        <MultiPills values={Object.keys(data.supplements)} onToggle={toggleSupplement} options={SUPPLEMENTS} />
        <div className="space-y-3">
          {Object.entries(data.supplements).map(([key, detail]) => {
            const supplement = SUPPLEMENTS.find(s => s.v === key)
            return (
              <div key={key} className="rounded-2xl border border-gray-800 bg-gray-900 p-3">
                <div className="mb-3 text-sm font-medium text-gray-100">{supplement?.label || key}</div>
                {key === 'other' && (
                  <input
                    type="text"
                    value={detail.name || ''}
                    onChange={e => setSupplement(key, { name: e.target.value })}
                    placeholder="Supplement name"
                    className={inputClass('mb-2')}
                  />
                )}
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={detail.amount ?? ''}
                    onChange={e => setSupplement(key, { amount: e.target.value })}
                    placeholder="Amt"
                    className={inputClass()}
                  />
                  <input
                    type="text"
                    value={detail.unit ?? ''}
                    onChange={e => setSupplement(key, { unit: e.target.value })}
                    placeholder="Unit"
                    className={inputClass()}
                  />
                  <select value={detail.frequency || 'daily'} onChange={e => setSupplement(key, { frequency: e.target.value })} className={inputClass()}>
                    {FREQUENCIES.map(f => <option key={f} value={f}>{human(f)}</option>)}
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Background">
        <Field label="Ethnic background">
          <MultiPills
            values={data.ethnic_background}
            onToggle={v => set('ethnic_background', toggleMulti(data.ethnic_background, v, 'prefer_not_to_say'))}
            options={ETHNIC_BACKGROUNDS}
          />
        </Field>
        <Field label="Injury limitations">
          <textarea
            rows={3}
            value={data.injury_limitations}
            onChange={e => set('injury_limitations', e.target.value)}
            placeholder="e.g. left shoulder impingement, avoid overhead pressing"
            className={inputClass('py-3 resize-none')}
          />
        </Field>
        <Field label="Country / region">
          <input type="text" value={data.country_region} onChange={e => set('country_region', e.target.value)} placeholder="e.g. United States" className={inputClass()} />
        </Field>
        <Field label="Job / role">
          <input type="text" value={data.job_title} onChange={e => set('job_title', e.target.value)} placeholder="e.g. nurse, software engineer, construction" className={inputClass()} />
        </Field>
        <Field label="Physical labor at work">
          <Pills value={data.physical_labor_level} onChange={v => set('physical_labor_level', v)} options={PHYSICAL_LABOR} />
        </Field>
        <Field label="Gym type">
          <Pills value={data.gym_type} onChange={v => set('gym_type', v)} options={GYMS} />
        </Field>
      </Section>

      <Section title="Sport & cardio">
        <Field label="Primary sport">
          <Pills value={data.sport_primary} onChange={v => set('sport_primary', v)} options={SPORTS} />
        </Field>
        {data.sport_primary && data.sport_primary !== 'none' && (
          <Field label="Sport sessions per week">
            <NumberField value={data.sport_sessions_per_week} onChange={v => set('sport_sessions_per_week', v)} placeholder="e.g. 3" suffix="x/wk" />
          </Field>
        )}
        {showRace && (
          <Field label="Race / distance">
            <input type="text" value={data.race_distance} onChange={e => set('race_distance', e.target.value)} placeholder="e.g. half-marathon, 100km, 1500m" className={inputClass()} />
          </Field>
        )}
        <Field label="VO2 max">
          <NumberField value={data.vo2_max} onChange={v => set('vo2_max', v)} placeholder="e.g. 48" />
        </Field>
        <Field label="Average daily steps">
          <NumberField value={data.avg_daily_steps} onChange={v => set('avg_daily_steps', v)} placeholder="e.g. 8500" />
        </Field>
      </Section>

      <Section title="Body measurements">
        <div className="grid grid-cols-2 gap-3">
          {[
            ['arm_cm', 'Arm'],
            ['chest_cm', 'Chest'],
            ['waist_cm', 'Waist'],
            ['thigh_cm', 'Thigh'],
            ['calf_cm', 'Calf'],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <NumberField value={data[key]} onChange={v => set(key, v)} placeholder="cm" suffix="cm" />
            </Field>
          ))}
        </div>
      </Section>

      <FooterBar
        onNext={onSave}
        nextLabel="Save and finish"
        submitting={submitting}
        secondary={<button onClick={onSkip} className="px-4 py-3 text-sm text-gray-400 hover:text-gray-200">Skip</button>}
      />
    </>
  )
}

function Header({ title, subtitle }) {
  return (
    <div className="mb-7 space-y-3">
      <h1 className="pt-2 text-3xl font-bold text-gray-100">{title}</h1>
      {subtitle && <p className="text-sm leading-relaxed text-gray-400">{subtitle}</p>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({ label, children, note, required }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        {required && <span className="text-[11px] uppercase tracking-wider text-indigo-300">Required</span>}
      </div>
      {note && <p className="text-xs leading-relaxed text-gray-500">{note}</p>}
      {children}
    </div>
  )
}

function ChoiceGrid({ value, onChange, options }) {
  return (
    <div className="grid gap-2">
      {options.map(o => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={
            'min-h-14 rounded-2xl border px-4 py-3 text-left transition-colors ' +
            (value === o.v ? 'bg-indigo-600/10 border-indigo-500 text-gray-100' : 'bg-gray-900 border-gray-800 text-gray-200 hover:border-gray-700')
          }
        >
          <div className="font-medium">{o.label}</div>
          {o.hint && <div className="mt-1 text-xs text-gray-500">{o.hint}</div>}
        </button>
      ))}
    </div>
  )
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl border border-gray-800 bg-gray-900 p-1">
      {options.map(o => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={'min-h-11 rounded-xl text-sm font-semibold transition ' + (value === o.v ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function TrainingAgeSlider({ value, onChange }) {
  const index = Math.max(0, TRAINING_AGE_VALUES.indexOf(Number(value)))
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-3 text-center text-2xl font-bold tabular-nums text-gray-100">{formatTrainingAge(value)}</div>
      <input
        type="range"
        min="0"
        max={TRAINING_AGE_VALUES.length - 1}
        step="1"
        value={index}
        onChange={e => onChange(TRAINING_AGE_VALUES[Number(e.target.value)])}
        className="w-full accent-indigo-500"
      />
      <div className="mt-2 flex justify-between text-xs text-gray-500">
        <span>New</span>
        <span>12+ years</span>
      </div>
    </div>
  )
}

function WheelMetric({ label, value, values, displayValue, displayLabel, toMetric, onChange, onClear, unitMode }) {
  const current = displayValue === '' || displayValue === null || displayValue === undefined ? '' : Number(displayValue)
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-3">
      <div className="mb-1 text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mb-2 h-7 text-lg font-bold text-gray-100">{current === '' ? '-' : (displayLabel ? displayLabel(current) : current)} <span className="text-xs text-gray-500">{unitMode}</span></div>
      <WheelPicker
        value={current}
        values={values}
        labelFor={displayLabel || String}
        onChange={v => onChange(Math.round(toMetric(Number(v)) * 10) / 10)}
        onClear={onClear}
      />
      {value !== '' && <div className="mt-2 text-[11px] text-gray-500">Saved as {value} {label === 'Height' ? 'cm' : 'kg'}</div>}
    </div>
  )
}

function WheelPicker({ value, values, labelFor = String, onChange, onClear }) {
  const selected = value === '' || value === null || value === undefined ? '' : Number(value)

  return (
    <div>
      <div className="relative h-36 overflow-y-auto rounded-xl border border-gray-800 bg-gray-950 py-10 no-scrollbar snap-y snap-mandatory">
        <div className="pointer-events-none absolute inset-x-2 top-1/2 h-9 -translate-y-1/2 rounded-lg border border-indigo-500/40 bg-indigo-600/10" />
        {values.map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={'relative z-10 block h-9 w-full snap-center text-center text-sm tabular-nums transition ' + (Number(v) === selected ? 'font-bold text-gray-100' : 'text-gray-500')}
          >
            {labelFor(v)}
          </button>
        ))}
      </div>
      {onClear && (
        <button type="button" onClick={onClear} className="mt-2 text-xs text-gray-500 hover:text-gray-300">
          Prefer not to say
        </button>
      )}
    </div>
  )
}

function NumberField({ value, onChange, placeholder, suffix }) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass(suffix ? 'pr-16' : '')}
      />
      {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500">{suffix}</span>}
    </div>
  )
}

function Pills({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(value === o.v ? '' : o.v)}
          className={
            'rounded-full border px-4 py-2 text-sm font-medium transition-colors ' +
            (value === o.v ? 'bg-indigo-600/15 border-indigo-500 text-indigo-200' : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-700')
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function MultiPills({ values, onToggle, options }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const active = values.includes(o.v)
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onToggle(o.v)}
            className={
              'rounded-full border px-4 py-2 text-sm font-medium transition-colors ' +
              (active ? 'bg-indigo-600/15 border-indigo-500 text-indigo-200' : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-700')
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function FooterBar({ onNext, nextLabel = 'Continue', canNext = true, submitting, secondary }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-gray-800 bg-gray-950/95 px-6 py-4 backdrop-blur pb-[max(env(safe-area-inset-bottom),1rem)]">
      <div className="mx-auto flex max-w-md items-center gap-3">
        {secondary}
        <button
          onClick={onNext}
          disabled={!canNext || submitting}
          className="min-h-12 flex-1 rounded-2xl bg-indigo-600 px-4 font-semibold text-white transition-all hover:bg-indigo-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? 'Saving...' : nextLabel}
        </button>
      </div>
    </div>
  )
}

function inputClass(extra = '') {
  return `w-full min-h-11 rounded-xl border border-gray-800 bg-gray-900 px-3 text-sm text-gray-100 outline-none transition focus:border-indigo-600 ${extra}`
}

function range(min, max, step) {
  const out = []
  for (let n = min; n <= max + step / 2; n += step) out.push(Math.round(n * 100) / 100)
  return out
}

function trainingStartedAt(years) {
  const d = new Date()
  d.setDate(d.getDate() - Math.round(years * 365.25))
  return d.toISOString().slice(0, 10)
}

function formatTrainingAge(value) {
  const n = Number(value)
  if (n === 0) return 'Less than 6 months'
  if (n === 0.5) return '6 months'
  if (n >= 12) return '12+ years'
  return `${n} ${n === 1 ? 'year' : 'years'}`
}

function formatSleep(value) {
  const n = Number(value)
  if (n === 0) return '0 hours'
  if (Number.isInteger(n)) return `${n}h`
  return `${n}h`
}

function kgToLb(kg) {
  return kg === '' ? '' : Math.round(Number(kg) * 2.20462)
}

function lbToKg(lb) {
  return Math.round(Number(lb) / 2.20462 * 10) / 10
}

function cmToIn(cm) {
  return cm === '' ? '' : Math.round(Number(cm) / 2.54)
}

function inToCm(inches) {
  return Math.round(Number(inches) * 2.54)
}

function formatFeet(inches) {
  const n = Number(inches)
  return `${Math.floor(n / 12)}'${n % 12}"`
}

function proteinDisplay(value, units) {
  if (value === '') return ''
  const n = Number(value)
  return units === 'lbs' ? Math.round((n / 2.20462) * 100) / 100 : n
}

function proteinToKg(value, units) {
  if (value === '') return ''
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return units === 'lbs' ? Math.round(n * 2.20462 * 100) / 100 : n
}

function serializeSupplements(supplements) {
  return Object.entries(supplements).map(([key, detail]) => ({
    key,
    name: key === 'other' ? String(detail.name || '').trim() : undefined,
    amount: detail.amount === '' ? null : Number(detail.amount),
    unit: String(detail.unit || '').trim(),
    frequency: detail.frequency || 'daily',
  })).filter(s => s.key !== 'other' || s.name)
}

function toggleMulti(values, value, exclusiveValue) {
  if (value === exclusiveValue) return values.includes(value) ? [] : [value]
  const withoutExclusive = values.filter(v => v !== exclusiveValue)
  return withoutExclusive.includes(value)
    ? withoutExclusive.filter(v => v !== value)
    : [...withoutExclusive, value]
}

function human(value) {
  return String(value).replaceAll('_', ' ')
}
