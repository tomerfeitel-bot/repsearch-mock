import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { Avatar } from '../ui/Avatar.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { ConfirmSheet } from '../ui/ConfirmSheet.jsx'
import { api } from '../../lib/api.js'
import { useWorkout } from '../../hooks/useWorkout.jsx'
import { useToast } from '../ui/Toast.jsx'
import { timeAgo } from '../../lib/timeAgo.js'
import { SEED_EXERCISES } from '../../lib/exercises.js'
import { muscleColor } from '../../lib/musclePalette.js'

const REACTION_TYPES = [
  { key: 'respect', icon: '💪', label: 'Respect' },
  { key: 'fire',    icon: '🔥', label: 'Fire' },
  { key: 'strong',  icon: '🏆', label: 'Strong' },
]

export default function FeedCard({ item }) {
  if (item.type === 'workout') return <WorkoutCard item={item} />
  if (item.type === 'pr') return <PRCard item={item} />
  if (item.type === 'progression') return <ProgressionCard item={item} />
  if (item.type === 'program_published') return <ProgramEventCard item={item} event="published" />
  if (item.type === 'program_started') return <ProgramEventCard item={item} event="started" />
  return null
}

function CardShell({ children, onDoubleClick, doubleTapRef }) {
  const lastTap = useRef(0)
  return (
    <div
      ref={doubleTapRef}
      className="relative bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-3 overflow-hidden"
      onClick={(e) => {
        const now = Date.now()
        if (now - lastTap.current < 300) {
          onDoubleClick?.(e)
        }
        lastTap.current = now
      }}
    >
      {children}
    </div>
  )
}

function CardHeader({ username, ts, badge }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Link to={`/user/${username}`} className="flex items-center gap-2 min-w-0 flex-1" onClick={e => e.stopPropagation()}>
        <Avatar username={username} size="sm" />
        <span className="font-medium text-sm text-gray-200 truncate">{username}</span>
      </Link>
      {badge}
      <span className="text-[11px] text-gray-500 font-mono">{timeAgo(ts)}</span>
    </div>
  )
}

function Caption({ text }) {
  if (!text) return null
  return (
    <div className="mt-3 text-sm text-gray-200 leading-relaxed border-l-2 border-gray-700 pl-3">
      {text}
    </div>
  )
}

function WorkoutCard({ item }) {
  const [expanded, setExpanded] = useState(false)
  const [reactions, setReactions] = useState({})
  const [reactorsOpen, setReactorsOpen] = useState(false)
  const [comments, setComments] = useState([])
  const [hasPR, setHasPR] = useState(false)
  const [viewerBest, setViewerBest] = useState({})
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false)
  const heartRef = useRef(null)
  const cardRef = useRef(null)
  const navigate = useNavigate()
  const toast = useToast()
  const { workout, startWorkout } = useWorkout()
  const w = item.payload
  const totalSets = w.set_count || 0
  const exerciseCount = w.exercise_count || 0

  useEffect(() => {
    if (!expanded) return
    let cancelled = false
    api.get(`/public/workouts/${w.id}`).then(d => {
      if (cancelled) return
      setReactions(d.reactions || {})
      setComments(d.comments || [])
      setViewerBest(d.viewer_best || {})
    }).catch(() => {})
    return () => { cancelled = true }
  }, [expanded, w.id])

  // Probe reactions on initial render too so counts show before expand
  useEffect(() => {
    let cancelled = false
    api.get(`/reactions/workout/${w.id}`).then(d => {
      if (cancelled) return
      const counts = {}
      for (const [k, arr] of Object.entries(d.byReaction || {})) counts[k] = arr.length
      setReactions(counts)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [w.id])

  // Detect PRs via simple heuristic: presence indicated by the feed item alone is enough.
  // We could correlate with /prs but it costs a roundtrip; skip for now.
  // Treat presence of any 'top'/working set with high RIR=0 + new prevailing weight as a marker:
  useEffect(() => {
    // For now, leave hasPR=false; the trophy badge appears only on dedicated PR items.
    setHasPR(false)
  }, [])

  async function toggleReaction(rkey, e) {
    e.stopPropagation()
    try {
      const result = await api.post('/reactions', { workout_id: w.id, reaction: rkey })
      setReactions(prev => {
        const cur = prev[rkey] || 0
        return { ...prev, [rkey]: result.toggled === 'on' ? cur + 1 : Math.max(0, cur - 1) }
      })
    } catch {
      toast?.('Could not update reaction', 'error')
    }
  }

  async function loadPublicWorkout() {
    const data = await api.get(`/public/workouts/${w.id}`)
    const byEx = new Map()
    for (const s of data.sets || []) {
      if (s.set_type === 'warmup') continue
      if (!byEx.has(s.exercise_id)) byEx.set(s.exercise_id, [])
      byEx.get(s.exercise_id).push(s)
    }
    const exercises = [...byEx.entries()].map(([exerciseId, sets]) => {
      const seed = SEED_EXERCISES.find(e => e.id === exerciseId)
      return {
        exerciseId,
        exerciseName: seed?.name || exerciseId,
        primary_muscle: seed?.primary_muscle || null,
        equipment_type: seed?.equipment_type || null,
        sets,
      }
    })
    return { ...data, exercises }
  }

  async function tryWorkout(e) {
    e.stopPropagation()
    if (workout) {
      setReplaceConfirmOpen(true)
      return
    }
    await doStartWorkout()
  }

  async function doStartWorkout() {
    try {
      const data = await loadPublicWorkout()
      startWorkout({
        name: `${item.username}'s workout`,
        dayLabel: w.workout_day || null,
        exercises: data.exercises,
        runClassification: 'derived',
        skipReplaceWarning: true,
      })
      navigate('/workout')
    } catch (err) {
      toast?.(err.message || 'Could not start this workout', 'error')
    }
  }

  async function saveTemplate(e) {
    e.stopPropagation()
    navigate(`/templates/new?workout=${encodeURIComponent(w.id)}`)
  }

  function compareToMe(e) {
    e.stopPropagation()
    navigate(`/user/${item.username}/workout/${w.id}`)
  }

  function handleDoubleTap(e) {
    // GSAP heart pulse from the tap point
    const rect = cardRef.current?.getBoundingClientRect()
    if (heartRef.current && rect) {
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      gsap.set(heartRef.current, { left: x, top: y, opacity: 1, scale: 0.5 })
      gsap.to(heartRef.current, { scale: 1.6, opacity: 0, duration: 0.7, ease: 'power2.out' })
    }
    toggleReaction('respect', e)
  }

  return (
    <CardShell onDoubleClick={handleDoubleTap} doubleTapRef={cardRef}>
      <span ref={heartRef} className="absolute pointer-events-none text-4xl" style={{ opacity: 0 }}>❤️</span>
      <CardHeader username={item.username} ts={item.ts} badge={hasPR ? <Trophy /> : null} />

      {/* Hero metric: duration */}
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <div className="flex items-baseline gap-2">
          <span className="font-mono tabular-nums font-bold text-white" style={{ fontSize: '2.25rem', lineHeight: 1 }}>{w.duration_min}</span>
          <span className="text-sm text-gray-500">min</span>
        </div>
        <div className="mt-1 text-sm text-gray-300">
          {w.workout_day ? <span className="text-gray-100 font-medium">{w.workout_day} · </span> : null}
          <span className="text-gray-400">{exerciseCount} exercises · {totalSets} sets</span>
        </div>
      </button>

      <Caption text={w.feed_caption} />

      {expanded && <ExpandedSets workoutId={w.id} viewerBest={viewerBest} comments={comments} />}

      <div className="mt-3 grid grid-cols-3 gap-1.5" onClick={e => e.stopPropagation()}>
        <ActionButton onClick={tryWorkout}>Try</ActionButton>
        <ActionButton onClick={saveTemplate}>Save</ActionButton>
        <ActionButton onClick={compareToMe}>Compare</ActionButton>
      </div>

      {/* Reactions row */}
      <div className="mt-3 flex items-center gap-1 pt-2 border-t border-gray-800/60" onClick={e => e.stopPropagation()}>
        {REACTION_TYPES.map(r => {
          const count = reactions[r.key] || 0
          return (
            <button
              key={r.key}
              onClick={(e) => toggleReaction(r.key, e)}
              className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-800 transition-colors"
            >
              <span className="text-base leading-none">{r.icon}</span>
              {count > 0 && <span className="text-xs text-gray-400 font-mono tabular-nums">{count}</span>}
            </button>
          )
        })}
        {Object.values(reactions).some(n => n > 0) && (
          <button onClick={() => setReactorsOpen(true)} className="text-[11px] text-gray-500 ml-auto px-2">
            See all
          </button>
        )}
      </div>

      <ReactorsSheet open={reactorsOpen} onClose={() => setReactorsOpen(false)} workoutId={w.id} />
      <ConfirmSheet
        open={replaceConfirmOpen}
        onClose={() => setReplaceConfirmOpen(false)}
        onConfirm={() => { setReplaceConfirmOpen(false); doStartWorkout() }}
        title="Replace workout?"
        message="Starting this will replace your current active workout."
        confirmLabel="Replace"
        danger
      />
    </CardShell>
  )
}

function ActionButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="min-h-9 rounded-lg bg-gray-800/70 hover:bg-gray-800 active:scale-[0.98] text-xs font-semibold text-gray-200 transition"
    >
      {children}
    </button>
  )
}

function ExpandedSets({ workoutId, viewerBest, comments }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api.get(`/public/workouts/${workoutId}`).then(d => {
      if (cancelled) return
      setData(d)
    }).catch(err => {
      if (cancelled) return
      setData(null)
      setError(err.message || 'Could not load workout details')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [workoutId, retryKey])

  if (loading && !data) return <div className="mt-3 text-xs text-gray-500">Loading...</div>
  if (error && !data) {
    return (
      <div className="mt-3 rounded-xl border border-gray-800 bg-gray-950 p-3 text-xs text-gray-500">
        <div>{error}</div>
        <button
          onClick={e => { e.stopPropagation(); setRetryKey(k => k + 1) }}
          className="mt-2 px-3 py-1.5 rounded-lg bg-gray-900 text-gray-300 font-semibold hover:bg-gray-800"
        >
          Retry
        </button>
      </div>
    )
  }
  if (!data) return null

  // Group sets by exercise
  const byEx = new Map()
  for (const s of data.sets || []) {
    if (!byEx.has(s.exercise_id)) byEx.set(s.exercise_id, [])
    byEx.get(s.exercise_id).push(s)
  }
  const viewerBestByExercise = Object.keys(viewerBest || {}).length ? viewerBest : (data.viewer_best || {})
  const visibleComments = comments?.length ? comments : (data.comments || [])

  return (
    <div className="mt-4 space-y-3">
      {[...byEx.entries()].map(([eid, sets]) => {
        const seed = SEED_EXERCISES.find(e => e.id === eid)
        const best = viewerBestByExercise[eid]
        return (
          <div key={eid} className="pl-3" style={{ borderLeft: `3px solid ${muscleColor(seed?.primary_muscle)}` }}>
            <div className="text-sm font-medium text-gray-200">{seed?.name || eid}</div>
            <div className="text-xs text-gray-500 font-mono tabular-nums space-x-2">
              {sets.filter(s => s.set_type !== 'warmup').map((s, i) => (
                <span key={i}>{s.weight_kg}×{s.reps}</span>
              ))}
            </div>
            {best && (
              <div className="text-[10px] text-indigo-300 mt-1">Your best: {best.best_kg}kg × {best.best_reps}</div>
            )}
          </div>
        )
      })}
      {visibleComments.length > 0 && (
        <div className="pt-2 border-t border-gray-800/60 space-y-2">
          {visibleComments.map(c => (
            <div key={c.id} className="text-xs">
              <span className="font-medium text-gray-300">{c.username}</span>
              <span className="text-gray-400 ml-2">{c.body}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PRCard({ item }) {
  const p = item.payload
  return (
    <CardShell>
      <CardHeader username={item.username} ts={item.ts} badge={<Trophy />} />
      <div className="flex items-baseline gap-2">
        <span className="font-mono tabular-nums font-bold text-white" style={{ fontSize: '2.5rem', lineHeight: 1 }}>{p.weight_kg}</span>
        <span className="text-base text-gray-500">kg × {p.reps}</span>
      </div>
      <div className="mt-1 text-sm text-gray-300">New PR · <span className="text-gray-400">{p.exercise_name || p.exercise_id}</span></div>
      <div className="mt-2 text-[10px] uppercase tracking-wider text-amber-300 bg-amber-600/10 border border-amber-600/20 rounded-full px-2 py-1 w-fit">App-detected</div>
      <Caption text={p.feed_caption} />
    </CardShell>
  )
}

function ProgressionCard({ item }) {
  const p = item.payload
  return (
    <CardShell>
      <CardHeader username={item.username} ts={item.ts} badge={<span className="text-[10px] font-medium uppercase tracking-wider text-indigo-300 px-2 py-0.5 rounded-full bg-indigo-600/15">Progression</span>} />
      <div className="flex items-baseline gap-2">
        <span className="text-gray-500 font-mono tabular-nums text-xl line-through">{Math.round(p.prev_1rm)}</span>
        <span className="text-gray-600">→</span>
        <span className="font-mono tabular-nums font-bold text-white" style={{ fontSize: '2.25rem', lineHeight: 1 }}>{Math.round(p.curr_1rm)}</span>
        <span className="text-sm text-gray-500">kg est. 1RM</span>
      </div>
      <div className="mt-1 text-sm text-gray-300">+{p.gain_pct}% on <span className="text-gray-400">{p.exercise_name || p.exercise_id}</span></div>
      <Caption text={p.feed_caption} />
    </CardShell>
  )
}

function ProgramEventCard({ item, event }) {
  const p = item.payload
  const navigate = useNavigate()
  const title = event === 'published' ? 'Published a program' : 'Started a program'
  const hero = event === 'published' ? `${p.weeks || 1}wk` : 'Started'
  return (
    <CardShell>
      <CardHeader username={item.username} ts={item.ts} badge={<span className="text-[10px] font-medium uppercase tracking-wider text-indigo-300 px-2 py-0.5 rounded-full bg-indigo-600/15">Program</span>} />
      <div className="flex items-baseline gap-2">
        <span className="font-mono tabular-nums font-bold text-white" style={{ fontSize: '2.25rem', lineHeight: 1 }}>{hero}</span>
        <span className="text-sm text-gray-500">{title}</span>
      </div>
      <div className="mt-1 text-sm text-gray-300">{p.name}</div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-500">
        {p.enrollment_count != null && <span><span className="font-mono text-gray-300">{p.enrollment_count}</span> started</span>}
        <button
          onClick={() => navigate('/community?tab=plans')}
          className="ml-auto px-2 py-1 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700"
        >
          View plans
        </button>
      </div>
    </CardShell>
  )
}

function Trophy() {
  return (
    <span className="text-amber-400 text-lg" title="PR">🏆</span>
  )
}

function ReactorsSheet({ open, onClose, workoutId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError('')
    api.get(`/reactions/workout/${workoutId}`).then(result => {
      if (cancelled) return
      setData(result)
    }).catch(err => {
      if (cancelled) return
      setData(null)
      setError(err.message || 'Could not load reactions')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [open, workoutId, retryKey])

  return (
    <Sheet open={open} onClose={onClose} title="Reactions">
      <div className="p-4 space-y-4 max-h-[60vh]">
        {loading && !data && <p className="text-center text-gray-500 text-sm py-4">Loading...</p>}
        {!loading && error && (
          <div className="rounded-xl border border-gray-800 bg-gray-950 p-3 text-center text-sm text-gray-500">
            <div>{error}</div>
            <button
              onClick={() => setRetryKey(k => k + 1)}
              className="mt-3 px-3 py-1.5 rounded-lg bg-gray-900 text-xs font-semibold text-gray-300 hover:bg-gray-800"
            >
              Retry
            </button>
          </div>
        )}
        {!loading && data && Object.entries(data.byReaction || {}).length === 0 && (
          <p className="text-center text-gray-500 text-sm py-4">No reactions yet.</p>
        )}
        {data && Object.entries(data.byReaction || {}).map(([rkey, list]) => {
          const r = REACTION_TYPES.find(x => x.key === rkey)
          return (
            <div key={rkey}>
              <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">{r?.icon} {r?.label} · {list.length}</div>
              <div className="space-y-1">
                {list.map((u, i) => (
                  <Link key={i} to={`/user/${u.username}`} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-800">
                    <Avatar username={u.username} size="sm" />
                    <span className="text-sm text-gray-200">{u.username}</span>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}
