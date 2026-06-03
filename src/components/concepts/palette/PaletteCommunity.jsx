import { useMemo, useState } from 'react'
import { MOCK_POSTS, KIND_META, timeAgo } from '../../../lib/conceptMockData.js'
import { IconUp, IconDown, IconComment, IconBookmark, IconSearch, IconPlus, IconClose, REACTIONS, compactScore } from '../cohesive/_shared.jsx'

const KINDS = ['all', 'discussion', 'workout', 'pr', 'study']
const SORTS = ['Hot', 'New', 'Top']

export default function PaletteCommunity({ P }) {
  const [posts, setPosts] = useState(() => MOCK_POSTS.map(p => ({ ...p, reactions: seedReactions(p) })))
  const [kind, setKind] = useState('all')
  const [sort, setSort] = useState('Hot')
  const [query, setQuery] = useState('')
  const [composing, setComposing] = useState(false)

  const r = P.radius
  const isEmber = P.tags.includes('amber')
  const isMarine = P.tags.includes('navy')
  const isGrove = P.tags.includes('earthy')
  const isQuartz = P.tags.includes('lavender')

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

  const fabStyle = isQuartz
    ? { background: 'linear-gradient(120deg,#6d28d9,#4c1d95)', color: '#ffffff', boxShadow: '0 4px 16px rgba(109,40,217,0.30)' }
    : isEmber
    ? { background: P.accent, color: P.accentInk, boxShadow: `0 4px 24px rgba(217,124,30,0.22)` }
    : { background: P.accent, color: P.accentInk }

  return (
    <div className="min-h-screen pb-28" style={{ background: P.bg, color: P.text }}>
      <header className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{
        background: P.bg,
        borderBottom: isEmber ? `2px solid ${P.accent}` : `1px solid ${P.border}`,
      }}>
        <div className="flex items-baseline justify-between">
          <h1 className={`text-2xl font-bold tracking-tight ${isMarine ? 'font-mono' : ''}`}>Community</h1>
          <span className="text-xs font-mono" style={{ color: P.textMuted }}>{visible.length} posts</span>
        </div>

        <div className="mt-3 flex items-center gap-2 px-3 h-10"
          style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: r }}>
          <IconSearch size={16} style={{ color: P.textMuted }} />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search posts and people"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: P.text }}
          />
          {query && <button onClick={() => setQuery('')} style={{ color: P.textMuted }}><IconClose size={15} /></button>}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-1 px-1 flex-1">
            {KINDS.map(k => {
              const on = kind === k
              const meta = KIND_META[k]
              return (
                <button key={k} onClick={() => setKind(k)} aria-pressed={on}
                  className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold whitespace-nowrap transition-colors"
                  style={{
                    borderRadius: r * 2,
                    background: on ? P.accent : P.surface,
                    color: on ? P.accentInk : P.textMuted,
                    border: on ? 'none' : `1px solid ${P.border}`,
                  }}>
                  {meta && <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />}
                  {k === 'all' ? 'All' : meta?.label || k}
                </button>
              )
            })}
          </div>
          <div className="flex gap-0.5 p-0.5 shrink-0" style={{ background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: r }}>
            {SORTS.map(s => {
              const on = sort === s
              return (
                <button key={s} onClick={() => setSort(s)} aria-pressed={on}
                  className="h-7 px-2.5 text-xs font-semibold transition-colors"
                  style={{ borderRadius: r - 2, background: on ? P.accent : 'transparent', color: on ? P.accentInk : P.textMuted }}>
                  {s}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      <ul className="px-4 pt-3 space-y-2.5">
        {visible.map(p => (
          <PostCard key={p.id} post={p} P={P} r={r} onVote={vote} onReact={react} onSave={save} isEmber={isEmber} isMarine={isMarine} isGrove={isGrove} />
        ))}
      </ul>

      <button onClick={() => setComposing(true)} aria-label="Create post"
        className="fixed right-5 bottom-6 z-30 inline-flex items-center gap-2 h-12 pl-4 pr-5 rounded-full font-semibold transition-transform hover:-translate-y-0.5"
        style={fabStyle}>
        <IconPlus size={18} /> Post
      </button>

      {composing && <Composer P={P} r={r} onClose={() => setComposing(false)} />}
    </div>
  )
}

function PostCard({ post, P, r, onVote, onReact, onSave, isEmber, isMarine }) {
  const meta = KIND_META[post.kind] || { label: post.kind, color: P.textMuted }

  // Ember: row-separator style (no card box)
  if (isEmber) {
    return (
      <li className="py-3 flex gap-3" style={{ borderBottom: `1px solid ${P.border}` }}>
        <div className="flex flex-col items-center gap-0.5 w-8 shrink-0 pt-0.5">
          <button onClick={() => onVote(post.id, 1)} aria-pressed={post.viewer_vote === 1}
            className="h-6 w-6 flex items-center justify-center rounded"
            style={{ color: post.viewer_vote === 1 ? P.accent : P.textMuted }}>
            <IconUp size={16} />
          </button>
          <span className="text-xs font-bold font-mono tabular-nums"
            style={{ color: post.viewer_vote !== 0 ? P.accent : P.text }}>
            {compactScore(post.score)}
          </span>
          <button onClick={() => onVote(post.id, -1)} aria-pressed={post.viewer_vote === -1}
            className="h-6 w-6 flex items-center justify-center rounded"
            style={{ color: post.viewer_vote === -1 ? P.negative : P.textMuted }}>
            <IconDown size={16} />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs mb-1" style={{ color: P.textMuted }}>
            <span className="font-semibold px-1.5 py-0.5 rounded" style={{ color: meta.color, background: `${meta.color}22` }}>{meta.label}</span>
            <span>u/{post.username} · {timeAgo(post.created_at)}</span>
          </div>
          {post.title && <h3 className="font-semibold leading-snug text-sm mb-1">{post.title}</h3>}
          {post.body && <p className="text-sm leading-relaxed line-clamp-2" style={{ color: P.textMuted }}>{post.body}</p>}
          <div className="mt-2 flex items-center gap-1.5">
            {REACTIONS.map(r2 => {
              const count = post.reactions[r2.key]
              const mine = post.myReaction === r2.key
              return (
                <button key={r2.key} onClick={() => onReact(post.id, r2.key)} aria-pressed={mine}
                  className="inline-flex items-center gap-1 h-7 px-2 rounded text-xs font-semibold"
                  style={mine ? { background: P.accentSoft, color: P.accent } : { color: P.textMuted }}>
                  <span>{r2.emoji}</span>
                  {count > 0 && <span className="font-mono">{count}</span>}
                </button>
              )
            })}
            <span className="inline-flex items-center gap-1 text-xs ml-auto" style={{ color: P.textMuted }}>
              <IconComment size={13} /> {post.comment_count}
            </span>
          </div>
        </div>
      </li>
    )
  }

  // Default card style (Marine/Grove/Chalk/Quartz)
  const isQuartz = P.tags.includes('lavender')
  return (
    <li style={{
      background: P.surface,
      border: isQuartz ? 'none' : `1px solid ${P.border}`,
      borderRadius: r,
      boxShadow: isQuartz ? '0 2px 10px rgba(109,40,217,0.07),0 1px 2px rgba(0,0,0,0.04)' : 'none',
      overflow: 'hidden',
    }}>
      <div className="flex">
        <div className="flex flex-col items-center gap-0.5 py-3 px-1.5 w-11 shrink-0"
          style={{ background: P.surfaceAlt, borderRight: isMarine ? `1px solid ${P.border}` : 'none' }}>
          <button onClick={() => onVote(post.id, 1)} aria-pressed={post.viewer_vote === 1}
            className="h-7 w-7 flex items-center justify-center rounded-md"
            style={{ color: post.viewer_vote === 1 ? P.accent : P.textMuted, background: post.viewer_vote === 1 ? P.accentSoft : 'transparent' }}>
            <IconUp size={17} />
          </button>
          <span className="text-xs font-bold font-mono tabular-nums"
            style={{ color: post.viewer_vote === 1 ? P.accent : post.viewer_vote === -1 ? P.negative : P.text }}>
            {compactScore(post.score)}
          </span>
          <button onClick={() => onVote(post.id, -1)} aria-pressed={post.viewer_vote === -1}
            className="h-7 w-7 flex items-center justify-center rounded-md"
            style={{ color: post.viewer_vote === -1 ? P.negative : P.textMuted, background: post.viewer_vote === -1 ? 'rgba(220,80,80,0.12)' : 'transparent' }}>
            <IconDown size={17} />
          </button>
        </div>

        <div className="flex-1 min-w-0 p-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: P.textMuted }}>
            <span className="font-semibold px-1.5 py-0.5 rounded"
              style={{ color: meta.color, background: `${meta.color}1f` }}>{meta.label}</span>
            <span>u/{post.username}</span>
            <span aria-hidden>·</span>
            <span className="font-mono">{timeAgo(post.created_at)}</span>
          </div>

          {post.title && <h3 className="mt-1.5 font-semibold leading-snug text-sm">{post.title}</h3>}
          {post.body && <p className="mt-1 text-sm leading-relaxed" style={{ color: P.textMuted, maxWidth: '60ch' }}>{post.body}</p>}

          {post.attachment && <Attachment P={P} r={r} kind={post.kind} a={post.attachment} />}

          <div className="mt-2.5 flex items-center flex-wrap gap-1">
            {REACTIONS.map(r2 => {
              const count = post.reactions[r2.key]
              const mine = post.myReaction === r2.key
              return (
                <button key={r2.key} onClick={() => onReact(post.id, r2.key)} aria-pressed={mine}
                  className="inline-flex items-center gap-1 h-7 px-2 rounded-full text-xs font-semibold"
                  style={mine
                    ? { background: P.accentSoft, color: P.accent, border: `1px solid ${P.accent}` }
                    : { background: P.surfaceAlt, color: P.textMuted, border: `1px solid ${P.border}` }}>
                  <span>{r2.emoji}</span>
                  {count > 0 && <span className="font-mono">{count}</span>}
                </button>
              )
            })}
            <span className="inline-flex items-center gap-1 h-7 px-2 text-xs ml-auto" style={{ color: P.textMuted }}>
              <IconComment size={14} /> <span className="font-mono">{post.comment_count}</span>
            </span>
            <button onClick={() => onSave(post.id)} aria-pressed={post.saved}
              className="h-7 w-7 flex items-center justify-center rounded-full"
              style={{ color: post.saved ? P.accent : P.textMuted }}>
              <IconBookmark size={15} filled={post.saved} />
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}

function Attachment({ P, r, kind, a }) {
  const rows = kind === 'workout'
    ? [[a.workout_day, 'session'], [`${a.duration_min}m`, 'time'], [a.exercise_count, 'lifts'], [a.set_count, 'sets']]
    : [[a.name, 'program'], [a.enrollment_count ?? 0, 'enrolled']]
  return (
    <div className="mt-2 flex flex-wrap gap-2 p-2.5" style={{ background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: Math.max(r - 4, 6) }}>
      {rows.map(([v, l], i) => (
        <div key={i} className="px-2">
          <div className="text-sm font-bold font-mono tabular-nums">{v}</div>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: P.textMuted }}>{l}</div>
        </div>
      ))}
    </div>
  )
}

function Composer({ P, r, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div className="relative w-full p-4" style={{ background: P.surface, borderTop: `1px solid ${P.border}`, borderTopLeftRadius: r, borderTopRightRadius: r }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">New post</h2>
          <button onClick={onClose} style={{ color: P.textMuted }}><IconClose /></button>
        </div>
        <input placeholder="An interesting title"
          className="w-full h-10 px-3 bg-transparent text-sm outline-none"
          style={{ border: `1px solid ${P.border}`, borderRadius: r - 2, color: P.text }} />
        <textarea placeholder="Share a finding, a session, or a question…" rows={3}
          className="mt-2 w-full p-3 bg-transparent text-sm outline-none resize-none"
          style={{ border: `1px solid ${P.border}`, borderRadius: r - 2, color: P.text }} />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="h-10 px-4 text-sm font-semibold"
            style={{ color: P.textMuted, border: `1px solid ${P.border}`, borderRadius: r - 2 }}>Cancel</button>
          <button onClick={onClose} className="h-10 px-4 text-sm font-semibold"
            style={{ background: P.accent, color: P.accentInk, borderRadius: r - 2 }}>Publish</button>
        </div>
      </div>
    </div>
  )
}

function seedReactions(p) {
  const base = Math.max(0, Math.round(p.score / 6))
  return { respect: base, fire: Math.round(base * 0.6), strong: p.kind === 'pr' ? base : Math.round(base * 0.3) }
}
