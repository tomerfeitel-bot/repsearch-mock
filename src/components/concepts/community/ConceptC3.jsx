import { useState } from 'react'
import { MOCK_POSTS, KIND_META, timeAgo } from '../../../lib/conceptMockData.js'

// Palette — Stream / dark social, sage green
const P = {
  bg: '#0a0a0a',
  surface: '#141414',
  surfaceBright: '#1e1e1e',
  border: '#282828',
  borderBright: '#383838',
  text: '#e8e8e8',
  textMuted: '#888888',
  textDim: '#444444',
  accent: '#7aaa70',
  accentDim: '#3a5a34',
  accentText: '#c8f0c0',
  upvote: '#7aaa70',
  downvote: '#8888cc',
}

const KINDS = [
  { v: '', label: 'All' },
  { v: 'discussion', label: 'Discussion' },
  { v: 'workout', label: 'Workout' },
  { v: 'pr', label: 'PR' },
  { v: 'study', label: 'Study' },
]

export default function ConceptC3() {
  const [posts, setPosts] = useState(MOCK_POSTS)
  const [kind, setKind] = useState('')
  const [sort, setSort] = useState('hot')
  const [composeOpen, setComposeOpen] = useState(false)

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

  const filtered = posts.filter(p => !kind || p.kind === kind)
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'top') return b.score - a.score
    if (sort === 'new') return new Date(b.created_at) - new Date(a.created_at)
    return b.score + b.comment_count - (a.score + a.comment_count)
  })

  const hot = posts
    .filter(p => p.score > 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)

  return (
    <div className="min-h-screen pb-24" style={{ background: P.bg, color: P.text }}>
      {/* Header */}
      <header className="sticky top-10 z-20 px-4 pt-4" style={{ background: P.bg }}>
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-xl font-bold flex-1 tracking-tight">Community</h1>
          <button
            onClick={() => setComposeOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold"
            style={{ background: P.accent, color: '#0a1a08' }}
          >
            + Post
          </button>
        </div>

        {/* Hot strip */}
        {hot.length > 0 && !kind && (
          <div className="mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: P.textDim }}>Trending</div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {hot.map(p => (
                <div
                  key={p.id}
                  className="shrink-0 px-3 py-2 rounded-xl cursor-pointer"
                  style={{ background: P.surface, border: `1px solid ${P.border}`, maxWidth: '180px' }}
                >
                  <div className="text-[10px] font-semibold truncate" style={{ color: P.accent }}>{KIND_META[p.kind]?.label}</div>
                  <div className="text-xs font-medium line-clamp-1 mt-0.5">{p.title || p.body}</div>
                  <div className="text-[10px] mt-1" style={{ color: P.textDim }}>▲ {p.score}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Kind pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3" style={{ borderBottom: `1px solid ${P.border}` }}>
          {KINDS.map(k => (
            <button
              key={k.v}
              onClick={() => setKind(k.v)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={kind === k.v
                ? { background: P.accent, color: '#0a1a08' }
                : { color: P.textMuted, border: `1px solid ${P.border}` }
              }
            >{k.label}</button>
          ))}
          <div className="ml-auto flex items-center gap-1 shrink-0">
            {[{ v: 'hot', icon: '↑' }, { v: 'new', icon: '✦' }, { v: 'top', icon: '★' }].map(s => (
              <button
                key={s.v}
                onClick={() => setSort(s.v)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                style={{ color: sort === s.v ? P.accent : P.textDim, background: sort === s.v ? P.accentDim + '60' : 'transparent' }}
              >{s.icon}</button>
            ))}
          </div>
        </div>
      </header>

      {/* Stream */}
      <div className="divide-y" style={{ borderColor: P.border }}>
        {sorted.map(post => (
          <StreamCard key={post.id} post={post} onVote={vote} onSave={toggleSave} />
        ))}
        {sorted.length === 0 && (
          <div className="py-16 text-center text-sm" style={{ color: P.textMuted }}>Nothing here yet.</div>
        )}
      </div>

      {composeOpen && <ComposeSheet onClose={() => setComposeOpen(false)} />}
    </div>
  )
}

function StreamCard({ post, onVote, onSave }) {
  const meta = KIND_META[post.kind] || KIND_META.discussion
  const initials = post.username.slice(0, 2).toUpperCase()

  return (
    <div className="px-4 py-4 transition-colors" style={{ background: 'transparent' }}>
      <div className="flex gap-3">
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
          style={{ background: P.surfaceBright, color: P.textMuted, border: `1px solid ${P.border}` }}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          {/* Meta row */}
          <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
            <span className="text-sm font-semibold">{post.username}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</span>
            <span className="text-xs tabular-nums ml-auto" style={{ color: P.textDim }}>{timeAgo(post.created_at)}</span>
          </div>

          {/* Content */}
          {post.title && <div className="text-sm font-semibold leading-snug line-clamp-2 mb-1">{post.title}</div>}
          {post.body && <div className="text-sm leading-relaxed line-clamp-3" style={{ color: P.textMuted }}>{post.body}</div>}

          {/* Attachment */}
          {post.attachment && <StreamAttachment post={post} />}

          {/* Actions row */}
          <div className="flex items-center gap-4 mt-3">
            {/* Horizontal vote */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onVote(post.id, 1)}
                className="flex items-center gap-1 text-sm px-2 py-1 rounded-lg transition-colors"
                style={post.viewer_vote === 1
                  ? { background: P.upvote + '20', color: P.upvote }
                  : { color: P.textDim }
                }
              >
                <span>▲</span>
                <span className="text-xs tabular-nums font-semibold">{post.score}</span>
              </button>
              <button
                onClick={() => onVote(post.id, -1)}
                className="p-1 rounded-lg text-sm transition-colors"
                style={{ color: post.viewer_vote === -1 ? P.downvote : P.textDim }}
              >▼</button>
            </div>

            <button className="flex items-center gap-1.5 text-xs" style={{ color: P.textDim }}>
              <span>◎</span>
              <span>{post.comment_count}</span>
            </button>

            <button
              onClick={() => onSave(post.id)}
              className="text-xs ml-auto"
              style={{ color: post.saved ? P.accent : P.textDim }}
            >
              {post.saved ? '★ Saved' : '☆ Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StreamAttachment({ post }) {
  const a = post.attachment
  if (!a) return null
  if (post.kind === 'workout') return (
    <div className="mt-2 rounded-xl p-2.5 flex items-center gap-2" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
      <span className="text-xs font-semibold" style={{ color: P.accentText }}>{a.workout_day}</span>
      <span className="text-xs" style={{ color: P.textMuted }}>{a.duration_min}min · {a.set_count} sets</span>
    </div>
  )
  if (post.kind === 'program' || post.kind === 'template') return (
    <div className="mt-2 rounded-xl p-2.5" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
      <span className="text-xs font-medium" style={{ color: P.text }}>{a.name}</span>
    </div>
  )
  return null
}

function ComposeSheet({ onClose }) {
  const [kind, setKind] = useState('discussion')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const COMPOSE_KINDS = ['discussion', 'workout', 'study', 'program']

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md mx-auto rounded-t-3xl" style={{ background: P.surface }}>
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ background: P.border }} />
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${P.border}` }}>
          <h2 className="font-semibold">What's on your mind?</h2>
          <button onClick={onClose} style={{ color: P.textMuted }}>✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            {COMPOSE_KINDS.map(k => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-colors"
                style={kind === k
                  ? { background: P.accent, color: '#0a1a08' }
                  : { background: P.surfaceBright, color: P.textMuted }
                }
              >{k}</button>
            ))}
          </div>
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: P.surfaceBright, color: P.text }}
          />
          <textarea
            value={body} onChange={e => setBody(e.target.value)}
            placeholder="Say something..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style={{ background: P.surfaceBright, color: P.text }}
          />
          <button
            onClick={onClose}
            className="w-full py-3 rounded-full text-sm font-bold"
            style={{ background: P.accent, color: '#0a1a08' }}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  )
}
