import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ExerciseCard from '../components/workout/ExerciseCard.jsx'
import AddExerciseSheet from '../components/workout/AddExerciseSheet.jsx'
import { Sheet } from '../components/ui/Sheet.jsx'
import { api } from '../lib/api.js'
import { nanoid } from '../lib/nanoid.js'
import { SEED_EXERCISES } from '../lib/exercises.js'
import { TEMPLATE_RESEARCH_FIELDS, hasResearchValue } from '../components/workout/researchFields.js'
import { topLevelGroup, muscleColor } from '../lib/musclePalette.js'
import { useToast } from '../components/ui/Toast.jsx'

const STRICTNESS = [
  { v: 'written', label: 'Run as written' },
  { v: 'adapt', label: 'Adapt as needed' },
  { v: 'inspiration', label: 'Use as inspiration' },
]

const exerciseById = new Map(SEED_EXERCISES.map(e => [e.id, e]))

export default function TemplateBuilder() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const workoutId = params.get('workout') || ''
  const returnTo = params.get('returnTo') || '/profile'
  const navigate = useNavigate()
  const toast = useToast()
  const [template, setTemplate] = useState(null)
  const [exercises, setExercises] = useState([])
  const [addOpen, setAddOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pinnedValues, setPinnedValues] = useState({})
  const createPromiseRef = useRef(null)
  const saveTimerRef = useRef(null)
  const templateRef = useRef(null)
  const exercisesRef = useRef([])
  const navigateRef = useRef(navigate)
  const toastRef = useRef(toast)

  useEffect(() => {
    templateRef.current = template
  }, [template])

  useEffect(() => {
    navigateRef.current = navigate
    toastRef.current = toast
  }, [navigate, toast])

  useEffect(() => {
    exercisesRef.current = exercises
  }, [exercises])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        if (id) {
          const data = await api.get(`/templates/${id}`)
          if (cancelled) return
          hydrate(data.template)
          return
        }
        if (!createPromiseRef.current) {
          createPromiseRef.current = workoutId
            ? api.post(`/templates/drafts/from-workout/${workoutId}`, {})
            : api.post('/templates/drafts', {})
        }
        const data = await createPromiseRef.current
        if (cancelled) return
        hydrate(data.template)
        const rt = params.get('returnTo')
        const builderUrl = rt
          ? `/templates/builder/${data.template.id}?returnTo=${encodeURIComponent(rt)}`
          : `/templates/builder/${data.template.id}`
        navigateRef.current(builderUrl, { replace: true })
      } catch (err) {
        toastRef.current?.(err.message || 'Failed to open template builder', 'error')
        navigateRef.current('/profile', { replace: true })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
      clearTimeout(saveTimerRef.current)
    }
  }, [id, workoutId])

  const totals = useMemo(() => {
    let setCount = 0
    const byGroup = {}
    for (const ex of exercises) {
      setCount += ex.sets.length
      const group = topLevelGroup(ex.primary_muscle)
      if (group) byGroup[group] = (byGroup[group] || 0) + ex.sets.length
    }
    return {
      setCount,
      groups: Object.entries(byGroup).map(([group, n]) => ({ group, n })).sort((a, b) => b.n - a.n),
    }
  }, [exercises])

  function hydrate(t) {
    setTemplate({
      id: t.id,
      name: t.name || 'Untitled template',
      description: t.description || '',
      visibility: t.visibility || 'private',
      strictness: t.strictness || 'adapt',
      workout_day: t.workout_day || '',
      workout_split_type: t.workout_split_type || '',
      status: t.status || 'draft',
    })
    setExercises((t.exercises || []).map((ex, originalIdx) => {
      const seed = exerciseById.get(ex.exercise_id)
      return {
        exerciseId: ex.exercise_id,
        exerciseName: seed?.name || ex.exercise_id,
        primary_muscle: seed?.primary_muscle || null,
        equipment_type: seed?.equipment_type || null,
        originalIdx,
        sets: (ex.sets || []).map(s => ({
          id: s.id || nanoid(),
          set_type: s.set_type || 'working',
          weight_kg: s.target_weight_kg ?? null,
          reps: s.target_reps ?? '',
          rir: s.target_rir ?? null,
          target_rep_range: s.target_rep_range ?? '',
          rom_category: s.rom_category ?? null,
          tempo_tag: s.tempo_tag ?? null,
          rest_seconds: s.rest_seconds ?? null,
          failure: !!s.failure,
          client_ts: Date.now(),
          done: false,
        })),
      }
    }))
  }

  function scheduleDraftSave(nextTemplate = templateRef.current, nextExercises = exercisesRef.current) {
    if (!nextTemplate?.id) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      api.patch(`/templates/${nextTemplate.id}`, payload(nextTemplate, nextExercises, 'draft')).catch(() => {})
    }, 900)
  }

  function updateTemplate(patch) {
    setTemplate(prev => {
      const next = { ...prev, ...patch }
      scheduleDraftSave(next, exercisesRef.current)
      return next
    })
  }

  function updateExercises(fn) {
    setExercises(prev => {
      const next = fn(prev).map((ex, i) => ({ ...ex, originalIdx: i }))
      scheduleDraftSave(templateRef.current, next)
      return next
    })
  }

  function addExercise(ex) {
    updateExercises(prev => {
      if (prev.some(row => row.exerciseId === ex.id)) return prev
      return [...prev, {
        exerciseId: ex.id,
        exerciseName: ex.name,
        primary_muscle: ex.primary_muscle,
        equipment_type: ex.equipment_type,
        sets: [freshPlanningSet()],
      }]
    })
  }

  function updateSet(exerciseIdx, setIdx, patch) {
    updateExercises(prev => prev.map((ex, i) => i !== exerciseIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, ...patch }),
    }))
  }

  function addSet(exerciseIdx, overrides = {}) {
    updateExercises(prev => prev.map((ex, i) => {
      if (i !== exerciseIdx) return ex
      const last = ex.sets[ex.sets.length - 1] || {}
      return {
        ...ex,
        sets: [...ex.sets, freshPlanningSet({
          set_type: last.set_type || 'working',
          weight_kg: last.weight_kg ?? null,
          reps: last.reps ?? '',
          ...pinnedValues,
          _pinnedFields: Object.keys(pinnedValues),
          _unpinnedFields: [],
          ...overrides,
        })],
      }
    }))
  }

  function removeSet(exerciseIdx, setIdx) {
    updateExercises(prev => prev.map((ex, i) => i !== exerciseIdx ? ex : {
      ...ex,
      sets: ex.sets.filter((_, j) => j !== setIdx),
    }))
  }

  function pinField(_exerciseIdx, field, value) {
    setPinnedValues(prev => ({ ...prev, [field]: value }))
  }

  function unpinField(_exerciseIdx, field) {
    setPinnedValues(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  async function finalize() {
    if (!template?.name?.trim()) {
      toast?.('Template name required', 'error')
      return
    }
    setSaving(true)
    try {
      clearTimeout(saveTimerRef.current)
      await api.patch(`/templates/${template.id}`, payload(template, exercises, 'final'))
      toast?.('Template saved', 'success')
      const url = new URL(returnTo, window.location.origin)
      url.searchParams.set('createdTemplate', template.id)
      navigate(`${url.pathname}${url.search}`, { replace: true })
    } catch (err) {
      toast?.(err.message || 'Failed to save template', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        Opening template builder...
      </div>
    )
  }

  return (
    <div className="pb-28">
      <div className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="px-4 safe-pt-3 pb-2 flex items-center justify-between gap-2">
          <button onClick={() => navigate(returnTo)} className="text-sm text-gray-500 hover:text-gray-300 px-2 py-1">
            Close
          </button>
          <div className="text-center min-w-0">
            <div className="text-lg font-bold text-gray-100 truncate">{template.name || 'Untitled template'}</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">
              <span className="font-mono tabular-nums">{exercises.length}</span> exercises - <span className="font-mono tabular-nums">{totals.setCount}</span> sets
            </div>
          </div>
          <button onClick={() => setSaveOpen(true)} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl">
            Save
          </button>
        </div>
        {totals.groups.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {totals.groups.map(({ group, n }) => (
              <span key={group} className="px-2 py-1 rounded-full text-[10px] font-medium border" style={{ borderColor: muscleColor(group), color: muscleColor(group) }}>
                {group} <span className="font-mono tabular-nums opacity-80">{n}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 pt-3">
        <BuilderMeta template={template} onChange={updateTemplate} />
        {exercises.length === 0 && (
          <div className="text-center py-10 text-gray-500 text-sm">
            No exercises yet. Tap <span className="text-indigo-400">+ Add exercise</span> below.
          </div>
        )}
        {exercises.map((ex, idx) => (
          <ExerciseCard
            key={ex.exerciseId}
            exercise={{ ...ex, originalIdx: idx }}
            index={idx}
            prevSession={null}
            pinnedValues={pinnedValues}
            onUpdateSet={updateSet}
            onAddSet={addSet}
            onRemoveSet={removeSet}
            onPinField={pinField}
            onUnpinField={unpinField}
            planning
            researchFields={TEMPLATE_RESEARCH_FIELDS}
          />
        ))}

        <button
          onClick={() => setAddOpen(true)}
          className="w-full py-4 rounded-2xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-700/40 text-indigo-300 font-medium transition-colors"
        >
          + Add exercise
        </button>
      </div>

      <AddExerciseSheet open={addOpen} onClose={() => setAddOpen(false)} onPick={addExercise} excludeIds={exercises.map(e => e.exerciseId)} />
      <SaveTemplateSheet
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        template={template}
        onChange={updateTemplate}
        onSave={finalize}
        saving={saving}
      />
    </div>
  )
}

function BuilderMeta({ template, onChange }) {
  return (
    <div className="mb-3 rounded-2xl bg-gray-900 border border-gray-800 p-3 space-y-3">
      <input
        value={template.name}
        onChange={e => onChange({ name: e.target.value })}
        placeholder="Template name"
        className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-600 rounded-xl px-3 py-2.5 text-gray-100 font-semibold outline-none"
      />
      <input
        value={template.description}
        onChange={e => onChange({ description: e.target.value })}
        placeholder="Short note: who this is for, how to run it"
        className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-600 rounded-xl px-3 py-2.5 text-sm text-gray-100 outline-none"
      />
      <div className="grid grid-cols-3 gap-1.5">
        {STRICTNESS.map(s => (
          <button
            key={s.v}
            onClick={() => onChange({ strictness: s.v })}
            className={'min-h-10 rounded-lg border px-2 text-[11px] font-semibold ' + (template.strictness === s.v ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100' : 'bg-gray-950 border-gray-800 text-gray-400')}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function SaveTemplateSheet({ open, onClose, template, onChange, onSave, saving }) {
  return (
    <Sheet open={open} onClose={onClose} title="Save template">
      <div className="p-4 space-y-4">
        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Name</span>
          <input
            value={template.name}
            onChange={e => onChange({ name: e.target.value })}
            className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-600 rounded-xl px-3 py-3 text-gray-100 outline-none"
          />
        </label>
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Visibility</div>
          <div className="grid grid-cols-2 gap-2">
            {['private', 'public'].map(v => (
              <button
                key={v}
                onClick={() => onChange({ visibility: v })}
                className={'py-3 rounded-xl border text-sm font-semibold capitalize ' + (template.visibility === v ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100' : 'bg-gray-950 border-gray-800 text-gray-400')}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <button onClick={onSave} disabled={saving || !template.name.trim()} className="w-full py-4 rounded-2xl bg-indigo-600 disabled:opacity-50 text-white font-semibold">
          {saving ? 'Saving...' : 'Save template'}
        </button>
      </div>
    </Sheet>
  )
}

function freshPlanningSet(overrides = {}) {
  return {
    id: nanoid(),
    set_type: 'working',
    weight_kg: null,
    reps: '',
    rir: null,
    target_rep_range: '',
    failure: false,
    client_ts: Date.now(),
    done: false,
    ...overrides,
  }
}

function payload(template, exercises, status) {
  return {
    name: template.name || 'Untitled template',
    description: template.description || '',
    visibility: status === 'draft' ? 'private' : template.visibility,
    status,
    strictness: template.strictness || 'adapt',
    workout_day: template.workout_day || null,
    workout_split_type: template.workout_split_type || null,
    exercises: exercises.map(ex => ({
      exercise_id: ex.exerciseId,
      sets: ex.sets.map(s => ({
        target_reps: s.reps == null ? '' : String(s.reps),
        target_weight_kg: s.weight_kg ?? null,
        target_rir: s.rir ?? null,
        target_rep_range: s.target_rep_range || null,
        set_type: s.set_type || 'working',
        rom_category: s.rom_category || null,
        tempo_tag: s.tempo_tag || null,
        rest_seconds: hasResearchValue(s.rest_seconds) ? Number(s.rest_seconds) : null,
        failure: !!s.failure,
      })),
    })),
  }
}
