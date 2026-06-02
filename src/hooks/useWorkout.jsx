import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from 'react'
import { api } from '../lib/api.js'
import { nanoid } from '../lib/nanoid.js'
import { useAuth } from './useAuth.jsx'
import { useToast } from '../components/ui/Toast.jsx'

const PERSIST_KEY = 'repsearch_pinned_values'
const ACTIVE_WORKOUT_KEY = 'repsearch_active_workout_fallback'
const GLOBAL_PIN_SCOPE = '_global'
const RESEARCH_FIELD_KEYS = [
  'rir',
  'set_type',
  'rom_category',
  'tempo_tag',
  'rest_seconds',
  'failure',
  'pain_flag',
]

const WEIGHT_MIN = 0
const WEIGHT_MAX = 1500
const REPS_MIN = 0
const REPS_MAX = 500

function hasValue(value) {
  return value !== null && value !== undefined && value !== ''
}

function hasWeightAndReps(set) {
  return hasValue(set.weight_kg) && hasValue(set.reps)
}

function shouldSaveSet(set) {
  return set.done || hasWeightAndReps(set)
}

function saveableSetCount(exercise) {
  return (exercise?.sets || []).filter(set => hasWeightAndReps(set)).length
}

function plannedSetCount(exercise) {
  if (Number.isFinite(Number(exercise?.plannedSetCount))) return Number(exercise.plannedSetCount)
  return (exercise?.sets || []).filter(set => set.template_set_id || set.planned_weight_kg != null || set.planned_reps != null || set.planned_rep_range).length
}

function classifyProgramRun(workout) {
  if (!workout?.programId) return workout?.runClassification || 'exact'
  if (workout.runClassification === 'derived') return 'derived'
  if ((workout.removedPlannedExercises || []).length > 0) return 'adapted'

  for (const exercise of workout.exercises || []) {
    const plannedExerciseId = exercise.plannedExerciseId || exercise.planned_exercise_id
    const plannedSets = plannedSetCount(exercise)
    if (!plannedExerciseId) return 'adapted'
    if (plannedSets > 0 && saveableSetCount(exercise) < plannedSets) return 'adapted'
  }

  return 'exact'
}

function describeSetLocation(exercise, setIdx) {
  return `${exercise.exerciseName || exercise.exerciseId || 'Exercise'} set ${setIdx + 1}`
}

function validateWorkoutForSave(workout) {
  const errors = []
  let saveableSets = 0

  for (const ex of workout?.exercises || []) {
    for (let idx = 0; idx < (ex.sets || []).length; idx += 1) {
      const set = ex.sets[idx]
      const hasWeight = hasValue(set.weight_kg)
      const hasReps = hasValue(set.reps)
      const location = describeSetLocation(ex, idx)

      if (!shouldSaveSet(set)) continue
      if (set.done && !hasWeight && !hasReps) {
        errors.push(`${location} is marked complete but has no weight or reps.`)
        continue
      }
      if (hasWeight && !hasReps) errors.push(`${location} has weight but no reps.`)
      if (hasReps && !hasWeight) errors.push(`${location} has reps but no weight.`)
      if (hasWeight) {
        const weight = Number(set.weight_kg)
        if (!Number.isFinite(weight) || weight < WEIGHT_MIN || weight > WEIGHT_MAX) {
          errors.push(`${location} weight must be between ${WEIGHT_MIN} and ${WEIGHT_MAX} kg.`)
        }
      }
      if (hasReps) {
        const reps = Number(set.reps)
        if (!Number.isInteger(reps) || reps < REPS_MIN || reps > REPS_MAX) {
          errors.push(`${location} reps must be a whole number between ${REPS_MIN} and ${REPS_MAX}.`)
        }
      }
      if (hasWeight && hasReps) saveableSets += 1
    }
  }

  if (saveableSets === 0) errors.push('Add at least one set with weight and reps before saving.')
  return errors
}

function activeWorkoutUpdatedAt(workout) {
  return workout?.localUpdatedAt || workout?.updatedAt || workout?.startedAt || null
}

function loadLocalActiveWorkout() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACTIVE_WORKOUT_KEY))
    if (!parsed?.state) return null
    return parsed
  } catch {
    return null
  }
}

function saveLocalActiveWorkout(state, updatedAt = new Date().toISOString()) {
  try {
    if (!state) {
      localStorage.removeItem(ACTIVE_WORKOUT_KEY)
      return null
    }
    const nextState = { ...state, localUpdatedAt: updatedAt }
    localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify({ state: nextState, updatedAt }))
    return nextState
  } catch {
    return state
  }
}

function clearLocalActiveWorkout() {
  try {
    localStorage.removeItem(ACTIVE_WORKOUT_KEY)
  } catch {
    // localStorage may be unavailable in private/error states.
  }
}

function isNewerLocalWorkout(localCopy, serverState, serverUpdatedAt) {
  if (!localCopy?.state) return false
  if (!serverState) return false
  const localTime = Date.parse(localCopy.updatedAt || activeWorkoutUpdatedAt(localCopy.state) || '')
  const serverTime = Date.parse(serverUpdatedAt || activeWorkoutUpdatedAt(serverState) || '')
  return Number.isFinite(localTime) && (!Number.isFinite(serverTime) || localTime > serverTime)
}

function localDateString(iso) {
  const date = new Date(iso)
  const d = Number.isFinite(date.getTime()) ? date : new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function loadPinned() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PERSIST_KEY)) || {}
    if (Array.isArray(parsed)) return {}
    if (!parsed || typeof parsed !== 'object') return {}
    const looksNested = Object.values(parsed).some(value => value && typeof value === 'object' && !Array.isArray(value))
    if (looksNested) return parsed
    const migrated = { [GLOBAL_PIN_SCOPE]: parsed }
    savePinned(migrated)
    return migrated
  } catch {
    return {}
  }
}
function savePinned(values) {
  localStorage.setItem(PERSIST_KEY, JSON.stringify(values))
}

function pinsForExercise(pinnedValues, exerciseId) {
  return {
    ...(pinnedValues?.[GLOBAL_PIN_SCOPE] || {}),
    ...(pinnedValues?.[exerciseId] || {}),
  }
}

function freshSet(overrides = {}) {
  return {
    id: nanoid(),
    set_type: 'working',
    weight_kg: null,
    reps: null,
    rir: null,
    failure: false,
    client_ts: Date.now(),
    done: false,
    ...overrides,
  }
}

function nextSessionSetOrder(workout) {
  let maxOrder = 0
  for (const ex of workout?.exercises || []) {
    for (const set of ex.sets || []) {
      const order = Number(set.session_set_order)
      if (Number.isFinite(order) && order > maxOrder) maxOrder = order
    }
  }
  return maxOrder + 1
}

const WorkoutContext = createContext(null)

export function WorkoutProvider({ children }) {
  const { token } = useAuth()
  const toast = useToast()
  const [workout, setWorkout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(new Set())
  const [pinnedValues, setPinnedValues] = useState(loadPinned)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [syncStatus, setSyncStatus] = useState('idle')
  const [syncError, setSyncError] = useState('')
  const [restoreError, setRestoreError] = useState('')
  const [restTimer, setRestTimer] = useState({ active: false, durationSec: 90, startedAt: 0 })
  const timerRef = useRef(null)
  const debounceRef = useRef(null)
  const workoutRef = useRef(workout)
  const saveInFlightRef = useRef(false)
  const workoutStartedAt = workout?.startedAt

  useEffect(() => {
    workoutRef.current = workout
  }, [workout])

  const scheduleSync = useCallback((nextState) => {
    if (saveInFlightRef.current || nextState?.finalizedAt) return
    clearTimeout(debounceRef.current)
    setSyncStatus('saving')
    setSyncError('')
    debounceRef.current = setTimeout(() => {
      if (!nextState) {
        api.del('/active-workout')
          .then(() => { setSyncStatus('idle'); setSyncError('') })
          .catch(err => {
            setSyncStatus('error')
            setSyncError(err.message || 'Autosave failed')
          })
      } else {
        api.put('/active-workout', { state: nextState })
          .then(() => { setSyncStatus('saved'); setSyncError('') })
          .catch(err => {
            setSyncStatus('error')
            setSyncError(err.message || 'Autosave failed')
          })
      }
    }, 1000)
  }, [])

  // Load active workout when authenticated; clear when not.
  useEffect(() => {
    let cancelled = false
    if (!token) {
      setWorkout(null)
      setSyncStatus('idle')
      setSyncError('')
      setRestoreError('')
      setLoading(false)
      return
    }
    setLoading(true)
    api.get('/active-workout')
      .then(d => {
        if (cancelled) return
        const restored = d.state ?? d.active ?? null
        const localCopy = loadLocalActiveWorkout()
        const localIsNewer = isNewerLocalWorkout(localCopy, restored, d.updated_at)
        const next = localIsNewer ? localCopy.state : restored
        if (next) {
          const localState = localIsNewer ? next : saveLocalActiveWorkout(next, d.updated_at || activeWorkoutUpdatedAt(next))
          setWorkout(localState)
          if (localIsNewer) {
            setSyncStatus('saving')
            setSyncError('Restored a newer local workout. Syncing it now.')
            scheduleSync(localState)
          } else {
            setSyncStatus('saved')
            setSyncError('')
          }
        } else {
          if (!restored) clearLocalActiveWorkout()
          setWorkout(null)
          setSyncStatus('idle')
          setSyncError('')
          setRestoreError('')
        }
      })
      .catch(err => {
        if (!cancelled) {
          const localCopy = loadLocalActiveWorkout()
          if (localCopy?.state) {
            setWorkout(localCopy.state)
            setSyncStatus('error')
            setSyncError(err.message || 'Could not restore from server. Restored local workout.')
            setRestoreError('')
          } else {
            setSyncStatus('error')
            setSyncError(err.message || 'Could not restore active workout')
            setRestoreError(err.message || 'Could not restore active workout.')
          }
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [scheduleSync, token])

  // Elapsed timer
  useEffect(() => {
    if (!workoutStartedAt) { clearInterval(timerRef.current); setElapsedSec(0); return }
    const tick = () => setElapsedSec(Math.floor((Date.now() - new Date(workoutStartedAt).getTime()) / 1000))
    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => clearInterval(timerRef.current)
  }, [workoutStartedAt])

  const update = useCallback((fn) => {
    setWorkout(prev => {
      if (prev?.finalizedAt) return prev
      const next = saveLocalActiveWorkout(fn(prev))
      scheduleSync(next)
      return next
    })
  }, [scheduleSync])

  const startWorkout = useCallback((opts = {}) => {
    const {
      name = null,
      dayLabel = null,
      exercises: templateExercises = [],
      templateId = null,
      programId = null,
      programSessionId = null,
      runClassification = 'exact',
      skipReplaceWarning = false,
      copyPreviousValues = false,
    } = opts
    if (workoutRef.current && !skipReplaceWarning) {
      return false
    }
    const w = {
      startedAt: new Date().toISOString(),
      name,
      dayLabel,
      templateId,
      programId,
      programSessionId,
      runClassification,
      nextSessionSetOrder: 1,
      removedPlannedExercises: [],
      exercises: templateExercises.map(e => ({
        exerciseId: e.exerciseId || e.exercise_id || e.id,
        exerciseName: e.exerciseName || e.name || '',
        primary_muscle: e.primary_muscle || null,
        secondary_muscle: e.secondary_muscle || null,
        equipment_type: e.equipment_type || null,
        plannedExerciseId: e.plannedExerciseId || e.exerciseId || e.exercise_id || e.id,
        plannedSetCount: (e.sets || []).length,
        sets: (e.sets || []).map((s, idx) => freshSet({
          weight_kg: copyPreviousValues ? (s.weight_kg ?? null) : null,
          reps: copyPreviousValues ? (s.reps ?? null) : null,
          rir: copyPreviousValues ? (s.rir ?? null) : null,
          set_type: s.set_type || 'working',
          planned_weight_kg: s.weight_kg ?? s.target_weight_kg ?? null,
          planned_reps: s.reps ?? s.target_reps ?? null,
          planned_rep_range: s.target_rep_range ?? s.rep_range ?? null,
          planned_rir: s.rir ?? s.target_rir ?? null,
          planned_rom_category: s.rom_category ?? null,
          planned_tempo_tag: s.tempo_tag ?? null,
          planned_rest_seconds: s.rest_seconds ?? null,
          planned_failure: s.failure ?? false,
          template_set_id: s.id || s.template_set_id || null,
          planned_exercise_id: e.plannedExerciseId || e.exerciseId || e.exercise_id || e.id,
          client_ts: Date.now() + idx,
        })),
      })),
    }
    setCollapsed(new Set())
    update(() => w)
    return true
  }, [update])

  const addExercise = useCallback((exercise) => {
    update(prev => {
      if (!prev) return prev
      const exerciseId = exercise.id || exercise.exerciseId
      const already = prev.exercises.findIndex(e => e.exerciseId === exerciseId)
      if (already !== -1) return prev
      const pinnedForExercise = pinsForExercise(pinnedValues, exerciseId)
      delete pinnedForExercise.set_type
      const pinnedFields = Object.keys(pinnedForExercise)
      return {
        ...prev,
        runClassification: prev.programId ? 'adapted' : prev.runClassification,
        exercises: [...prev.exercises, {
          exerciseId,
          exerciseName: exercise.name || exercise.exerciseName || '',
          primary_muscle: exercise.primary_muscle || null,
          secondary_muscle: exercise.secondary_muscle || null,
          equipment_type: exercise.equipment_type || null,
          sets: [freshSet({
            weight_kg: null,
            reps: null,
            set_type: 'working',
            ...pinnedForExercise,
            _restExplicit: hasValue(pinnedForExercise.rest_seconds),
            _pinnedFields: pinnedFields,
            _unpinnedFields: [],
            client_ts: Date.now(),
          })],
        }],
      }
    })
  }, [update, pinnedValues])

  const removeExercise = useCallback((exerciseIdx) => {
    update(prev => {
      if (!prev) return prev
      const removed = prev.exercises[exerciseIdx]
      const exercises = prev.exercises.filter((_, i) => i !== exerciseIdx)
      const plannedId = removed?.plannedExerciseId || removed?.planned_exercise_id || null
      const removedPlannedExercises = plannedId
        ? [
            ...(prev.removedPlannedExercises || []),
            {
              exerciseId: removed.exerciseId,
              exerciseName: removed.exerciseName || removed.exerciseId,
              plannedExerciseId: plannedId,
              removedAt: new Date().toISOString(),
            },
          ]
        : (prev.removedPlannedExercises || [])
      return {
        ...prev,
        runClassification: prev.programId && plannedId ? 'adapted' : prev.runClassification,
        exercises,
        removedPlannedExercises,
      }
    })
  }, [update])

  const addSet = useCallback((exerciseIdx, overrides = {}) => {
    update(prev => {
      if (!prev) return prev
      const exercises = prev.exercises.map((ex, i) => {
        if (i !== exerciseIdx) return ex
        const pinnedForExercise = pinsForExercise(pinnedValues, ex.exerciseId)
        const pinnedFields = Object.keys(pinnedForExercise)
        return {
          ...ex,
          sets: [...ex.sets, freshSet({
            weight_kg: null,
            reps: null,
            ...pinnedForExercise,
            _restExplicit: hasValue(pinnedForExercise.rest_seconds),
            _pinnedFields: pinnedFields,
            _unpinnedFields: [],
            client_ts: Date.now(),
            ...overrides,
          })],
        }
      })
      return {
        ...prev,
        exercises,
      }
    })
  }, [update, pinnedValues])

  const removeSet = useCallback((exerciseIdx, setIdx) => {
    update(prev => {
      if (!prev) return prev
      const exercises = prev.exercises.map((ex, i) => {
        if (i !== exerciseIdx) return ex
        return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) }
      })
      return {
        ...prev,
        exercises,
      }
    })
  }, [update])

  const updateSet = useCallback((exerciseIdx, setIdx, patch) => {
    update(prev => {
      if (!prev) return prev
      let nextOrder = prev.nextSessionSetOrder || nextSessionSetOrder(prev)
      const exercises = prev.exercises.map((ex, i) => {
        if (i !== exerciseIdx) return ex
        return {
          ...ex,
          sets: ex.sets.map((s, j) => {
            if (j !== setIdx) return s
            const nextSet = { ...s, ...patch }
            if (patch.done === true && !s.session_set_order) {
              nextSet.session_set_order = nextOrder
              nextOrder += 1
            }
            return nextSet
          }),
        }
      })
      return { ...prev, nextSessionSetOrder: nextOrder, exercises }
    })
  }, [update])

  const toggleCollapsed = useCallback((idx) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx); else next.add(idx)
      return next
    })
  }, [])

  const pinField = useCallback((exerciseIdx, field, value) => {
    setPinnedValues(prev => {
      const exerciseId = workoutRef.current?.exercises?.[exerciseIdx]?.exerciseId
      if (!exerciseId) return prev
      const next = {
        ...prev,
        [exerciseId]: {
          ...(prev[exerciseId] || {}),
          [field]: value,
        },
      }
      savePinned(next)
      return next
    })
  }, [])

  const unpinField = useCallback((exerciseIdx, field) => {
    setPinnedValues(prev => {
      const exerciseId = workoutRef.current?.exercises?.[exerciseIdx]?.exerciseId
      if (!exerciseId) return prev
      const next = { ...prev }
      const exercisePins = { ...(next[exerciseId] || {}) }
      delete exercisePins[field]
      if (Object.keys(exercisePins).length) next[exerciseId] = exercisePins
      else delete next[exerciseId]
      savePinned(next)
      return next
    })
  }, [])

  const finishWorkout = useCallback(async (meta = {}, options = {}) => {
    const w = workoutRef.current
    if (!w) return null
    if (w.finalizedAt) return { ok: false, error: 'This workout has already been saved.' }
    if (saveInFlightRef.current) return null
    const validationErrors = validateWorkoutForSave(w)
    if (validationErrors.length) {
      const message = validationErrors.slice(0, 4).join('\n')
      toast(message, 'error')
      return { ok: false, error: message, validationErrors }
    }
    saveInFlightRef.current = true
    clearTimeout(debounceRef.current)
    setSyncStatus('saving')
    setSyncError('')
    // session_position computed by backend from set_number + timestamps; here we just send the sets in order.
    const allSets = []
    for (const ex of w.exercises) {
      const inherited = {}
      ex.sets.forEach((s, idx) => {
        const effective = { ...s }
        for (const key of RESEARCH_FIELD_KEYS) {
          if (s._unpinnedFields?.includes(key)) {
            delete inherited[key]
            if (key !== 'set_type') effective[key] = key === 'failure' || key === 'pain_flag' ? false : null
            continue
          }
          if (s[key] !== null && s[key] !== undefined && s[key] !== '') {
            inherited[key] = s[key]
          } else if (inherited[key] !== null && inherited[key] !== undefined && inherited[key] !== '') {
            effective[key] = inherited[key]
          }
        }
        if (!shouldSaveSet(effective)) return
        if (!hasValue(effective.weight_kg) || !hasValue(effective.reps)) return
        allSets.push({
          exercise_id: ex.exerciseId,
          planned_exercise_id: effective.planned_exercise_id || ex.plannedExerciseId || ex.exerciseId,
          template_set_id: effective.template_set_id || null,
          set_number: idx + 1,
          set_type: effective.set_type,
          weight_kg: effective.weight_kg,
          reps: effective.reps,
          rir: effective.rir,
          failure: effective.failure ? 1 : 0,
          rom_category: effective.rom_category || null,
          tempo_tag: effective.tempo_tag || null,
          rest_seconds: effective.rest_seconds ?? null,
          set_notes: effective.set_notes || null,
          session_set_order: effective.session_set_order ?? null,
          equipment_type: effective.equipment_type || ex.equipment_type || null,
          pain_flag: effective.pain_flag ? 1 : 0,
          client_ts: effective.client_ts,
        })
      })
    }
    const durationMin = Math.max(1, Math.round(elapsedSec / 60))
    try {
      const result = await api.post('/workouts', {
        date: localDateString(w.startedAt),
        start_time: w.startedAt,
        duration_min: durationMin,
        workout_day: w.dayLabel || null,
        template_id: w.templateId || null,
        program_id: w.programId || null,
        program_session_id: w.programSessionId || null,
        run_classification: classifyProgramRun(w),
        sets: allSets,
        ...meta,
      })
      await api.del('/active-workout').catch(() => {})
      clearLocalActiveWorkout()
      setWorkout(options.keepLocal
        ? { ...w, finalizedAt: new Date().toISOString(), savedWorkoutId: result.workout?.id || null }
        : null)
      setCollapsed(new Set())
      setSyncStatus('idle')
      setSyncError('')
      setRestTimer(t => ({ ...t, active: false }))
      return result
    } catch (err) {
      const message = err.message || 'Failed to save workout'
      toast(message, 'error')
      return { ok: false, error: message }
    } finally {
      saveInFlightRef.current = false
    }
  }, [elapsedSec, toast])

  const clearLocalWorkout = useCallback(() => {
    clearLocalActiveWorkout()
    setWorkout(null)
    setCollapsed(new Set())
    setSyncStatus('idle')
    setSyncError('')
    setRestoreError('')
    setRestTimer(t => ({ ...t, active: false }))
  }, [])

  const discardWorkout = useCallback(async () => {
    clearTimeout(debounceRef.current)
    await api.del('/active-workout').catch(() => {})
    clearLocalActiveWorkout()
    setWorkout(null)
    setCollapsed(new Set())
    setSyncStatus('idle')
    setSyncError('')
    setRestoreError('')
    setRestTimer(t => ({ ...t, active: false }))
  }, [])

  const startRestTimer = useCallback((durationSec = 90) => {
    const nextDuration = Math.min(600, Math.max(15, Number(durationSec) || 90))
    setRestTimer({ active: true, durationSec: nextDuration, startedAt: Date.now() })
  }, [])

  const dismissRestTimer = useCallback(() => {
    setRestTimer(t => ({ ...t, active: false }))
  }, [])

  const sortedExercises = useMemo(() => {
    if (!workout) return []
    return workout.exercises.map((ex, originalIdx) => ({ ...ex, originalIdx }))
  }, [workout])

  const value = {
    workout,
    loading,
    sortedExercises,
    collapsed,
    pinnedFields: new Set(Object.keys(pinnedValues).filter(key => key !== GLOBAL_PIN_SCOPE)),
    pinnedValues,
    elapsedSec,
    restTimer,
    syncStatus,
    syncError,
    restoreError,
    startWorkout,
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    updateSet,
    toggleCollapsed,
    pinField,
    unpinField,
    finishWorkout,
    clearLocalWorkout,
    discardWorkout,
    startRestTimer,
    dismissRestTimer,
  }

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext)
  if (!ctx) throw new Error('useWorkout must be used inside <WorkoutProvider>')
  return ctx
}
