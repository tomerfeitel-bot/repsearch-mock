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
import {
  VotePill, StudyAttachment, AvatarWithDot, IconArrow, IconComment, IconShare, IconBookmark,
} from '../components/community/PostCard.jsx'
import { ProgramDetailSheet, StartProgramSheet } from '../components/community/PlansTab.jsx'

const exerciseById = new Map(SEED_EXERCISES.map(e => [e.id, e]))

// Composer sits directly above the fixed BottomNav (~62px tall + safe-area inset).
const COMPOSER_BOTTOM = 'calc(env(safe-area-inset-bottom) + 62px)'

const DETAIL_KIND = {
  discussion: { label: 'Discussion', dot: '#8a948c', pill: 'text-gray-200 bg-gray-700/50', prompt: 'Add your take, ask for details, or reply to the strongest branch.' },
  workout: { label: 'Workout', dot: '#2f6e4a', pill: 'text-emerald-300 bg-emerald-600/15', prompt: 'Ask about exercise choices, set progression, recovery, or how the session felt.' },
  program: { label: 'Program', dot: '#454c47', pill: 'text-indigo-300 bg-indigo-600/12', prompt: 'Ask how they ran it, what changed week to week, or where it worked best.' },
  template: { label: 'Template', dot: '#2b6a86', pill: 'text-sky-300 bg-sky-600/15', prompt: 'Ask how to adapt it, when to use it, or what substitutions fit.' },
  study: { label: 'Study', dot: '#7CA982', pill: 'text-[#46624b] bg-[rgba(124,169,130,0.18)]', prompt: 'Challenge the method, share a data point, or ask what variable should be checked next.' },
  pr: { label: 'PR', dot: '#8a6010', pill: 'text-amber-300 bg-amber-600/15', prompt: 'Ask how they built up to it: programming, technique, recovery, and what finally clicked.' },
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
  const total = post.comment_count

  return (
    <div className="min-h-screen bg-gray-950" style={{ paddingBottom: `calc(${COMPOSER_BOTTOM} + 76px)` }}>
      <header className="sticky top-0 z-20 flex items-center gap-2 h-12 px-2.5 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <button onClick={() => navigate(-1)} aria-label="Back to feed" className="h-10 w-10 grid place-items-center rounded-full text-gray-200 hover:bg-gray-800/60">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          <span className="sr-only">Back</span>
        </button>
        <div className="min-w-0">
          <div className="text-sm font-bold text-gray-100 truncate">{detail.label}</div>
          <div className="text-[11px] text-gray-500 truncate">{total} comments</div>
        </div>
      </header>

      <main>
        {/* Post — borderless lead, like Pulse */}
        <article className="px-4 pt-4">
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate(`/user/${post.username}`)} className="shrink-0" aria-label={`View ${post.username}`}>
              <AvatarWithDot username={post.username} dot={detail.dot} />
            </button>
            <button onClick={() => navigate(`/user/${post.username}`)} className="min-w-0 flex-1 text-left">
              <div className="text-sm font-bold leading-tight truncate text-gray-100">{post.username}</div>
              <div className="text-xs truncate text-gray-500 font-mono">{timeAgo(post.created_at)}</div>
            </button>
            <span className={'inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-bold shrink-0 ' + detail.pill}>{detail.label}</span>
          </div>

          {(post.title || prTitle) && <h1 className="mt-3 text-xl font-extrabold text-gray-100 leading-snug" style={{ textWrap: 'balance' }}>{post.title || prTitle}</h1>}
          {post.body && !prTitle && <p className="mt-2 text-[15px] text-gray-200 leading-relaxed whitespace-pre-wrap">{post.body}</p>}

          {post.labels?.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {post.labels.map(l => <span key={l} className="text-[10px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">{l}</span>)}
            </div>
          )}

          <div className="mt-3"><AttachmentDetail post={post} /></div>

          <div className="mt-3.5 flex items-center gap-1.5">
            <VotePill score={post.score} vote={post.viewer_vote} onVote={onVote} />
            <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-semibold text-gray-400">
              <IconComment size={18} /><span className="font-mono tabular-nums">{total}</span>
            </span>
            <button onClick={() => sharePost(post.id)} aria-label="Share post" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-semibold text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 transition-colors">
              <IconShare size={18} /><span>Share</span>
            </button>
            <button onClick={onToggleSave} aria-pressed={post.saved} aria-label={post.saved ? 'Unsave' : 'Save'}
              className={'ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-semibold transition-colors ' + (post.saved ? 'text-amber-300 bg-amber-600/20' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60')}>
              <IconBookmark size={17} filled={post.saved} /><span>{post.saved ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </article>

        {/* Conversation lead-in */}
        <div className="mt-5 px-4 pt-4 flex items-baseline justify-between border-t border-gray-800">
          <h2 className="text-base font-extrabold text-gray-100">Conversation</h2>
          <span className="text-xs font-mono tabular-nums text-gray-500">{total} replies</span>
        </div>
        <p className="px-4 mt-1 text-[13px] text-gray-400 leading-relaxed">{detail.prompt}</p>

        {/* Connected comment flow */}
        <ul className="px-4 pt-2">
          {comments.length === 0 && (
            <li className="mt-3 rounded-2xl border border-dashed border-gray-800 bg-gray-900/40 p-4 text-sm text-gray-500">
              No replies yet. Start the thread with a question or a useful data point.
            </li>
          )}
          {comments.map(c => (
            <CommentNode key={c.id} node={c} depth={0} opUser={post.username} onVote={voteComment} onReply={submitComment} posting={posting} />
          ))}
        </ul>
      </main>

      {/* Sticky composer — standing invitation, parked above the bottom nav */}
      <div className="fixed inset-x-0 z-30" style={{ bottom: COMPOSER_BOTTOM }}>
        <div className="max-w-md mx-auto px-3 py-2.5 bg-gray-950/95 backdrop-blur border-t border-gray-800">
          <form onSubmit={e => { e.preventDefault(); submitComment(reply, null, () => setReply('')) }} className="flex items-center gap-2">
            <label className="sr-only" htmlFor="thread-comment">Join the conversation</label>
            <input id="thread-comment" value={reply} onChange={e => setReply(e.target.value)} placeholder="Join the conversation..."
              className="min-w-0 flex-1 h-11 px-4 rounded-full bg-gray-900 border border-gray-800 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500" />
            <button type="submit" disabled={posting || !reply.trim()}
              className="h-11 px-5 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-bold text-white transition-colors">Comment</button>
          </form>
        </div>
      </div>
    </div>
  )
}

function CommentNode({ node, depth, opUser, onVote, onReply, posting }) {
  const navigate = useNavigate()
  const [score, setScore] = useState(node.score)
  const [vote, setVote] = useState(node.viewer_vote)
  const [replying, setReplying] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [text, setText] = useState('')

  async function doVote(value) {
    const res = await onVote(node.id, value)
    if (res) { setScore(res.score); setVote(res.viewer_vote) }
  }

  const childCount = countReplies(node)
  const kids = node.children || []
  const isOp = node.username === opUser

  return (
    <li className="pt-1">
      <div className="flex items-start gap-2.5 pt-2">
        <button onClick={() => navigate(`/user/${node.username}`)} className="shrink-0 mt-0.5" aria-label={`View ${node.username}`}>
          <Avatar username={node.username} size="sm" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => navigate(`/user/${node.username}`)} className="text-[13px] font-bold text-gray-200">{node.username}</button>
            {isOp && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-indigo-300 bg-indigo-600/15">OP</span>}
            <span className="text-[11px] text-gray-500">· {timeAgo(node.created_at)}</span>
          </div>
          <p className="mt-1 text-[14px] text-gray-300 leading-relaxed whitespace-pre-wrap">{node.body}</p>

          <div className="mt-1.5 flex items-center gap-1 flex-wrap -ml-1">
            <InlineVote score={score} vote={vote} onVote={doVote} />
            <button onClick={() => setReplying(r => !r)} aria-expanded={replying}
              className="h-8 px-2.5 rounded-full text-[12px] font-semibold text-gray-400 hover:text-gray-200 inline-flex items-center gap-1.5">
              <IconComment size={15} />Reply
            </button>
            {childCount > 0 && (
              <button onClick={() => setCollapsed(c => !c)} aria-expanded={!collapsed}
                className="h-8 px-2.5 rounded-full text-[12px] font-semibold text-gray-400 hover:text-gray-200">
                {collapsed ? `Show ${childCount} ${childCount === 1 ? 'reply' : 'replies'}` : 'Hide replies'}
              </button>
            )}
          </div>

          {replying && (
            <div className="mt-2 rounded-2xl p-2.5 bg-gray-900 border border-gray-800">
              <label className="sr-only" htmlFor={`reply-${node.id}`}>Reply to {node.username}</label>
              <textarea id={`reply-${node.id}`} autoFocus rows={2} value={text} onChange={e => setText(e.target.value)} placeholder={`Reply to ${node.username}...`}
                className="w-full bg-transparent text-[14px] text-gray-100 placeholder:text-gray-500 leading-relaxed outline-none resize-none" />
              <div className="mt-1 flex items-center justify-end gap-2">
                <button onClick={() => { setReplying(false); setText('') }} className="h-9 px-3 rounded-full text-[12px] font-semibold text-gray-400 hover:text-gray-200">Cancel</button>
                <button onClick={() => onReply(text, node.id, () => { setText(''); setReplying(false); setCollapsed(false) })} disabled={posting || !text.trim()}
                  className="h-9 px-4 rounded-full text-[12px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">Reply</button>
              </div>
            </div>
          )}

          {!collapsed && kids.length > 0 && (
            <ul className="mt-1 pl-3.5 border-l border-gray-800">
              {kids.map(child => (
                <CommentNode key={child.id} node={child} depth={depth + 1} opUser={opUser} onVote={onVote} onReply={onReply} posting={posting} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  )
}

function InlineVote({ score, vote, onVote }) {
  const up = vote === 1
  const down = vote === -1
  return (
    <div className="inline-flex items-center">
      <button onClick={() => onVote(up ? 0 : 1)} aria-pressed={up} aria-label="Upvote comment"
        className={'h-8 w-8 grid place-items-center rounded-full ' + (up ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300')}>
        <IconArrow dir="up" size={16} />
      </button>
      <span className={'text-[12px] font-bold font-mono tabular-nums min-w-[1.6rem] text-center ' + (up ? 'text-orange-400' : down ? 'text-indigo-400' : 'text-gray-300')}>{score}</span>
      <button onClick={() => onVote(down ? 0 : -1)} aria-pressed={down} aria-label="Downvote comment"
        className={'h-8 w-8 grid place-items-center rounded-full ' + (down ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300')}>
        <IconArrow dir="down" size={16} />
      </button>
    </div>
  )
}

function countReplies(node) {
  return (node.children || []).reduce((total, child) => total + 1 + countReplies(child), 0)
}

function sharePost(id) {
  const url = `${window.location.origin}${import.meta.env.BASE_URL}post/${id}`.replace(/([^:]\/)\/+/g, '$1')
  if (navigator.share) { navigator.share({ url }).catch(() => {}); return }
  navigator.clipboard?.writeText(url).catch(() => {})
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
    <div className="rounded-2xl bg-gray-950/60 border border-gray-800 p-3.5 space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="font-mono tabular-nums font-extrabold text-gray-100 text-3xl">{summary?.duration_min ?? '-'}</span>
        <span className="text-sm font-semibold text-gray-500">min</span>
        <span className="ml-auto text-xs text-gray-400">{summary?.workout_day || 'Workout'}</span>
      </div>
      {groups.map(([eid, sets]) => {
        const seed = exerciseById.get(eid)
        return (
          <div key={eid} className="rounded-xl border border-gray-800 bg-gray-900/60 p-2">
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
    <div className="rounded-2xl bg-gray-950/60 border border-gray-800 p-3.5">
      <div className="text-xs font-semibold text-gray-500">Program</div>
      <div className="font-bold text-gray-100">{a.name}</div>
      {a.description && <div className="mt-1 text-xs text-gray-500 line-clamp-3">{a.description}</div>}
      <div className="mt-1 text-xs text-indigo-200/75">{a.enrollment_count || 0} started · open-ended</div>
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
    <div className="rounded-2xl bg-gray-950/60 border border-gray-800 p-3.5">
      <div className="text-xs font-semibold text-gray-500">Template</div>
      <div className="font-bold text-gray-100">{a.name}</div>
      <div className="mt-1 text-xs text-sky-200/75">{a.exercise_count || 0} exercises · used {a.usage_count || 0}x</div>
      <button onClick={() => start()} className="mt-3 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold">Start as workout</button>
      <ConfirmSheet open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={() => { setConfirmOpen(false); start(true) }} title="Replace workout?" message="Starting this template will replace your current active workout." confirmLabel="Replace" danger />
    </div>
  )
}
