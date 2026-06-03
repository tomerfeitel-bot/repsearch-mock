import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../ui/Avatar.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { ConfirmSheet } from '../ui/ConfirmSheet.jsx'
import { api } from '../../lib/api.js'
import { useWorkout } from '../../hooks/useWorkout.jsx'
import { useToast } from '../ui/Toast.jsx'
import { useAuth } from '../../hooks/useAuth.jsx'
import { SEED_EXERCISES } from '../../lib/exercises.js'

const SECTIONS = [
  { v: 'for_you', label: 'For you' },
  { v: 'following', label: 'Following' },
  { v: 'programs', label: 'Programs' },
  { v: 'templates', label: 'Templates' },
]

const STRICTNESS = [
  { v: 'written', label: 'Run as written' },
  { v: 'adapt', label: 'Adapt as needed' },
  { v: 'inspiration', label: 'Use as inspiration' },
]

const exerciseById = new Map(SEED_EXERCISES.map(e => [e.id, e]))

function sortForSection(section) {
  if (section === 'following') return 'following'
  if (section === 'for_you') return 'for_you'
  return 'enrolled'
}

export default function PlansTab() {
  const navigate = useNavigate()
  const [section, setSection] = useState('for_you')
  const [templates, setTemplates] = useState([])
  const [drafts, setDrafts] = useState([])
  const [programDrafts, setProgramDrafts] = useState([])
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailProgram, setDetailProgram] = useState(null)
  const [detailRefreshKey, setDetailRefreshKey] = useState(0)
  const toast = useToast()

  const loadPlans = useCallback((nextSection = section, showLoading = true) => {
    if (showLoading) setLoading(true)
    return Promise.all([
      api.get('/templates'),
      api.get('/templates?status=draft'),
      api.get('/programs?status=draft'),
      api.get(`/programs?sort=${sortForSection(nextSection)}`),
    ])
      .then(([t, d, pd, p]) => {
        setTemplates(t.templates || [])
        setDrafts(d.templates || [])
        setProgramDrafts(pd.programs || [])
        setPrograms(p.programs || [])
      })
      .catch(err => toast?.(err.message || 'Failed to load plans', 'error'))
      .finally(() => setLoading(false))
  }, [section, toast])

  useEffect(() => {
    loadPlans(section)
  }, [section, loadPlans])

  const shownPrograms = section === 'templates' ? [] : programs
  const shownTemplates = section === 'programs' || section === 'for_you' || section === 'following'
    ? []
    : templates

  function refresh() {
    return loadPlans(section)
  }

  function handleProgramStarted(programId) {
    loadPlans(section, false)
    if (detailProgram?.id === programId) setDetailRefreshKey(k => k + 1)
  }

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1">
          {SECTIONS.map(s => (
            <button
              key={s.v}
              onClick={() => setSection(s.v)}
              className={
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ' +
                (section === s.v ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-gray-900 border-gray-800 text-gray-400')
              }
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="w-9 h-9 shrink-0 rounded-full border border-gray-800 bg-gray-900 text-gray-300 hover:text-gray-100 hover:border-gray-700"
          aria-label="Create"
        >
          +
        </button>
      </div>

      {loading && <Skeleton />}

      {!loading && section !== 'templates' && (
        <div className="space-y-3">
          {shownPrograms.length === 0 ? <Empty>No programs here yet.</Empty> : shownPrograms.map(p => (
            <ProgramCard key={p.id} program={p} onOpen={() => setDetailProgram(p)} onStarted={handleProgramStarted} />
          ))}
        </div>
      )}

      {!loading && section === 'templates' && (
        <Templates templates={shownTemplates} onChanged={refresh} />
      )}

      <CreateMenu
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        drafts={drafts}
        onTemplate={() => navigate('/templates/new')}
        onDraft={(draft) => navigate(`/templates/builder/${draft.id}`)}
        programDrafts={programDrafts}
        onProgramDraft={(draft) => navigate(`/programs/builder/${draft.id}`)}
        onDeleted={refresh}
        onProgram={() => navigate('/programs/new')}
      />
      <ProgramDetailSheet program={detailProgram} refreshKey={detailRefreshKey} onClose={() => setDetailProgram(null)} />
    </div>
  )
}

function CreateMenu({ open, onClose, drafts = [], programDrafts = [], onTemplate, onDraft, onProgramDraft, onDeleted, onProgram }) {
  const toast = useToast()
  const [confirmDelete, setConfirmDelete] = useState(null) // { type: 'draft'|'program', item }

  async function doDelete() {
    if (!confirmDelete) return
    const { type, item } = confirmDelete
    setConfirmDelete(null)
    try {
      if (type === 'draft') {
        await api.del(`/templates/${item.id}`)
        toast?.('Draft deleted', 'success')
      } else {
        await api.del(`/programs/${item.id}`)
        toast?.('Program draft deleted', 'success')
      }
      onDeleted?.()
    } catch (err) {
      toast?.(err.message || 'Failed to delete', 'error')
    }
  }

  return (
    <>
    <Sheet open={open} onClose={onClose} title="Create">
      <div className="p-4 space-y-4">
        {drafts.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Drafts</div>
            {drafts.slice(0, 4).map(draft => (
              <div
                key={draft.id}
                className="w-full rounded-xl bg-gray-950 border border-gray-800 p-3 flex items-center gap-2"
              >
                <button onClick={() => { onClose(); onDraft(draft) }} className="min-w-0 flex-1 text-left">
                  <div className="font-medium text-gray-100 truncate">{draft.name}</div>
                  <div className="mt-1 text-xs text-gray-500">Private draft</div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'draft', item: draft }) }}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-red-300 hover:bg-red-500/10 min-w-[52px]"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
        {programDrafts.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Program drafts</div>
            {programDrafts.slice(0, 4).map(draft => (
              <div
                key={draft.id}
                className="w-full rounded-xl bg-gray-950 border border-gray-800 p-3 flex items-center gap-2"
              >
                <button onClick={() => { onClose(); onProgramDraft(draft) }} className="min-w-0 flex-1 text-left">
                  <div className="font-medium text-gray-100 truncate">{draft.name}</div>
                  <div className="mt-1 text-xs text-gray-500">Private program draft</div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'program', item: draft }) }}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-red-300 hover:bg-red-500/10 min-w-[52px]"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
        <button
          onClick={() => { onClose(); onTemplate() }}
          className="w-full text-left rounded-xl bg-gray-950 border border-gray-800 p-4"
        >
          <div className="font-semibold text-gray-100">Template</div>
          <div className="mt-1 text-xs text-gray-500">Build a reusable workout in the full template builder.</div>
        </button>
        <button
          onClick={() => { onClose(); onProgram() }}
          className="w-full text-left rounded-xl bg-gray-950 border border-gray-800 p-4"
        >
          <div className="font-semibold text-gray-100">Program</div>
          <div className="mt-1 text-xs text-gray-500">Create a multi-week plan from saved templates.</div>
        </button>
        </div>
      </div>
    </Sheet>
    <ConfirmSheet
      open={!!confirmDelete}
      onClose={() => setConfirmDelete(null)}
      onConfirm={doDelete}
      title={confirmDelete?.type === 'draft' ? 'Delete draft?' : 'Delete program draft?'}
      message={`"${confirmDelete?.item?.name}" will be permanently removed.`}
      confirmLabel="Delete"
      danger
    />
    </>
  )
}

function Templates({ templates, onChanged }) {
  const { workout, startWorkout } = useWorkout()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState(null)
  const [pendingTemplate, setPendingTemplate] = useState(null)

  if (!templates.length) return <Empty>Save a finished workout or create a lightweight template.</Empty>

  async function startFromTemplate(t, skipConfirm = false) {
    if (workout && !skipConfirm) {
      setPendingTemplate(t)
      return
    }
    try {
      const data = await api.get(`/templates/${t.id}`)
      let template = data.template
      if (template.user_id !== user?.id) {
        const copied = await api.post('/templates', {
          name: template.name,
          description: template.description || '',
          visibility: 'private',
          strictness: template.strictness || 'adapt',
          source_template_id: template.id,
          workout_day: template.workout_day || null,
          workout_split_type: template.workout_split_type || null,
          exercises: (template.exercises || []).map(e => ({
            exercise_id: e.exercise_id,
            sets: (e.sets || []).map(s => ({
              target_reps: s.target_reps,
              target_weight_kg: s.target_weight_kg,
              target_rir: s.target_rir,
              target_rep_range: s.target_rep_range,
              set_type: s.set_type,
              rom_category: s.rom_category,
              tempo_tag: s.tempo_tag,
              rest_seconds: s.rest_seconds,
              failure: s.failure,
            })),
          })),
        })
        template = copied.template
      }
      const exercises = (template.exercises || []).map(e => {
        const seed = exerciseById.get(e.exercise_id)
        return {
          exerciseId: e.exercise_id,
          exerciseName: seed?.name || e.exercise_id,
          primary_muscle: seed?.primary_muscle,
          equipment_type: seed?.equipment_type,
          sets: e.sets || [],
        }
      })
      startWorkout({
        name: template.name,
        dayLabel: template.workout_day || null,
        templateId: template.id,
        exercises,
        runClassification: template.source_template_id ? 'derived' : 'exact',
        skipReplaceWarning: true,
      })
      navigate('/workout')
    } catch (err) {
      toast?.(err.message || 'Failed to start template', 'error')
    }
  }

  async function doDeleteTemplate() {
    if (!confirmDeleteTemplate) return
    const t = confirmDeleteTemplate
    setConfirmDeleteTemplate(null)
    try {
      await api.del(`/templates/${t.id}`)
      toast?.('Template deleted', 'success')
      onChanged?.()
    } catch (err) {
      toast?.(err.message || 'Failed to delete template', 'error')
    }
  }

  return (
    <>
      <div className="space-y-2">
        {templates.map(t => (
          <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-100 truncate">{t.name}</div>
              <div className="text-xs text-gray-500 truncate">
                {t.creator_username ? `by ${t.creator_username} · ` : ''}{strictnessLabel(t.strictness)} · used {t.usage_count || 0}x
              </div>
            </div>
            <button
              onClick={() => startFromTemplate(t)}
              className="px-3 py-2 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-700/40 text-indigo-300 text-xs font-medium min-w-[48px]"
            >
              Start
            </button>
            {t.user_id === user?.id && (
              <button
                onClick={() => setConfirmDeleteTemplate(t)}
                className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-300 text-xs font-medium min-w-[52px]"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
      <ConfirmSheet
        open={!!confirmDeleteTemplate}
        onClose={() => setConfirmDeleteTemplate(null)}
        onConfirm={doDeleteTemplate}
        title="Delete template?"
        message={`"${confirmDeleteTemplate?.name}" will be permanently removed.`}
        confirmLabel="Delete"
        danger
      />
      <ConfirmSheet
        open={!!pendingTemplate}
        onClose={() => setPendingTemplate(null)}
        onConfirm={() => { const t = pendingTemplate; setPendingTemplate(null); startFromTemplate(t, true) }}
        title="Replace workout?"
        message="Starting this template will replace your current active workout."
        confirmLabel="Replace"
        danger
      />
    </>
  )
}

function ProgramCard({ program, onOpen, onStarted }) {
  const toast = useToast()
  const [startOpen, setStartOpen] = useState(false)

  return (
    <>
      <div onClick={onOpen} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }} className="w-full text-left bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3 active:scale-[0.99] transition cursor-pointer">
        <div className="flex items-center gap-2">
          <Avatar username={program.creator_username || 'anon'} size="sm" />
          <span className="text-sm text-gray-300 truncate">{program.creator_username || 'unknown'}</span>
          <span className="ml-auto text-[10px] text-gray-500 uppercase tracking-wider">Open-ended</span>
        </div>
        <div>
          <div className="font-bold text-gray-100 text-lg leading-tight line-clamp-2">{program.name}</div>
          {program.description && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{program.description}</div>}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
          <span className="font-mono tabular-nums text-gray-100 text-xl">{program.proof?.hero || `${program.enrollment_count || 0} started`}</span>
          <span>{proofStatus(program.proof?.status)}</span>
          <span className="px-2 py-1 rounded-full bg-gray-950 border border-gray-800">open-ended</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500">{strictnessLabel(program.strictness)}</span>
          <button onClick={(e) => { e.stopPropagation(); setStartOpen(true) }} className="ml-auto px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold">
            Start program
          </button>
        </div>
      </div>
      <StartProgramSheet
        open={startOpen}
        onClose={() => setStartOpen(false)}
        program={program}
        onStarted={() => {
          toast?.(`Started ${program.name}`, 'success')
          onStarted?.(program.id)
        }}
      />
    </>
  )
}

export function ProgramDetailSheet({ program, refreshKey, onClose }) {
  const [evidence, setEvidence] = useState(null)
  const [full, setFull] = useState(null)
  const [evidenceError, setEvidenceError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  const [decisionOpen, setDecisionOpen] = useState(false)
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false)
  const navigate = useNavigate()
  const { workout, startWorkout } = useWorkout()
  const toast = useToast()

  useEffect(() => {
    if (!program) return
    let cancelled = false
    setEvidence(null)
    setFull(null)
    setEvidenceError('')
    setDetailError('')
    api.get(`/programs/${program.id}/evidence`).then(result => {
      if (!cancelled) setEvidence(result)
    }).catch(err => {
      if (!cancelled) setEvidenceError(err.message || 'Could not load evidence')
    })
    api.get(`/programs/${program.id}`).then(data => {
      if (!cancelled) setFull(data.program)
    }).catch(err => {
      if (!cancelled) setDetailError(err.message || 'Could not load program details')
    })
    return () => { cancelled = true }
  }, [program, refreshKey, retryKey])

  if (!program) return null

  const nextSession = full?.phase?.next_session_id
    ? full.workouts?.find(w => w.id === full.phase.next_session_id)
    : full?.workouts?.[0]

  async function startNextSession(skipConfirm = false) {
    if (!nextSession?.template_id) return
    if (workout && !skipConfirm) {
      setReplaceConfirmOpen(true)
      return
    }
    try {
      const data = await api.get(`/templates/${nextSession.template_id}`)
      const template = data.template
      const exercises = (template.exercises || []).map(e => {
        const seed = exerciseById.get(e.exercise_id)
        return {
          exerciseId: e.exercise_id,
          exerciseName: seed?.name || e.exercise_id,
          primary_muscle: seed?.primary_muscle,
          equipment_type: seed?.equipment_type,
          sets: e.sets || [],
        }
      })
      startWorkout({
        name: nextSession.session_label || template.name,
        dayLabel: nextSession.session_label || null,
        templateId: template.id,
        programId: program.id,
        exercises,
        runClassification: nextSession.optional ? 'adapted' : 'exact',
        skipReplaceWarning: true,
      })
      navigate('/workout')
    } catch (err) {
      toast?.(err.message || 'Failed to start next session', 'error')
    }
  }

  async function decide(decision) {
    try {
      const data = await api.post(`/programs/${program.id}/phase-decision`, { decision })
      setFull(prev => prev ? { ...prev, phase: data.phase } : prev)
      setDecisionOpen(false)
      toast?.('Program timing updated', 'success')
    } catch (err) {
      toast?.(err.message || 'Failed to update timing', 'error')
    }
  }

  return (
    <>
    <Sheet open={!!program} onClose={onClose} title={program.name}>
      <div className="p-4 space-y-5">
        <div>
          <div className="text-xs uppercase tracking-wider text-gray-500">Creator note</div>
          <p className="mt-1 text-sm text-gray-300">{program.description || 'No creator note yet.'}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ProofStat label="Started" value={program.proof?.starts || 0} />
          <ProofStat label="Active" value={program.proof?.active_users || 0} />
          <ProofStat label="Exact runs" value={program.proof?.exact_runs || 0} />
          <ProofStat label="Adapted" value={program.proof?.adapted_runs || 0} />
        </div>
        <div className="rounded-2xl bg-gray-950 border border-gray-800 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-500">Next session</div>
              <div className="mt-1 text-sm font-semibold text-gray-100">
                {detailError || nextSession?.session_label || nextSession?.template_name || (full ? 'Start the program to queue a session' : 'Loading program...')}
              </div>
              {full?.phase?.next_suggested_at && <div className="mt-1 text-xs text-gray-500">Suggested {new Date(full.phase.next_suggested_at).toLocaleDateString()}</div>}
            </div>
            {nextSession && full?.enrollment && (
              <button onClick={startNextSession} className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold">
                Start
              </button>
            )}
          </div>
          {detailError && (
            <button onClick={() => setRetryKey(k => k + 1)} className="w-full py-2 rounded-lg bg-gray-900 text-gray-300 text-xs font-semibold">
              Retry program details
            </button>
          )}
          {full?.enrollment && (
            <button onClick={() => setDecisionOpen(true)} className="w-full py-2 rounded-lg bg-gray-900 text-gray-300 text-xs font-semibold">
              Missed timing? Continue, shift, or adapt
            </button>
          )}
        </div>
        {full?.blocks?.length > 0 && (
          <div className="rounded-2xl bg-gray-950 border border-gray-800 p-4 space-y-3">
            <div className="text-xs uppercase tracking-wider text-gray-500">Structure</div>
            {full.blocks.map(block => (
              <div key={block.id} className="space-y-2">
                <div className="text-sm font-semibold text-gray-100">{block.name}</div>
                {(full.workouts || []).filter(w => w.block_id === block.id).map((session, idx) => (
                  <div key={session.id} className="flex gap-2 text-xs text-gray-400">
                    <span className="font-mono text-gray-500">{idx + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{session.session_label || session.template_name}</span>
                    <span>{timingLabel(session.timing_preset)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        <div className="rounded-2xl bg-gray-950 border border-gray-800 p-4">
          <div className="text-xs uppercase tracking-wider text-gray-500">Evidence</div>
          <p className="mt-2 text-sm text-gray-300">{evidenceError || evidence?.language || 'Loading evidence...'}</p>
          {evidenceError && (
            <button onClick={() => setRetryKey(k => k + 1)} className="mt-3 px-3 py-1.5 rounded-lg bg-gray-900 text-xs font-semibold text-gray-300 hover:bg-gray-800">
              Retry evidence
            </button>
          )}
          {evidence?.cohorts && (
            <div className="mt-3 text-xs text-gray-500 space-y-1">
              <div>People running this: <span className="font-mono text-gray-300">{evidence.cohorts.running_this}</span></div>
              <div>Adapting this: <span className="font-mono text-gray-300">{evidence.cohorts.adapting_this}</span></div>
              <div>Matched lifters: <span className="text-gray-400">Study view</span></div>
            </div>
          )}
        </div>
        <button onClick={() => navigate(`/study?program=${program.id}`)} className="w-full py-3 rounded-xl bg-gray-800 text-gray-200 text-sm font-semibold">
          Open in Study
        </button>
        <DecisionSheet open={decisionOpen} onClose={() => setDecisionOpen(false)} onPick={decide} />
      </div>
    </Sheet>
    <ConfirmSheet
      open={replaceConfirmOpen}
      onClose={() => setReplaceConfirmOpen(false)}
      onConfirm={() => { setReplaceConfirmOpen(false); startNextSession(true) }}
      title="Replace workout?"
      message="Starting this session will replace your current active workout."
      confirmLabel="Replace"
      danger
    />
    </>
  )
}

export function StartProgramSheet({ open, onClose, program, onStarted }) {
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [ack, setAck] = useState(false)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!open) return
    setStartDate(new Date().toISOString().slice(0, 10))
    setAck(false)
    setSaving(false)
  }, [open, program?.id])

  async function start() {
    if (saving) return
    setSaving(true)
    try {
      await api.post(`/programs/${program.id}/start`, { start_date: startDate, accepted_minimum_weeks: ack })
      onStarted?.()
      onClose()
    } catch (err) {
      toast?.(err.message || 'Failed to start program', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Start program">
      <div className="p-4 space-y-4">
        <div className="text-sm text-gray-300">Pick a start date. RepSearch will suggest the next sessions from the program timing rules. Programs are open-ended, but useful evidence needs a real run.</div>
        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-600 rounded-xl px-3 py-3 text-gray-100 outline-none"
          />
        </label>
        <label className="flex gap-3 rounded-xl bg-gray-950 border border-gray-800 p-3">
          <input
            type="checkbox"
            checked={ack}
            onChange={e => setAck(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-gray-300">I understand this program is open-ended, and I am expected to run it for at least 6 weeks before judging the results.</span>
        </label>
        <button onClick={start} disabled={saving || !startDate || !ack} className="w-full py-4 rounded-2xl bg-indigo-600 disabled:opacity-50 text-white font-semibold">
          {saving ? 'Starting...' : 'Start program'}
        </button>
      </div>
    </Sheet>
  )
}

function DecisionSheet({ open, onClose, onPick }) {
  return (
    <Sheet open={open} onClose={onClose} title="Timing decision">
      <div className="p-4 space-y-2">
        <button onClick={() => onPick('continue')} className="w-full text-left rounded-xl bg-gray-950 border border-gray-800 p-4">
          <div className="font-semibold text-gray-100">Continue with next session</div>
          <div className="mt-1 text-xs text-gray-500">Keep the program order and mark timing as handled.</div>
        </button>
        <button onClick={() => onPick('shift')} className="w-full text-left rounded-xl bg-gray-950 border border-gray-800 p-4">
          <div className="font-semibold text-gray-100">Shift future suggestions</div>
          <div className="mt-1 text-xs text-gray-500">Keep the session but reset the timing track.</div>
        </button>
        <button onClick={() => onPick('skip_adapt')} className="w-full text-left rounded-xl bg-gray-950 border border-gray-800 p-4">
          <div className="font-semibold text-gray-100">Skip / mark adapted</div>
          <div className="mt-1 text-xs text-gray-500">Record that this run moved away from the written plan.</div>
        </button>
      </div>
    </Sheet>
  )
}

function ProofStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-gray-950 border border-gray-800 p-3">
      <div className="font-mono text-2xl text-gray-100">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
    </div>
  )
}

function strictnessLabel(v) {
  return STRICTNESS.find(s => s.v === v)?.label || 'Adapt as needed'
}

function proofStatus(status) {
  if (status === 'based_on_lifters') return 'based on lifters'
  if (status === 'early_signal') return 'early signal'
  return 'not enough data'
}

function timingLabel(value) {
  if (value === 'next_day') return 'next day'
  if (value === 'after_2_rest_days') return '2 rest days'
  if (value === 'two_to_three_days') return '2-3 days'
  if (value === 'any_time_this_week') return 'this week'
  if (value === 'optional_bonus') return 'optional'
  if (value === 'advanced') return 'custom'
  return '1 rest day'
}

function Empty({ children }) {
  return <div className="text-center py-12 text-sm text-gray-500">{children}</div>
}

function Skeleton() {
  return (
    <div className="space-y-2">
      <div className="h-32 bg-gray-900 rounded-2xl animate-pulse" />
      <div className="h-32 bg-gray-900 rounded-2xl animate-pulse" />
    </div>
  )
}
