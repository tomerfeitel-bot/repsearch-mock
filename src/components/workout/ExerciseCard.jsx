import { useEffect, useState, useMemo } from 'react'
import SetRow from './SetRow.jsx'
import { muscleColor } from '../../lib/musclePalette.js'
import {
  RESEARCH_FIELDS,
  formatResearchValue,
  formatRest,
  hasResearchValue,
} from './researchFields.js'

function hasValue(value) {
  return value !== null && value !== undefined && value !== ''
}

const PINNABLE_FIELD_KEYS = new Set([
  'rir',
  'set_type',
  'rom_category',
  'tempo_tag',
  'rest_seconds',
  'failure',
  'pain_flag',
])

const ROW_PIN_FIELDS = new Set([
  'rir',
  'rom_category',
  'tempo_tag',
  'rest_seconds',
  'failure',
  'pain_flag',
])

export default function ExerciseCard({
  exercise,
  index,
  prevSession,
  pinnedValues = {},
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onPinField,
  onUnpinField,
  onOpenPrevious,
  onRequestRemove,
  onSetCompleted,
  onRestTimerStart,
  domId,
  planning = false,
  researchFields = RESEARCH_FIELDS,
  researchDetailsVisible = true,
}) {
  const [expandedSet, setExpandedSet] = useState(null)
  const [setActionIdx, setSetActionIdx] = useState(null)
  const muscle = exercise.primary_muscle
  const cardDomId = domId || (exercise.exerciseId ? `active-exercise-${String(exercise.exerciseId).replace(/[^a-zA-Z0-9_-]/g, '-')}` : undefined)
  const lastTop = prevSession?.length
    ? prevSession.reduce((best, s) => (s.weight_kg ?? 0) > (best.weight_kg ?? 0) ? s : best, prevSession[0])
    : null

  useEffect(() => {
    if (!researchDetailsVisible) setExpandedSet(null)
  }, [researchDetailsVisible])

  const pinnedByIndex = useMemo(() => {
    const lastValueOf = {}
    return exercise.sets.map(s => {
      const pills = []
      for (const field of researchFields) {
        const key = field.key
        if (!ROW_PIN_FIELDS.has(key)) continue
        if (s._unpinnedFields?.includes(key)) {
          delete lastValueOf[key]
          continue
        }
        if (hasResearchValue(s[key])) {
          lastValueOf[key] = s[key]
        }
        const isPinnedHere = s._pinnedFields?.includes(key) || key in pinnedValues
        const value = hasResearchValue(s[key]) ? s[key] : lastValueOf[key]
        if (isPinnedHere && hasResearchValue(value)) pills.push({ field: key, value })
      }
      return pills
    })
  }, [exercise.sets, pinnedValues, researchFields])

  const setBadges = useMemo(() => {
    const counts = { working: 0, warmup: 0, backoff: 0 }
    return exercise.sets.map(s => {
      const type = s.set_type === 'warmup' ? 'warmup' : s.set_type === 'backoff' ? 'backoff' : 'working'
      counts[type] += 1
      if (type === 'warmup') return `W${counts.warmup}`
      if (type === 'backoff') return `B${counts.backoff}`
      return String(counts.working)
    })
  }, [exercise.sets])

  function handleToggleDone(setIdx) {
    const s = exercise.sets[setIdx]
    const newDone = !s.done
    const patch = { done: newDone }
    onUpdateSet(index, setIdx, patch)
    if (newDone) onSetCompleted?.({ ...s, ...patch })
  }

  function handleUsePrevious(setIdx) {
    const prev = prevSession?.[setIdx]
    if (!prev) return
    onUpdateSet(index, setIdx, {
      weight_kg: prev.weight_kg ?? null,
      reps: prev.reps ?? null,
      rir: prev.rir ?? null,
    })
  }

  function setTemplateForNew(set, extra = {}, keepActuals = false) {
    return {
      weight_kg: keepActuals ? (set.weight_kg ?? null) : null,
      reps: keepActuals ? (set.reps ?? null) : null,
      rir: keepActuals ? (set.rir ?? null) : null,
      set_type: set.set_type || 'working',
      rom_category: set.rom_category ?? null,
      tempo_tag: set.tempo_tag ?? null,
      rest_seconds: set.rest_seconds ?? set.planned_rest_seconds ?? null,
      _restExplicit: keepActuals
        ? !!set._restExplicit
        : !!set._restExplicit || hasValue(set.planned_rest_seconds),
      failure: keepActuals ? !!set.failure : false,
      pain_flag: keepActuals ? !!set.pain_flag : false,
      set_notes: keepActuals ? (set.set_notes ?? null) : null,
      planned_weight_kg: set.weight_kg ?? set.planned_weight_kg ?? null,
      planned_reps: set.reps ?? set.planned_reps ?? null,
      planned_rir: set.rir ?? set.planned_rir ?? null,
      ...extra,
    }
  }

  function handleDuplicateSet(setIdx) {
    const set = exercise.sets[setIdx]
    onAddSet(index, setTemplateForNew(set, {}, true))
  }

  function handleCopyPreviousSet(setIdx) {
    const previous = exercise.sets[setIdx - 1]
    if (!previous) return
    onUpdateSet(index, setIdx, setTemplateForNew(previous, {}, true))
  }

  function handleAddTypedSet(setIdx, setType) {
    const source = exercise.sets[setIdx] || exercise.sets[exercise.sets.length - 1] || {}
    onAddSet(index, setTemplateForNew(source, { set_type: setType }, false))
  }

  function handleAddSet() {
    const source = exercise.sets[exercise.sets.length - 1]
    onAddSet(index, source ? setTemplateForNew(source, {}, false) : undefined)
  }

  function handleLongPress(setIdx) {
    setSetActionIdx(setIdx)
  }

  function handleResearchChange(setIdx, key, value) {
    const set = exercise.sets[setIdx]
    const nextPinnedFields = new Set(set._pinnedFields || [])
    const nextUnpinnedFields = new Set(set._unpinnedFields || [])
    const patch = { [key]: value }
    if (PINNABLE_FIELD_KEYS.has(key) && hasResearchValue(value)) {
      nextPinnedFields.add(key)
      nextUnpinnedFields.delete(key)
      patch._pinnedFields = [...nextPinnedFields]
      patch._unpinnedFields = [...nextUnpinnedFields]
      onPinField?.(index, key, value)
    }
    if (key === 'rest_seconds') {
      patch._restExplicit = hasResearchValue(value)
      const durationSec = Number(value)
      if (Number.isFinite(durationSec) && durationSec > 0) {
        onRestTimerStart?.(durationSec)
      }
    }
    onUpdateSet(index, setIdx, patch)
  }

  function handleUnpinSetField(setIdx, key) {
    const set = exercise.sets[setIdx]
    const nextPinnedFields = new Set(set._pinnedFields || [])
    const nextUnpinnedFields = new Set(set._unpinnedFields || [])
    nextPinnedFields.delete(key)
    nextUnpinnedFields.add(key)
    const resetValue = key === 'failure' || key === 'pain_flag'
      ? false
      : key === 'set_type'
        ? 'working'
        : null
    onUpdateSet(index, setIdx, {
      [key]: resetValue,
      ...(key === 'rest_seconds' ? { _restExplicit: false } : {}),
      _pinnedFields: [...nextPinnedFields],
      _unpinnedFields: [...nextUnpinnedFields],
    })
    onUnpinField?.(index, key)
  }

  const exerciseColor = muscleColor(muscle)

  return (
    <section
      id={cardDomId}
      className="workout-exercise scroll-mt-32"
      style={{ '--exercise-color': exerciseColor }}
    >
      <div className="flex">
        <div className="min-w-0 flex-1 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 truncate text-sm font-black" style={{ color: 'var(--text)' }}>
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: exerciseColor }} />
                {exercise.exerciseName}
              </div>
              <div className="mt-0.5 text-caption" style={{ color: 'var(--text-muted)' }}>
                {muscle}{exercise.equipment_type ? ` - ${exercise.equipment_type}` : ''}
              </div>
            </div>
            {lastTop && (
              <button
                onClick={() => onOpenPrevious?.(exercise)}
                className="shrink-0 text-right text-xs transition-colors hover:text-white"
                style={{ color: 'var(--text-muted)' }}
              >
                <div className="font-mono tabular-nums">{lastTop.weight_kg}kg x {lastTop.reps}</div>
                <div className="text-[10px]" style={{ color: 'var(--ink-soft)' }}>Last top</div>
              </button>
            )}
            <button
              type="button"
              onClick={() => onRequestRemove?.(exercise, index)}
              aria-label={`Delete ${exercise.exerciseName || 'exercise'} from active workout`}
              data-testid="delete-exercise-button"
              className="min-h-9 shrink-0 rounded-full border px-3 text-xs font-bold transition-colors hover:bg-red-950/50"
              style={{ borderColor: 'rgba(211,98,58,0.58)', color: '#ea9670' }}
            >
              Delete
            </button>
          </div>

          <div className="mt-3">
            {exercise.sets.length === 0 ? (
              <div className="py-3 text-xs italic" style={{ color: 'var(--text-muted)' }}>No sets yet.</div>
            ) : (
              exercise.sets.map((s, sIdx) => (
                <div key={s.id}>
                  <SetRow
                    set={s}
                    setNumber={sIdx + 1}
                    setBadge={setBadges[sIdx]}
                    prev={prevSession?.[sIdx]}
                    pinnedPills={pinnedByIndex[sIdx]}
                    onChange={(patch) => onUpdateSet(index, sIdx, patch)}
                    onPinnedChange={(key, value) => handleResearchChange(sIdx, key, value)}
                    onToggleDone={() => handleToggleDone(sIdx)}
                    onLongPress={() => handleLongPress(sIdx)}
                    onExpand={() => setExpandedSet(expandedSet === sIdx ? null : sIdx)}
                    onUsePrevious={() => handleUsePrevious(sIdx)}
                    expanded={expandedSet === sIdx}
                    planning={planning}
                    researchFields={researchFields}
                    researchDetailsVisible={researchDetailsVisible}
                  />
                  {researchDetailsVisible && expandedSet === sIdx && (
                    <PrecisionDrawer
                      exerciseName={exercise.exerciseName}
                      setNumber={sIdx + 1}
                      set={s}
                      pinnedValues={pinnedValues}
                      onChange={(key, value) => handleResearchChange(sIdx, key, value)}
                      onUnpin={(key) => handleUnpinSetField(sIdx, key)}
                      onClose={() => setExpandedSet(null)}
                      onCopyPrevious={() => handleCopyPreviousSet(sIdx)}
                      onDuplicate={() => handleDuplicateSet(sIdx)}
                      onAddWarmup={() => handleAddTypedSet(sIdx, 'warmup')}
                      onAddBackoff={() => handleAddTypedSet(sIdx, 'backoff')}
                      canCopyPrevious={sIdx > 0}
                      researchFields={researchFields}
                    />
                  )}
                </div>
              ))
            )}
          </div>

          <button
            onClick={handleAddSet}
            className="mt-2 min-h-11 w-full border-t text-sm font-bold transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            + Add set
          </button>
        </div>
      </div>
      {setActionIdx !== null && (
        <SetActionSheet
          set={exercise.sets[setActionIdx]}
          setNumber={setActionIdx + 1}
          onToggleWarmup={() => {
            const s = exercise.sets[setActionIdx]
            onUpdateSet(index, setActionIdx, { set_type: s.set_type === 'warmup' ? 'working' : 'warmup' })
            setSetActionIdx(null)
          }}
          onDelete={() => {
            onRemoveSet(index, setActionIdx)
            setSetActionIdx(null)
          }}
          onClose={() => setSetActionIdx(null)}
        />
      )}
    </section>
  )
}

function SetActionSheet({ set, setNumber, onToggleWarmup, onDelete, onClose }) {
  const isWarmup = set?.set_type === 'warmup'
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom)]">
        <div className="w-10 h-1 rounded-full bg-gray-700 absolute top-2 left-1/2 -translate-x-1/2" />
        <div className="px-4 pt-5 pb-3 border-b border-gray-800">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold text-center">Set {setNumber}</p>
        </div>
        <div className="p-4 space-y-2">
          <button
            type="button"
            onClick={onToggleWarmup}
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3.5 text-sm font-semibold text-gray-100 text-left active:bg-gray-700"
          >
            {isWarmup ? 'Mark as working set' : 'Mark as warmup'}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="w-full rounded-xl border border-red-500/30 bg-red-600/10 px-4 py-3.5 text-sm font-semibold text-red-300 text-left active:bg-red-600/20"
          >
            Delete set
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-3.5 text-sm font-semibold text-gray-400 active:bg-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function PrecisionDrawer({
  exerciseName,
  setNumber,
  set,
  pinnedValues,
  onChange,
  onUnpin,
  onClose,
  onCopyPrevious,
  onDuplicate,
  onAddWarmup,
  onAddBackoff,
  canCopyPrevious,
  researchFields = RESEARCH_FIELDS,
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/50 px-3 pb-3" role="dialog" aria-modal="true">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close precision drawer" onClick={onClose} />
      <div className="relative w-full max-h-[82vh] overflow-y-auto rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl shadow-black/60">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-800 bg-gray-950/95 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-100">{exerciseName}</div>
            <div className="text-xs text-gray-500">Set {setNumber} precision</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm font-semibold text-gray-300 hover:bg-gray-700">
            Done
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <QuickAction label="Copy prev" disabled={!canCopyPrevious} onClick={onCopyPrevious} />
            <QuickAction label="Duplicate" onClick={onDuplicate} />
            <QuickAction label="Warmup" onClick={onAddWarmup} />
            <QuickAction label="Backoff" onClick={onAddBackoff} />
          </div>

          <ExpandedFields
            set={set}
            pinnedValues={pinnedValues}
            onChange={onChange}
            onUnpin={onUnpin}
            researchFields={researchFields}
          />
        </div>
      </div>
    </div>
  )
}

function QuickAction({ label, disabled = false, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl border border-gray-700 bg-gray-900 px-2 py-2 text-xs font-semibold text-gray-300 transition-colors hover:border-gray-500 hover:text-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  )
}

function ExpandedFields({ set, pinnedValues, onChange, onUnpin, researchFields = RESEARCH_FIELDS }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {researchFields.map(field => {
        const canPin = PINNABLE_FIELD_KEYS.has(field.key)
        const isPinned = canPin && (set._pinnedFields?.includes(field.key) ||
          (field.key in pinnedValues && !set._unpinnedFields?.includes(field.key))
        )
        const wide = field.type === 'rir' || field.type === 'rest' || field.type === 'text'
        return (
          <div key={field.key} className={(wide ? 'col-span-2 ' : '') + 'space-y-1'}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{field.label}</label>
                <HelpTip text={field.help} />
              </div>
              {canPin && (
                <button
                  type="button"
                  onClick={() => isPinned ? onUnpin(field.key) : hasResearchValue(set[field.key]) && onChange(field.key, set[field.key])}
                  className={'text-[10px] font-semibold ' + (isPinned ? 'text-gray-100' : 'text-gray-600 hover:text-gray-400')}
                  title={isPinned ? 'Unpin from this set forward' : 'Pin value to next sets'}
                >
                  {isPinned ? 'Pinned' : 'Pin'}
                </button>
              )}
            </div>
            <ResearchInput field={field} value={set[field.key]} onChange={value => onChange(field.key, value)} />
          </div>
        )
      })}
    </div>
  )
}

function HelpTip({ text }) {
  return (
    <span className="relative inline-flex group">
      <button
        type="button"
        className="w-4 h-4 rounded-full border border-gray-700 bg-gray-800 text-gray-500 hover:text-gray-200 hover:border-gray-500 focus:text-gray-200 focus:border-gray-500 focus:outline-none text-[10px] leading-none flex items-center justify-center"
        aria-label={text}
      >
        ?
      </button>
      <span className="pointer-events-none absolute left-1/2 bottom-full z-20 mb-2 w-48 -translate-x-1/2 rounded-lg border border-gray-700 bg-gray-950 px-2.5 py-2 text-[11px] leading-snug text-gray-300 opacity-0 shadow-xl shadow-black/40 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {text}
      </span>
    </span>
  )
}

function ResearchInput({ field, value, onChange }) {
  if (field.type === 'rir') return <RirTicker value={value} onChange={onChange} />
  if (field.type === 'rest') {
    const seconds = Number(value) || 0
    return <RestWheel value={seconds} onChange={onChange} />
  }
  if (field.type === 'boolean') {
    return (
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={'w-full rounded-lg px-2 py-2 text-sm font-medium border ' + (value ? 'bg-gray-100 border-gray-100 text-gray-950' : 'bg-gray-800 border-gray-700 text-gray-400')}
      >
        {value ? 'Yes' : 'No'}
      </button>
    )
  }
  if (field.type === 'text') {
    return (
      <input
        value={value || ''}
        placeholder={field.placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 focus:border-gray-500 rounded-lg px-2 py-1.5 text-sm text-gray-100 outline-none"
      />
    )
  }
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      className="w-full bg-gray-800 border border-gray-700 focus:border-gray-500 rounded-lg px-2 py-1.5 text-sm text-gray-100 outline-none"
    >
      <option value="">None</option>
      {field.options.map(o => <option key={o} value={o}>{formatResearchValue(field.key, o)}</option>)}
    </select>
  )
}

function RestWheel({ value, onChange }) {
  const values = Array.from({ length: 41 }, (_, i) => i * 15)
  const selected = Number(value) || 0
  return (
    <div className="rounded-xl bg-gray-800 border border-gray-700 p-2">
      <div className="relative h-40 overflow-hidden rounded-lg bg-gray-900/70">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-9 border-y border-gray-500/60 bg-white/5" />
        <div className="h-full overflow-y-auto snap-y snap-mandatory py-[3.25rem] no-scrollbar">
          {values.map(seconds => {
            const active = seconds === selected
            return (
              <button
                key={seconds}
                type="button"
                onClick={() => onChange(seconds)}
                className={'snap-center w-full h-9 flex items-center justify-center font-mono tabular-nums transition-colors ' + (active ? 'text-gray-100 text-lg font-bold' : 'text-gray-500 text-sm hover:text-gray-300')}
              >
                {formatRest(seconds)}
              </button>
            )
          })}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button type="button" onClick={() => onChange(Math.max(0, selected - 15))} className="px-3 py-1 rounded-lg bg-gray-900 text-gray-300 text-xs">-15s</button>
        <span className="font-mono text-gray-100 text-sm">{formatRest(selected)}</span>
        <button type="button" onClick={() => onChange(Math.min(600, selected + 15))} className="px-3 py-1 rounded-lg bg-gray-900 text-gray-300 text-xs">+15s</button>
      </div>
    </div>
  )
}

function RirTicker({ value, onChange }) {
  const options = [
    { value: 0, color: 'bg-red-600 text-white border-red-500' },
    { value: 1, color: 'bg-orange-600 text-gray-100 border-orange-500' },
    { value: 2, color: 'bg-amber-500 text-gray-950 border-amber-400' },
    { value: 3, color: 'bg-lime-600 text-gray-100 border-lime-500' },
    { value: 4, color: 'bg-emerald-600 text-white border-emerald-500' },
    { value: '5+', color: 'bg-sky-600 text-gray-100 border-sky-500' },
  ]
  return (
    <div className="grid grid-cols-6 gap-1">
      {options.map(opt => {
        const active = String(value) === String(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(active ? null : opt.value)}
            className={'h-9 rounded-lg text-xs font-bold border transition-colors ' + (active ? opt.color : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200')}
          >
            {opt.value}
          </button>
        )
      })}
    </div>
  )
}
