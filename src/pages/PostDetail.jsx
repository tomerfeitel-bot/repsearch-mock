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
  VotePill, StudyAttachment, HeroFrame, SaveButton, AvatarWithDot, KIND_META,
  IconComment, IconShare,
} from '../components/community/PostCard.jsx'
import { ProgramDetailSheet, StartProgramSheet } from '../components/community/PlansTab.jsx'

const exerciseById = new Map(SEED_EXERCISES.map(e => [e.id, e]))

// Composer sits directly above the fixed BottomNav (~62px tall + safe-area inset).
const COMPOSER_BOTTOM = 'calc(env(safe-area-inset-bottom) + 62px)'

// Kind colors/labels are shared with the feed (KIND_META). The thread only adds
// a per-kind prompt that seeds the conversation.
const KIND_PROMPT = {
  discussion: 'Add your take, ask for details, or reply to the strongest branch.',
  workout: 'Ask about exercise choices, set progression, recovery, or how the session felt.',
  program: 'Ask how they ran it, what changed week to week, or where it worked best.',
  template: 'Ask how to adapt it, when to use it, or what substitutions fit.',
  study: 'Challenge the method, share a data point, or ask what variable should be checked next.',
  pr: 'Ask how they built up to it: programming, technique, recovery, and what finally clicked.',
}

const PAGE_BG = 'linear-gradient(145deg, var(--surface-alt) 0%, var(--hero-fade) 42%, var(--bg) 100%)'

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

  // The standout reply: highest-scored top-level comment, so the conversation
  // has a focal point instead of a flat list.
  const topReplyId = useMemo(() => {
    if (comments.length < 2) return null
    const top = [...comments].sort((a, b) => (b.score || 0) - (a.score || 0))[0]
    return top && (top.score || 0) > 0 ? top.id : null
  }, [comments])

  if (loading) return <div className="min-h-screen p-4 text-sm text-[var(--text-muted)]" style={{ background: PAGE_BG }}>Loading...</div>
  if (!post) return <div className="min-h-screen p-4 text-sm text-[var(--text-muted)]" style={{ background: PAGE_BG }}>Post not found.</div>

  const meta = KIND_META[post.kind] || KIND_META.discussion
  const prompt = KIND_PROMPT[post.kind] || KIND_PROMPT.discussion
  const prTitle = post.kind === 'pr' && !post.title ? post.body : ''
  const total = post.comment_count

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG, paddingBottom: `calc(${COMPOSER_BOTTOM} + 76px)` }}>
      <header className="sticky top-0 z-20 flex items-center gap-2 h-12 px-2.5 bg-white/85 backdrop-blur border-b border-[var(--border)]">
        <button onClick={() => navigate(-1)} aria-label="Back to feed" className="h-10 w-10 grid place-items-center rounded-full text-[var(--text)] hover:bg-[var(--accent-soft)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          <span className="sr-only">Back</span>
        </button>
        <div className="min-w-0">
          <div className="text-sm font-bold text-[var(--text)] truncate">{meta.label}</div>
          <div className="text-micro text-[var(--text-muted)] truncate font-mono">@{post.username}</div>
        </div>
      </header>

      <main>
        {/* Post — borderless lead */}
        <article className="px-4 pt-4">
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate(`/user/${post.username}`)} className="shrink-0" aria-label={`View ${post.username}`}>
              <AvatarWithDot username={post.username} dot={meta.dot} />
            </button>
            <button onClick={() => navigate(`/user/${post.username}`)} className="min-w-0 flex-1 text-left">
              <div className="text-sm font-bold leading-tight truncate text-[var(--text)]">{post.username}</div>
              <div className="text-caption truncate text-[var(--text-muted)] font-mono">{timeAgo(post.created_at)}</div>
            </button>
            <span className="inline-flex items-center h-6 px-2.5 rounded-full text-micro font-bold shrink-0" style={{ color: meta.text, background: meta.tint }}>{meta.label}</span>
          </div>

          {(post.title || prTitle) && <h1 className="mt-3 text-lead font-extrabold text-[var(--text)]" style={{ textWrap: 'balance' }}>{post.title || prTitle}</h1>}
          {post.body && !prTitle && <p className="mt-2 text-read text-[var(--text)] whitespace-pre-wrap" style={{ textWrap: 'pretty' }}>{post.body}</p>}

          {post.labels?.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {post.labels.map(l => <span key={l} className="text-micro text-[var(--text-muted)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-full">{l}</span>)}
            </div>
          )}

          <div className="mt-3"><AttachmentDetail post={post} /></div>

          <div className="mt-3.5 flex items-center gap-1.5">
            <VotePill score={post.score} vote={post.viewer_vote} onVote={onVote} />
            <button onClick={() => sharePost(post.id)} aria-label="Share post" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/60 transition-colors">
              <IconShare size={18} /><span>Share</span>
            </button>
            <SaveButton saved={post.saved} onClick={onToggleSave} />
          </div>
        </article>

        {/* Conversation lead-in */}
        <div className="mt-5 px-4 pt-4 flex items-baseline justify-between border-t border-[var(--border)]">
          <h2 className="text-head font-extrabold text-[var(--text)]">Conversation</h2>
          <span className="text-caption font-mono tabular-nums text-[var(--text-muted)]">{total} {total === 1 ? 'reply' : 'replies'}</span>
        </div>
        <p className="px-4 mt-1 text-meta text-[var(--text-muted)]">{prompt}</p>

        {/* Connected comment flow */}
        <ul className="px-4 pt-2">
          {comments.length === 0 && (
            <li className="mt-3 rounded-2xl border border-dashed border-[var(--border-strong)] bg-white/50 p-4 text-sm text-[var(--text-muted)]">
              No replies yet. Start the thread with a question or a useful data point.
            </li>
          )}
          {comments.map(c => (
            <CommentNode key={c.id} node={c} depth={0} opUser={post.username} topReplyId={topReplyId} onVote={voteComment} onReply={submitComment} posting={posting} />
          ))}
        </ul>
      </main>

      {/* Sticky composer — standing invitation, parked above the bottom nav */}
      <div className="fixed inset-x-0 z-30" style={{ bottom: COMPOSER_BOTTOM }}>
        <div className="max-w-md mx-auto px-3 py-2.5 bg-white/90 backdrop-blur border-t border-[var(--border)]">
          <form onSubmit={e => { e.preventDefault(); submitComment(reply, null, () => setReply('')) }} className="flex items-center gap-2">
            <label className="sr-only" htmlFor="thread-comment">Join the conversation</label>
            <input id="thread-comment" value={reply} onChange={e => setReply(e.target.value)} placeholder="Join the conversation..."
              className="min-w-0 flex-1 h-11 px-4 rounded-full bg-white/80 border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]" />
            <button type="submit" disabled={posting || !reply.trim()}
              className="h-11 px-5 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] disabled:opacity-50 text-sm font-bold transition-transform active:scale-95">Comment</button>
          </form>
        </div>
      </div>
    </div>
  )
}

function CommentNode({ node, depth, opUser, topReplyId, onVote, onReply, posting }) {
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
  const isTop = node.id === topReplyId

  return (
    <li className="pt-1">
      <div className="flex items-start gap-2.5 pt-2">
        <button onClick={() => navigate(`/user/${node.username}`)} className="shrink-0 mt-0.5" aria-label={`View ${node.username}`}>
          <Avatar username={node.username} size="sm" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => navigate(`/user/${node.username}`)} className="text-meta font-bold text-[var(--text)]">{node.username}</button>
            {isOp && <span className="text-micro font-bold px-1.5 py-0.5 rounded-full text-[var(--accent-ink)] bg-[var(--accent)]">OP</span>}
            {isTop && <span className="inline-flex items-center gap-1 text-micro font-bold px-1.5 py-0.5 rounded-full text-[var(--brass)] bg-[var(--brass-soft)]">Top reply</span>}
            <span className="text-caption text-[var(--text-muted)]">· {timeAgo(node.created_at)}</span>
          </div>
          <p className="mt-1 text-body text-[var(--text)] whitespace-pre-wrap" style={{ textWrap: 'pretty' }}>{node.body}</p>

          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <VotePill score={score} vote={vote} onVote={doVote} size="sm" ariaSuffix=" comment" />
            <button onClick={() => setReplying(r => !r)} aria-expanded={replying}
              className="h-8 px-3 rounded-full text-caption font-semibold text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/60 inline-flex items-center gap-1.5">
              <IconComment size={15} />Reply
            </button>
            {childCount > 0 && (
              <button onClick={() => setCollapsed(c => !c)} aria-expanded={!collapsed}
                className="h-8 px-3 rounded-full text-caption font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">
                {collapsed ? `Show ${childCount} ${childCount === 1 ? 'reply' : 'replies'}` : 'Hide replies'}
              </button>
            )}
          </div>

          {replying && (
            <div className="mt-2 rounded-2xl p-2.5 bg-white/70 border border-[var(--border)]">
              <label className="sr-only" htmlFor={`reply-${node.id}`}>Reply to {node.username}</label>
              <textarea id={`reply-${node.id}`} autoFocus rows={2} value={text} onChange={e => setText(e.target.value)} placeholder={`Reply to ${node.username}...`}
                className="w-full bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] leading-relaxed outline-none resize-none" />
              <div className="mt-1 flex items-center justify-end gap-2">
                <button onClick={() => { setReplying(false); setText('') }} className="h-9 px-3 rounded-full text-caption font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">Cancel</button>
                <button onClick={() => onReply(text, node.id, () => { setText(''); setReplying(false); setCollapsed(false) })} disabled={posting || !text.trim()}
                  className="h-9 px-4 rounded-full text-caption font-bold bg-[var(--accent)] text-[var(--accent-ink)] disabled:opacity-50">Reply</button>
              </div>
            </div>
          )}

          {!collapsed && kids.length > 0 && (
            <ul className="mt-1 pl-3.5 border-l-2 border-[var(--border)]">
              {kids.map(child => (
                <CommentNode key={child.id} node={child} depth={depth + 1} opUser={opUser} topReplyId={topReplyId} onVote={onVote} onReply={onReply} posting={posting} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
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
  const meta = KIND_META[post.kind] || KIND_META.discussion
  if (post.kind === 'workout') return <WorkoutAttachment id={post.attachment?.id} summary={post.attachment} accent={meta.accent} wash={meta.wash} />
  if (post.kind === 'program') return <ProgramAttachment a={post.attachment} accent={meta.accent} wash={meta.wash} />
  if (post.kind === 'template') return <TemplateAttachment a={post.attachment} accent={meta.accent} wash={meta.wash} />
  if (post.kind === 'study') return <StudyAttachment a={post.attachment} />
  return null
}

function WorkoutAttachment({ id, summary, accent, wash }) {
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
    <HeroFrame accent={accent} wash={wash}>
      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono tabular-nums font-extrabold text-[var(--text)] text-3xl">{summary?.duration_min ?? '-'}</span>
          <span className="text-sm font-semibold text-[var(--text-muted)]">min</span>
          <span className="ml-auto text-caption" style={{ color: accent || '#2f6e4a' }}>{summary?.workout_day || 'Workout'}</span>
        </div>
        {groups.map(([eid, sets]) => {
          const seed = exerciseById.get(eid)
          return (
            <div key={eid} className="rounded-xl border border-[var(--border)] bg-white/60 p-2">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: muscleColor(seed?.primary_muscle) }} />
                {seed?.name || eid}
              </div>
              <div className="text-xs text-[var(--text-muted)] font-mono space-x-2">
                {sets.filter(s => s.set_type !== 'warmup').map((s, i) => <span key={i}>{s.weight_kg}x{s.reps}</span>)}
              </div>
            </div>
          )
        })}
      </div>
    </HeroFrame>
  )
}

function ProgramAttachment({ a, accent, wash }) {
  const [startOpen, setStartOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const toast = useToast()
  if (!a) return null
  const program = { id: a.id, name: a.name, description: a.description, strictness: a.strictness, proof: { starts: a.enrollment_count } }
  return (
    <HeroFrame accent={accent} wash={wash}>
      <div className="font-bold text-[var(--text)]">{a.name}</div>
      {a.description && <div className="mt-1 text-caption text-[var(--text-muted)] line-clamp-3">{a.description}</div>}
      <div className="mt-1 text-caption" style={{ color: accent || '#454c47' }}>{a.enrollment_count || 0} started · open-ended</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => setStartOpen(true)} className="py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-sm font-semibold">Start program</button>
        <button onClick={() => setDetailOpen(true)} className="py-2.5 rounded-xl bg-white border border-[var(--border)] text-[var(--text)] text-sm font-semibold hover:border-[var(--border-strong)]">View details</button>
      </div>
      <StartProgramSheet open={startOpen} onClose={() => setStartOpen(false)} program={program} onStarted={() => { setStartOpen(false); toast?.(`Started ${a.name}`, 'success') }} />
      {detailOpen && <ProgramDetailSheet program={program} onClose={() => setDetailOpen(false)} />}
    </HeroFrame>
  )
}

function TemplateAttachment({ a, accent, wash }) {
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
    <HeroFrame accent={accent} wash={wash}>
      <div className="font-bold text-[var(--text)]">{a.name}</div>
      <div className="mt-1 text-caption" style={{ color: accent || '#2b6a86' }}>{a.exercise_count || 0} exercises · used {a.usage_count || 0}x</div>
      <button onClick={() => start()} className="mt-3 w-full py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-sm font-semibold">Start as workout</button>
      <ConfirmSheet open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={() => { setConfirmOpen(false); start(true) }} title="Replace workout?" message="Starting this template will replace your current active workout." confirmLabel="Replace" danger />
    </HeroFrame>
  )
}
