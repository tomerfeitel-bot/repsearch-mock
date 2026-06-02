import { useMemo, useState } from 'react'
import { STYLE1 as P } from '../../../lib/conceptStyles.js'
import { MOCK_POSTS, KIND_META, timeAgo } from '../../../lib/conceptMockData.js'
import { IconUp, IconDown, IconComment, IconBookmark, IconSearch, IconPlus, IconClose, REACTIONS, compactScore } from './_shared.jsx'

const KINDS = ['all', 'discussion', 'workout', 'pr', 'study', 'program', 'template']
const SORTS = ['Hot', 'New', 'Top']

// Clinic · light, card-forward feed. Vote rail on the left (Reddit reference),
// teal accent only on the active sort, the primary action, and the live score.
export default function Style1Community() {
  const [posts, setPosts] = useState(() => MOCK_POSTS.map(p => ({ ...p, reactions: seedReactions(p) })))
  const [kind, setKind] = useState('all')
  const [sort, setSort] = useState('Hot')
  const [query, setQuery] = useState('')
  const [composing, setComposing] = useState(false)

  const visible = useMemo(() => {
    let list = posts
    if (kind !== 'all') list = list.filter(p => p.kind === kind)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(p => (p.title || p.body || '').toLowerCase().includes(q) || p.username.includes(q))
    }
    const score = p => p.score + p.reactions.respect + p.reactions.fire + p.reactions.strong
    return [...list].sort((a, b) =>
      sort === 'New' ? new Date(b.created_at) - new Date(a.created_at)
      : sort === 'Top' ? b.score - a.score
      : score(b) - score(a))
  }, [posts, kind, sort, query])

  function vote(id, dir) {
    setPosts(ps => ps.map(p => {
      if (p.id !== id) return p
      const next = p.viewer_vote === dir ? 0 : dir
      return { ...p, viewer_vote: next, score: p.score - p.viewer_vote + next }
    }))
  }
  function react(id, key) {
    setPosts(ps => ps.map(p => {
      if (p.id !== id) return p
      const mine = p.myReaction === key
      const reactions = { ...p.reactions, [key]: p.reactions[key] + (mine ? -1 : 1) }
      if (p.myReaction && !mine) reactions[p.myReaction] -= 1
      return { ...p, reactions, myReaction: mine ? null : key }
    }))
  }
  function save(id) {
    setPosts(ps => ps.map(p => p.id === id ? { ...p, saved: !p.saved } : p))
  }

  return (
    <div className="concept-focus min-h-screen pb-28" style={{ background: P.bg, color: P.text, fontFamily: 'Inter, system-ui, sans-serif', '--cf': P.accent }}>
      <header className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{ background: P.bg, borderBottom: `1px solid ${P.border}` }}>
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Community</h1>
          <span className="text-xs font-mono" style={{ color: P.textMuted }}>{visible.length} posts</span>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl px-3 h-10"
          style={{ background: P.surface, border: `1px solid ${P.border}` }}>
          <IconSearch size={16} style={{ color: P.textMuted }} />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search posts and people"
            aria-label="Search community"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: P.text }}
          />
          {query && <button onClick={() => setQuery('')} aria-label="Clear search" style={{ color: P.textMuted }}><IconClose size={15} /></button>}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-1 px-1">
            {KINDS.map(k => {
              const on = kind === k
              const meta = KIND_META[k]
              return (
                <button key={k} onClick={() => setKind(k)} aria-pressed={on}
                  className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-colors motion-reduce:transition-none"
                  style={on
                    ? { background: P.text, color: P.surface }
                    : { background: P.surface, color: P.textMuted, border: `1px solid ${P.border}` }}>
                  {meta && <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />}
                  {k === 'all' ? 'All' : meta?.label || k}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-2 flex gap-1 p-1 rounded-lg w-max" style={{ background: P.surfaceAlt, border: `1px solid ${P.border}` }}>
          {SORTS.map(s => {
            const on = sort === s
            return (
              <button key={s} onClick={() => setSort(s)} aria-pressed={on}
                className="h-7 px-3 rounded-md text-xs font-semibold transition-colors motion-reduce:transition-none"
                style={on ? { background: P.accent, color: P.accentInk } : { color: P.textMuted }}>
                {s}
              </button>
            )
          })}
        </div>
      </header>

      <ul className="px-4 pt-3 space-y-2.5">
        {visible.length === 0 && (
          <li className="text-center py-16 rounded-2xl" style={{ background: P.surface, border: `1px dashed ${P.border}` }}>
            <p className="text-sm font-medium">No posts match that filter.</p>
            <p className="text-xs mt-1" style={{ color: P.textMuted }}>Clear the search or pick a different type to see the feed.</p>
          </li>
        )}
        {visible.map(p => (
          <PostCard key={p.id} post={p} onVote={vote} onReact={react} onSave={save} />
        ))}
      </ul>

      <button onClick={() => setComposing(true)} aria-label="Create post"
        className="fixed right-5 bottom-6 z-30 inline-flex items-center gap-2 h-12 pl-4 pr-5 rounded-full font-semibold shadow-lg transition-transform motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none"
        style={{ background: P.accent, color: P.accentInk }}>
        <IconPlus size={18} /> Post
      </button>

      {composing && <Composer onClose={() => setComposing(false)} />}
    </div>
  )
}

function PostCard({ post, onVote, onReact, onSave }) {
  const meta = KIND_META[post.kind] || { label: post.kind, color: P.textMuted }
  return (
    <li className="rounded-2xl overflow-hidden" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
      <div className="flex">
        <div className="flex flex-col items-center gap-0.5 py-3 px-1.5 w-12 shrink-0" style={{ background: P.surfaceAlt }}>
          <VoteBtn dir={1} active={post.viewer_vote === 1} onClick={() => onVote(post.id, 1)} />
          <span className="text-xs font-bold font-mono tabular-nums"
            style={{ color: post.viewer_vote === 1 ? P.accent : post.viewer_vote === -1 ? P.negative : P.text }}>
            {compactScore(post.score)}
          </span>
          <VoteBtn dir={-1} active={post.viewer_vote === -1} onClick={() => onVote(post.id, -1)} />
        </div>

        <div className="flex-1 min-w-0 p-3.5">
          <div className="flex items-center gap-2 text-xs" style={{ color: P.textMuted }}>
            <span className="inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded"
              style={{ color: meta.color, background: `${meta.color}1f` }}>{meta.label}</span>
            <span>u/{post.username}</span>
            <span aria-hidden>·</span>
            <span className="font-mono">{timeAgo(post.created_at)}</span>
          </div>

          {post.title && <h3 className="mt-1.5 font-semibold leading-snug" style={{ textWrap: 'balance' }}>{post.title}</h3>}
          {post.body && <p className="mt-1 text-sm leading-relaxed" style={{ color: P.textMuted, maxWidth: '68ch' }}>{post.body}</p>}

          {post.attachment && <Attachment kind={post.kind} a={post.attachment} />}

          <div className="mt-3 flex items-center flex-wrap gap-1.5">
            {REACTIONS.map(r => {
              const count = post.reactions[r.key]
              const mine = post.myReaction === r.key
              return (
                <button key={r.key} onClick={() => onReact(post.id, r.key)} aria-pressed={mine}
                  className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-xs font-semibold transition-colors motion-reduce:transition-none"
                  style={mine
                    ? { background: P.accentSoft, color: P.accent, border: `1px solid ${P.accent}` }
                    : { background: P.surfaceAlt, color: P.textMuted, border: `1px solid ${P.border}` }}>
                  <span aria-hidden>{r.emoji}</span>
                  {count > 0 && <span className="font-mono tabular-nums">{count}</span>}
                </button>
              )
            })}
            <span className="inline-flex items-center gap-1.5 h-8 px-2 text-xs ml-auto" style={{ color: P.textMuted }}>
              <IconComment size={15} /> <span className="font-mono tabular-nums">{post.comment_count}</span>
            </span>
            <button onClick={() => onSave(post.id)} aria-pressed={post.saved} aria-label={post.saved ? 'Unsave' : 'Save'}
              className="inline-flex items-center justify-center h-8 w-8 rounded-full transition-colors motion-reduce:transition-none"
              style={{ color: post.saved ? P.accent : P.textMuted }}>
              <IconBookmark size={16} filled={post.saved} />
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}

function VoteBtn({ dir, active, onClick }) {
  const Icon = dir === 1 ? IconUp : IconDown
  return (
    <button onClick={onClick} aria-pressed={active} aria-label={dir === 1 ? 'Upvote' : 'Downvote'}
      className="inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors motion-reduce:transition-none"
      style={{ color: active ? (dir === 1 ? P.accent : P.negative) : P.textMuted, background: active ? P.accentSoft : 'transparent' }}>
      <Icon size={18} />
    </button>
  )
}

function Attachment({ kind, a }) {
  const rows = kind === 'workout'
    ? [[a.workout_day, 'session'], [`${a.duration_min}m`, 'time'], [a.exercise_count, 'lifts'], [a.set_count, 'sets']]
    : kind === 'program'
    ? [[a.name, 'program'], [a.enrollment_count, 'enrolled']]
    : [[a.name, 'template'], [a.exercise_count, 'lifts'], [a.usage_count, 'uses']]
  return (
    <div className="mt-2.5 flex flex-wrap gap-2 rounded-xl p-2.5" style={{ background: P.surfaceAlt, border: `1px solid ${P.border}` }}>
      {rows.map(([v, l], i) => (
        <div key={i} className="px-2">
          <div className="text-sm font-bold font-mono tabular-nums">{v}</div>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: P.textMuted }}>{l}</div>
        </div>
      ))}
    </div>
  )
}

function Composer({ onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Create post">
      <div className="absolute inset-0" style={{ background: 'rgba(20,30,33,0.45)' }} onClick={onClose} />
      <div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">New post</h2>
          <button onClick={onClose} aria-label="Close" style={{ color: P.textMuted }}><IconClose /></button>
        </div>
        <input placeholder="An interesting title" aria-label="Post title"
          className="mt-3 w-full h-10 px-3 rounded-xl bg-transparent text-sm outline-none"
          style={{ border: `1px solid ${P.border}`, color: P.text }} />
        <textarea placeholder="Share a finding, a session, or a question…" rows={4} aria-label="Post body"
          className="mt-2 w-full p-3 rounded-xl bg-transparent text-sm outline-none resize-none"
          style={{ border: `1px solid ${P.border}`, color: P.text }} />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="h-10 px-4 rounded-xl text-sm font-semibold" style={{ color: P.textMuted, border: `1px solid ${P.border}` }}>Cancel</button>
          <button onClick={onClose} className="h-10 px-4 rounded-xl text-sm font-semibold" style={{ background: P.accent, color: P.accentInk }}>Publish post</button>
        </div>
      </div>
    </div>
  )
}

function seedReactions(p) {
  const base = Math.max(0, Math.round(p.score / 6))
  return { respect: base, fire: Math.round(base * 0.6), strong: p.kind === 'pr' ? base : Math.round(base * 0.3) }
}
