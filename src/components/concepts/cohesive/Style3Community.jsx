import { useMemo, useState } from 'react'
import { STYLE3 as P } from '../../../lib/conceptStyles.js'
import { MOCK_POSTS, KIND_META, timeAgo } from '../../../lib/conceptMockData.js'
import { IconUp, IconDown, IconComment, IconBookmark, IconSearch, IconPlus, IconClose, REACTIONS, compactScore } from './_shared.jsx'

const KINDS = ['all', 'discussion', 'workout', 'pr', 'study', 'program', 'template']
const SORTS = ['Hot', 'New', 'Top']

// Ledger · cool dark, instrument-panel feed. Mono throughout, steel accent only
// on the active control, an upvoted score, and the primary action.
export default function Style3Community() {
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
    return [...list].sort((a, b) =>
      sort === 'New' ? new Date(b.created_at) - new Date(a.created_at) : b.score - a.score)
  }, [posts, kind, sort, query])

  function vote(id, dir) {
    setPosts(ps => ps.map(p => p.id === id
      ? { ...p, viewer_vote: p.viewer_vote === dir ? 0 : dir, score: p.score - p.viewer_vote + (p.viewer_vote === dir ? 0 : dir) } : p))
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
  function save(id) { setPosts(ps => ps.map(p => p.id === id ? { ...p, saved: !p.saved } : p)) }

  return (
    <div className="concept-focus min-h-screen pb-28" style={{ background: P.bg, color: P.text, fontFamily: 'Inter, system-ui, sans-serif', '--cf': P.accent }}>
      <header className="sticky top-0 z-20 px-4 pt-4 pb-2" style={{ background: P.bg, borderBottom: `1px solid ${P.border}` }}>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">Community</h1>
          <div className="flex items-center gap-3">
            {SORTS.map(s => (
              <button key={s} onClick={() => setSort(s)} aria-pressed={sort === s}
                className="text-xs font-mono uppercase tracking-wide transition-colors motion-reduce:transition-none"
                style={{ color: sort === s ? P.accent : P.textMuted }}>{s}</button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-md px-3 h-9" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
          <IconSearch size={15} style={{ color: P.textMuted }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="filter feed…" aria-label="Search community"
            className="flex-1 bg-transparent text-sm font-mono outline-none" style={{ color: P.text }} />
          {query && <button onClick={() => setQuery('')} aria-label="Clear search" style={{ color: P.textMuted }}><IconClose size={14} /></button>}
        </div>

        <div className="mt-2.5 flex gap-1 overflow-x-auto no-scrollbar pb-1">
          {KINDS.map(k => {
            const on = kind === k
            const meta = KIND_META[k]
            return (
              <button key={k} onClick={() => setKind(k)} aria-pressed={on}
                className="shrink-0 inline-flex items-center gap-1.5 h-7 px-2 rounded text-[11px] font-mono uppercase tracking-wide transition-colors motion-reduce:transition-none"
                style={on ? { background: P.accentSoft, color: P.accent } : { color: P.textMuted }}>
                {meta && <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />}
                {k === 'all' ? 'all' : meta?.label || k}
              </button>
            )
          })}
        </div>
      </header>

      <ul>
        {visible.length === 0 && (
          <li className="text-center py-16 px-4">
            <p className="text-sm font-medium">No matching rows.</p>
            <p className="text-xs mt-1 font-mono" style={{ color: P.textMuted }}>clear the filter to restore the feed</p>
          </li>
        )}
        {visible.map(p => <Row key={p.id} post={p} onVote={vote} onReact={react} onSave={save} />)}
      </ul>

      <button onClick={() => setComposing(true)} aria-label="Create post"
        className="fixed right-5 bottom-6 z-30 inline-flex items-center gap-2 h-12 pl-4 pr-5 rounded-md font-semibold shadow-lg transition-transform motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none"
        style={{ background: P.accent, color: P.accentInk }}>
        <IconPlus size={18} /> Post
      </button>

      {composing && <Composer onClose={() => setComposing(false)} />}
    </div>
  )
}

function Row({ post, onVote, onReact, onSave }) {
  const meta = KIND_META[post.kind] || { label: post.kind, color: P.textMuted }
  const voted = post.viewer_vote === 1
  return (
    <li className="px-4 py-3 grid grid-cols-[3rem_1fr] gap-3" style={{ borderBottom: `1px solid ${P.border}` }}>
      {/* ledger score column */}
      <div className="flex flex-col items-center pt-0.5">
        <button onClick={() => onVote(post.id, 1)} aria-pressed={voted} aria-label="Upvote"
          className="h-6 w-6 inline-flex items-center justify-center rounded transition-colors motion-reduce:transition-none"
          style={{ color: voted ? P.accent : P.textMuted }}><IconUp size={16} /></button>
        <span className="text-sm font-bold font-mono tabular-nums leading-tight"
          style={{ color: voted ? P.accent : post.viewer_vote === -1 ? P.negative : P.text }}>{compactScore(post.score)}</span>
        <button onClick={() => onVote(post.id, -1)} aria-pressed={post.viewer_vote === -1} aria-label="Downvote"
          className="h-6 w-6 inline-flex items-center justify-center rounded transition-colors motion-reduce:transition-none"
          style={{ color: post.viewer_vote === -1 ? P.negative : P.textMuted }}><IconDown size={16} /></button>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] font-mono" style={{ color: P.textMuted }}>
          <span className="uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</span>
          <span>{post.username}</span>
          <span className="ml-auto">{timeAgo(post.created_at)}</span>
        </div>
        {post.title && <h3 className="mt-1 font-semibold leading-snug" style={{ textWrap: 'balance' }}>{post.title}</h3>}
        {post.body && <p className="mt-0.5 text-sm leading-relaxed" style={{ color: P.textMuted, maxWidth: '68ch' }}>{post.body}</p>}
        {post.attachment && <Attachment kind={post.kind} a={post.attachment} />}

        <div className="mt-2.5 flex items-center gap-1">
          {REACTIONS.map(r => {
            const mine = post.myReaction === r.key
            const count = post.reactions[r.key]
            return (
              <button key={r.key} onClick={() => onReact(post.id, r.key)} aria-pressed={mine}
                className="inline-flex items-center gap-1 h-7 px-1.5 rounded text-xs transition-colors motion-reduce:transition-none"
                style={mine ? { background: P.accentSoft, color: P.accent } : { color: P.textMuted }}>
                <span aria-hidden>{r.emoji}</span>{count > 0 && <span className="font-mono tabular-nums">{count}</span>}
              </button>
            )
          })}
          <span className="inline-flex items-center gap-1 text-xs font-mono ml-auto" style={{ color: P.textMuted }}>
            <IconComment size={14} />{post.comment_count}
          </span>
          <button onClick={() => onSave(post.id)} aria-pressed={post.saved} aria-label={post.saved ? 'Unsave' : 'Save'}
            className="h-7 w-7 inline-flex items-center justify-center rounded transition-colors motion-reduce:transition-none"
            style={{ color: post.saved ? P.accent : P.textMuted }}><IconBookmark size={15} filled={post.saved} /></button>
        </div>
      </div>
    </li>
  )
}

function Attachment({ kind, a }) {
  const rows = kind === 'workout'
    ? [[a.workout_day, 'session'], [`${a.duration_min}m`, 'time'], [a.exercise_count, 'lifts'], [a.set_count, 'sets']]
    : kind === 'program' ? [[a.name, 'program'], [a.enrollment_count, 'enrolled']]
    : [[a.name, 'template'], [a.exercise_count, 'lifts'], [a.usage_count, 'uses']]
  return (
    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 rounded-md px-3 py-2 text-xs" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
      {rows.map(([v, l], i) => (
        <div key={i} className="flex items-baseline justify-between gap-2">
          <span className="uppercase tracking-wide" style={{ color: P.textMuted }}>{l}</span>
          <span className="font-mono font-semibold tabular-nums">{v}</span>
        </div>
      ))}
    </div>
  )
}

function Composer({ onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Create post">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div className="relative w-full sm:max-w-md rounded-t-md sm:rounded-md p-4" style={{ background: P.surface, border: `1px solid ${P.borderStrong}` }}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold font-mono">new_post</h2>
          <button onClick={onClose} aria-label="Close" style={{ color: P.textMuted }}><IconClose /></button>
        </div>
        <input placeholder="title" aria-label="Post title"
          className="mt-3 w-full h-10 px-3 rounded-md bg-transparent text-sm font-mono outline-none" style={{ border: `1px solid ${P.border}`, color: P.text }} />
        <textarea placeholder="body…" rows={4} aria-label="Post body"
          className="mt-2 w-full p-3 rounded-md bg-transparent text-sm outline-none resize-none" style={{ border: `1px solid ${P.border}`, color: P.text }} />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="h-10 px-4 rounded-md text-sm font-semibold" style={{ color: P.textMuted, border: `1px solid ${P.border}` }}>Cancel</button>
          <button onClick={onClose} className="h-10 px-4 rounded-md text-sm font-semibold" style={{ background: P.accent, color: P.accentInk }}>Publish post</button>
        </div>
      </div>
    </div>
  )
}

function seedReactions(p) {
  const base = Math.max(0, Math.round(p.score / 6))
  return { respect: base, fire: Math.round(base * 0.6), strong: p.kind === 'pr' ? base : Math.round(base * 0.3) }
}
