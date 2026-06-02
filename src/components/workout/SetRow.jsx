import { useEffect, useRef, useState } from 'react'
import { RESEARCH_FIELD_LABELS, TEMPLATE_RESEARCH_FIELD_LABELS, formatResearchValue } from './researchFields.js'

export default function SetRow({
  set,
  setNumber,
  setBadge,
  prev,
  pinnedPills = [],
  onChange,
  onPinnedChange,
  onToggleDone,
  onLongPress,
  onExpand,
  onUsePrevious,
  expanded,
  planning = false,
  researchDetailsVisible = true,
}) {
  const checkRef = useRef(null)
  const longPressTimer = useRef(null)
  const suppressClick = useRef(false)
  const [bounce, setBounce] = useState(false)
  const [editingField, setEditingField] = useState(null)

  useEffect(() => {
    if (set.done && checkRef.current) {
      setBounce(true)
      const t = setTimeout(() => setBounce(false), 200)
      return () => clearTimeout(t)
    }
  }, [set.done])

  function startLongPress() {
    suppressClick.current = false
    longPressTimer.current = setTimeout(() => {
      suppressClick.current = true
      onLongPress?.()
    }, 500)
  }

  function cancelLongPress() {
    clearTimeout(longPressTimer.current)
  }

  const ghost = ghostValue(set, prev)
  const plannedPills = planning || !researchDetailsVisible ? [] : plannedCuePills(set)
  const contextPills = planning ? [] : contextCuePills(prev, ghost)
  const labels = planning ? TEMPLATE_RESEARCH_FIELD_LABELS : RESEARCH_FIELD_LABELS

  function applyGhost() {
    if (!ghost) return
    if (ghost.source === 'last') {
      onUsePrevious?.()
      return
    }
    onChange({ weight_kg: ghost.weight, reps: ghost.reps })
  }

  function handleDoneClick(event) {
    if (suppressClick.current) {
      event.preventDefault()
      event.stopPropagation()
      suppressClick.current = false
      return
    }
    onToggleDone?.()
  }

  return (
    <div className={'transition-opacity duration-200 ' + (!planning && set.done ? 'opacity-60' : 'opacity-100')}>
      <div className="flex items-center gap-2 py-1.5">
        <SetMarker badge={setBadge ?? setNumber} setType={set.set_type} />

        <div className="flex-1 relative">
          <input
            type="text"
            inputMode="decimal"
            min="0"
            max="1500"
            step="2.5"
            value={set.weight_kg ?? ''}
            onChange={e => onChange({ weight_kg: e.target.value === '' ? null : e.target.value })}
            placeholder="-"
            className={'w-full text-center bg-gray-900 border border-gray-800 focus:border-indigo-600 rounded-lg py-2 text-white font-mono tabular-nums outline-none ' + ((set.weight_kg == null || set.weight_kg === '') ? 'placeholder:text-gray-600' : '')}
          />
        </div>

        <span className="text-gray-600 text-sm font-mono">x</span>

        <div className="flex-1 relative">
          <input
            type="text"
            inputMode="numeric"
            min="0"
            max="500"
            step="1"
            value={set.reps ?? ''}
            onChange={e => onChange({ reps: e.target.value === '' ? null : e.target.value })}
            placeholder="-"
            className={'w-full text-center bg-gray-900 border border-gray-800 focus:border-indigo-600 rounded-lg py-2 text-white font-mono tabular-nums outline-none ' + ((set.reps == null || set.reps === '') ? 'placeholder:text-gray-600' : '')}
          />
        </div>

        {!planning && (
          <button
            ref={checkRef}
            onClick={handleDoneClick}
            onPointerDown={startLongPress}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            className={'w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 ' +
              (bounce ? 'scale-110' : 'scale-100') + ' ' +
              (set.done ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-gray-800 text-gray-600 hover:bg-gray-700 hover:text-gray-400')}
            aria-label={set.done ? 'Mark set incomplete' : 'Mark set complete'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        )}

        {researchDetailsVisible && (
          <button
            onClick={onExpand}
            className={'w-11 h-11 flex items-center justify-center rounded-md transition-colors ' + (expanded ? 'text-indigo-300 bg-indigo-600/10' : 'text-gray-500 hover:text-gray-300')}
            aria-label="Research detail settings"
          >
            <SlidersIcon />
          </button>
        )}
      </div>

      {ghost && !planning && (
        <div className="pl-10 pb-1">
          <button
            type="button"
            onClick={applyGhost}
            className="rounded-full border border-gray-700 bg-gray-900 px-2 py-1 text-[10px] font-semibold text-gray-400 hover:border-indigo-600 hover:text-indigo-300"
          >
            {ghost.label} {ghost.weight}kg x {ghost.reps}
          </button>
        </div>
      )}

      {(contextPills.length > 0 || plannedPills.length > 0 || (researchDetailsVisible && pinnedPills.length > 0)) && (
        <div className="flex flex-wrap gap-1 pl-10 pb-1.5">
          {contextPills.slice(0, 1).map(p => (
            <span key={p.field} className="px-2 py-0.5 rounded-full bg-gray-900 border border-gray-700 text-gray-400 text-[10px] font-medium">
              {p.label}: {p.value}
            </span>
          ))}
          {plannedPills.map(p => (
            <span key={p.field} className="px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300 text-[10px] font-medium">
              {p.label}: {p.value}
            </span>
          ))}
          {researchDetailsVisible && pinnedPills.slice(0, 3).map(p => (
            <ResearchPill
              key={p.field}
              field={p.field}
              label={labels[p.field] || p.field}
              value={p.value}
              completed={!!set.done}
              editing={editingField === p.field}
              onEdit={() => setEditingField(p.field)}
              onChange={value => onPinnedChange?.(p.field, value)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ghostValue(set, prev) {
  if (prev?.weight_kg != null && prev?.reps != null) {
    return { source: 'last', label: 'Last', weight: prev.weight_kg, reps: prev.reps }
  }
  if (set?.planned_weight_kg != null && set?.planned_reps != null) {
    return { source: 'plan', label: 'Plan', weight: set.planned_weight_kg, reps: set.planned_reps }
  }
  return null
}

function contextCuePills(prev, ghost) {
  const cues = []
  if (ghost?.source !== 'last' && prev?.weight_kg != null && prev?.reps != null) cues.push({ field: 'last', label: 'Last', value: `${prev.weight_kg}kg x ${prev.reps}` })
  return cues
}

function plannedCuePills(set) {
  const cues = []
  if (set.planned_rep_range) cues.push({ field: 'planned_rep_range', label: 'Aim', value: set.planned_rep_range })
  if (set.planned_rir !== null && set.planned_rir !== undefined && set.planned_rir !== '') cues.push({ field: 'planned_rir', label: 'RIR', value: set.planned_rir })
  if (set.planned_rest_seconds) cues.push({ field: 'planned_rest_seconds', label: 'Rest', value: formatResearchValue('rest_seconds', set.planned_rest_seconds) })
  if (set.planned_rom_category) cues.push({ field: 'planned_rom_category', label: 'ROM', value: formatResearchValue('rom_category', set.planned_rom_category) })
  if (set.planned_tempo_tag) cues.push({ field: 'planned_tempo_tag', label: 'Tempo', value: formatResearchValue('tempo_tag', set.planned_tempo_tag) })
  return cues
}

function SetMarker({ badge, setType }) {
  const styles = setType === 'warmup'
    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    : setType === 'backoff'
      ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
      : 'bg-gray-800 text-gray-400 border-gray-700'
  return (
    <div
      className={'w-8 h-8 shrink-0 flex items-center justify-center rounded-lg border text-[11px] font-semibold tabular-nums ' + styles}
      title={setType || 'working'}
    >
      {badge}
    </div>
  )
}

function SlidersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" d="M4 7h5m4 0h7M4 17h9m4 0h3" />
      <circle cx="11" cy="7" r="2" />
      <circle cx="15" cy="17" r="2" />
    </svg>
  )
}

function ResearchPill({ field, label, value, completed, editing, onEdit, onChange }) {
  if (completed && !editing) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="rounded-full bg-emerald-600/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-600/25"
      >
        {label}: {formatResearchValue(field, value)}
      </button>
    )
  }

  if (field === 'rir') return <MiniRirTicker value={value} onChange={onChange} />
  if (field === 'rest_seconds') return <MiniRestPill value={value} onChange={onChange} />
  if (field === 'rom_category') return <MiniSelectPill label={label} value={value} options={['full', 'partial', 'lengthened', 'shortened']} field={field} onChange={onChange} />
  if (field === 'tempo_tag') return <MiniSelectPill label={label} value={value} options={['controlled', 'explosive', '3010', '2020', 'paused']} field={field} onChange={onChange} />
  if (field === 'failure' || field === 'pain_flag') return <MiniBooleanPill label={label} value={!!value} onChange={onChange} />

  return (
    <button
      type="button"
      onClick={() => onChange(null)}
      className="rounded-full border border-indigo-500/20 bg-indigo-600/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300"
    >
      {label}: {formatResearchValue(field, value)}
    </button>
  )
}

function MiniRirTicker({ value, onChange }) {
  const options = [
    { value: 0, color: 'bg-red-600 text-white' },
    { value: 1, color: 'bg-orange-600 text-white' },
    { value: 2, color: 'bg-amber-500 text-gray-950' },
    { value: 3, color: 'bg-lime-600 text-white' },
    { value: 4, color: 'bg-emerald-600 text-white' },
    { value: '5+', color: 'bg-sky-600 text-white' },
  ]
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-indigo-600/10 border border-indigo-500/20 px-1 py-0.5">
      <span className="px-1 text-[9px] uppercase tracking-wider text-indigo-300">RIR</span>
      {options.map(opt => {
        const active = String(value) === String(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(active ? null : opt.value)}
            className={'min-w-5 h-5 rounded-full px-1 text-[10px] font-bold transition-colors ' + (active ? opt.color : 'bg-gray-800 text-gray-500 hover:text-gray-200')}
          >
            {opt.value}
          </button>
        )
      })}
    </div>
  )
}

function MiniRestPill({ value, onChange }) {
  const seconds = Number(value) || 0
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-indigo-600/10 border border-indigo-500/20 px-1 py-0.5">
      <span className="px-1 text-[9px] uppercase tracking-wider text-indigo-300">Rest</span>
      <button type="button" onClick={() => onChange(Math.max(15, seconds - 15))} className="min-w-5 h-5 rounded-full bg-gray-800 px-1 text-[10px] font-bold text-gray-300">-</button>
      <button type="button" onClick={() => onChange(seconds || 90)} className="min-w-10 h-5 rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
        {formatResearchValue('rest_seconds', seconds || 90)}
      </button>
      <button type="button" onClick={() => onChange(Math.min(600, (seconds || 90) + 15))} className="min-w-5 h-5 rounded-full bg-gray-800 px-1 text-[10px] font-bold text-gray-300">+</button>
    </div>
  )
}

function MiniSelectPill({ label, field, value, options, onChange }) {
  return (
    <label className="flex items-center gap-1 rounded-full bg-indigo-600/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
      <span>{label}</span>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        className="max-w-24 bg-transparent text-[10px] font-semibold text-indigo-100 outline-none"
      >
        <option value="">None</option>
        {options.map(option => (
          <option key={option} value={option}>{formatResearchValue(field, option)}</option>
        ))}
      </select>
    </label>
  )
}

function MiniBooleanPill({ label, value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={'rounded-full border px-2 py-0.5 text-[10px] font-semibold ' + (value ? 'border-indigo-500/20 bg-indigo-600/15 text-indigo-200' : 'border-gray-700 bg-gray-800 text-gray-400')}
    >
      {label}: {value ? 'Yes' : 'No'}
    </button>
  )
}
