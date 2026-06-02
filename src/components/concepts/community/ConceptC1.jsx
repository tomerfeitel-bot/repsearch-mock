import { useState } from 'react'
import { MOCK_POSTS, KIND_META, timeAgo } from '../../../lib/conceptMockData.js'

// Palette — The Board / light mode teal
const P = {
  bg: '#f0f4f6',
  surface: '#ffffff',
  surfaceTint: '#f7fafb',
  border: '#e2e8ec',
  borderAccent: '#4a8fa0',
  text: '#1a2830',
  textMuted: '#5a7080',
  textDim: '#9ab0bc',
  accent: '#4a8fa0',
  accentLight: '#e8f4f8',
  accentText: '#ffffff',
  upvote: '#e05a3a',
  downvote: '#4a8fa0',
}

const KINDS = [
  { v: '', label: 'All' },
  { v: 'discussion', label: 'Discussion' },
  { v: 'workout', label: 'Workout' },
  { v: 'pr', label: 'PR' },
  { v: 'study', label: 'Study' },
  { v: 'program', label: 'Program' },
]

const SORTS = [
  { v: 'hot', label: 'Hot' },
  { v: 'new', label: 'New' },
  { v: 'top', label: 'Top' },
]

export default function ConceptC1() {
  const [posts, setPosts] = useState(MOCK_POSTS)
  const [kind, setKind] = useState('')
  const [sort, setSort] = useState('hot')
  const [composeOpen, setComposeOpen] = useState(false)
  const [search, setSearch] = useState('')

  function vote(id, value) {
    setPosts(prev => prev.map(p => {
      if (p.id !== id) return p
      const next = p.viewer_vote === value ? 0 : value
      return { ...p, viewer_vote: next, score: p.score + (next - p.viewer_vote) }
    }))
  }

  function toggleSave(id) {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, saved: !p.saved } : p))
  }

  const filtered = posts.filter(p => {
    if (kind && p.kind !== kind) return false
    if (search && !p.title?.toLowerCase().includes(search.toLowerCase()) && !p.body?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'top') return b.score - a.score
    if (sort === 'new') return new Date(b.created_at) - new Date(a.created_at)
    return b.score + b.comment_count - (a.score + a.comment_count)
  })

  return (
    <div className="min-h-screen pb-24" style={{ background: P.bg, color: P.text }}>
      {/* Header */}
      <header className="sticky top-10 z-20 px-4 pt-4 pb-3" style={{ background: P.bg, borderBottom: `1px solid ${P.border}` }}>
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-xl font-bold flex-1">Community</h1>
          <button
            onClick={() => setComposeOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors"
            style={{ background: P.accent, color: P.accentText }}
          >
            <span>+</span> Post
          </button>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search posts..."
          className="w-full px-4 py-2.5 rounded-full text-sm outline-none mb-3"
          style={{ background: P.surface, border: `1px solid ${P.border}`, color: P.text }}
        />

        {/* Sort tabs */}
        <div className="flex gap-1 mb-2">
          {SORTS.map(s => (
            <button
              key={s.v}
              onClick={() => setSort(s.v)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-colors"
              style={sort === s.v
                ? { background: P.accent, color: P.accentText }
                : { color: P.textMuted }
              }
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Kind filter pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {KINDS.map(k => (
            <button
              key={k.v}
              onClick={() => setKind(k.v)}
              className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={kind === k.v
                ? { background: P.accentLight, color: P.accent, border: `1.5px solid ${P.accent}` }
                : { background: P.surface, color: P.textMuted, border: `1px solid ${P.border}` }
              }
            >
              {k.label}
            </button>
          ))}
        </div>
      </header>

      {/* Feed */}
      <div className="px-4 pt-3 space-y-2">
        {sorted.map((post, idx) => (
          <BoardCard key={post.id} post={post} featured={idx === 0 && !kind && !search} onVote={vote} onSave={toggleSave} />
        ))}
        {sorted.length === 0 && (
          <div className="py-16 text-center text-sm" style={{ color: P.textMuted }}>
            Nothing matches — try a different filter.
          </div>
        )}
      </div>

      {composeOpen && <ComposeSheet onClose={() => setComposeOpen(false)} />}
    </div>
  )
}

function BoardCard({ post, featured, onVote, onSave }) {
  const meta = KIND_META[post.kind] || KIND_META.discussion
  return (
    <div
      className="rounded-2xl overflow-hidden transition-shadow hover:shadow-md"
      style={{ background: P.surface, border: `1px solid ${P.border}`, boxShadow: featured ? `0 0 0 2px ${P.accent}20, 0 2px 12px ${P.accent}10` : undefined }}
    >
      <div className="flex">
        {/* Vote rail */}
        <div className="flex flex-col items-center pt-3 px-2.5 gap-0.5 shrink-0">
          <button
            onClick={() => onVote(post.id, 1)}
            className="text-base leading-none p-1 rounded transition-colors"
            style={{ color: post.viewer_vote === 1 ? P.upvote : P.textDim }}
          >▲</button>
          <span
            className="text-xs font-bold tabular-nums w-6 text-center"
            style={{ color: post.viewer_vote === 1 ? P.upvote : post.viewer_vote === -1 ? P.downvote : P.textMuted }}
          >{post.score}</span>
          <button
            onClick={() => onVote(post.id, -1)}
            className="text-base leading-none p-1 rounded transition-colors"
            style={{ color: post.viewer_vote === -1 ? P.downvote : P.textDim }}
          >▼</button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 py-3 pr-3">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: meta.color + '20', color: meta.color }}
            >{meta.label}</span>
            {post.labels?.slice(0, 1).map(l => (
              <span key={l} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: P.bg, color: P.textMuted, border: `1px solid ${P.border}` }}>{l}</span>
            ))}
            <span className="ml-auto text-[11px] tabular-nums" style={{ color: P.textDim }}>{timeAgo(post.created_at)}</span>
          </div>

          {/* Title / body */}
          <PostLead post={post} />

          {/* Attachment */}
          {post.attachment && <BoardAttachment post={post} />}

          {/* Footer */}
          <div className="mt-2.5 flex items-center gap-3">
            <span className="text-xs font-medium" style={{ color: P.textMuted }}>{post.username}</span>
            <span className="text-xs" style={{ color: P.textDim }}>{post.comment_count} replies</span>
            <button
              onClick={() => onSave(post.id)}
              className="ml-auto text-xs px-2.5 py-1 rounded-lg transition-colors"
              style={post.saved
                ? { background: '#fef3c7', color: '#92400e' }
                : { color: P.textDim }
              }
            >
              {post.saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PostLead({ post }) {
  if (post.kind === 'pr') return (
    <div>
      <div className="text-sm font-bold leading-snug" style={{ color: P.text }}>{post.title}</div>
    </div>
  )
  return (
    <div>
      {post.title && <div className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: P.text }}>{post.title}</div>}
      {post.body && <div className="mt-1 text-xs leading-relaxed line-clamp-2" style={{ color: P.textMuted }}>{post.body}</div>}
    </div>
  )
}

function BoardAttachment({ post }) {
  const a = post.attachment
  if (post.kind === 'workout') return (
    <div className="mt-2 rounded-xl p-2.5 flex items-center gap-3" style={{ background: P.bg, border: `1px solid ${P.border}` }}>
      <span className="text-xs font-bold" style={{ color: P.accent }}>{a.workout_day}</span>
      <span className="text-xs" style={{ color: P.textMuted }}>{a.duration_min}min · {a.exercise_count} exercises · {a.set_count} sets</span>
    </div>
  )
  if (post.kind === 'program' || post.kind === 'template') return (
    <div className="mt-2 rounded-xl p-2.5" style={{ background: P.bg, border: `1px solid ${P.border}` }}>
      <div className="text-xs font-semibold truncate" style={{ color: P.text }}>{a.name}</div>
    </div>
  )
  return null
}

function ComposeSheet({ onClose }) {
  const [kind, setKind] = useState('discussion')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const COMPOSE_KINDS = ['discussion', 'workout', 'study', 'program', 'template']

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md mx-auto rounded-t-2xl" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${P.border}` }}>
          <h2 className="font-semibold text-sm">New post</h2>
          <button onClick={onClose} className="text-sm" style={{ color: P.textMuted }}>✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {COMPOSE_KINDS.map(k => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className="px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors"
                style={kind === k
                  ? { background: P.accent, color: P.accentText }
                  : { background: P.bg, color: P.textMuted, border: `1px solid ${P.border}` }
                }
              >{k}</button>
            ))}
          </div>
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.text }}
          />
          <textarea
            value={body} onChange={e => setBody(e.target.value)}
            placeholder="What's on your mind?"
            rows={4}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.text }}
          />
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: P.accent, color: P.accentText }}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  )
}
