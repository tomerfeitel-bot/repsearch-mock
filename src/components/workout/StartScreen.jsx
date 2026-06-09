import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hasConfiguredSplit, splitDaysForProfile, splitTypeForProfile } from '../../lib/splits.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useToast } from '../ui/Toast.jsx'
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
  Other: 'Off-split, cardio, mobility, or whatever needs work',
}

const HISTORY_PAGE_SIZE = 50
const HISTORY_PREVIEW_LIMIT = 3
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function StartScreen({ onStart, restoreError = '' }) {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const seedById = new Map(SEED_EXERCISES.map(e => [e.id, e]))

  const [activeProgram, setActiveProgram] = useState(null)
  const [programDetail, setProgramDetail] = useState(null)
  const [templateDetails, setTemplateDetails] = useState({})
  const [templates, setTemplates] = useState([])
  const [recentWorkouts, setRecentWorkouts] = useState([])
  const [loadingStarts, setLoadingStarts] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [startLoadError, setStartLoadError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [historyOffset, setHistoryOffset] = useState(0)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [openWorkspace, setOpenWorkspace] = useState('')
  const [expandedDay, setExpandedDay] = useState(null)
  const [repeatMode] = useState('empty')

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
        setStartLoadError('Some saved starts could not be loaded. You can still start blank.')
      }
      setActiveProgram(programData?.program && (programData?.next_session || programData?.completed) ? programData : null)
      setTemplates(templateData?.templates || [])
      setRecentWorkouts(workoutData?.workouts || [])
    }).finally(() => {
      if (!cancelled) setLoadingStarts(false)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const programId = activeProgram?.program?.id
    if (!programId) {
      setProgramDetail(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    api.get(`/programs/${programId}`)
      .then(data => { if (!cancelled) setProgramDetail(data.program || null) })
      .catch(() => { if (!cancelled) setProgramDetail(null) })
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [activeProgram?.program?.id])

  async function ensureTemplate(templateId) {
    if (!templateId) return null
    if (templateDetails[templateId]) return templateDetails[templateId]
    const data = await api.get(`/templates/${templateId}`)
    const template = data.template || null
    if (template) setTemplateDetails(prev => ({ ...prev, [templateId]: template }))
    return template
  }

  async function loadHistory({ reset = false } = {}) {
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
  }

  function templateExercises(template) {
    return (template?.exercises || []).map(e => {
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
      const fullTemplate = await ensureTemplate(template.id || template.template_id)
      if (!fullTemplate) throw new Error('Template not found')
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

  async function startProgramSession(session) {
    if (!session?.template_id) return
    await startTemplate({ id: session.template_id }, {
      name: session.session_label || session.template_name || activeProgram?.program?.name || 'Program workout',
      dayLabel: session.session_label || session.template_name || null,
      programId: activeProgram?.program?.id || session.program_id,
      programSessionId: session.id,
      runClassification: 'exact',
    })
  }

  function getItemDayLabel(item) {
    return String(item?.workout_day || item?.workout_split_type || '').trim()
  }

  const allSplitDays = useMemo(() => splitDaysForProfile(user), [user])
  const normalDays = useMemo(() => new Set(allSplitDays.filter(day => day !== 'Other')), [allSplitDays])
  const hasProgram = !!activeProgram?.program?.id
  const hasSplit = !hasProgram && hasConfiguredSplit(user)
  const splitType = splitTypeForProfile(user)
  const splitDays = useMemo(() => hasSplit ? allSplitDays : [], [hasSplit, allSplitDays])
  const ownedTemplates = useMemo(() => {
    return templates.filter(t => t.user_id === user?.id && t.status !== 'draft')
  }, [templates, user])

  function matchesSplitDay(item, day, normalDaysSet = normalDays) {
    const label = getItemDayLabel(item)
    if (day === 'Other') return !label || label === 'Other' || !normalDaysSet.has(label)
    return label === day
  }

  function templatesForDay(day) {
    return ownedTemplates.filter(t => matchesSplitDay(t, day))
  }

  function workoutsForDay(day, limit = 5) {
    return recentWorkouts.filter(w => matchesSplitDay(w, day)).slice(0, limit)
  }

  const nextSplitDay = useMemo(() => {
    if (!hasSplit) return splitDays[0] || 'Other'
    return nextDayAfterLastWorkout(recentWorkouts[0], splitDays)
  }, [hasSplit, recentWorkouts, splitDays])
  const activeDay = expandedDay || nextSplitDay || splitDays[0] || 'Other'
  const activeDayTemplates = templatesForDay(activeDay)
  const projectedTemplateId = activeProgram?.next_session?.template_id || activeDayTemplates[0]?.id || null
  const projectedTemplate = templateDetails[projectedTemplateId] || activeDayTemplates[0] || null

  useEffect(() => {
    if (!projectedTemplateId || templateDetails[projectedTemplateId]) return
    let cancelled = false
    setDetailLoading(true)
    api.get(`/templates/${projectedTemplateId}`)
      .then(data => {
        if (cancelled || !data.template) return
        setTemplateDetails(prev => ({ ...prev, [projectedTemplateId]: data.template }))
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [projectedTemplateId, templateDetails])

  const lastWorkout = recentWorkouts[0]
  const historyRows = history.length ? history : recentWorkouts
  const historyPreview = recentWorkouts.slice(0, HISTORY_PREVIEW_LIMIT)
  const programSessions = programDetail?.workouts || activeProgram?.sessions || []
  const lowerOpen = !!openWorkspace
  const projected = buildProjection({
    activeProgram,
    projectedTemplate,
    nextSplitDay,
    hasSplit,
    splitType,
    user,
    lastWorkout,
  })

  return (
    <div className="workout-start min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <main className="mx-auto max-w-md px-4 safe-pt-4">
        <div className="start-page-head mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-caption font-semibold" style={{ color: 'var(--emerald-ink)' }}>Workout console</div>
            <h1 className="text-display font-black" style={{ color: 'var(--text)' }}>Start</h1>
          </div>
          <div className="font-mono text-caption tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString([], { weekday: 'short' })}
          </div>
        </div>

        {(restoreError || startLoadError) && (
          <div className="mb-3 border px-3 py-2 text-sm" style={{ borderColor: 'rgba(213,154,58,0.42)', background: 'var(--brass-soft)', color: '#e8c074', borderRadius: 12 }}>
            {restoreError || startLoadError}
          </div>
        )}

        <HeroPanel
          projected={projected}
          compressed={lowerOpen}
          loading={loadingStarts || detailLoading}
          onToggle={() => {
            if (lowerOpen) setOpenWorkspace('')
          }}
          onStart={() => {
            if (projected.kind === 'program') startProgramSession(activeProgram?.next_session)
            else if (projected.kind === 'split' && projected.template) startTemplate(projected.template, { dayLabel: projected.day })
            else onStart({ exercises: [] })
          }}
          onSplitNudge={() => navigate('/profile')}
        />

        <div className="mt-5 space-y-3">
          <PlanWorkspace
            open={openWorkspace === 'plan'}
            mode={hasProgram ? 'program' : 'split'}
            onToggle={() => setOpenWorkspace(openWorkspace === 'plan' ? '' : 'plan')}
            hasSplit={hasSplit}
            splitType={splitType}
            days={splitDays}
            activeDay={activeDay}
            setActiveDay={day => { setExpandedDay(day); setOpenWorkspace('plan') }}
            templatesForDay={templatesForDay}
            workoutsForDay={workoutsForDay}
            program={activeProgram?.program}
            sessions={programSessions}
            loading={detailLoading}
            projectedSessionId={activeProgram?.next_session?.id}
            onStartTemplate={startTemplate}
            onStartProgramSession={startProgramSession}
            onRepeatWorkout={repeatPast}
            onLogSplit={() => navigate('/profile')}
          />

          <HistoryPanel
            open={openWorkspace === 'history'}
            onToggle={() => {
              const nextOpen = openWorkspace !== 'history'
              setOpenWorkspace(nextOpen ? 'history' : '')
              if (nextOpen && history.length === 0) loadHistory({ reset: true })
            }}
            preview={historyPreview}
            rows={historyRows}
            loading={historyLoading}
            error={historyError}
            total={historyTotal || recentWorkouts.length}
            onLoadMore={() => loadHistory()}
            onRepeatWorkout={repeatPast}
          />
        </div>

        <div className="bottom-actions mt-8 grid grid-cols-[0.82fr_1.18fr] gap-3">
          <button
            type="button"
            onClick={() => onStart({ exercises: [] })}
            className="start-blank-button text-left transition-transform active:scale-[0.98]"
          >
            <span className="text-caption font-semibold">Open start</span>
            <span className="mt-1 block text-sm font-black">Start blank</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/community?tab=plans')}
            className="find-plans-banner text-left transition-transform active:scale-[0.99]"
          >
            <span className="text-caption font-semibold" style={{ color: 'var(--emerald-ink)' }}>Discovery</span>
            <span className="mt-1 flex items-center justify-between gap-3">
              <span className="text-head font-black" style={{ color: 'var(--text)' }}>Find Plans</span>
              <span className="grid h-10 w-10 place-items-center rounded-full font-mono text-title" style={{ background: 'var(--emerald)', color: 'var(--on-emerald)' }}>+</span>
            </span>
          </button>
        </div>
      </main>
    </div>
  )
}

function HeroPanel({ projected, compressed, loading, onToggle, onStart, onSplitNudge }) {
  const open = !compressed
  const isBlank = projected.kind === 'blank'
  return (
    <section className="hero-panel" data-open={open ? 'true' : 'false'} data-compressed={compressed ? 'true' : 'false'} data-kind={projected.kind}>
      <div className="hero-command">
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left" aria-expanded={open}>
          <div className="text-caption font-semibold" style={{ color: 'rgba(255,255,255,0.78)' }}>{projected.label}</div>
          <h2 className="mt-1 truncate text-[1.72rem] font-black leading-none" style={{ color: 'var(--on-emerald)' }}>
            {projected.title}
          </h2>
        </button>
        <button type="button" onClick={onStart} className="hero-start-button shrink-0 rounded-full px-5 text-sm font-black transition-transform active:scale-95">
          {isBlank ? 'Start blank' : 'Start workout'}
        </button>
      </div>

      <div className="hero-reveal grid" data-open={open ? 'true' : 'false'}>
        <div className="min-h-0 overflow-hidden">
          <div className="pt-4">
            <div className="trust-line">
              <span className="font-mono text-micro tabular-nums">{projected.reasonLabel}</span>
              <span className="text-meta">{projected.trust}</span>
            </div>

            {isBlank ? (
              <div className="mt-4 rounded-2xl border px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.22)', background: 'rgba(8,9,10,0.16)' }}>
                <div className="text-sm font-bold" style={{ color: 'var(--on-emerald)' }}>No split logged yet</div>
                <p className="mt-1 text-meta" style={{ color: 'rgba(255,255,255,0.74)' }}>Start blank now, then log your split so this screen can project the right session next time.</p>
                <button type="button" onClick={onSplitNudge} className="mt-3 min-h-10 rounded-full px-4 text-sm font-black" style={{ background: 'rgba(255,255,255,0.16)', color: 'var(--on-emerald)' }}>Log split</button>
              </div>
            ) : (
              <ExercisePreview exercises={projected.exercises} loading={loading} />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function ExercisePreview({ exercises, loading }) {
  if (loading) return <HistorySkeleton compact />
  if (!exercises.length) {
    return (
      <div className="mt-4 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.78)' }}>
        Start to load the planned exercises into the logger.
      </div>
    )
  }
  return (
    <div className="exercise-preview mt-4">
      {exercises.map((exercise, index) => (
        <div key={`${exercise.name}-${index}`} className="exercise-preview-row">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold" style={{ color: 'var(--on-emerald)' }}>{exercise.name}</div>
            <div className="mt-0.5 text-caption" style={{ color: 'rgba(255,255,255,0.68)' }}>{exercise.muscle || 'Planned exercise'}</div>
          </div>
          <span className="font-mono text-caption font-bold tabular-nums" style={{ color: 'rgba(255,255,255,0.72)' }}>{exercise.setCount || 0} sets</span>
        </div>
      ))}
    </div>
  )
}

function PlanWorkspace({
  open,
  mode,
  onToggle,
  hasSplit,
  splitType,
  days,
  activeDay,
  setActiveDay,
  templatesForDay,
  workoutsForDay,
  program,
  sessions,
  loading,
  projectedSessionId,
  onStartTemplate,
  onStartProgramSession,
  onRepeatWorkout,
  onLogSplit,
}) {
  const isProgram = mode === 'program'
  const selectedTemplates = !isProgram && hasSplit ? templatesForDay(activeDay) : []
  const selectedWorkouts = !isProgram && hasSplit ? workoutsForDay(activeDay, 20) : []
  const summary = isProgram
    ? `${sessions.length || 0} sessions`
    : hasSplit ? splitType : 'not logged'

  return (
    <section className="workspace-panel" data-open={open ? 'true' : 'false'}>
      <button type="button" onClick={onToggle} className="panel-heading" aria-expanded={open}>
        <span>
          <span className="text-title font-black" style={{ color: 'var(--text)' }}>{isProgram ? 'Your Program' : 'Your Split'}</span>
          <span className="mt-0.5 block font-mono text-caption tabular-nums" style={{ color: open ? 'var(--emerald-ink)' : 'var(--text-muted)' }}>
            {isProgram ? (program?.name || 'active program') : summary}
          </span>
        </span>
        <PanelGlyph open={open} />
      </button>

      {!isProgram && hasSplit && (
        <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {days.map(day => {
            const templateCount = templatesForDay(day).length
            const workoutCount = workoutsForDay(day).length
            return (
              <button key={day} type="button" onClick={() => setActiveDay(day)} className="split-day-chip shrink-0" data-active={day === activeDay ? 'true' : 'false'}>
                <span>{day}</span>
                <span className="font-mono text-micro tabular-nums">{templateCount}/{workoutCount}</span>
              </button>
            )
          })}
        </div>
      )}

      {!isProgram && !hasSplit && (
        <p className="mt-2 text-meta" style={{ color: 'var(--text-muted)' }}>Log your split so RepSearch can project the right session instead of defaulting to blank.</p>
      )}

      {isProgram && !open && (
        <p className="mt-2 text-meta" style={{ color: 'var(--text-muted)' }}>Open to choose from every session in the active program.</p>
      )}

      <PanelReveal open={open}>
        <div className="workspace-body">
          {isProgram ? (
            <>
              <WorkspaceHeader title={program?.name || 'Active program'} meta="Program replaces your split while it is active." />
              <div className="workspace-scroll">
                {loading && sessions.length === 0 && <HistorySkeleton />}
                {!loading && sessions.length === 0 && <EmptyInline>No program sessions found.</EmptyInline>}
                {sessions.map((session, index) => (
                  <StartRow
                    key={session.id || `${session.template_id}-${index}`}
                    title={session.session_label || session.template_name || `Session ${index + 1}`}
                    meta={[session.block_name, session.week_number ? `Week ${session.week_number}` : null, session.id === projectedSessionId ? 'projected next' : null].filter(Boolean).join(' / ')}
                    action="Start"
                    highlight={session.id === projectedSessionId}
                    onClick={() => onStartProgramSession(session)}
                  />
                ))}
              </div>
            </>
          ) : hasSplit ? (
            <>
              <WorkspaceHeader title={activeDay} meta={DAY_HINTS[activeDay] || 'Start from this split day.'} />
              <div className="workspace-scroll">
                {selectedTemplates.map(template => (
                  <StartRow
                    key={template.id}
                    title={template.name || 'Template'}
                    meta={template.usage_count ? `Template / used ${template.usage_count}x` : 'Template'}
                    action="Start"
                    onClick={() => onStartTemplate(template, { dayLabel: activeDay })}
                  />
                ))}
                {selectedWorkouts.map(workout => {
                  const summary = summaryForWorkout(workout)
                  return (
                    <StartRow
                      key={workout.id}
                      title={getWorkoutTitle(workout)}
                      meta={summary.exerciseNames.slice(0, 4).join(', ') || `${summary.setCount} sets`}
                      action={shortDate(workout.date)}
                      onClick={() => onRepeatWorkout(workout)}
                    />
                  )
                })}
                {selectedTemplates.length === 0 && selectedWorkouts.length === 0 && (
                  <EmptyInline>No saved starts for this split day yet. Use Start blank below if you want an open session.</EmptyInline>
                )}
              </div>
            </>
          ) : (
            <div className="pt-4">
              <button type="button" onClick={onLogSplit} className="min-h-11 rounded-full px-4 text-sm font-black" style={{ background: 'var(--emerald)', color: 'var(--on-emerald)' }}>Log split</button>
            </div>
          )}
        </div>
      </PanelReveal>
    </section>
  )
}

function HistoryPanel({ open, onToggle, preview, rows, loading, error, total, onLoadMore, onRepeatWorkout }) {
  return (
    <section className="workspace-panel" data-open={open ? 'true' : 'false'}>
      <button type="button" onClick={onToggle} className="panel-heading" aria-expanded={open}>
        <span>
          <span className="text-title font-black" style={{ color: 'var(--text)' }}>History</span>
          <span className="mt-0.5 block font-mono text-caption tabular-nums" style={{ color: open ? 'var(--emerald-ink)' : 'var(--text-muted)' }}>{total || 0} workouts</span>
        </span>
        <PanelGlyph open={open} />
      </button>

      {!open && preview.length > 0 && (
        <div className="mt-2 space-y-1">
          {preview.map(workout => {
            const summary = summaryForWorkout(workout)
            return (
              <button key={workout.id} type="button" onClick={() => onRepeatWorkout(workout)} className="history-peek-row">
                <span className="min-w-0 truncate">{getWorkoutTitle(workout)}</span>
                <span className="font-mono text-micro tabular-nums">{summary.setCount} sets</span>
              </button>
            )
          })}
        </div>
      )}

      <PanelReveal open={open}>
        <div className="workspace-body">
          <WorkspaceHeader title="All past workouts" meta="Tap any row to repeat it into the logger." />
          <div className="workspace-scroll">
            {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
            {loading && rows.length === 0 && <HistorySkeleton />}
            {!loading && !error && rows.length === 0 && <EmptyInline>No past workouts yet.</EmptyInline>}
            {rows.map(workout => {
              const summary = summaryForWorkout(workout)
              return (
                <StartRow
                  key={workout.id}
                  title={getWorkoutTitle(workout)}
                  meta={`${summary.exerciseNames.slice(0, 4).join(', ')}${summary.exerciseNames.length > 4 ? ` +${summary.exerciseNames.length - 4}` : ''}`}
                  action={shortDate(workout.date)}
                  onClick={() => onRepeatWorkout(workout)}
                />
              )
            })}
            {rows.length < total && (
              <button type="button" onClick={onLoadMore} disabled={loading} className="mt-3 min-h-11 w-full rounded-full px-4 text-sm font-black disabled:opacity-50" style={{ background: 'var(--surface-alt)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                {loading ? 'Loading...' : 'Load more'}
              </button>
            )}
          </div>
        </div>
      </PanelReveal>
    </section>
  )
}

function WorkspaceHeader({ title, meta }) {
  return (
    <div className="workspace-header">
      <div className="min-w-0">
        <div className="truncate text-head font-black" style={{ color: 'var(--text)' }}>{title}</div>
        <div className="mt-1 text-meta" style={{ color: 'var(--text-muted)' }}>{meta}</div>
      </div>
    </div>
  )
}

function PanelReveal({ open, children }) {
  return (
    <div className="panel-reveal grid" data-open={open ? 'true' : 'false'}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}

function PanelGlyph({ open }) {
  return <span className="panel-glyph" data-open={open ? 'true' : 'false'} aria-hidden="true">+</span>
}

function StartRow({ title, meta, action, onClick, highlight = false }) {
  return (
    <button type="button" onClick={onClick} className="start-row" data-highlight={highlight ? 'true' : 'false'}>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold" style={{ color: 'var(--text)' }}>{title}</div>
        {meta && <div className="mt-0.5 truncate text-caption" style={{ color: 'var(--text-muted)' }}>{meta}</div>}
      </div>
      <span className="font-mono text-caption font-bold tabular-nums" style={{ color: highlight ? 'var(--emerald-ink)' : 'var(--text-muted)' }}>{action}</span>
    </button>
  )
}

function EmptyInline({ children }) {
  return <p className="empty-inline border-t py-4 text-sm" style={{ borderColor: 'rgba(255,255,255,0.18)', color: 'var(--text-muted)' }}>{children}</p>
}

function HistorySkeleton({ compact = false }) {
  return (
    <div className={(compact ? 'mt-4 ' : '') + 'space-y-3 py-2 animate-pulse'}>
      {[1, 2, 3].map(i => (
        <div key={i} className="border-b pb-3" style={{ borderColor: compact ? 'rgba(255,255,255,0.18)' : 'var(--border)' }}>
          <div className="h-4 w-36 rounded bg-gray-800" />
          <div className="mt-2 h-3 w-56 rounded bg-gray-800" />
        </div>
      ))}
    </div>
  )
}

function buildProjection({ activeProgram, projectedTemplate, nextSplitDay, hasSplit, splitType, user, lastWorkout }) {
  const next = activeProgram?.next_session
  if (next?.template_id) {
    const exercises = templateExercisePreview(projectedTemplate)
    const plannedSets = exercises.reduce((sum, exercise) => sum + (exercise.setCount || 0), 0)
    const suggested = activeProgram?.phase?.next_suggested_at ? formatSuggestedTime(activeProgram.phase.next_suggested_at) : 'queued'
    const title = next.session_label || next.template_name || projectedTemplate?.name || 'Next session'
    return {
      kind: 'program',
      label: 'Projected next',
      title,
      reasonLabel: 'Program',
      trust: [
        activeProgram?.program?.name || 'Active program',
        `${suggested} target`,
        plannedSets ? `${plannedSets} planned sets` : null,
        lastWorkout ? `last: ${getWorkoutTitle(lastWorkout)} ${shortDate(lastWorkout.date)}` : null,
      ].filter(Boolean).join(' / '),
      exercises,
    }
  }

  if (hasSplit) {
    const title = projectedTemplate?.name || `${nextSplitDay} day`
    const schedule = scheduleTrustForDay(user, nextSplitDay)
    return {
      kind: 'split',
      label: 'Projected next',
      title,
      day: nextSplitDay,
      template: projectedTemplate,
      reasonLabel: splitType || 'Split',
      trust: [
        lastWorkout ? `after last ${getWorkoutTitle(lastWorkout)}` : 'first split session',
        `${nextSplitDay} is next`,
        schedule,
      ].filter(Boolean).join(' / '),
      exercises: templateExercisePreview(projectedTemplate),
    }
  }

  return {
    kind: 'blank',
    label: 'No split yet',
    title: 'Start blank',
    reasonLabel: 'Setup',
    trust: 'No program or split is logged yet.',
    exercises: [],
  }
}

function nextDayAfterLastWorkout(lastWorkout, splitDays) {
  const days = splitDays.filter(day => day !== 'Other')
  if (!days.length) return splitDays[0] || 'Other'
  const last = getItemDayLabelStatic(lastWorkout)
  const idx = days.indexOf(last)
  if (idx === -1) return days[0]
  return days[(idx + 1) % days.length]
}

function scheduleTrustForDay(user, splitDay) {
  const schedule = parseSchedule(user?.split_days_json)
  const hits = schedule.filter(row => row.type === splitDay).map(row => row.day)
  if (!hits.length) return ''
  const today = new Date().getDay()
  const next = hits
    .map(day => ({ day, distance: (WEEKDAYS.indexOf(day) - today + 7) % 7 }))
    .sort((a, b) => a.distance - b.distance)[0]
  if (!next) return ''
  if (next.distance === 0) return `scheduled today (${next.day})`
  return `next scheduled ${next.day}`
}

function parseSchedule(value) {
  try {
    const parsed = JSON.parse(value || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(row => ({ day: String(row?.day || '').slice(0, 3), type: String(row?.type || '').trim() }))
      .filter(row => WEEKDAYS.includes(row.day) && row.type)
  } catch {
    return []
  }
}

function templateExercisePreview(template) {
  return (template?.exercises || []).map(exercise => ({
    name: exercise.exercise_name || exercise.name || exercise.exercise_id || 'Exercise',
    muscle: exercise.primary_muscle || exercise.secondary_muscle || '',
    setCount: Array.isArray(exercise.sets) ? exercise.sets.length : (exercise.set_count || 0),
  }))
}

function summaryForWorkout(workout) {
  const sets = workout?.sets || []
  const byExercise = new Map()
  for (const set of sets) {
    if (!set.exercise_id || byExercise.has(set.exercise_id)) continue
    byExercise.set(set.exercise_id, {
      name: set.exercise_name || set.exercise_id,
      muscle: set.primary_muscle || '',
    })
  }
  const exercises = [...byExercise.values()]
  return {
    exerciseNames: exercises.map(exercise => exercise.name),
    muscleGroups: [...new Set(exercises.map(exercise => topLevelGroup(exercise.muscle)).filter(Boolean))],
    setCount: sets.length || workout?.set_count || 0,
  }
}

function getItemDayLabelStatic(item) {
  return String(item?.workout_day || item?.workout_split_type || '').trim()
}

function getWorkoutTitle(workout) {
  return workout?.workout_day || workout?.workout_split_type || workout?.name || 'Workout'
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

function shortDate(value) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value || 'none'
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
