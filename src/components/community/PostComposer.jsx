import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '../ui/Sheet.jsx'
import { useToast } from '../ui/Toast.jsx'
import { usePosts } from '../../hooks/usePosts.js'
import { POST_LABELS, POST_KINDS } from '../../lib/postLabels.js'
import { GROUP_BY_OPTIONS, MEASURE_OPTIONS, prettyGroupBy, prettyMeasure } from '../../lib/researchTheme.js'

const VISIBILITIES = [{ v: 'public', label: 'Public' }, { v: 'followers', label: 'Followers' }]

// Where "build new" sends the user. The builder returns to /community?compose=<kind>
// so the composer reopens on that kind and the freshly created item is pickable.
function buildNewTarget(kind) {
  const ret = encodeURIComponent(`/community?compose=${kind}`)
  if (kind === 'workout') return '/workout'
  if (kind === 'program') return `/programs/new?returnTo=${ret}`
  if (kind === 'template') return `/templates/new?returnTo=${ret}`
  if (kind === 'study') return `/study?returnTo=${ret}`
  return null
}

export default function PostComposer({ open, onClose, onPosted, initialKind = null, initialWorkoutId = null }) {
  const toast = useToast()
  const navigate = useNavigate()
  const { createPost, loadComposeOptions } = usePosts(toast)
  const [kind, setKind] = useState(initialKind)
  const [options, setOptions] = useState({ workouts: [], programs: [], templates: [], studies: [] })
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [labels, setLabels] = useState([])
  const [visibility, setVisibility] = useState('public')
  const [study, setStudy] = useState(null) // { groupBy, measure }
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setKind(initialKind)
    setSelected(null); setTitle(''); setBody(''); setLabels([]); setVisibility('public'); setStudy(null)
    setLoading(true)
    loadComposeOptions().then(opts => {
      setOptions({ workouts: opts.workouts || [], programs: opts.programs || [], templates: opts.templates || [], studies: opts.studies || [] })
      if (initialWorkoutId) {
        const w = (opts.workouts || []).find(x => x.id === initialWorkoutId)
        if (w) { setKind('workout'); setSelected(w) }
      }
    }).finally(() => setLoading(false))
  }, [open, initialKind, initialWorkoutId, loadComposeOptions])

  const itemList = kind === 'workout' ? options.workouts : kind === 'program' ? options.programs : kind === 'template' ? options.templates : kind === 'study' ? options.studies : []

  function pickStudy(s) {
    setSelected(s)
    const q = s.query || {}
    setStudy({ groupBy: q.groupBy || q.groupBys?.[0] || GROUP_BY_OPTIONS[0].value, measure: q.measure || MEASURE_OPTIONS[0].value })
  }

  function toggleLabel(l) {
    setLabels(prev => prev.includes(l) ? prev.filter(x => x !== l) : prev.length >= 5 ? prev : [...prev, l])
  }

  function studyFeature() {
    const q = selected.query || {}
    const base = { groupBy: study.groupBy, measure: study.measure, exerciseId: q.exerciseId, muscle: q.muscle, minCohort: q.minCohort, label: selected.label }
    if (selected.mode === 'compare' && q.cohortA && q.cohortB) {
      return { ...base, mode: 'compare', cohortA: { label: q.cohortA.label || 'A', filters: q.cohortA.filters || [] }, cohortB: { label: q.cohortB.label || 'B', filters: q.cohortB.filters || [] } }
    }
    return { ...base, mode: 'single', filters: q.filters || [] }
  }

  async function submit() {
    setSaving(true)
    try {
      const payload = { kind, title: title.trim(), body: body.trim(), labels, visibility }
      if (kind === 'study') payload.study_feature = studyFeature()
      else if (kind !== 'discussion') payload.attachment_id = selected.id
      await createPost(payload)
      toast?.('Posted', 'success')
      onPosted?.()
    } catch { /* toast handled in hook */ } finally {
      setSaving(false)
    }
  }

  const canSubmit = kind === 'discussion' ? !!title.trim()
    : kind === 'study' ? !!(selected && study?.groupBy && study?.measure)
    : !!selected

  return (
    <Sheet open={open} onClose={onClose} title={kind ? `Share: ${POST_KINDS.find(k => k.kind === kind)?.label}` : 'Create a post'}>
      <div className="p-4 space-y-4">
        {!kind && (
          <div className="space-y-2">
            <div className="text-sm text-gray-400">What do you want to share?</div>
            {POST_KINDS.map(k => (
              <button key={k.kind} onClick={() => setKind(k.kind)} className="w-full text-left rounded-xl bg-gray-950 border border-gray-800 hover:border-indigo-500 p-4 transition-colors">
                <div className="font-semibold text-gray-100">{k.label}</div>
                <div className="mt-1 text-caption text-gray-500">{k.blurb}</div>
              </button>
            ))}
          </div>
        )}

        {kind && kind !== 'discussion' && (
          <div className="space-y-3">
            <button onClick={() => { setKind(null); setSelected(null) }} className="text-xs text-gray-500 hover:text-gray-300">← Change type</button>
            <div className="flex items-center justify-between">
              <div className="text-micro uppercase tracking-wider text-gray-500 font-semibold">Pick one of yours</div>
              <button onClick={() => navigate(buildNewTarget(kind))} className="text-xs font-semibold text-indigo-300 hover:text-indigo-200">+ Create new</button>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {loading && <div className="text-sm text-gray-500 text-center py-6">Loading...</div>}
              {!loading && itemList.length === 0 && <div className="text-sm text-gray-500 text-center py-6">Nothing yet. Use “Create new”.</div>}
              {!loading && itemList.map(item => (
                <button
                  key={item.id}
                  onClick={() => kind === 'study' ? pickStudy(item) : setSelected(item)}
                  className={'w-full text-left rounded-xl border p-3 transition-colors ' + (selected?.id === item.id ? 'bg-indigo-600/20 border-indigo-500' : 'bg-gray-950 border-gray-800 hover:border-gray-700')}
                >
                  <ItemSummary kind={kind} item={item} />
                </button>
              ))}
            </div>
            {kind === 'study' && selected && study && (
              <div className="rounded-xl bg-gray-950 border border-gray-800 p-3 space-y-2">
                <div className="text-micro uppercase tracking-wider text-gray-500 font-semibold">Feature which variable</div>
                <LabeledSelect label="Variable" value={study.groupBy} onChange={v => setStudy(s => ({ ...s, groupBy: v }))} options={GROUP_BY_OPTIONS.map(o => [o.value, o.label])} />
                <LabeledSelect label="Outcome" value={study.measure} onChange={v => setStudy(s => ({ ...s, measure: v }))} options={MEASURE_OPTIONS.map(o => [o.value, o.label])} />
                <div className="text-caption text-gray-500">{prettyMeasure(study.measure)} by {prettyGroupBy(study.groupBy)}, shown as result bars.</div>
              </div>
            )}
          </div>
        )}

        {kind === 'discussion' && (
          <button onClick={() => setKind(null)} className="text-xs text-gray-500 hover:text-gray-300">← Change type</button>
        )}

        {kind && (
          <div className="space-y-3">
            {kind === 'discussion' && (
              <input value={title} onChange={e => setTitle(e.target.value.slice(0, 160))} placeholder="Title" className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-600 text-gray-100 py-3 px-4 rounded-2xl outline-none" />
            )}
            <textarea
              value={body}
              onChange={e => setBody(e.target.value.slice(0, 5000))}
              rows={3}
              placeholder={kind === 'discussion' ? 'Say more (optional)' : 'Why / open question (optional)'}
              className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-600 text-gray-100 py-3 px-4 rounded-2xl outline-none resize-none"
            />
            <div>
              <div className="text-micro uppercase tracking-wider text-gray-500 font-semibold mb-2">Labels</div>
              <div className="flex flex-wrap gap-1.5">
                {POST_LABELS.map(l => (
                  <button key={l} onClick={() => toggleLabel(l)} className={'px-2.5 py-1 rounded-full text-xs border transition-colors ' + selectedClass(labels.includes(l))}>{l}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {VISIBILITIES.map(o => (
                <button key={o.v} onClick={() => setVisibility(o.v)} className={'py-2.5 rounded-xl border text-sm font-semibold ' + selectedClass(visibility === o.v)}>{o.label}</button>
              ))}
            </div>
            <button onClick={submit} disabled={!canSubmit || saving} className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {saving ? 'Posting...' : 'Post'}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  )
}

function ItemSummary({ kind, item }) {
  if (kind === 'workout') return (
    <div><div className="font-semibold text-gray-100">{item.workout_day || 'Workout'}</div><div className="mt-1 text-caption text-gray-500">{item.date} · {item.exercise_count || 0} ex · {item.set_count || 0} sets</div></div>
  )
  if (kind === 'program') return (
    <div><div className="font-semibold text-gray-100 truncate">{item.name}</div><div className="mt-1 text-caption text-gray-500">{item.enrollment_count || 0} started</div></div>
  )
  if (kind === 'template') return (
    <div><div className="font-semibold text-gray-100 truncate">{item.name}</div><div className="mt-1 text-caption text-gray-500">{item.exercise_count || 0} exercises · used {item.usage_count || 0}x</div></div>
  )
  return (
    <div><div className="font-semibold text-gray-100 truncate">{item.label}</div><div className="mt-1 text-caption text-gray-500">{item.mode} · {item.evidence_status || 'Not enough'}</div></div>
  )
}

function LabeledSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-caption text-gray-500">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full bg-gray-900 border border-gray-800 rounded-lg px-2 py-2 text-sm text-gray-100 outline-none">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}

function selectedClass(selected) {
  return selected
    ? 'bg-indigo-600 border-indigo-500 text-white'
    : 'bg-gray-950 border-gray-800 text-gray-400'
}
