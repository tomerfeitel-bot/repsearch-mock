import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { MODERN, MODERN_MOSS } from '../../../lib/conceptStyles.js'
import { MOCK_POSTS, KIND_META, timeAgo, threadFor, countThread } from '../../../lib/conceptMockData.js'
import { nanoid } from '../../../lib/nanoid.js'
import {
  IconUp, IconCaret, IconComment, IconShare, IconBookmark, IconMore, IconSearch,
  IconPlus, IconClose, IconBolt, IconTrophy, compactScore,
} from '../cohesive/_shared.jsx'

const SORTS = ['Hot', 'New', 'Top']
const KINDS = ['all', 'discussion', 'workout', 'pr', 'study', 'program', 'template']
const THEMES = [MODERN, MODERN_MOSS]

// The active palette flows through context so every accent surface can read its own gradient
// recipe (P.g.*) and the whole page re-skins instantly when the palette toggle flips.
const PulseCtx = createContext(MODERN)
const usePulse = () => useContext(PulseCtx)

// "Pulse" — a modern, Reddit-shaped community feed. Two togglable palettes (Tidewater teal /
// Terrarium moss-gold). The accent shows only where the reference uses orange (active sort
// pill, upvoted vote pill, FAB) and fades a different way on each via per-element recipes.
export default function ConceptCModern() {
  const [themeId, setThemeId] = useState('teal')
  const [posts, setPosts] = useState(() => MOCK_POSTS)
  const [sort, setSort] = useState('Hot')
  const [kind, setKind] = useState('all')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [composing, setComposing] = useState(false)
  const [openId, setOpenId] = useState(null)

  const P = themeId === 'moss' ? MODERN_MOSS : MODERN

  const visible = useMemo(() => {
    let list = posts
    if (kind !== 'all') list = list.filter(p => p.kind === kind)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(p => (p.title || p.body || '').toLowerCase().includes(q) || p.username.includes(q))
    }
    return [...list].sort((a, b) =>
      sort === 'New' ? new Date(b.created_at) - new Date(a.created_at) : b.score - a.score)
  }, [posts, kind, query, sort])

  function vote(id, dir) {
    setPosts(ps => ps.map(p => p.id === id
      ? { ...p, viewer_vote: p.viewer_vote === dir ? 0 : dir, score: p.score - p.viewer_vote + (p.viewer_vote === dir ? 0 : dir) } : p))
  }
  function save(id) { setPosts(ps => ps.map(p => p.id === id ? { ...p, saved: !p.saved } : p)) }

  const openPost = openId ? posts.find(p => p.id === openId) : null

  return (
    <PulseCtx.Provider value={P}>
      <div className="concept-focus relative min-h-screen" style={{ background: P.bg, color: P.ink, fontFamily: 'Inter, system-ui, sans-serif', '--cf': P.accentDeep }}>
        <Grain />

        <div className="relative" style={{ zIndex: 1 }}>
          {/* App bar */}
          <header className="sticky top-9 z-20 px-4 pt-3.5 pb-2.5"
            style={{ background: `${P.bg}f2`, backdropFilter: 'blur(8px)', borderBottom: `1px solid ${P.border}` }}>
            <div className="flex items-center justify-between">
              {searching ? (
                <div className="flex items-center gap-2 flex-1 h-10 px-3 rounded-full" style={{ background: P.surface, border: `1px solid ${P.borderStrong}` }}>
                  <IconSearch size={17} style={{ color: P.muted }} />
                  <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search posts and people"
                    aria-label="Search community" className="flex-1 bg-transparent text-sm outline-none" style={{ color: P.ink }} />
                  <button onClick={() => { setSearching(false); setQuery('') }} aria-label="Close search" style={{ color: P.muted }}><IconClose size={17} /></button>
                </div>
              ) : (
                <>
                  <button className="flex items-center gap-1.5" aria-label="Switch community">
                    <span className="text-xl font-extrabold tracking-tight">Community</span>
                    <IconCaret size={18} style={{ color: P.muted }} />
                  </button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSearching(true)} aria-label="Search"
                      className="h-10 w-10 inline-flex items-center justify-center rounded-full transition-colors motion-reduce:transition-none"
                      style={{ color: P.ink }}><IconSearch size={20} /></button>
                    <span aria-hidden className="h-9 w-9 rounded-full grid place-items-center text-sm font-bold ml-0.5"
                      style={{ background: P.surfaceAlt, border: `1px solid ${P.border}`, color: P.accentDeep }}>You</span>
                  </div>
                </>
              )}
            </div>
          </header>

          {/* Sort pills + palette toggle */}
          <div className="px-4 pt-3 flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              {SORTS.map(s => {
                const on = sort === s
                return (
                  <button key={s} onClick={() => setSort(s)} aria-pressed={on}
                    className="h-9 px-4 rounded-full text-sm font-bold transition-all motion-reduce:transition-none"
                    style={on
                      ? { background: P.g.ctaBg, color: P.g.ctaInk, boxShadow: '0 4px 12px -6px rgba(16,32,38,0.4)' }
                      : { background: P.surface, color: P.muted, border: `1px solid ${P.border}` }}>
                    {s}
                  </button>
                )
              })}
            </div>
            <PaletteToggle themeId={themeId} setThemeId={setThemeId} />
          </div>

          {/* Kind chips */}
          <div className="px-4 pt-2.5 pb-1 flex gap-1.5 overflow-x-auto no-scrollbar">
            {KINDS.map(k => {
              const on = kind === k
              const meta = KIND_META[k]
              return (
                <button key={k} onClick={() => setKind(k)} aria-pressed={on}
                  className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-colors motion-reduce:transition-none"
                  style={on ? { background: P.ink, color: P.surface } : { background: 'transparent', color: P.muted, border: `1px solid ${P.border}` }}>
                  {meta && <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />}
                  {k === 'all' ? 'All' : meta?.label || k}
                </button>
              )
            })}
          </div>

          {/* Feed */}
          <main className="px-4 pt-2 pb-24">
            {visible.length === 0 ? (
              <EmptyState onReset={() => { setKind('all'); setQuery(''); setSearching(false) }} />
            ) : (
              <ul className="space-y-3.5">
                {visible.map(p => <Card key={p.id} post={p} onVote={vote} onSave={save} onOpen={() => setOpenId(p.id)} />)}
              </ul>
            )}
          </main>
        </div>

        {/* Compose FAB */}
        <button onClick={() => setComposing(true)} aria-label="Create post"
          className="fixed right-5 z-40 h-14 w-14 rounded-full grid place-items-center transition-transform motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none"
          style={{ bottom: 24, background: P.g.fabBg, color: P.g.fabInk, boxShadow: '0 10px 26px -10px rgba(16,32,38,0.45)' }}>
          <IconPlus size={24} />
        </button>

        {composing && <Composer onClose={() => setComposing(false)} />}
        {openPost && <Thread post={openPost} onClose={() => setOpenId(null)} onVote={vote} onSave={save} />}
      </div>
    </PulseCtx.Provider>
  )
}

/* ------------------------------------------------------- palette toggle */

function PaletteToggle({ themeId, setThemeId }) {
  const active = themeId === 'moss' ? MODERN_MOSS : MODERN
  return (
    <div role="group" aria-label="Colour palette" className="flex items-center gap-1.5 shrink-0">
      {THEMES.map(t => {
        const on = themeId === t.id
        return (
          <button key={t.id} onClick={() => setThemeId(t.id)} aria-pressed={on}
            aria-label={`${t.label} palette`} title={`${t.label} palette`}
            className="h-9 w-9 rounded-full grid place-items-center transition-transform motion-safe:hover:scale-105 motion-reduce:transition-none"
            style={{ background: active.surface, border: `1px solid ${active.border}`, boxShadow: on ? `0 0 0 2px ${active.surface}, 0 0 0 3.5px ${active.accentDeep}` : 'none' }}>
            <span className="h-5 w-5 rounded-full" style={{ background: t.g.fabBg }} />
          </button>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------- Card */

function Card({ post, onVote, onSave, onOpen }) {
  const P = usePulse()
  const meta = KIND_META[post.kind] || { label: post.kind, color: P.muted }
  const community = COMMUNITY_BY_KIND[post.kind] || 'r/Training'
  return (
    <li className="rounded-3xl overflow-hidden" style={{ background: P.surface, border: `1px solid ${P.border}`, boxShadow: P.shadowSoft }}>
      <div className="p-4 pb-0">
        {/* header */}
        <div className="flex items-center gap-2.5">
          <Avatar name={post.username} kind={post.kind} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold leading-tight truncate">{community}</div>
            <div className="text-xs truncate" style={{ color: P.muted }}>u/{post.username} · {timeAgo(post.created_at)}</div>
          </div>
          <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-bold" style={{ background: P.g.softBg, color: P.g.softInk }}>
            {meta.label}
          </span>
          <button aria-label="More options" className="h-8 w-8 grid place-items-center rounded-full" style={{ color: P.muted }}><IconMore size={18} /></button>
        </div>

        {/* title + body — opens the thread */}
        <button onClick={onOpen} className="mt-3 block w-full text-left">
          {post.title && <h3 className="text-[17px] font-bold leading-snug" style={{ textWrap: 'balance' }}>{post.title}</h3>}
          {post.body && <p className="mt-1.5 text-sm leading-relaxed" style={{ color: P.muted, maxWidth: '64ch' }}>{post.body}</p>}
        </button>
      </div>

      {/* media hero — also opens the thread */}
      <button onClick={onOpen} className="block w-full px-4 pt-3 text-left">
        <MediaHero post={post} />
      </button>

      {/* footer actions */}
      <div className="p-3 pt-3.5 flex items-center gap-2">
        <VotePill post={post} onVote={onVote} />
        <Action icon={<IconComment size={18} />} label={compactScore(post.comment_count)} ariaLabel="Open thread" onClick={onOpen} />
        <Action icon={<IconShare size={18} />} label="Share" ariaLabel="Share" />
        <SaveButton saved={post.saved} onClick={() => onSave(post.id)} />
      </div>
    </li>
  )
}

function VotePill({ post, onVote }) {
  const P = usePulse()
  const up = post.viewer_vote === 1
  const down = post.viewer_vote === -1
  return (
    <div className="inline-flex items-center h-10 rounded-full overflow-hidden" style={up ? { background: P.g.voteBg } : { background: P.surfaceAlt, border: `1px solid ${P.border}` }}>
      <button onClick={() => onVote(post.id, 1)} aria-pressed={up} aria-label="Upvote"
        className="h-10 w-9 grid place-items-center transition-colors motion-reduce:transition-none" style={{ color: up ? P.g.voteInk : P.muted }}>
        <IconUp size={18} />
      </button>
      <span className="text-sm font-bold font-mono tabular-nums px-0.5 min-w-[2.2rem] text-center" style={{ color: up ? P.g.voteInk : down ? P.negative : P.ink }}>
        {compactScore(post.score)}
      </span>
      <button onClick={() => onVote(post.id, -1)} aria-pressed={down} aria-label="Downvote"
        className="h-10 w-9 grid place-items-center transition-colors motion-reduce:transition-none" style={{ color: down ? P.negative : up ? P.g.voteInk : P.muted }}>
        <IconCaret size={18} />
      </button>
    </div>
  )
}

function Action({ icon, label, ariaLabel, onClick }) {
  const P = usePulse()
  return (
    <button onClick={onClick} aria-label={ariaLabel} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-full text-sm font-semibold transition-colors motion-reduce:transition-none" style={{ color: P.muted }}>
      {icon}<span className="font-mono tabular-nums">{label}</span>
    </button>
  )
}

function SaveButton({ saved, onClick }) {
  const P = usePulse()
  return (
    <button onClick={onClick} aria-pressed={saved} aria-label={saved ? 'Unsave' : 'Save'}
      className="ml-auto inline-flex items-center gap-1.5 h-10 px-3 rounded-full text-sm font-semibold transition-colors motion-reduce:transition-none"
      style={saved ? { background: P.g.softBg, color: P.g.softInk } : { color: P.muted }}>
      <IconBookmark size={18} filled={saved} />
      <span>{saved ? 'Saved' : 'Save'}</span>
    </button>
  )
}

/* ----------------------------------------------------------- Media hero */

function MediaHero({ post }) {
  const k = post.kind
  if (k === 'workout' && post.attachment) return <WorkoutHero a={post.attachment} seed={post.id} />
  if (k === 'pr') return <PrHero seed={post.id} />
  if (k === 'program' && post.attachment) return <ProgramHero a={post.attachment} seed={post.id} />
  if (k === 'template' && post.attachment) return <TemplateHero a={post.attachment} />
  return <TextBanner kind={k} />
}

function HeroFrame({ children, tint = false }) {
  const P = usePulse()
  return (
    <div className="rounded-2xl p-4 overflow-hidden" style={{ background: tint ? P.g.softBg : P.surfaceAlt, border: `1px solid ${P.border}` }}>
      {children}
    </div>
  )
}

function WorkoutHero({ a, seed }) {
  const P = usePulse()
  const bars = barSeries(seed, 9)
  const max = Math.max(...bars)
  return (
    <HeroFrame>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold" style={{ color: P.muted }}>{a.workout_day}</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold font-mono tabular-nums">{a.duration_min}</span>
            <span className="text-sm font-semibold" style={{ color: P.muted }}>min</span>
          </div>
        </div>
        <div className="flex gap-1.5 items-end" aria-hidden>
          {bars.map((v, i) => (
            <span key={i} className="w-2 rounded-full" style={{ height: 12 + (v / max) * 40, background: P.accentDeep, opacity: 0.32 + (v / max) * 0.4 }} />
          ))}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <StatChip n={a.exercise_count} l="exercises" />
        <StatChip n={a.set_count} l="sets" />
        <StatChip n={Math.round(a.set_count / a.exercise_count)} l="avg sets" />
      </div>
    </HeroFrame>
  )
}

function PrHero({ seed }) {
  const P = usePulse()
  const spark = barSeries(seed, 12)
  const max = Math.max(...spark), min = Math.min(...spark)
  const pts = spark.map((v, i) => `${(i / (spark.length - 1)) * 100},${28 - ((v - min) / (max - min || 1)) * 24}`).join(' ')
  return (
    <HeroFrame tint>
      <div className="flex items-center gap-3">
        <span className="h-11 w-11 rounded-2xl grid place-items-center shrink-0" style={{ background: P.surface, color: P.accentDeep }}><IconTrophy size={22} /></span>
        <div className="flex-1">
          <div className="text-xs font-bold" style={{ color: P.g.softInk }}>Personal record</div>
          <div className="text-sm font-semibold" style={{ color: P.ink }}>New all-time best lift</div>
        </div>
        <svg width="84" height="30" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden>
          <polyline points={pts} fill="none" stroke={P.accentDeep} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </HeroFrame>
  )
}

function ProgramHero({ a, seed }) {
  const P = usePulse()
  const blocks = barSeries(seed, 6)
  return (
    <HeroFrame>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold" style={{ color: P.muted }}>Program</div>
          <div className="font-bold truncate">{a.name}</div>
        </div>
        <StatChip n={a.enrollment_count} l="enrolled" />
      </div>
      <div className="mt-3 flex gap-1.5 h-8 items-end" aria-hidden>
        {blocks.map((v, i) => (
          <span key={i} className="flex-1 rounded-md" style={{ height: 10 + (v % 22), background: P.accentDeep, opacity: 0.28 + (i / blocks.length) * 0.42 }} />
        ))}
      </div>
    </HeroFrame>
  )
}

function TemplateHero({ a }) {
  const P = usePulse()
  return (
    <HeroFrame>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold" style={{ color: P.muted }}>Template</div>
          <div className="font-bold truncate">{a.name}</div>
        </div>
        <div className="flex gap-2">
          <StatChip n={a.exercise_count} l="lifts" />
          <StatChip n={a.usage_count} l="uses" />
        </div>
      </div>
    </HeroFrame>
  )
}

function TextBanner({ kind }) {
  const P = usePulse()
  const meta = KIND_META[kind] || { label: kind }
  return (
    <div className="rounded-2xl px-4 py-5 flex items-center gap-3" style={{ background: P.g.softBg, border: `1px solid ${P.border}` }}>
      <span className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ background: P.surface, color: P.accentDeep }}>
        <IconBolt size={20} />
      </span>
      <div>
        <div className="text-sm font-bold" style={{ color: P.ink }}>{meta.label === 'Study' ? 'Research thread' : 'Open discussion'}</div>
        <div className="text-xs" style={{ color: P.g.softInk }}>Tap to read the full thread and replies</div>
      </div>
    </div>
  )
}

function StatChip({ n, l }) {
  const P = usePulse()
  return (
    <div className="rounded-xl px-2.5 py-1.5" style={{ background: P.surface, border: `1px solid ${P.border}` }}>
      <span className="text-sm font-bold font-mono tabular-nums">{n}</span>
      <span className="ml-1.5 text-[11px]" style={{ color: P.muted }}>{l}</span>
    </div>
  )
}

/* --------------------------------------------------------------- Thread */

// The thread view. One continuous, connected conversation — neutral avatars, borderless
// comments joined by a thin hairline connector, an always-present sticky composer, and
// inline reply on every comment — so the page invites you to keep the discussion going.
function Thread({ post, onClose, onVote, onSave }) {
  const P = usePulse()
  const [shown, setShown] = useState(false)
  useEffect(() => { setShown(true) }, [])
  const [tree, setTree] = useState(() => clone(threadFor(post.id)))
  const [draft, setDraft] = useState('')
  const total = useMemo(() => countThread(tree), [tree])
  const meta = KIND_META[post.kind] || { label: post.kind, color: P.muted }
  const community = COMMUNITY_BY_KIND[post.kind] || 'r/Training'

  function addReply(parentId, body) {
    const node = newComment(body)
    setTree(t => (parentId ? insertReply(t, parentId, node) : [...t, node]))
  }
  function voteComment(id, dir) {
    setTree(t => mapTree(t, n => (n.id === id
      ? { ...n, viewer_vote: n.viewer_vote === dir ? 0 : dir, score: n.score - n.viewer_vote + (n.viewer_vote === dir ? 0 : dir) }
      : n)))
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={`Thread: ${post.title || community}`}
      className="fixed inset-0 z-[70] flex flex-col transition-all duration-200 ease-out motion-reduce:transition-none"
      style={{ background: P.bg, color: P.ink, fontFamily: 'Inter, system-ui, sans-serif', '--cf': P.accentDeep, opacity: shown ? 1 : 0, transform: shown ? 'none' : 'translateY(10px)' }}>
      <div className="concept-focus flex flex-col h-full">
        <Grain />

        {/* Back bar */}
        <header className="relative z-10 shrink-0 flex items-center gap-2 h-12 px-2.5"
          style={{ background: `${P.bg}f2`, backdropFilter: 'blur(8px)', borderBottom: `1px solid ${P.border}` }}>
          <button onClick={onClose} aria-label="Back to feed" className="h-10 w-10 grid place-items-center rounded-full" style={{ color: P.ink }}><IconBack size={20} /></button>
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">{community}</div>
            <div className="text-[11px] truncate" style={{ color: P.muted }}>{total} comments</div>
          </div>
        </header>

        {/* Scroll region */}
        <div className="relative z-10 flex-1 overflow-y-auto">
          {/* Post header — the only card */}
          <article className="px-4 pt-4">
            <div className="flex items-center gap-2.5">
              <Avatar name={post.username} kind={post.kind} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold leading-tight truncate">{community}</div>
                <div className="text-xs truncate" style={{ color: P.muted }}>u/{post.username} · {timeAgo(post.created_at)}</div>
              </div>
              <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-bold" style={{ background: P.g.softBg, color: P.g.softInk }}>{meta.label}</span>
            </div>
            {post.title && <h1 className="mt-3 text-xl font-extrabold leading-snug" style={{ textWrap: 'balance' }}>{post.title}</h1>}
            {post.body && <p className="mt-2 text-[15px] leading-relaxed" style={{ color: P.ink, maxWidth: '68ch' }}>{post.body}</p>}
            <div className="mt-3"><MediaHero post={post} /></div>
            <div className="mt-3 flex items-center gap-2">
              <VotePill post={post} onVote={onVote} />
              <Action icon={<IconComment size={18} />} label={compactScore(total)} ariaLabel="Comments" />
              <Action icon={<IconShare size={18} />} label="Share" ariaLabel="Share" />
              <SaveButton saved={post.saved} onClick={() => onSave(post.id)} />
            </div>
          </article>

          {/* Conversation lead-in */}
          <div className="mt-5 px-4 flex items-baseline justify-between" style={{ borderTop: `1px solid ${P.border}`, paddingTop: 16 }}>
            <h2 className="text-base font-extrabold">Conversation</h2>
            <span className="text-xs font-mono tabular-nums" style={{ color: P.muted }}>{total} replies</span>
          </div>
          <p className="px-4 mt-1 text-[13px] leading-relaxed" style={{ color: P.muted, maxWidth: '64ch' }}>{threadPrompt(post.kind)}</p>

          {/* Connected comment flow */}
          <ul className="px-4 pt-2 pb-44">
            {tree.map(node => <ThreadComment key={node.id} node={node} depth={0} onReply={addReply} onVote={voteComment} />)}
          </ul>
        </div>

        {/* Sticky composer — the standing invitation */}
        <ThreadComposer value={draft} setValue={setDraft}
          onSubmit={() => { if (draft.trim()) { addReply(null, draft.trim()); setDraft('') } }} />
      </div>
    </div>
  )
}

function ThreadComment({ node, depth, onReply, onVote }) {
  const P = usePulse()
  const [collapsed, setCollapsed] = useState(false)
  const [replying, setReplying] = useState(false)
  const [text, setText] = useState('')
  const kids = node.children || []
  const replyCount = countThread(kids)
  const up = node.viewer_vote === 1
  const down = node.viewer_vote === -1
  return (
    <li className="pt-1">
      <div className="flex items-start gap-2.5 pt-2">
        <Avatar name={node.username} size={28} showDot={false} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-bold">{node.username}</span>
            {node.op && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: P.g.softBg, color: P.g.softInk }}>OP</span>}
            <span className="text-[11px]" style={{ color: P.muted }}>· {timeAgo(node.created_at)}</span>
          </div>
          <p className="mt-1 text-[14px] leading-relaxed" style={{ color: P.ink, maxWidth: '64ch' }}>{node.body}</p>

          <div className="mt-1.5 flex items-center gap-1 flex-wrap -ml-1.5">
            <InlineVote up={up} down={down} score={node.score} onUp={() => onVote(node.id, 1)} onDown={() => onVote(node.id, -1)} />
            <button onClick={() => setReplying(r => !r)} aria-expanded={replying}
              className="h-8 px-2.5 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors motion-reduce:transition-none" style={{ color: P.muted }}>
              <IconComment size={15} />Reply
            </button>
            {replyCount > 0 && (
              <button onClick={() => setCollapsed(c => !c)} aria-expanded={!collapsed}
                className="h-8 px-2.5 rounded-full text-[12px] font-semibold transition-colors motion-reduce:transition-none" style={{ color: P.muted }}>
                {collapsed ? `Show ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}` : 'Hide replies'}
              </button>
            )}
          </div>

          {replying && (
            <ReplyInline username={node.username} value={text} setValue={setText}
              onCancel={() => { setReplying(false); setText('') }}
              onSubmit={() => { if (text.trim()) { onReply(node.id, text.trim()); setText(''); setReplying(false); setCollapsed(false) } }} />
          )}

          {!collapsed && kids.length > 0 && (
            <ul className="mt-1 pl-3.5" style={{ borderLeft: `1px solid ${P.border}` }}>
              {kids.map(c => <ThreadComment key={c.id} node={c} depth={depth + 1} onReply={onReply} onVote={onVote} />)}
            </ul>
          )}
        </div>
      </div>
    </li>
  )
}

function InlineVote({ up, down, score, onUp, onDown }) {
  const P = usePulse()
  return (
    <div className="inline-flex items-center">
      <button onClick={onUp} aria-pressed={up} aria-label="Upvote comment"
        className="h-8 w-8 grid place-items-center rounded-full transition-colors motion-reduce:transition-none" style={{ color: up ? P.accentDeep : P.muted }}><IconUp size={16} /></button>
      <span className="text-[12px] font-bold font-mono tabular-nums min-w-[1.6rem] text-center" style={{ color: up ? P.accentDeep : down ? P.negative : P.ink }}>{compactScore(score)}</span>
      <button onClick={onDown} aria-pressed={down} aria-label="Downvote comment"
        className="h-8 w-8 grid place-items-center rounded-full transition-colors motion-reduce:transition-none" style={{ color: down ? P.negative : P.muted }}><IconCaret size={16} /></button>
    </div>
  )
}

function ReplyInline({ username, value, setValue, onSubmit, onCancel }) {
  const P = usePulse()
  const id = `reply-${username}`
  return (
    <div className="mt-2 rounded-2xl p-2.5" style={{ background: P.surfaceAlt, border: `1px solid ${P.border}` }}>
      <label className="sr-only" htmlFor={id}>Reply to {username}</label>
      <textarea id={id} autoFocus rows={2} value={value} onChange={e => setValue(e.target.value)} placeholder={`Reply to ${username}…`}
        className="w-full bg-transparent text-[14px] leading-relaxed outline-none resize-none" style={{ color: P.ink }} />
      <div className="mt-1 flex items-center justify-end gap-2">
        <button onClick={onCancel} className="h-9 px-3 rounded-full text-[12px] font-semibold" style={{ color: P.muted }}>Cancel</button>
        <button onClick={onSubmit} disabled={!value.trim()}
          className="h-9 px-4 rounded-full text-[12px] font-bold disabled:opacity-45 transition-opacity motion-reduce:transition-none"
          style={{ background: P.g.ctaBg, color: P.g.ctaInk }}>Reply</button>
      </div>
    </div>
  )
}

function ThreadComposer({ value, setValue, onSubmit }) {
  const P = usePulse()
  return (
    <div className="relative z-10 shrink-0 px-3 py-2.5" style={{ background: `${P.surface}f5`, backdropFilter: 'blur(10px)', borderTop: `1px solid ${P.border}` }}>
      <form onSubmit={e => { e.preventDefault(); onSubmit() }} className="flex items-center gap-2">
        <label className="sr-only" htmlFor="pulse-thread-comment">Join the conversation</label>
        <input id="pulse-thread-comment" value={value} onChange={e => setValue(e.target.value)} placeholder="Join the conversation…"
          className="flex-1 h-11 px-4 rounded-full text-sm outline-none" style={{ background: P.surfaceAlt, border: `1px solid ${P.border}`, color: P.ink }} />
        <button type="submit" disabled={!value.trim()} aria-label="Post comment"
          className="h-11 px-5 rounded-full text-sm font-bold disabled:opacity-45 transition-opacity motion-reduce:transition-none"
          style={{ background: P.g.ctaBg, color: P.g.ctaInk }}>Comment</button>
      </form>
    </div>
  )
}

function threadPrompt(kind) {
  switch (kind) {
    case 'pr': return 'Ask how they built up to it: programming, technique, recovery, and what finally clicked.'
    case 'study': return 'Challenge the method, add a data point, or ask what variable to check next.'
    case 'workout': return 'Ask about exercise choices, set progression, or how the session actually felt.'
    case 'program': return 'Ask how they ran it, what changed week to week, or where it worked best.'
    case 'template': return 'Ask how to adapt it, when to use it, or what substitutions fit.'
    default: return 'Add your take, share what worked for you, or reply to the strongest point.'
  }
}

/* -------------------------------------------------------------- chrome */

function Avatar({ name, kind, size = 40, showDot = true }) {
  const P = usePulse()
  const meta = KIND_META[kind]
  return (
    <span aria-hidden className="rounded-full grid place-items-center font-extrabold shrink-0 relative"
      style={{ height: size, width: size, fontSize: Math.round(size * 0.34), background: P.surfaceAlt, border: `1px solid ${P.border}`, color: P.accentDeep }}>
      {name[0].toUpperCase()}
      {showDot && meta && <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2" style={{ background: meta.color, borderColor: P.surface }} />}
    </span>
  )
}

function EmptyState({ onReset }) {
  const P = usePulse()
  return (
    <div className="mt-10 text-center px-6 py-12 rounded-3xl" style={{ background: P.surface, border: `1px dashed ${P.borderStrong}` }}>
      <span className="mx-auto h-12 w-12 rounded-2xl grid place-items-center" style={{ background: P.g.softBg, color: P.g.softInk }}><IconBolt size={22} /></span>
      <p className="mt-3 font-bold">Nothing matches that filter</p>
      <p className="mt-1 text-sm" style={{ color: P.muted }}>Try a different type or clear your search.</p>
      <button onClick={onReset} className="mt-4 h-10 px-4 rounded-full text-sm font-bold" style={{ background: P.g.ctaBg, color: P.g.ctaInk }}>Reset filters</button>
    </div>
  )
}

function Composer({ onClose }) {
  const P = usePulse()
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Create post">
      <div className="absolute inset-0" style={{ background: 'rgba(20,28,24,0.45)' }} onClick={onClose} />
      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5" style={{ background: P.surface, boxShadow: '0 -8px 40px rgba(16,24,20,0.2)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">New post</h2>
          <button onClick={onClose} aria-label="Close" className="h-9 w-9 grid place-items-center rounded-full" style={{ color: P.muted, background: P.surfaceAlt }}><IconClose size={18} /></button>
        </div>
        <input placeholder="An interesting title" aria-label="Post title"
          className="mt-4 w-full h-11 px-4 rounded-2xl bg-transparent text-sm outline-none" style={{ border: `1px solid ${P.border}`, color: P.ink }} />
        <textarea placeholder="Share a finding, a session, or a question…" rows={4} aria-label="Post body"
          className="mt-2.5 w-full p-4 rounded-2xl bg-transparent text-sm outline-none resize-none" style={{ border: `1px solid ${P.border}`, color: P.ink }} />
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 h-11 rounded-full text-sm font-bold" style={{ color: P.muted, border: `1px solid ${P.border}` }}>Cancel</button>
          <button onClick={onClose} className="flex-1 h-11 rounded-full text-sm font-extrabold" style={{ background: P.g.ctaBg, color: P.g.ctaInk }}>Publish post</button>
        </div>
      </div>
    </div>
  )
}

function Grain() {
  const noise = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"
  return <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 0, opacity: 0.035, backgroundImage: `url("${noise}")`, backgroundSize: '140px 140px', mixBlendMode: 'multiply' }} />
}

function IconBack({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

/* --------------------------------------------------------------- utils */

const COMMUNITY_BY_KIND = {
  discussion: 'r/Hypertrophy',
  workout: 'r/Training',
  pr: 'r/StrengthWins',
  study: 'r/Research',
  program: 'r/Programs',
  template: 'r/Templates',
}

function newComment(body) {
  return { id: nanoid(), username: 'you', body, score: 1, viewer_vote: 1, op: false, created_at: new Date().toISOString(), children: [] }
}
function clone(nodes) { return nodes.map(n => ({ ...n, children: clone(n.children || []) })) }
function insertReply(nodes, parentId, node) {
  return nodes.map(n => (n.id === parentId
    ? { ...n, children: [...(n.children || []), node] }
    : { ...n, children: insertReply(n.children || [], parentId, node) }))
}
function mapTree(nodes, fn) {
  return nodes.map(n => fn({ ...n, children: mapTree(n.children || [], fn) }))
}

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) }
function barSeries(seed, n) {
  const base = hash(String(seed))
  return Array.from({ length: n }, (_, i) => 8 + ((base >> (i % 12)) % 7) * 3 + ((base * (i + 3)) % 11))
}
