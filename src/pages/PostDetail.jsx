import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/ui/Avatar.jsx'
import { ConfirmSheet } from '../components/ui/ConfirmSheet.jsx'
import { api } from '../lib/api.js'
import { useToast } from '../components/ui/Toast.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import { useWorkout } from '../hooks/useWorkout.jsx'
import { usePosts } from '../hooks/usePosts.js'
import { timeAgo } from '../lib/timeAgo.js'
import { SEED_EXERCISES } from '../lib/exercises.js'
import { muscleColor } from '../lib/musclePalette.js'
import { VoteRail, StudyAttachment } from '../components/community/PostCard.jsx'
import { ProgramDetailSheet, StartProgramSheet } from '../components/community/PlansTab.jsx'

const exerciseById = new Map(SEED_EXERCISES.map(e => [e.id, e]))

const DETAIL_KIND = {
  discussion: { label: 'Discussion', badge: 'bg-gray-700/60 text-gray-100', card: 'bg-gray-900 border-gray-800', prompt: 'Add your take, ask for details, or reply to the strongest branch.' },
  workout: { label: 'Workout', badge: 'bg-emerald-600/25 text-emerald-100', card: 'bg-[#101a18] border-emerald-900/70', prompt: 'Ask about exercise choices, set progression, recovery, or how the session felt.' },
  program: { label: 'Program', badge: 'bg-indigo-600/25 text-indigo-100', card: 'bg-[#111426] border-indigo-900/70', prompt: 'Ask how they ran it, what changed week to week, or where it worked best.' },
  template: { label: 'Template', badge: 'bg-sky-600/25 text-sky-100', card: 'bg-[#0f1824] border-sky-900/70', prompt: 'Ask how to adapt it, when to use it, or what substitutions fit.' },
  study: { label: 'Study', badge: 'bg-[rgba(124,169,130,0.22)] text-[#d9f3dc]', card: 'bg-[#101510] border-[#263527]', prompt: 'Challenge the method, share a data point, or ask what variable should be checked next.' },
  pr: { label: 'PR', badge: 'bg-amber-600/25 text-amber-100', card: 'bg-[#1d1710] border-amber-900/70', prompt: 'Ask how they built up to it: programming, technique, recovery, and what finally clicked.' },
}

export default function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { getPost, votePost, voteComment, setSaved, addComment } = usePosts(toast)
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [posting, setPosting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPost(id)
      setPost(data.post)
      setComments(data.comments || [])
    } catch (err) {
      toast?.(err.message || 'Could not load post', 'error')
      setPost(null)
    } finally {
      setLoading(false)
    }
  }, [id, getPost, toast])

  useEffect(() => { load() }, [load])

  async function onVote(value) {
    const res = await votePost(post.id, value)
    if (res) setPost(p => ({ ...p, score: res.score, viewer_vote: res.viewer_vote }))
  }

  async function onToggleSave() {
    const next = await setSaved(post.id, !post.saved)
    setPost(p => ({ ...p, saved: next }))
  }

  async function submitComment(body, parentId, done) {
    if (!body.trim()) return
    setPosting(true)
    try {
      await addComment(post.id, body.trim(), parentId)
      await load()
      done?.()
    } finally {
      setPosting(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-950 p-4 text-sm text-gray-500">Loading...</div>
  if (!post) return <div className="min-h-screen bg-gray-950 p-4 text-sm text-gray-500">Post not found.</div>

  const detail = DETAIL_KIND[post.kind] || DETAIL_KIND.discussion
  const prTitle = post.kind === 'pr' && !post.title ? post.body : ''
  const saveClass = post.saved
    ? 'text-amber-100 bg-amber-600/25'
    : 'text-gray-400 hover:text-gray-200'

  return (
    <div className="min-h-screen pb-28 bg-gray-950">
      <header className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 safe-pt-3 pb-3">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-gray-200">Back</button>
      </header>

      <main className="p-4 space-y-4">
        <div className={'border rounded-2xl p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)] ' + detail.card}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ' + detail.badge}>{detail.label}</span>
            {post.labels?.map(l => <span key={l} className="text-[10px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">{l}</span>)}
            <span className="ml-auto text-[11px] text-gray-500 font-mono">{timeAgo(post.created_at)}</span>
          </div>
          {(post.title || prTitle) && <h1 className="mt-2 text-xl font-bold text-white leading-tight">{post.title || prTitle}</h1>}
          <button onClick={() => navigate(`/user/${post.username}`)} className="mt-2 flex items-center gap-1.5">
            <Avatar username={post.username} size="sm" />
            <span className="text-xs text-gray-400">{post.username}</span>
          </button>
          {post.body && !prTitle && <p className="mt-3 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{post.body}</p>}

          <div className="mt-4"><AttachmentDetail post={post} /></div>

          <div className="mt-4 flex items-center gap-4 pt-3 border-t border-gray-800/60">
            <VoteRail score={post.score} vote={post.viewer_vote} onVote={onVote} vertical={false} />
            <button onClick={onToggleSave} className={'text-xs px-2 py-1 rounded-md ' + saveClass}>
              {post.saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-white">{post.comment_count} comments</div>
              <p className="mt-1 text-sm text-gray-400 leading-relaxed">{detail.prompt}</p>
            </div>
            <div className="shrink-0 rounded-full bg-gray-950 border border-gray-800 px-2.5 py-1 text-[11px] font-mono text-gray-400">{comments.length} roots</div>
          </div>
          <div className="mt-4">
            <ReplyBox value={reply} setValue={setReply} disabled={posting} onSubmit={() => submitComment(reply, null, () => setReply(''))} placeholder="Add to the thread" />
          </div>
          <div className="mt-5 space-y-4">
            {comments.length === 0 && <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-950 p-4 text-sm text-gray-500">No replies yet. Start the thread with a question or a useful data point.</div>}
            {comments.map(c => (
              <CommentNode key={c.id} node={c} depth={0} onVote={voteComment} onReply={submitComment} posting={posting} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

function CommentNode({ node, depth, onVote, onReply, posting }) {
  const navigate = useNavigate()
  const [score, setScore] = useState(node.score)
  const [vote, setVote] = useState(node.viewer_vote)
  const [replying, setReplying] = useState(false)
  const [text, setText] = useState('')

  async function doVote(value) {
    const res = await onVote(node.id, value)
    if (res) { setScore(res.score); setVote(res.viewer_vote) }
  }

  const childCount = countReplies(node)
  const indent = Math.min(depth, 3) * 10
  const root = depth === 0

  return (
    <div style={{ marginLeft: indent }} className={root ? 'rounded-2xl bg-gray-950/70 border border-gray-800 p-3' : 'pl-3 border-l border-gray-800/80'}>
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-center pt-0.5">
          <button onClick={() => doVote(vote === 1 ? 0 : 1)} className={'text-sm leading-none ' + (vote === 1 ? 'text-orange-400' : 'text-gray-600 hover:text-gray-400')} aria-label="Upvote comment">▲</button>
          <span className="text-[11px] font-mono text-gray-400">{score}</span>
          <button onClick={() => doVote(vote === -1 ? 0 : -1)} className={'text-sm leading-none ' + (vote === -1 ? 'text-indigo-400' : 'text-gray-600 hover:text-gray-400')} aria-label="Downvote comment">▼</button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => navigate(`/user/${node.username}`)} className="text-xs font-semibold text-gray-300">{node.username}</button>
            <span className="text-[10px] text-gray-600 font-mono">{timeAgo(node.created_at)}</span>
            {childCount > 0 && <span className="text-[10px] text-gray-500">{childCount} replies</span>}
          </div>
          <div className="mt-1 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{node.body}</div>
          <button onClick={() => setReplying(r => !r)} className="mt-2 text-[11px] font-semibold text-gray-400 hover:text-gray-200">{replying ? 'Cancel reply' : `Reply to ${node.username}`}</button>
          {replying && (
            <div className="mt-2">
              <ReplyBox value={text} setValue={setText} disabled={posting} placeholder={`Reply to ${node.username}`}
                onSubmit={() => onReply(text, node.id, () => { setText(''); setReplying(false) })} />
            </div>
          )}
          <div className="mt-3 space-y-3">
            {node.children?.map(child => (
              <CommentNode key={child.id} node={child} depth={depth + 1} onVote={onVote} onReply={onReply} posting={posting} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function countReplies(node) {
  return (node.children || []).reduce((total, child) => total + 1 + countReplies(child), 0)
}

function ReplyBox({ value, setValue, onSubmit, disabled, placeholder }) {
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSubmit() }}
        placeholder={placeholder}
        className="min-h-10 min-w-0 flex-1 rounded-xl bg-gray-950 border border-gray-800 px-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-indigo-600"
      />
      <button disabled={disabled || !value.trim()} onClick={onSubmit} className="min-h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-semibold text-white">Reply</button>
    </div>
  )
}

function AttachmentDetail({ post }) {
  if (post.kind === 'workout') return <WorkoutAttachment id={post.attachment?.id} summary={post.attachment} />
  if (post.kind === 'program') return <ProgramAttachment a={post.attachment} />
  if (post.kind === 'template') return <TemplateAttachment a={post.attachment} />
  if (post.kind === 'study') return <StudyAttachment a={post.attachment} />
  return null
}

function WorkoutAttachment({ id, summary }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    api.get(`/public/workouts/${id}`).then(d => { if (!cancelled) setData(d) }).catch(() => {})
    return () => { cancelled = true }
  }, [id])
  const groups = useMemo(() => {
    const map = new Map()
    for (const s of data?.sets || []) {
      if (!map.has(s.exercise_id)) map.set(s.exercise_id, [])
      map.get(s.exercise_id).push(s)
    }
    return [...map.entries()]
  }, [data])

  return (
    <div className="rounded-xl bg-gray-950 border border-gray-800 p-3 space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="font-mono tabular-nums font-bold text-white text-2xl">{summary?.duration_min ?? '-'}</span>
        <span className="text-xs text-gray-500">min</span>
        <span className="ml-auto text-xs text-gray-400">{summary?.workout_day || 'Workout'}</span>
      </div>
      {groups.map(([eid, sets]) => {
        const seed = exerciseById.get(eid)
        return (
          <div key={eid} className="rounded-lg border border-gray-800 bg-gray-900/60 p-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: muscleColor(seed?.primary_muscle) }} />
              {seed?.name || eid}
            </div>
            <div className="text-xs text-gray-500 font-mono space-x-2">
              {sets.filter(s => s.set_type !== 'warmup').map((s, i) => <span key={i}>{s.weight_kg}x{s.reps}</span>)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ProgramAttachment({ a }) {
  const [startOpen, setStartOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const toast = useToast()
  if (!a) return null
  const program = { id: a.id, name: a.name, description: a.description, strictness: a.strictness, proof: { starts: a.enrollment_count } }
  return (
    <div className="rounded-xl bg-gray-950 border border-gray-800 p-3">
      <div className="font-semibold text-white">{a.name}</div>
      {a.description && <div className="mt-1 text-xs text-gray-500 line-clamp-3">{a.description}</div>}
      <div className="mt-1 text-xs text-gray-500">{a.enrollment_count || 0} started, open-ended</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => setStartOpen(true)} className="py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold">Start program</button>
        <button onClick={() => setDetailOpen(true)} className="py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-semibold">View details</button>
      </div>
      <StartProgramSheet open={startOpen} onClose={() => setStartOpen(false)} program={program} onStarted={() => { setStartOpen(false); toast?.(`Started ${a.name}`, 'success') }} />
      {detailOpen && <ProgramDetailSheet program={program} onClose={() => setDetailOpen(false)} />}
    </div>
  )
}

function TemplateAttachment({ a }) {
  const { user } = useAuth()
  const { workout, startWorkout } = useWorkout()
  const navigate = useNavigate()
  const toast = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)
  if (!a) return null

  async function start(skipConfirm = false) {
    if (workout && !skipConfirm) { setConfirmOpen(true); return }
    try {
      const data = await api.get(`/templates/${a.id}`)
      let template = data.template
      if (template.user_id !== user?.id) {
        const copied = await api.post('/templates', {
          name: template.name, description: template.description || '', visibility: 'private',
          strictness: template.strictness || 'adapt', source_template_id: template.id,
          workout_day: template.workout_day || null, workout_split_type: template.workout_day || null,
          exercises: (template.exercises || []).map(e => ({
            exercise_id: e.exercise_id,
            sets: (e.sets || []).map(s => ({
              target_reps: s.target_reps, target_weight_kg: s.target_weight_kg, target_rir: s.target_rir,
              target_rep_range: s.target_rep_range, set_type: s.set_type, rom_category: s.rom_category,
              tempo_tag: s.tempo_tag, rest_seconds: s.rest_seconds, failure: s.failure,
            })),
          })),
        })
        template = copied.template
      }
      const exercises = (template.exercises || []).map(e => {
        const seed = exerciseById.get(e.exercise_id)
        return { exerciseId: e.exercise_id, exerciseName: seed?.name || e.exercise_id, primary_muscle: seed?.primary_muscle, equipment_type: seed?.equipment_type, sets: e.sets || [] }
      })
      startWorkout({ name: template.name, dayLabel: template.workout_day || null, templateId: template.id, exercises, runClassification: template.source_template_id ? 'derived' : 'exact', skipReplaceWarning: true })
      navigate('/workout')
    } catch (err) {
      toast?.(err.message || 'Failed to start template', 'error')
    }
  }

  return (
    <div className="rounded-xl bg-gray-950 border border-gray-800 p-3">
      <div className="font-semibold text-white">{a.name}</div>
      <div className="mt-1 text-xs text-gray-500">{a.exercise_count || 0} exercises, used {a.usage_count || 0}x</div>
      <button onClick={() => start()} className="mt-3 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold">Start as workout</button>
      <ConfirmSheet open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={() => { setConfirmOpen(false); start(true) }} title="Replace workout?" message="Starting this template will replace your current active workout." confirmLabel="Replace" danger />
    </div>
  )
}
