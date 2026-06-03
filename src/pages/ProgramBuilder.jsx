import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Sheet } from '../components/ui/Sheet.jsx'
import { api } from '../lib/api.js'
import { nanoid } from '../lib/nanoid.js'
import { useToast } from '../components/ui/Toast.jsx'

const STRICTNESS = [
  { v: 'written', label: 'Run as written' },
  { v: 'adapt', label: 'Adapt as needed' },
  { v: 'inspiration', label: 'Use as inspiration' },
]

const TIMING = [
  { v: 'next_day', label: 'Next day', short: 'next day', min: 18, ideal: 24, max: 36 },
  { v: 'after_1_rest_day', label: 'After 1 rest day', short: '1 rest day', min: 36, ideal: 48, max: 72 },
  { v: 'after_2_rest_days', label: 'After 2 rest days', short: '2 rest days', min: 60, ideal: 72, max: 96 },
  { v: 'two_to_three_days', label: '2-3 days later', short: '2-3 days', min: 48, ideal: 72, max: 96 },
  { v: 'any_time_this_week', label: 'Any time this week', short: 'this week', min: 0, ideal: 72, max: 168 },
  { v: 'optional_bonus', label: 'Optional / bonus', short: 'optional', min: 0, ideal: 0, max: 168 },
  { v: 'advanced', label: 'Advanced window', short: 'advanced', min: 36, ideal: 48, max: 72 },
]

const timingById = new Map(TIMING.map(t => [t.v, t]))

export default function ProgramBuilder() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const createdTemplateId = searchParams.get('createdTemplate') || ''
  const addToBlock = searchParams.get('addToBlock') || ''
  const returnTo = searchParams.get('returnTo') || '/profile'
  const navigate = useNavigate()
  const toast = useToast()
  const [program, setProgram] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saveOpen, setSaveOpen] = useState(false)
  const [templatePicker, setTemplatePicker] = useState(null)
  const [saving, setSaving] = useState(false)
  const createPromiseRef = useRef(null)
  const saveTimerRef = useRef(null)
  const programRef = useRef(null)
  const blocksRef = useRef([])
  const navigateRef = useRef(navigate)
  const toastRef = useRef(toast)
  const consumedTemplateRef = useRef('')

  useEffect(() => {
    programRef.current = program
  }, [program])

  useEffect(() => {
    blocksRef.current = blocks
  }, [blocks])

  useEffect(() => {
    navigateRef.current = navigate
    toastRef.current = toast
  }, [navigate, toast])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const templateData = await api.get('/templates')
        if (cancelled) return
        const loadedTemplates = templateData.templates || []
        setTemplates(loadedTemplates)
        if (id) {
          const data = await api.get(`/programs/${id}`)
          if (cancelled) return
          const hydratedBlocks = hydrate(data.program)
          if (createdTemplateId && consumedTemplateRef.current !== createdTemplateId) {
            const template = loadedTemplates.find(t => t.id === createdTemplateId) || (await api.get(`/templates/${createdTemplateId}`)).template
            if (cancelled) return
            const blockIdx = Math.min(Math.max(Number(addToBlock) || 0, 0), Math.max(hydratedBlocks.length - 1, 0))
            const nextBlocks = appendTemplateToBlocks(hydratedBlocks, blockIdx, template)
            consumedTemplateRef.current = createdTemplateId
            setBlocks(nextBlocks)
            clearTimeout(saveTimerRef.current)
            const nextProgram = programFromApi(data.program)
            await api.patch(`/programs/${nextProgram.id}`, payload(nextProgram, nextBlocks, nextProgram.status || 'draft'))
            if (cancelled) return
            navigateRef.current(`/programs/builder/${id}`, { replace: true })
          }
          return
        }
        if (!createPromiseRef.current) createPromiseRef.current = api.post('/programs/drafts', {})
        const data = await createPromiseRef.current
        if (cancelled) return
        hydrate(data.program)
        navigateRef.current(`/programs/builder/${data.program.id}`, { replace: true })
      } catch (err) {
        toastRef.current?.(err.message || 'Failed to open program builder', 'error')
        navigateRef.current(returnTo, { replace: true })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
      clearTimeout(saveTimerRef.current)
    }
  }, [id, createdTemplateId, addToBlock])

  const totals = useMemo(() => {
    const sessions = blocks.reduce((n, block) => n + block.sessions.length, 0)
    const gaps = blocks.reduce((n, block) => n + block.sessions.filter(s => s.timing_preset).length, 0)
    return { sessions, gaps }
  }, [blocks])

  function hydrate(p) {
    const nextProgram = programFromApi(p)
    setProgram(nextProgram)
    const byBlock = new Map((p.blocks || []).map(block => [block.id, {
      localId: block.id,
      name: block.name || 'Main block',
      description: block.description || '',
      repeat_behavior: block.repeat_behavior || 'repeat',
      sort_order: block.sort_order || 0,
      sessions: [],
    }]))
    if (!byBlock.size) {
      byBlock.set('default', { localId: 'default', name: 'Main block', description: '', repeat_behavior: 'repeat', sort_order: 0, sessions: [] })
    }
    ;(p.workouts || []).forEach((session, idx) => {
      const block = byBlock.get(session.block_id) || [...byBlock.values()][0]
      const timing = timingById.get(session.timing_preset) || timingById.get('after_1_rest_day')
      block.sessions.push({
        localId: session.id || nanoid(),
        template_id: session.template_id,
        template_name: session.template_name || 'Saved template',
        session_label: session.session_label || '',
        session_note: session.session_note || '',
        optional: !!session.optional,
        sort_order: session.sort_order ?? idx,
        timing_preset: session.timing_preset || 'after_1_rest_day',
        timing_min_hours: session.timing_min_hours ?? timing.min,
        timing_ideal_hours: session.timing_ideal_hours ?? timing.ideal,
        timing_max_hours: session.timing_max_hours ?? timing.max,
      })
    })
    const nextBlocks = [...byBlock.values()].sort((a, b) => a.sort_order - b.sort_order).map(normalizeBlock)
    setBlocks(nextBlocks)
    return nextBlocks
  }

  function programFromApi(p) {
    return {
      id: p.id,
      name: p.name || 'Untitled program',
      description: p.description || '',
      visibility: p.visibility || 'private',
      status: p.status || 'draft',
      strictness: p.strictness || 'adapt',
      is_open_ended: p.is_open_ended !== 0,
    }
  }

  function scheduleSave(nextProgram = programRef.current, nextBlocks = blocksRef.current, status = 'draft') {
    if (!nextProgram?.id) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      api.patch(`/programs/${nextProgram.id}`, payload(nextProgram, nextBlocks, status)).catch(() => {})
    }, 900)
  }

  function updateProgram(patch) {
    setProgram(prev => {
      const next = { ...prev, ...patch }
      scheduleSave(next, blocksRef.current, next.status || 'draft')
      return next
    })
  }

  function updateBlocks(fn) {
    setBlocks(prev => {
      const next = fn(prev).map((block, i) => normalizeBlock({ ...block, sort_order: i }))
      scheduleSave(programRef.current, next, programRef.current?.status || 'draft')
      return next
    })
  }

  function addBlock() {
    updateBlocks(prev => [...prev, {
      localId: nanoid(),
      name: `Block ${prev.length + 1}`,
      description: '',
      repeat_behavior: 'repeat',
      sessions: [],
    }])
  }

  function updateBlock(blockIdx, patch) {
    updateBlocks(prev => prev.map((block, i) => i === blockIdx ? { ...block, ...patch } : block))
  }

  function removeBlock(blockIdx) {
    updateBlocks(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== blockIdx))
  }

  function addSession(blockIdx, template) {
    addSessionToBlocks(blockIdx, template)
  }

  function addSessionToBlocks(blockIdx, template) {
    updateBlocks(prev => appendTemplateToBlocks(prev, blockIdx, template))
  }

  function updateSession(blockIdx, sessionIdx, patch) {
    updateBlocks(prev => prev.map((block, i) => i !== blockIdx ? block : {
      ...block,
      sessions: block.sessions.map((session, j) => j === sessionIdx ? { ...session, ...patch } : session),
    }))
  }

  function moveSession(blockIdx, sessionIdx, delta) {
    updateBlocks(prev => prev.map((block, i) => {
      if (i !== blockIdx) return block
      const next = [...block.sessions]
      const target = sessionIdx + delta
      if (target < 0 || target >= next.length) return block
      const [row] = next.splice(sessionIdx, 1)
      next.splice(target, 0, row)
      return { ...block, sessions: next }
    }))
  }

  function duplicateSession(blockIdx, sessionIdx) {
    updateBlocks(prev => prev.map((block, i) => i !== blockIdx ? block : {
      ...block,
      sessions: block.sessions.flatMap((session, j) => j === sessionIdx ? [session, { ...session, localId: nanoid(), session_label: session.session_label ? `${session.session_label} copy` : '' }] : [session]),
    }))
  }

  function removeSession(blockIdx, sessionIdx) {
    updateBlocks(prev => prev.map((block, i) => i !== blockIdx ? block : {
      ...block,
      sessions: block.sessions.filter((_, j) => j !== sessionIdx),
    }))
  }

  async function finalize() {
    if (!program?.name?.trim()) return toast?.('Program name required', 'error')
    if (!totals.sessions) return toast?.('Add at least one template session', 'error')
    setSaving(true)
    try {
      clearTimeout(saveTimerRef.current)
      await api.patch(`/programs/${program.id}`, payload(program, blocks, 'final'))
      toast?.('Program saved', 'success')
      navigate(returnTo, { replace: true })
    } catch (err) {
      toast?.(err.message || 'Failed to save program', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !program) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        Opening program builder...
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
            <div className="text-lg font-bold text-gray-100 truncate">{program.name || 'Untitled program'}</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">
              <span className="font-mono tabular-nums">{totals.sessions}</span> sessions - open-ended
            </div>
          </div>
          <button onClick={() => setSaveOpen(true)} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl">
            Save
          </button>
        </div>
      </div>

      <div className="px-3 pt-3 space-y-3">
        <ProgramMeta program={program} onChange={updateProgram} />
        {blocks.map((block, blockIdx) => (
          <BlockEditor
            key={block.localId}
            block={block}
            canRemove={blocks.length > 1}
            onChange={patch => updateBlock(blockIdx, patch)}
            onRemove={() => removeBlock(blockIdx)}
            onPickTemplate={() => setTemplatePicker(blockIdx)}
            onUpdateSession={(sessionIdx, patch) => updateSession(blockIdx, sessionIdx, patch)}
            onMoveSession={(sessionIdx, delta) => moveSession(blockIdx, sessionIdx, delta)}
            onDuplicateSession={sessionIdx => duplicateSession(blockIdx, sessionIdx)}
            onRemoveSession={sessionIdx => removeSession(blockIdx, sessionIdx)}
          />
        ))}
        <button onClick={addBlock} className="w-full py-3 rounded-2xl bg-gray-900 hover:bg-gray-850 border border-gray-800 text-gray-300 text-sm font-semibold">
          + Add block
        </button>
      </div>

          <TemplatePicker
        open={templatePicker !== null}
        onClose={() => setTemplatePicker(null)}
        templates={templates}
        onCreate={() => {
          setTemplatePicker(null)
          navigate(`/templates/new?returnTo=${encodeURIComponent(`/programs/builder/${program.id}?addToBlock=${templatePicker || 0}`)}`)
        }}
        onPick={template => {
          addSession(templatePicker, template)
          setTemplatePicker(null)
        }}
      />
      <SaveProgramSheet open={saveOpen} onClose={() => setSaveOpen(false)} program={program} onChange={updateProgram} onSave={finalize} saving={saving} />
    </div>
  )
}

function ProgramMeta({ program, onChange }) {
  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-3 space-y-3">
      <input
        value={program.name}
        onChange={e => onChange({ name: e.target.value })}
        placeholder="Program name"
        className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-600 rounded-xl px-3 py-2.5 text-gray-100 font-semibold outline-none"
      />
      <input
        value={program.description}
        onChange={e => onChange({ description: e.target.value })}
        placeholder="Who this is for and how to run it"
        className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-600 rounded-xl px-3 py-2.5 text-sm text-gray-100 outline-none"
      />
      <div className="grid grid-cols-3 gap-1.5">
        {STRICTNESS.map(s => (
          <button
            key={s.v}
            onClick={() => onChange({ strictness: s.v })}
            className={'min-h-10 rounded-lg border px-2 text-[11px] font-semibold ' + (program.strictness === s.v ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100' : 'bg-gray-950 border-gray-800 text-gray-400')}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function BlockEditor({ block, canRemove, onChange, onRemove, onPickTemplate, onUpdateSession, onMoveSession, onDuplicateSession, onRemoveSession }) {
  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-3 space-y-3">
      <div className="flex gap-2">
        <input
          value={block.name}
          onChange={e => onChange({ name: e.target.value })}
          className="min-w-0 flex-1 bg-gray-950 border border-gray-800 focus:border-indigo-600 rounded-xl px-3 py-2 text-gray-100 font-semibold outline-none"
          placeholder="Block name"
        />
        {canRemove && (
          <button onClick={onRemove} className="px-3 rounded-xl text-red-300 bg-red-500/10 border border-red-500/20 text-xs font-semibold">
            Delete
          </button>
        )}
      </div>
      <input
        value={block.description}
        onChange={e => onChange({ description: e.target.value })}
        className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-600 rounded-xl px-3 py-2 text-sm text-gray-100 outline-none"
        placeholder="Optional block note: volume, strength, deload..."
      />
      {block.sessions.length === 0 && (
        <div className="py-8 text-center text-sm text-gray-500">Add saved templates to build this sequence.</div>
      )}
      <div className="space-y-2">
        {block.sessions.map((session, sessionIdx) => (
          <SessionCard
            key={session.localId}
            session={session}
            index={sessionIdx}
            first={sessionIdx === 0}
            last={sessionIdx === block.sessions.length - 1}
            onChange={patch => onUpdateSession(sessionIdx, patch)}
            onMove={delta => onMoveSession(sessionIdx, delta)}
            onDuplicate={() => onDuplicateSession(sessionIdx)}
            onRemove={() => onRemoveSession(sessionIdx)}
          />
        ))}
      </div>
      <button onClick={onPickTemplate} className="w-full py-3 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-700/40 text-indigo-300 text-sm font-semibold">
        + Add template session
      </button>
    </div>
  )
}

function SessionCard({ session, index, first, last, onChange, onMove, onDuplicate, onRemove }) {
  const timing = timingById.get(session.timing_preset) || timingById.get('after_1_rest_day')
  function chooseTiming(value) {
    const next = timingById.get(value) || timing
    onChange({
      timing_preset: value,
      optional: value === 'optional_bonus',
      timing_min_hours: next.min,
      timing_ideal_hours: next.ideal,
      timing_max_hours: next.max,
    })
  }

  return (
    <div className="rounded-xl bg-gray-950 border border-gray-800 p-3 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-200 flex items-center justify-center text-xs font-mono">{index + 1}</div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-100 truncate">{session.session_label || session.template_name}</div>
          <div className="text-xs text-gray-500 truncate">{session.template_name}</div>
        </div>
        <div className="flex gap-1">
          <button disabled={first} onClick={() => onMove(-1)} className="w-8 h-8 rounded-lg bg-gray-900 disabled:opacity-30 text-gray-300 text-[10px] font-semibold">Up</button>
          <button disabled={last} onClick={() => onMove(1)} className="w-8 h-8 rounded-lg bg-gray-900 disabled:opacity-30 text-gray-300 text-[10px] font-semibold">Dn</button>
        </div>
      </div>
      <input
        value={session.session_label}
        onChange={e => onChange({ session_label: e.target.value })}
        placeholder="Optional session label"
        className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-600 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none"
      />
      <input
        value={session.session_note}
        onChange={e => onChange({ session_note: e.target.value })}
        placeholder="Optional session note"
        className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-600 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none"
      />
      <div className="grid grid-cols-2 gap-2">
        {TIMING.map(item => (
          <button
            key={item.v}
            onClick={() => chooseTiming(item.v)}
            className={'min-h-10 rounded-lg border px-2 text-[11px] font-semibold ' + (session.timing_preset === item.v ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100' : 'bg-gray-900 border-gray-800 text-gray-400')}
          >
            {item.label}
          </button>
        ))}
      </div>
      {session.timing_preset === 'advanced' && (
        <div className="grid grid-cols-3 gap-2">
          <SmallNumber label="Min h" value={session.timing_min_hours} onChange={v => onChange({ timing_min_hours: Number(v) })} />
          <SmallNumber label="Ideal h" value={session.timing_ideal_hours} onChange={v => onChange({ timing_ideal_hours: Number(v) })} />
          <SmallNumber label="Max h" value={session.timing_max_hours} onChange={v => onChange({ timing_max_hours: Number(v) })} />
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Gap: {timing.short}</span>
        <button onClick={onDuplicate} className="ml-auto px-3 py-1.5 rounded-lg bg-gray-900 text-gray-300 text-xs font-semibold">Duplicate</button>
        <button onClick={onRemove} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-300 text-xs font-semibold">Remove</button>
      </div>
    </div>
  )
}

function SmallNumber({ label, value, onChange }) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] uppercase tracking-wider text-gray-500">{label}</span>
      <input
        type="number"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-900 border border-gray-800 focus:border-indigo-600 rounded-lg px-2 py-2 text-sm text-gray-100 outline-none"
      />
    </label>
  )
}

function TemplatePicker({ open, onClose, templates, onPick, onCreate }) {
  return (
    <Sheet open={open} onClose={onClose} title="Add template">
      <div className="p-4 space-y-3">
        <button
          onClick={onCreate}
          className="w-full text-left rounded-xl bg-indigo-600/15 border border-indigo-700/40 p-4"
        >
          <div className="font-semibold text-indigo-100">Create a new template</div>
          <div className="mt-1 text-xs text-indigo-300/80">Open the template builder, save it, then return to this program draft.</div>
        </button>
        {templates.length === 0 && <div className="text-sm text-gray-500">No saved templates yet. Create one without leaving this program flow.</div>}
        {templates.map(template => (
          <button
            key={template.id}
            onClick={() => onPick(template)}
            className="w-full text-left rounded-xl bg-gray-950 border border-gray-800 p-3"
          >
            <div className="font-semibold text-gray-100 truncate">{template.name}</div>
            <div className="text-xs text-gray-500 mt-1">{template.visibility} - {template.usage_count || 0} uses</div>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

function SaveProgramSheet({ open, onClose, program, onChange, onSave, saving }) {
  return (
    <Sheet open={open} onClose={onClose} title="Save program">
      <div className="p-4 space-y-4">
        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Name</span>
          <input
            value={program.name}
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
                className={'py-3 rounded-xl border text-sm font-semibold capitalize ' + (program.visibility === v ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100' : 'bg-gray-950 border-gray-800 text-gray-400')}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <button onClick={onSave} disabled={saving || !program.name.trim()} className="w-full py-4 rounded-2xl bg-indigo-600 disabled:opacity-50 text-white font-semibold">
          {saving ? 'Saving...' : 'Save program'}
        </button>
      </div>
    </Sheet>
  )
}

function normalizeBlock(block) {
  return {
    ...block,
    sessions: (block.sessions || []).map((session, i) => ({ ...session, sort_order: i })),
  }
}

function appendTemplateToBlocks(blocks, blockIdx, template) {
  return blocks.map((block, i) => {
    if (i !== blockIdx) return block
    const timing = timingById.get('after_1_rest_day')
    return {
      ...block,
      sessions: [...block.sessions, {
        localId: nanoid(),
        template_id: template.id,
        template_name: template.name,
        session_label: '',
        session_note: '',
        optional: false,
        timing_preset: 'after_1_rest_day',
        timing_min_hours: timing.min,
        timing_ideal_hours: timing.ideal,
        timing_max_hours: timing.max,
      }],
    }
  }).map(normalizeBlock)
}

function payload(program, blocks, status) {
  return {
    name: program.name || 'Untitled program',
    description: program.description || '',
    visibility: status === 'draft' ? 'private' : program.visibility,
    status,
    strictness: program.strictness || 'adapt',
    is_open_ended: true,
    blocks: blocks.map((block, blockIdx) => ({
      name: block.name || (blockIdx === 0 ? 'Main block' : `Block ${blockIdx + 1}`),
      description: block.description || '',
      repeat_behavior: block.repeat_behavior || 'repeat',
      sort_order: blockIdx,
      sessions: block.sessions.map((session, sessionIdx) => ({
        template_id: session.template_id,
        session_label: session.session_label || null,
        session_note: session.session_note || null,
        optional: !!session.optional || session.timing_preset === 'optional_bonus',
        sort_order: sessionIdx,
        timing_preset: session.timing_preset || 'after_1_rest_day',
        timing_min_hours: Number(session.timing_min_hours) || 0,
        timing_ideal_hours: Number(session.timing_ideal_hours) || 0,
        timing_max_hours: Number(session.timing_max_hours) || 0,
      })),
    })),
  }
}
