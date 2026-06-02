import { useEffect, useState } from 'react'

const SCALE = [1, 2, 3, 4, 5]
const INITIAL_FORM = {
  sleep_duration: '',
  sleep_quality: 3,
  nutrition_quality: 3,
  subjective_energy: 3,
  stress_level: 3,
  bodyweight_kg: '',
  notes: '',
}

export default function DailyCheckinModal({ open, loading, onClose, onSubmit }) {
  const [form, setForm] = useState(INITIAL_FORM)

  useEffect(() => {
    if (open) setForm(INITIAL_FORM)
  }, [open])

  if (!open) return null

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    const saved = await onSubmit({
      ...form,
      sleep_duration: nullableNumber(form.sleep_duration),
      bodyweight_kg: nullableNumber(form.bodyweight_kg),
      illness_flag: 0,
    })
    if (saved) setForm(INITIAL_FORM)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 px-4 flex items-center justify-center" onClick={() => { if (!loading) onClose() }}>
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-gray-950 border border-gray-800 p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">Daily check-in</h2>
            <p className="mt-1 text-sm text-gray-400">A quick datapoint for better progress and better research.</p>
          </div>
          <button type="button" onClick={onClose} disabled={loading} className="w-10 h-10 rounded-full bg-gray-900 hover:bg-gray-800 active:scale-95 disabled:opacity-50 text-gray-400 transition">×</button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sleep hours" type="number" step="0.25" value={form.sleep_duration} onChange={v => setField('sleep_duration', v)} />
            <Field label="Bodyweight kg" type="number" step="0.1" value={form.bodyweight_kg} onChange={v => setField('bodyweight_kg', v)} />
          </div>

          <Scale label="Sleep quality" value={form.sleep_quality} onChange={v => setField('sleep_quality', v)} />
          <Scale label="Nutrition" value={form.nutrition_quality} onChange={v => setField('nutrition_quality', v)} />
          <Scale label="Energy" value={form.subjective_energy} onChange={v => setField('subjective_energy', v)} />
          <Scale label="Stress" value={form.stress_level} onChange={v => setField('stress_level', v)} />

          <label className="block">
            <span className="text-xs uppercase tracking-wider text-gray-500">Notes</span>
            <textarea
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl bg-gray-900 border border-gray-800 px-3 py-3 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Anything that might affect training today?"
            />
          </label>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} disabled={loading} className="min-h-11 rounded-xl bg-gray-900 hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 text-sm font-semibold text-gray-300 transition">Not now</button>
          <button disabled={loading} className="min-h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-60 text-sm font-semibold text-white transition">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, ...props }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-gray-500">{label}</span>
      <input
        {...props}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full min-h-11 rounded-xl bg-gray-900 border border-gray-800 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </label>
  )
}

function Scale({ label, value, onChange }) {
  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className="grid grid-cols-5 gap-1">
        {SCALE.map(n => (
          <button
            type="button"
            key={n}
            onClick={() => onChange(n)}
            className={'min-h-10 rounded-xl text-sm font-mono transition active:scale-95 ' + (Number(value) === n ? 'bg-indigo-600 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-200')}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

function nullableNumber(value) {
  return value === '' || value === null || value === undefined ? null : Number(value)
}
