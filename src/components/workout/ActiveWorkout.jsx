import { useEffect, useMemo, useState } from 'react'
import ExerciseCard from './ExerciseCard.jsx'
import AddExerciseSheet from './AddExerciseSheet.jsx'
import FinishSheet from './FinishSheet.jsx'
import CelebrationCard from './CelebrationCard.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { ConfirmSheet } from '../ui/ConfirmSheet.jsx'
import { useWorkout } from '../../hooks/useWorkout.jsx'
import { useNavigate } from 'react-router-dom'
import { SEED_EXERCISES } from '../../lib/exercises.js'
import { topLevelGroup, muscleColor } from '../../lib/musclePalette.js'
import { formatElapsed } from '../../lib/formatTime.js'
import { api } from '../../lib/api.js'

const DETAIL_FIELDS = ['rir', 'rest_seconds', 'rom_category', 'tempo_tag']
const WEIGHT_MIN = 0
const WEIGHT_MAX = 1500
const REPS_MIN = 0
const REPS_MAX = 500

export default function ActiveWorkout() {
  const wo = useWorkout()
  const navigate = useNavigate()
  const [addOpen, setAddOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [celebration, setCelebration] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [researchDetailsVisible, setResearchDetailsVisible] = useState(true)
  const [lastSession, setLastSession] = useState({}) // { exerciseId: [{weight_kg, reps}, ...] }
  const workoutStartedAt = wo.workout?.startedAt
  const finalized = !!wo.workout?.finalizedAt

  // Fetch the user's last 20 workouts and capture the most recent session per exercise (for ghosted hints)
  useEffect(() => {
    if (!workoutStartedAt) return
    let cancelled = false
    api.get('/workouts?limit=20').then(data => {
      if (cancelled) return
      // workouts come back date DESC, created_at DESC. The first workout containing an exercise wins.
      const map = {}
      for (const w of data.workouts || []) {
        for (const s of w.sets || []) {
          if (map[s.exercise_id]) continue // already captured a more-recent session
          // collect ALL sets from THIS workout for THIS exercise
          const exSets = (w.sets || [])
            .filter(x => x.exercise_id === s.exercise_id && x.weight_kg != null)
            .sort((a, b) => (a.session_position - b.session_position) || (a.set_number - b.set_number))
            .map(x => ({
              weight_kg: x.weight_kg,
              reps: x.reps,
              rir: x.rir,
              rest_seconds: x.rest_seconds,
              rom_category: x.rom_category,
              tempo_tag: x.tempo_tag,
            }))
          if (exSets.length) map[s.exercise_id] = exSets
        }
      }
      setLastSession(map)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [workoutStartedAt])

  // Hydrate render rows with muscle/equipment from seed catalog
  const renderRows = useMemo(() => {
    if (!wo.workout) return []
    const byId = new Map(SEED_EXERCISES.map(e => [e.id, e]))
    return wo.sortedExercises.map(ex => {
      const seed = byId.get(ex.exerciseId)
      return {
        ...ex,
        exerciseName: ex.exerciseName || seed?.name || ex.exerciseId,
        primary_muscle: ex.primary_muscle || seed?.primary_muscle || null,
        secondary_muscle: ex.secondary_muscle || seed?.secondary_muscle || null,
        equipment_type: ex.equipment_type || seed?.equipment_type || null,
      }
    })
  }, [wo.sortedExercises, wo.workout])

  // Live totals
  const totals = useMemo(() => {
    let totalSets = 0
    let volume = 0
    const byGroup = {}
    for (const ex of renderRows) {
      const group = topLevelGroup(ex.primary_muscle)
      for (const s of ex.sets) {
        if (s.set_type === 'warmup') continue
        if (hasWeightAndReps(s)) {
          totalSets += 1
          volume += Number(s.weight_kg) * Number(s.reps)
          if (group) byGroup[group] = (byGroup[group] || 0) + 1
        }
      }
    }
    const groupChips = Object.entries(byGroup)
      .sort((a, b) => b[1] - a[1])
      .map(([group, n]) => ({ group, n }))
    return { totalSets, volume, groupChips }
  }, [renderRows])

  const audit = useMemo(() => buildFinishAudit({
    exercises: renderRows,
    elapsedSec: wo.elapsedSec,
    removedPlannedExercises: wo.workout?.removedPlannedExercises || [],
  }), [renderRows, wo.elapsedSec, wo.workout?.removedPlannedExercises])

  const summaryPreview = useMemo(() => buildWorkoutSummary({
    exercises: renderRows,
    elapsedSec: wo.elapsedSec,
    removedPlannedExercises: wo.workout?.removedPlannedExercises || [],
  }), [renderRows, wo.elapsedSec, wo.workout?.removedPlannedExercises])

  if (!wo.workout) return null

  function handleSetCompleted(set) {
    const selectedRest = set?._restExplicit ? set?.rest_seconds : null
    const durationSec = Number(selectedRest ?? set?.planned_rest_seconds)
    if (Number.isFinite(durationSec) && durationSec > 0) {
      wo.startRestTimer(durationSec)
    }
  }

  function toggleResearchDetails() {
    setResearchDetailsVisible(visible => {
      const next = !visible
      if (!next) wo.dismissRestTimer()
      return next
    })
  }

  async function handleFinish(meta) {
    if (saving) return
    setSaving(true)
    setSaveError('')
    const result = await wo.finishWorkout(meta, { keepLocal: true })
    setSaving(false)
    if (!result || result.ok === false) {
      setSaveError(result?.error || 'Could not save workout. Your workout is still open.')
      return
    }
    setFinishOpen(false)
    const prsHit = (result.prsHit || []).map(pr => ({
      ...pr,
      exercise_name: SEED_EXERCISES.find(e => e.id === pr.exercise_id)?.name || pr.exercise_id,
    }))
    const savedSummary = buildWorkoutSummary({
      exercises: hydrateSavedExercises(result.workout?.sets || [], renderRows),
      elapsedSec: wo.elapsedSec,
      removedPlannedExercises: wo.workout?.removedPlannedExercises || [],
      workout: result.workout,
    })
    setCelebration({
      workoutId: result.workout?.id,
      prsHit,
      summary: savedSummary,
    })
  }

  function progressUrl() {
    const ids = celebration?.prsHit.map(p => p.exercise_id).join(',') || ''
    return `/progress?tab=lifts${ids ? `&highlight=${encodeURIComponent(ids)}` : ''}`
  }

  function handleCelebrationDone() {
    setCelebration(null)
    wo.clearLocalWorkout()
    navigate('/workout', { replace: true })
  }

  function handleViewProgress() {
    const target = progressUrl()
    setCelebration(null)
    wo.clearLocalWorkout()
    navigate(target, { replace: true })
  }

  function handleSaveTemplateFromSummary() {
    const workoutId = celebration?.workoutId
    if (!workoutId) return
    setCelebration(null)
    wo.clearLocalWorkout()
    navigate(`/templates/new?workout=${encodeURIComponent(workoutId)}`)
  }

  function handleSharePost() {
    const workoutId = celebration?.workoutId
    if (!workoutId) return
    setCelebration(null)
    wo.clearLocalWorkout()
    navigate(`/community?shareWorkout=${encodeURIComponent(workoutId)}`)
  }

  function handleJumpToAuditItem(item) {
    setFinishOpen(false)
    const id = item?.exerciseId ? exerciseDomId(item.exerciseId) : null
    window.setTimeout(() => {
      if (!id) return
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
  }

  async function handleDiscard() {
    await wo.discardWorkout()
  }

  function handleConfirmRemove() {
    if (!removeTarget) return
    wo.removeExercise(removeTarget.index)
    setRemoveTarget(null)
  }

  return (
    <div className="workout-log min-h-screen pb-32">
      <div className="workout-log-header sticky top-0 z-20">
        <div className="safe-pt-3 px-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            <button
              onClick={() => setDiscardOpen(true)}
              className="min-h-11 px-1 text-sm font-semibold"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Discard workout"
            >
              Discard
            </button>
            <div className="min-w-0 flex-1 text-center">
              <div className="font-mono text-display font-black tabular-nums" style={{ color: 'var(--text)' }}>{formatElapsed(wo.elapsedSec)}</div>
              <div className="mt-0.5 text-caption font-semibold" style={{ color: 'var(--text-muted)' }}>
                <span className="font-mono tabular-nums">{totals.totalSets}</span> sets
                <span className="px-1.5" style={{ color: 'var(--ink-soft)' }}>·</span>
                <span className="font-mono tabular-nums">{Math.round(totals.volume)}</span> kg
              </div>
              <SaveStatus status={wo.syncStatus} error={wo.syncError} />
            </div>
            <button
              onClick={() => { if (!finalized) { setSaveError(''); setFinishOpen(true) } }}
              disabled={finalized}
              className="min-h-11 rounded-full px-4 text-sm font-black transition-colors disabled:opacity-45"
              style={{ background: 'var(--emerald)', color: 'var(--on-emerald)' }}
            >
              {finalized ? 'Saved' : 'Finish'}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
            <div className="min-w-0 truncate text-caption" style={{ color: 'var(--text-muted)' }}>
              {wo.workout.dayLabel ? `${wo.workout.dayLabel} day` : 'Active workout'}
            </div>
            <button
              type="button"
              onClick={toggleResearchDetails}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-caption font-black transition-colors"
              style={{
                borderColor: researchDetailsVisible ? 'var(--emerald)' : 'var(--border)',
                background: researchDetailsVisible ? 'var(--emerald)' : 'transparent',
                color: researchDetailsVisible ? 'var(--on-emerald)' : 'var(--text-muted)',
              }}
              aria-pressed={researchDetailsVisible}
            >
              <SlidersIcon />
              Advanced {researchDetailsVisible ? 'on' : 'off'}
            </button>
          </div>
        </div>
        {totals.groupChips.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto border-t px-4 py-2 no-scrollbar" style={{ borderColor: 'var(--border)' }}>
            {totals.groupChips.map(({ group, n }) => (
              <span
                key={group}
                className="whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-black"
                style={{ background: muscleColor(group), color: '#fff' }}
              >
                {group} <span className="font-mono tabular-nums opacity-80">{n}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2">
        {renderRows.length === 0 && (
          <div className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No exercises yet. Tap <span style={{ color: 'var(--text)' }}>+ Add exercise</span> below.
          </div>
        )}
        {renderRows.map(ex => (
          <ExerciseCard
            key={ex.exerciseId}
            domId={exerciseDomId(ex.exerciseId)}
            exercise={ex}
            index={ex.originalIdx}
            prevSession={lastSession[ex.exerciseId] || null}
            pinnedFields={wo.pinnedFields}
            pinnedValues={{ ...(wo.pinnedValues?._global || {}), ...(wo.pinnedValues?.[ex.exerciseId] || {}) }}
            onUpdateSet={wo.updateSet}
            onAddSet={wo.addSet}
            onRemoveSet={wo.removeSet}
            onPinField={wo.pinField}
            onUnpinField={wo.unpinField}
            onSetCompleted={handleSetCompleted}
            onRestTimerStart={wo.startRestTimer}
            onRequestRemove={(exercise, index) => setRemoveTarget({ exercise, index })}
            researchDetailsVisible={researchDetailsVisible}
          />
        ))}

        <button
          onClick={() => setAddOpen(true)}
          className="mx-4 mt-3 block min-h-12 w-[calc(100%-2rem)] border-y text-sm font-black transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          + Add exercise
        </button>
      </div>

      <AddExerciseSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onPick={(ex) => wo.addExercise(ex)}
        excludeIds={renderRows.map(e => e.exerciseId)}
      />
      <RemoveExerciseSheet
        target={removeTarget}
        onClose={() => setRemoveTarget(null)}
        onRemove={handleConfirmRemove}
      />
      <FinishSheet
        open={finishOpen}
        onClose={() => { setSaveError(''); setFinishOpen(false) }}
        onSave={handleFinish}
        saving={saving}
        error={saveError}
        audit={audit}
        summary={summaryPreview}
        onJumpToItem={handleJumpToAuditItem}
      />
      <ConfirmSheet
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={() => { setDiscardOpen(false); handleDiscard() }}
        title="Discard workout?"
        message="All logged sets will be lost. This cannot be undone."
        confirmLabel="Discard"
        danger
      />
      <CelebrationCard
        visible={!!celebration}
        workoutId={celebration?.workoutId}
        prsHit={celebration?.prsHit || []}
        summary={celebration?.summary}
        onDone={handleCelebrationDone}
        onViewProgress={handleViewProgress}
        onSaveTemplate={handleSaveTemplateFromSummary}
        onSharePost={handleSharePost}
      />
    </div>
  )
}

function SlidersIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" d="M4 7h5m4 0h7M4 17h9m4 0h3" />
      <circle cx="11" cy="7" r="2" />
      <circle cx="15" cy="17" r="2" />
    </svg>
  )
}

function isLoggedSet(set) {
  const hasWeight = set.weight_kg !== null && set.weight_kg !== undefined && set.weight_kg !== ''
  const hasReps = set.reps !== null && set.reps !== undefined && set.reps !== ''
  return !!set.done || hasWeight || hasReps
}

function exerciseDomId(exerciseId) {
  return `active-exercise-${String(exerciseId || '').replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== ''
}

function hasWeightAndReps(set) {
  return hasValue(set.weight_kg) && hasValue(set.reps)
}

function isWorkingSet(set) {
  return set.set_type !== 'warmup' && hasWeightAndReps(set)
}

function isPlannedSet(set) {
  return hasValue(set.planned_weight_kg) || hasValue(set.planned_reps) || hasValue(set.template_set_id) || hasValue(set.planned_exercise_id)
}

function setLabel(exercise, setIdx) {
  return `${exercise.exerciseName || exercise.exerciseId} set ${setIdx + 1}`
}

function buildFinishAudit({ exercises = [], elapsedSec = 0, removedPlannedExercises = [] }) {
  const items = []
  let saveableSets = 0
  let volume = 0

  exercises.forEach(exercise => {
    ;(exercise.sets || []).forEach((set, setIdx) => {
      const hasWeight = hasValue(set.weight_kg)
      const hasReps = hasValue(set.reps)
      const weight = Number(set.weight_kg)
      const reps = Number(set.reps)
      const completed = !!set.done
      const validWeight = hasWeight && Number.isFinite(weight) && weight >= WEIGHT_MIN && weight <= WEIGHT_MAX
      const validReps = hasReps && Number.isInteger(reps) && reps >= REPS_MIN && reps <= REPS_MAX
      const saveable = validWeight && validReps
      if (saveable) {
        saveableSets += 1
        if (set.set_type !== 'warmup') volume += weight * reps
      }
      const base = { exerciseId: exercise.exerciseId, setIdx, label: setLabel(exercise, setIdx) }
      if (!hasWeight && !hasReps) {
        items.push({
          ...base,
          severity: completed ? 'critical' : 'warning',
          title: completed ? 'Completed blank set' : 'Blank set row',
          detail: completed ? 'Add weight and reps or uncheck it before saving.' : 'This row will be ignored unless you log it.',
        })
      } else if (hasWeight !== hasReps) {
        items.push({
          ...base,
          severity: completed ? 'critical' : 'warning',
          title: completed ? 'Completed incomplete set' : 'Incomplete row',
          detail: hasWeight ? 'Weight is filled but reps are missing.' : 'Reps are filled but weight is missing.',
        })
      }
      if (hasWeight && !validWeight) {
        items.push({
          ...base,
          severity: 'critical',
          title: 'Invalid weight',
          detail: `Weight must be between ${WEIGHT_MIN} and ${WEIGHT_MAX} kg.`,
        })
      }
      if (hasReps && !validReps) {
        items.push({
          ...base,
          severity: 'critical',
          title: 'Invalid reps',
          detail: `Reps must be a whole number between ${REPS_MIN} and ${REPS_MAX}.`,
        })
      }
      if (isPlannedSet(set) && !saveable) {
        items.push({
          ...base,
          severity: 'warning',
          title: 'Skipped planned set',
          detail: 'This planned set has no logged weight and reps.',
        })
      }
      if (saveable && set.set_type !== 'warmup' && DETAIL_FIELDS.every(field => !hasValue(set[field]))) {
        items.push({
          ...base,
          severity: 'warning',
          title: 'Missing set details',
          detail: 'No RIR, rest, ROM, or tempo detail is logged for this working set.',
        })
      }
      if (saveable && weight * reps > 10000) {
        items.push({
          ...base,
          severity: 'warning',
          title: 'Unusual set volume',
          detail: `${weight * reps} kg x reps looks unusually high.`,
        })
      }
    })
  })

  if (!saveableSets) {
    items.unshift({
      severity: 'critical',
      title: 'Empty workout',
      detail: 'Add at least one set with weight and reps before saving.',
    })
  }
  removedPlannedExercises.forEach(exercise => {
    items.push({
      severity: 'warning',
      title: 'Removed planned exercise',
      detail: `${exercise.exerciseName || exercise.exerciseId} was removed from this session only.`,
    })
  })
  const durationMin = Math.max(1, Math.round(elapsedSec / 60))
  if (durationMin < 3 && saveableSets >= 3) {
    items.push({ severity: 'warning', title: 'Strange duration', detail: `${durationMin} minutes is very short for ${saveableSets} logged sets.` })
  }
  if (durationMin > 240) {
    items.push({ severity: 'warning', title: 'Strange duration', detail: `${durationMin} minutes is unusually long. Check the timer before saving.` })
  }
  if (volume > 80000) {
    items.push({ severity: 'warning', title: 'Unusual volume', detail: `${Math.round(volume)} kg total volume is unusually high.` })
  }

  return {
    items,
    criticalCount: items.filter(item => item.severity === 'critical').length,
    warningCount: items.filter(item => item.severity !== 'critical').length,
  }
}

function buildWorkoutSummary({ exercises = [], elapsedSec = 0, removedPlannedExercises = [], workout = null }) {
  const durationMin = workout?.duration_min || Math.max(1, Math.round(elapsedSec / 60))
  const workingSets = []
  const exerciseIds = new Set()
  let volume = 0
  let plannedSets = 0
  let completedPlannedSets = 0

  const direct = {}
  const secondary = {}
  for (const exercise of exercises) {
    const sets = exercise.sets || []
    if (sets.some(hasWeightAndReps)) exerciseIds.add(exercise.exerciseId)
    for (const set of sets) {
      if (isPlannedSet(set)) plannedSets += 1
      if (isPlannedSet(set) && hasWeightAndReps(set)) completedPlannedSets += 1
      if (!isWorkingSet(set)) continue
      workingSets.push(set)
      volume += Number(set.weight_kg) * Number(set.reps)
      const primary = exercise.primary_muscle || 'Other'
      const group = topLevelGroup(primary) || primary
      direct[group] ||= { total: 0, specific: {} }
      direct[group].total += 1
      direct[group].specific[primary] = (direct[group].specific[primary] || 0) + 1
      if (exercise.secondary_muscle) {
        secondary[exercise.secondary_muscle] = (secondary[exercise.secondary_muscle] || 0) + 1
      }
    }
  }

  const directGroups = Object.entries(direct)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([group, data]) => ({
      group,
      total: data.total,
      specific: Object.entries(data.specific).sort((a, b) => b[1] - a[1]).map(([muscle, count]) => ({ muscle, count })),
    }))

  return {
    durationMin,
    workingSetCount: workingSets.length,
    volume: Math.round(volume),
    exerciseCount: exerciseIds.size,
    plannedSets,
    completedPlannedSets,
    removedExercises: removedPlannedExercises,
    adherence: plannedSets ? Math.round((completedPlannedSets / plannedSets) * 100) : null,
    muscleBreakdown: {
      directGroups,
      secondary: Object.entries(secondary).sort((a, b) => b[1] - a[1]).map(([muscle, count]) => ({ muscle, count })),
    },
  }
}

function hydrateSavedExercises(savedSets = [], activeExercises = []) {
  const activeById = new Map(activeExercises.map(ex => [ex.exerciseId, ex]))
  const byId = new Map()
  for (const set of savedSets) {
    const active = activeById.get(set.exercise_id)
    if (!byId.has(set.exercise_id)) {
      byId.set(set.exercise_id, {
        exerciseId: set.exercise_id,
        exerciseName: set.exercise_name || active?.exerciseName || set.exercise_id,
        primary_muscle: set.primary_muscle || active?.primary_muscle || null,
        secondary_muscle: active?.secondary_muscle || null,
        sets: [],
      })
    }
    byId.get(set.exercise_id).sets.push(set)
  }
  return [...byId.values()]
}

function RemoveExerciseSheet({ target, onClose, onRemove }) {
  const exercise = target?.exercise
  const loggedSets = exercise?.sets?.filter(isLoggedSet).length || 0
  const planned = !!exercise?.plannedExerciseId
  return (
    <Sheet open={!!target} onClose={onClose} title="Delete exercise">
      <div className="p-4 space-y-4">
        <div>
          <div className="text-lg font-semibold text-gray-100">{exercise?.exerciseName || 'Exercise'}</div>
          <div className="mt-1 text-sm text-gray-400">
            {loggedSets > 0
              ? `Deleting this exercise removes ${loggedSets} logged set${loggedSets === 1 ? '' : 's'} from the active workout.`
              : 'This deletes the exercise from the active workout.'}
          </div>
          {planned && (
            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              This came from a template or program. The original plan will not be changed.
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-3 text-sm font-semibold text-gray-300"
          >
            Keep
          </button>
          <button
            type="button"
            onClick={onRemove}
            data-testid="confirm-delete-exercise"
            className="rounded-xl bg-red-600 px-3 py-3 text-sm font-semibold text-white hover:bg-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </Sheet>
  )
}

function SaveStatus({ status, error }) {
  if (status === 'idle') return null
  const saving = status === 'saving'
  const saved = status === 'saved'
  const label = saving ? 'Saving...' : saved ? 'Saved' : 'Not saved - autosave failed'
  const color = saving ? 'text-amber-300' : saved ? 'text-emerald-300' : 'text-red-300'
  return (
    <div className={'mt-1 text-[10px] font-semibold max-w-44 truncate ' + color} title={error || label}>
      {label}
      {error && status === 'error' ? <div className="normal-case tracking-normal text-[10px] text-red-200 truncate">{error}</div> : null}
    </div>
  )
}
