import { useEffect, useMemo, useState } from 'react'
import { Sheet } from '../ui/Sheet.jsx'
import { SEED_EXERCISES } from '../../lib/exercises.js'
import { muscleColor } from '../../lib/musclePalette.js'
import { api } from '../../lib/api.js'

const MUSCLE_OPTIONS = [...new Set(SEED_EXERCISES.map(e => e.primary_muscle).filter(Boolean))].sort()
const EQUIPMENT_OPTIONS = [...new Set(SEED_EXERCISES.map(e => e.equipment_type).filter(Boolean))].sort()
const MOVEMENT_OPTIONS = [...new Set(SEED_EXERCISES.map(e => e.movement_pattern).filter(Boolean))].sort()
const RECENT_LIMIT = 24

function searchableText(exercise) {
  return [
    exercise.name,
    exercise.id,
    exercise.id?.replace(/[_-]/g, ' '),
    exercise.primary_muscle,
    exercise.secondary_muscle,
    exercise.equipment_type,
    exercise.movement_pattern,
    exercise.force_vector,
  ].filter(Boolean).join(' ').toLowerCase()
}

function normalizeExercise(exercise, source = 'seed') {
  return {
    ...exercise,
    id: exercise.id || exercise.exerciseId,
    name: exercise.name || exercise.exerciseName,
    source,
  }
}

function historyStats(workouts = []) {
  const stats = new Map()
  for (const workout of workouts) {
    const seenInWorkout = new Set()
    for (const set of workout.sets || []) {
      if (!set.exercise_id) continue
      const current = stats.get(set.exercise_id) || {
        count: 0,
        lastDate: workout.date || workout.created_at || '',
        lastTs: 0,
      }
      current.count += 1
      const ts = Date.parse(workout.date || workout.created_at || '') || 0
      if (ts >= current.lastTs && !seenInWorkout.has(set.exercise_id)) {
        current.lastDate = workout.date || workout.created_at || current.lastDate
        current.lastTs = ts
      }
      seenInWorkout.add(set.exercise_id)
      stats.set(set.exercise_id, current)
    }
  }
  return stats
}

export default function AddExerciseSheet({ open, onClose, onPick, excludeIds = [] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [muscle, setMuscle] = useState('')
  const [equipment, setEquipment] = useState('')
  const [customExercises, setCustomExercises] = useState([])
  const [workoutHistory, setWorkoutHistory] = useState([])
  const [customLoading, setCustomLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [customError, setCustomError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [form, setForm] = useState({
    name: '',
    primary_muscle: '',
    secondary_muscle: '',
    movement_pattern: MOVEMENT_OPTIONS.includes('Isolation') ? 'Isolation' : (MOVEMENT_OPTIONS[0] || ''),
    equipment_type: 'Machine',
  })
  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setCustomLoading(true)
    setHistoryLoading(true)
    setCustomError('')
    setHistoryError('')
    api.get('/custom-exercises')
      .then(data => { if (!cancelled) setCustomExercises(data.exercises || []) })
      .catch(err => { if (!cancelled) setCustomError(err.message || 'Could not load custom exercises.') })
      .finally(() => { if (!cancelled) setCustomLoading(false) })
    api.get('/workouts?limit=100')
      .then(data => { if (!cancelled) setWorkoutHistory(data.workouts || []) })
      .catch(err => { if (!cancelled) setHistoryError(err.message || 'Could not load exercise history.') })
      .finally(() => { if (!cancelled) setHistoryLoading(false) })
    return () => { cancelled = true }
  }, [open])

  const stats = useMemo(() => historyStats(workoutHistory), [workoutHistory])
  const recentIds = useMemo(() => (
    [...stats.entries()]
      .sort((a, b) => (b[1].lastTs || 0) - (a[1].lastTs || 0))
      .slice(0, RECENT_LIMIT)
      .map(([id]) => id)
  ), [stats])

  const exercises = useMemo(() => [
    ...SEED_EXERCISES.map(e => normalizeExercise(e, 'seed')),
    ...customExercises.map(e => normalizeExercise(e, 'custom')),
  ], [customExercises])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const tokens = q.split(/\s+/).filter(Boolean)
    const recentSet = new Set(recentIds)
    return exercises
      .filter(e => !excludeSet.has(e.id))
      .filter(e => !muscle || e.primary_muscle === muscle)
      .filter(e => !equipment || e.equipment_type === equipment)
      .filter(e => {
        if (filter === 'recent') return recentSet.has(e.id)
        if (filter === 'frequent') return (stats.get(e.id)?.count || 0) > 0
        return true
      })
      .filter(e => !tokens.length || tokens.every(token => searchableText(e).includes(token)))
      .sort((a, b) => {
        if (filter === 'frequent') return (stats.get(b.id)?.count || 0) - (stats.get(a.id)?.count || 0)
        if (filter === 'recent') return (stats.get(b.id)?.lastTs || 0) - (stats.get(a.id)?.lastTs || 0)
        const customDelta = (b.source === 'custom') - (a.source === 'custom')
        if (customDelta) return customDelta
        return a.name.localeCompare(b.name)
      })
      .slice(0, 100)
  }, [equipment, exercises, excludeSet, filter, muscle, query, recentIds, stats])

  function pick(exercise) {
    onPick(exercise)
    onClose()
    setQuery('')
    setCreateOpen(false)
  }

  async function createCustomExercise(event) {
    event.preventDefault()
    if (creating) return
    if (!form.name.trim() || !form.primary_muscle) {
      setCreateError('Name and primary muscle are required.')
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      const data = await api.post('/custom-exercises', form)
      const exercise = normalizeExercise(data.exercise, 'custom')
      setCustomExercises(prev => [...prev, exercise])
      pick(exercise)
    } catch (err) {
      setCreateError(err.message || 'Could not create exercise')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add exercise">
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name, alias, muscle, equipment"
            className="min-w-0 flex-1 rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-white outline-none focus:border-indigo-600"
          />
          <button
            type="button"
            onClick={() => setCreateOpen(v => !v)}
            className="rounded-xl border border-indigo-700/50 bg-indigo-600/15 px-3 text-sm font-semibold text-indigo-200"
          >
            New
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterChip>
          <FilterChip active={filter === 'recent'} onClick={() => setFilter('recent')}>Recent</FilterChip>
          <FilterChip active={filter === 'frequent'} onClick={() => setFilter('frequent')}>Frequent</FilterChip>
          <select value={muscle} onChange={e => setMuscle(e.target.value)} className="shrink-0 rounded-full border border-gray-800 bg-gray-950 px-3 py-2 text-xs font-semibold text-gray-300 outline-none">
            <option value="">Any muscle</option>
            {MUSCLE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={equipment} onChange={e => setEquipment(e.target.value)} className="shrink-0 rounded-full border border-gray-800 bg-gray-950 px-3 py-2 text-xs font-semibold text-gray-300 outline-none">
            <option value="">Any equipment</option>
            {EQUIPMENT_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        {(customError || historyError) && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {[customError, historyError].filter(Boolean).join(' ')}
          </div>
        )}

        {createOpen && (
          <form onSubmit={createCustomExercise} className="rounded-2xl border border-gray-800 bg-gray-950 p-3 space-y-2">
            <input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Custom exercise name"
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-600"
            />
            <div className="grid grid-cols-2 gap-2">
              <select required value={form.primary_muscle} onChange={e => setForm(f => ({ ...f, primary_muscle: e.target.value }))} className="rounded-lg border border-gray-800 bg-gray-900 px-2 py-2 text-sm text-white outline-none">
                <option value="">Primary muscle *</option>
                {MUSCLE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
              <select value={form.equipment_type} onChange={e => setForm(f => ({ ...f, equipment_type: e.target.value }))} className="rounded-lg border border-gray-800 bg-gray-900 px-2 py-2 text-sm text-white outline-none">
                {EQUIPMENT_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
              <select value={form.movement_pattern} onChange={e => setForm(f => ({ ...f, movement_pattern: e.target.value }))} className="rounded-lg border border-gray-800 bg-gray-900 px-2 py-2 text-sm text-white outline-none">
                {MOVEMENT_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
              <input
                value={form.secondary_muscle}
                onChange={e => setForm(f => ({ ...f, secondary_muscle: e.target.value }))}
                placeholder="Secondary"
                className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-600"
              />
            </div>
            {createError && <div className="text-xs font-semibold text-red-300">{createError}</div>}
            <button disabled={creating} className="w-full rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {creating ? 'Creating...' : 'Create and add'}
            </button>
          </form>
        )}

        <div className="space-y-1 max-h-[58vh] overflow-y-auto -mx-1 px-1 pb-4">
          {(customLoading || historyLoading) && (
            <p className="text-center text-sm text-gray-500 py-3">Loading exercise data...</p>
          )}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-8">
              {(filter === 'recent' || filter === 'frequent') && historyError ? 'Exercise history could not be loaded.' : 'No exercises match.'}
            </p>
          )}
          {filtered.map(ex => (
            <button
              key={ex.id}
              onClick={() => pick(ex)}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-gray-950 active:bg-gray-800"
            >
              <span
                className="w-1 self-stretch rounded-full"
                style={{ background: muscleColor(ex.primary_muscle) }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="truncate font-medium text-white">{ex.name}</div>
                  {ex.source === 'custom' && <span className="rounded-full bg-indigo-600/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-200">Custom</span>}
                </div>
                <div className="text-xs text-gray-500">
                  {[ex.primary_muscle, ex.equipment_type, ex.movement_pattern].filter(Boolean).join(' - ')}
                </div>
              </div>
              {(stats.get(ex.id)?.count || 0) > 0 && (
                <div className="shrink-0 text-right text-[10px] text-gray-500">
                  <div className="font-mono text-gray-300">{stats.get(ex.id).count}</div>
                  <div>sets</div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={'shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ' + (
        active
          ? 'border-indigo-500 bg-indigo-600/20 text-indigo-100'
          : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-gray-200'
      )}
    >
      {children}
    </button>
  )
}
