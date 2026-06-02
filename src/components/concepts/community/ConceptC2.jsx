import { useState } from 'react'
import { MOCK_POSTS, KIND_META, timeAgo } from '../../../lib/conceptMockData.js'

// Palette — The Digest / dark editorial, earthy Pantone
const P = {
  bg: '#17160f',
  surface: '#211f16',
  surfaceBright: '#2a2820',
  border: '#35321f',
  borderBright: '#4a4630',
  text: '#e8e0c8',
  textMuted: '#9a9078',
  textDim: '#5a5438',
  accent: '#c4841a',
  accentLight: '#f5d9a0',
  accentDim: '#7a5010',
  tagWorkout: '#3d7a54',
  tagStudy: '#4a7a5a',
  tagPR: '#b87020',
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
  { v: 'hot', label: 'Trending' },
  { v: 'new', label: 'Latest' },
  { v: 'top', label: 'Top rated' },
]

export default function ConceptC2() {
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
    return b.score + b.comment_count * 2 - (a.score + a.comment_count * 2)
  })

  const [featured, ...rest] = sorted

  return (
    <div className="min-h-screen pb-24" style={{ background: P.bg, color: P.text }}>
      {/* Header */}
      <header className="sticky top-10 z-20 px-4 pt-4 pb-0" style={{ background: P.bg + 'f8' }}>
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-2xl font-bold tracking-tight flex-1">Community</h1>
          <button
            onClick={() => setComposeOpen(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-colors"
            style={{ background: P.accent, color: '#1a1000' }}
          >+</button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0 mb-0 overflow-x-auto no-scrollbar" style={{ borderBottom: `1px solid ${P.border}` }}>
          {SORTS.map(s => (
            <button
              key={s.v}
              onClick={() => setSort(s.v)}
              className="shrink-0 px-4 py-2.5 text-sm font-medium transition-colors"
              style={sort === s.v
                ? { color: P.accent, borderBottom: `2px solid ${P.accent}` }
                : { color: P.textMuted, borderBottom: '2px solid transparent' }
              }
            >{s.label}</button>
          ))}
          <div className="flex-1" />
          {KINDS.slice(1).map(k => (
            <button
              key={k.v}
              onClick={() => setKind(prev => prev === k.v ? '' : k.v)}
              className="shrink-0 px-3 py-2.5 text-xs font-medium transition-colors"
              style={{ color: kind === k.v ? P.accent : P.textDim }}
            >{k.label}</button>
          ))}
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* Featured post — editorial hero */}
        {featured && !kind && sort === 'hot' && (
          <FeaturedCard post={featured} onVote={vote} onSave={toggleSave} />
        )}

        {/* Grid of rest */}
        <div className="grid grid-cols-1 gap-3">
          {(kind || sort !== 'hot' ? sorted : rest).map(post => (
            <DigestCard key={post.id} post={post} onVote={vote} onSave={toggleSave} />
          ))}
        </div>

        {sorted.length === 0 && (
          <div className="py-16 text-center text-sm" style={{ color: P.textMuted }}>
            Nothing here yet — be the first to post.
          </div>
        )}
      </div>

      {composeOpen && <ComposeSheet onClose={() => setComposeOpen(false)} />}
    </div>
  )
}

function FeaturedCard({ post, onVote, onSave }) {
  const meta = KIND_META[post.kind] || KIND_META.discussion
  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background: P.surface, border: `1px solid ${P.borderBright}` }}
    >
      {/* Gold accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: P.accent }} />

      <div className="flex items-start gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: P.accent + '20', color: P.accent }}>{meta.label}</span>
        {post.labels?.slice(0, 1).map(l => (
          <span key={l} className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: P.textDim, border: `1px solid ${P.border}` }}>{l}</span>
        ))}
        <span className="ml-auto text-xs" style={{ color: P.textDim }}>{timeAgo(post.created_at)}</span>
      </div>

      {post.title && (
        <h2 className="text-xl font-bold leading-tight mb-2" style={{ color: P.text }}>{post.title}</h2>
      )}
      {post.body && (
        <p className="text-sm leading-relaxed line-clamp-3 mb-4" style={{ color: P.textMuted }}>{post.body}</p>
      )}

      {post.attachment && <DigestAttachment post={post} />}

      <div className="flex items-center gap-4 mt-4">
        {/* Score */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => onVote(post.id, 1)} className="text-lg leading-none" style={{ color: post.viewer_vote === 1 ? P.accent : P.textDim }}>▲</button>
          <span className="text-lg font-bold tabular-nums" style={{ color: post.viewer_vote !== 0 ? P.accent : P.text }}>{post.score}</span>
          <button onClick={() => onVote(post.id, -1)} className="text-lg leading-none" style={{ color: post.viewer_vote === -1 ? '#e05a3a' : P.textDim }}>▼</button>
        </div>
        <span className="text-sm" style={{ color: P.textMuted }}>{post.comment_count} replies</span>
        <span className="text-sm" style={{ color: P.textMuted }}>{post.username}</span>
        <button
          onClick={() => onSave(post.id)}
          className="ml-auto text-xs px-3 py-1 rounded-lg"
          style={post.saved ? { background: P.accent + '30', color: P.accentLight } : { color: P.textDim }}
        >{post.saved ? 'Saved' : 'Save'}</button>
      </div>
    </div>
  )
}

function DigestCard({ post, onVote, onSave }) {
  const meta = KIND_META[post.kind] || KIND_META.discussion
  return (
    <div className="rounded-xl p-4" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
      <div className="flex items-start gap-3">
        {/* Vote column */}
        <div className="flex flex-col items-center gap-0.5 pt-0.5 shrink-0">
          <button onClick={() => onVote(post.id, 1)} className="leading-none text-base" style={{ color: post.viewer_vote === 1 ? P.accent : P.textDim }}>▲</button>
          <span className="text-xs font-bold tabular-nums w-6 text-center" style={{ color: post.viewer_vote !== 0 ? P.accent : P.textMuted }}>{post.score}</span>
          <button onClick={() => onVote(post.id, -1)} className="leading-none text-base" style={{ color: post.viewer_vote === -1 ? '#e05a3a' : P.textDim }}>▼</button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</span>
            <span className="ml-auto text-[10px] tabular-nums" style={{ color: P.textDim }}>{timeAgo(post.created_at)}</span>
          </div>
          {post.title && <div className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: P.text }}>{post.title}</div>}
          {!post.title && post.body && <div className="text-sm leading-relaxed line-clamp-2" style={{ color: P.textMuted }}>{post.body}</div>}
          {post.title && post.body && <div className="mt-1 text-xs line-clamp-1" style={{ color: P.textMuted }}>{post.body}</div>}

          {post.attachment && <DigestAttachment post={post} compact />}

          <div className="mt-2 flex items-center gap-3">
            <span className="text-xs" style={{ color: P.textDim }}>{post.username}</span>
            <span className="text-xs" style={{ color: P.textDim }}>{post.comment_count} replies</span>
            <button
              onClick={() => onSave(post.id)}
              className="ml-auto text-xs"
              style={{ color: post.saved ? P.accent : P.textDim }}
            >{post.saved ? 'Saved' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DigestAttachment({ post, compact }) {
  const a = post.attachment
  if (!a) return null
  if (post.kind === 'workout') return (
    <div className={`${compact ? 'mt-1.5' : 'mt-3'} rounded-lg px-3 py-2 flex items-center gap-2`} style={{ background: P.surfaceBright }}>
      <span className="text-xs font-bold" style={{ color: P.accentLight }}>{a.workout_day}</span>
      <span className="text-xs" style={{ color: P.textDim }}>{a.duration_min}min · {a.set_count} sets</span>
    </div>
  )
  if (post.kind === 'program' || post.kind === 'template') return (
    <div className={`${compact ? 'mt-1.5' : 'mt-3'} rounded-lg px-3 py-2`} style={{ background: P.surfaceBright }}>
      <div className="text-xs font-medium truncate" style={{ color: P.text }}>{a.name}</div>
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
      <div className="relative w-full max-w-md mx-auto rounded-t-2xl" style={{ background: P.surface, border: `1px solid ${P.borderBright}` }}>
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ background: P.border }} />
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${P.border}` }}>
          <h2 className="font-semibold">New post</h2>
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
                  ? { background: P.accent, color: '#1a1000' }
                  : { background: P.surfaceBright, color: P.textMuted }
                }
              >{k}</button>
            ))}
          </div>
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: P.surfaceBright, color: P.text }}
          />
          <textarea
            value={body} onChange={e => setBody(e.target.value)}
            placeholder="What do you want to say?"
            rows={4}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style={{ background: P.surfaceBright, color: P.text }}
          />
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-bold transition-colors"
            style={{ background: P.accent, color: '#1a1000' }}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  )
}
