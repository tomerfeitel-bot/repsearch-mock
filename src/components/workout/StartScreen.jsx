import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { splitDaysForProfile } from '../../lib/splits.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useToast } from '../ui/Toast.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { api } from '../../lib/api.js'
import { SEED_EXERCISES } from '../../lib/exercises.js'
import { topLevelGroup } from '../../lib/musclePalette.js'

const DAY_HINTS = {
  Push: 'Chest, Shoulders, Triceps',
  Pull: 'Back, Biceps, Rear Delts',
  Legs: 'Quads, Hamstrings, Glutes, Calves',
  Upper: 'Chest, Back, Shoulders, Arms',
  Lower: 'Quads, Hamstrings, Glutes, Calves',
  'Full Body': 'Everything in one session',
  Chest: 'Chest day',
  Back: 'Back day',
  Shoulders: 'Shoulder day',
  Arms: 'Biceps + Triceps',
  Other: 'Cardio, mobility, or off-split',
}

const HISTORY_PAGE_SIZE = 50

export default function StartScreen({ onStart, restoreError = '' }) {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const days = splitDaysForProfile(user)
  const [activeProgram, setActiveProgram] = useState(null)
  const [templates, setTemplates] = useState([])
  const [recentWorkouts, setRecentWorkouts] = useState([])
  const [loadingStarts, setLoadingStarts] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [startLoadError, setStartLoadError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [historyOffset, setHistoryOffset] = useState(0)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [repeatMode] = useState('empty')
  const seedById = new Map(SEED_EXERCISES.map(e => [e.id, e]))

  const [expandedDay, setExpandedDay] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoadingStarts(true)
    setStartLoadError('')
    Promise.all([
      api.get('/programs/active/next').catch(err => ({ __error: err, program: null })),
      api.get('/templates').catch(err => ({ __error: err, templates: [] })),
      api.get('/workouts?limit=50').catch(err => ({ __error: err, workouts: [] })),
    ]).then(([programData, templateData, workoutData]) => {
      if (cancelled) return
      if ([programData, templateData, workoutData].some(data => data?.__error)) {
        setStartLoadError('Some saved starts could not be loaded. You can still start a blank workout.')
      }
      setActiveProgram(programData?.program && (programData?.next_session || programData?.completed) ? programData : null)
      setTemplates(templateData?.templates || [])
      setRecentWorkouts(workoutData?.workouts || [])
    }).finally(() => {
      if (!cancelled) setLoadingStarts(false)
    })
    return () => { cancelled = true }
  }, [])

  async function loadHistory({ reset = false } = {}) {
    setHistoryOpen(true)
    if (!reset && history.length && history.length >= historyTotal) return
    const offset = reset ? 0 : historyOffset
    setHistoryLoading(true)
    setHistoryError('')
    try {
      const data = await api.get(`/workouts?limit=${HISTORY_PAGE_SIZE}&offset=${offset}`)
      const workouts = data.workouts || []
      setHistory(prev => reset ? workouts : [...prev, ...workouts])
      setHistoryOffset(offset + workouts.length)
      setHistoryTotal(data.total || workouts.length)
    } catch (err) {
      setHistoryError(err.message || 'Could not load past workouts.')
    } finally {
      setHistoryLoading(false)
    }
  }

  function repeatPast(w) {
    const exMap = new Map()
    const order = []
    const sortedSets = [...(w.sets || [])].sort((a, b) => (
      (a.session_position ?? 0) - (b.session_position ?? 0) ||
      (a.set_number ?? 0) - (b.set_number ?? 0)
    ))
    for (const s of sortedSets) {
      if (!exMap.has(s.exercise_id)) {
        const seed = seedById.get(s.exercise_id)
        exMap.set(s.exercise_id, {
          exerciseId: s.exercise_id,
          exerciseName: seed?.name || s.exercise_name || s.exercise_id,
          primary_muscle: seed?.primary_muscle || s.primary_muscle || null,
          equipment_type: s.equipment_type || seed?.equipment_type || null,
          sets: [],
        })
        order.push(s.exercise_id)
      }
      exMap.get(s.exercise_id).sets.push({
        set_type: s.set_type || 'working',
        weight_kg: s.weight_kg,
        reps: s.reps,
        rir: s.rir,
        rest_seconds: s.rest_seconds,
        rom_category: s.rom_category,
        tempo_tag: s.tempo_tag,
        failure: !!s.failure,
        template_set_id: s.template_set_id || null,
      })
    }
    onStart({
      dayLabel: getItemDayLabel(w) || null,
      exercises: order.map(id => exMap.get(id)),
      copyPreviousValues: repeatMode === 'copy',
    })
    setHistoryOpen(false)
  }

  function templateExercises(template) {
    return (template.exercises || []).map(e => {
      const seed = seedById.get(e.exercise_id)
      return {
        exerciseId: e.exercise_id,
        exerciseName: seed?.name || e.exercise_name || e.exercise_id,
        primary_muscle: seed?.primary_muscle || e.primary_muscle || null,
        secondary_muscle: seed?.secondary_muscle || e.secondary_muscle || null,
        equipment_type: seed?.equipment_type || e.equipment_type || null,
        plannedExerciseId: e.id || e.exercise_id,
        sets: e.sets || [],
      }
    })
  }

  async function startTemplate(template, extras = {}) {
    try {
      const data = await api.get(`/templates/${template.id}`)
      const fullTemplate = data.template
      const { dayLabel: requestedDayLabel, ...restExtras } = extras
      onStart({
        name: extras.name || fullTemplate.name,
        dayLabel: requestedDayLabel || getItemDayLabel(fullTemplate) || null,
        templateId: fullTemplate.id,
        exercises: templateExercises(fullTemplate),
        ...restExtras,
      })
    } catch (err) {
      toast?.(err.message || 'Failed to start template', 'error')
    }
  }

  async function startActiveProgram() {
    const session = activeProgram?.next_session
    if (!session?.template_id) return
    await startTemplate({ id: session.template_id }, {
      name: session.session_label || activeProgram.program?.name || 'Program workout',
      dayLabel: session.session_label || null,
      programId: activeProgram.program?.id,
      programSessionId: session.id,
      runClassification: 'exact',
    })
  }

  async function restartProgram() {
    const programId = activeProgram?.program?.id
    if (!programId) return
    try {
      const result = await api.post(`/programs/${programId}/start`, { accepted_minimum_weeks: true })
      const next = { ...activeProgram, completed: false, phase: { next_session_id: result.next_session_id, next_suggested_at: result.next_suggested_at }, next_session: { id: result.next_session_id, template_id: result.template_id } }
      setActiveProgram(next)
      await startTemplate({ id: result.template_id }, {
        name: activeProgram.program?.name || 'Program workout',
        programId,
        programSessionId: result.next_session_id,
        runClassification: 'exact',
      })
    } catch (err) {
      toast?.(err.message || 'Failed to restart program', 'error')
    }
  }

  function workoutSummary(w) {
    const sets = w.sets || []
    const byExercise = new Map()
    for (const set of sets) {
      if (!set.exercise_id || byExercise.has(set.exercise_id)) continue
      const seed = seedById.get(set.exercise_id)
      byExercise.set(set.exercise_id, {
        name: seed?.name || set.exercise_name || set.exercise_id,
        muscle: seed?.primary_muscle || set.primary_muscle || null,
      })
    }
    const exercises = [...byExercise.values()]
    const exerciseNames = exercises.map(exercise => exercise.name)
    const muscleGroups = [...new Set(exercises
      .map(exercise => topLevelGroup(exercise.muscle))
      .filter(Boolean))]
    return {
      exerciseNames,
      muscleGroups,
      setCount: sets.length,
    }
  }

  function getItemDayLabel(item) {
    return String(item?.workout_day || item?.workout_split_type || '').trim()
  }

  const normalDays = useMemo(() => {
    const normalSplitDays = days.filter(day => day !== 'Other')
    return new Set(normalSplitDays)
  }, [days])

  function matchesSplitDay(item, day, normalDaysSet) {
    const label = getItemDayLabel(item)
    if (day === 'Other') {
      return !label || label === 'Other' || !normalDaysSet.has(label)
    }
    return label === day
  }

  const ownedTemplates = useMemo(() => {
    return templates.filter(t => t.user_id === user?.id && t.status !== 'draft')
  }, [templates, user])

  function templatesForDay(day) {
    return ownedTemplates.filter(t => matchesSplitDay(t, day, normalDays))
  }

  function workoutsForDay(day) {
    return recentWorkouts
      .filter(w => matchesSplitDay(w, day, normalDays))
      .slice(0, 5)
  }

  return (
    <div className="faded-page min-h-screen px-4 safe-pt-4 pb-24 space-y-6">
      <div className="p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, var(--surface-alt), var(--hero-fade))' }}>
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>New session</span>
          <h1 className="mt-1 text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>Start a workout</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Pick the next planned session, a template, or today's split.</p>
        </div>
      </div>
      {(restoreError || startLoadError) && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {restoreError || startLoadError}
        </div>
      )}

      {(loadingStarts || activeProgram) && (
        <section className="space-y-2 min-h-[124px]">
          <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Active program</h2>
          {loadingStarts ? (
            <ActiveProgramSkeleton />
          ) : activeProgram?.completed ? (
            <div className="w-full bg-emerald-600/15 border border-emerald-500/40 rounded-2xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-emerald-200/80 font-semibold">{activeProgram.program?.name}</div>
              <div className="mt-1 font-semibold text-gray-100 text-lg">Program Complete!</div>
              <div className="text-xs text-emerald-100/80 mt-0.5">View summary or restart.</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/community?tab=plans')}
                  className="rounded-xl bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-100"
                >
                  View summary
                </button>
                <button
                  type="button"
                  onClick={restartProgram}
                  className="rounded-xl bg-gray-950/60 px-3 py-2 text-xs font-semibold text-gray-100"
                >
                  Restart
                </button>
              </div>
            </div>
          ) : activeProgram?.next_session ? (
            <button
              onClick={startActiveProgram}
              className="w-full text-left bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 border border-indigo-400/50 rounded-2xl p-4 transition-colors"
            >
              <div className="text-[11px] uppercase tracking-wider text-indigo-100/80 font-semibold">{activeProgram.program?.name}</div>
              <div className="mt-1 font-semibold text-gray-100 text-lg">{activeProgram.next_session?.session_label || activeProgram.next_session?.template_name || 'Next session'}</div>
              <div className="text-xs text-indigo-100/80 mt-0.5">
                {activeProgram.phase?.next_suggested_at ? `Suggested ${formatSuggestedTime(activeProgram.phase.next_suggested_at)}` : 'Run the next programmed workout.'}
              </div>
            </button>
          ) : null}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold">My split</h2>
        <div className="space-y-2">
          {days.map(day => {
            const isExpanded = expandedDay === day
            const dayTemplates = templatesForDay(day)
            const dayWorkouts = workoutsForDay(day)
            const isEmpty = dayTemplates.length === 0 && dayWorkouts.length === 0

            return (
              <div key={day} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden transition-colors">
                <button
                  type="button"
                  onClick={() => setExpandedDay(isExpanded ? null : day)}
                  className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-850 active:bg-gray-800 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-gray-100 text-lg">{day}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{DAY_HINTS[day] || ''}</div>
                  </div>
                  <span className="text-gray-500 text-lg font-mono leading-none">
                    {isExpanded ? '-' : '+'}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-800 p-4 space-y-4 bg-gray-950/40">
                    <button
                      type="button"
                      onClick={() => onStart({ dayLabel: day, exercises: [] })}
                      className="w-full py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-750 active:bg-gray-700 text-sm font-semibold text-gray-100 transition-colors text-center"
                    >
                      Start blank {day}
                    </button>

                    {dayTemplates.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">My templates</div>
                        <div className="space-y-1.5">
                          {dayTemplates.map(t => {
                            const otherLabel = day === 'Other' ? getItemDayLabel(t) : ''
                            const showLabel = otherLabel && otherLabel !== 'Other'
                            return (
                              <button
                                key={t.id}
                                onClick={() => startTemplate(t)}
                                className="w-full text-left bg-gray-900 hover:bg-gray-850 active:bg-gray-800 border border-gray-800 rounded-xl p-3 flex justify-between items-center transition-colors"
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <div className="font-medium text-sm text-gray-100 truncate">{t.name || 'Template'}</div>
                                  <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                                    {showLabel && (
                                      <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">{otherLabel}</span>
                                    )}
                                    <span>{t.usage_count ? `Used ${t.usage_count}x` : 'Never used'}</span>
                                  </div>
                                </div>
                                <span className="text-xs text-indigo-400 font-medium shrink-0">Start &gt;</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {dayWorkouts.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Past workouts</div>
                        <div className="space-y-1.5">
                          {dayWorkouts.map(w => {
                            const summary = workoutSummary(w)
                            return (
                              <button
                                key={w.id}
                                onClick={() => repeatPast(w)}
                                className="w-full text-left bg-gray-900 hover:bg-gray-850 active:bg-gray-800 border border-gray-800 rounded-xl p-3 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="font-medium text-sm text-gray-100 truncate">{getItemDayLabel(w) || w.name || 'Workout'}</div>
                                    <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                                      {summary.exerciseNames.slice(0, 3).join(', ')}
                                      {summary.exerciseNames.length > 3 ? ` +${summary.exerciseNames.length - 3}` : ''}
                                    </div>
                                  </div>
                                  <div className="text-[10px] text-gray-500 font-mono shrink-0">{w.date}</div>
                                </div>
                                <div className="flex gap-1.5 mt-2">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-950 text-gray-400">{summary.exerciseNames.length} exercises</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-950 text-gray-400">{summary.setCount} sets</span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {isEmpty && (
                      <p className="text-xs text-gray-500 text-center py-2">
                        No saved starts for this split yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold">More options</h2>
        <button
          onClick={() => loadHistory({ reset: history.length === 0 })}
          className="w-full text-left bg-gray-900 hover:bg-gray-850 border border-gray-800 rounded-2xl p-4 transition-colors"
        >
          <div className="font-medium text-gray-200">View all past workouts</div>
          <div className="text-xs text-gray-500 mt-0.5">Use history as a secondary start path.</div>
        </button>
        <button
          onClick={() => navigate('/community?tab=plans')}
          className="w-full text-left bg-gray-900 hover:bg-gray-850 border border-gray-800 rounded-2xl p-4 transition-colors"
        >
          <div className="font-medium text-gray-200">Browse templates and programs</div>
          <div className="text-xs text-gray-500 mt-0.5">Discover templates and multi-week plans.</div>
        </button>
      </section>

      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Browse past workouts">
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 gap-2 pb-2">
            <button
              type="button"
              className="px-3 py-2 rounded-xl text-xs font-semibold border bg-indigo-600/15 border-indigo-500 text-indigo-200"
            >
              Empty rows
            </button>
          </div>
          {historyError && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{historyError}</p>}
          {historyLoading && history.length === 0 && <p className="text-center text-gray-500 text-sm py-6">Loading...</p>}
          {!historyLoading && !historyError && history.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-6">No past workouts yet.</p>
          )}
          {history.map(w => {
            const summary = workoutSummary(w)
            return (
              <button
                key={w.id}
                onClick={() => repeatPast(w)}
                className="w-full text-left p-3 rounded-xl bg-gray-800 hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-100 truncate">{w.workout_day || w.name || 'Workout'}</div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      {summary.exerciseNames.slice(0, 4).join(', ')}
                      {summary.exerciseNames.length > 4 ? ` +${summary.exerciseNames.length - 4}` : ''}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 font-mono shrink-0">{w.date}</div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[11px] px-2 py-1 rounded-full bg-gray-900 text-gray-400">{summary.exerciseNames.length} exercises</span>
                  <span className="text-[11px] px-2 py-1 rounded-full bg-gray-900 text-gray-400">{summary.setCount} sets</span>
                  {summary.muscleGroups.slice(0, 3).map(group => (
                    <span key={group} className="text-[11px] px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-200">{group}</span>
                  ))}
                </div>
              </button>
            )
          })}
          {history.length < historyTotal && (
            <button
              type="button"
              onClick={() => loadHistory()}
              disabled={historyLoading}
              className="w-full rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-300 disabled:text-gray-600"
            >
              {historyLoading ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      </Sheet>
    </div>
  )
}

function ActiveProgramSkeleton() {
  return (
    <div className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 animate-pulse">
      <div className="h-3 w-28 rounded bg-gray-800" />
      <div className="mt-3 h-5 w-44 rounded bg-gray-800" />
      <div className="mt-2 h-3 w-36 rounded bg-gray-800" />
    </div>
  )
}

function formatSuggestedTime(iso) {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return 'soon'
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()
  return sameDay
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
