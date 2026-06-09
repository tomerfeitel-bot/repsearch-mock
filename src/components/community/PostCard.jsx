import { useNavigate } from 'react-router-dom'
import { Avatar } from '../ui/Avatar.jsx'
import { timeAgo } from '../../lib/timeAgo.js'
import { SingleResultChart, CompareResultChart } from '../study/ResultsChart.jsx'
import { labelStyle } from '../../lib/bubbleColors.js'

// Kind metadata (DESIGN.md round 6): a post's type is a SOLID colored badge —
// `fill` background + contrasting `on` text — one hue per type, drawn from the
// brand-green-anchored family so the feed is colorful but cohesive. `ink` is the
// vibrant on-dark text value kept for the hero-frame captions. All contrast-safe.
export const KIND_META = {
  discussion: { label: 'Discussion', fill: '#0B7A43', on: '#ffffff', ink: '#34BE73' },
  workout: { label: 'Workout', fill: '#007661', on: '#ffffff', ink: '#44BFA5' },
  program: { label: 'Program', fill: '#2D6DA5', on: '#ffffff', ink: '#5CABF2' },
  template: { label: 'Template', fill: '#7B5AAE', on: '#ffffff', ink: '#B38EF1' },
  study: { label: 'Study', fill: '#AB4477', on: '#ffffff', ink: '#EA7AAE' },
  pr: { label: 'PR', fill: '#B48226', on: '#0c0c0c', ink: '#F2B036' },
}

// A post is "hot" when it has clear traction — used for the heat cue that tells
// a browsing user which threads are worth jumping into.
function isHot(item) {
  return (item.score || 0) >= 100 || (item.comment_count || 0) >= 5
}

const HERO_KINDS = new Set(['workout', 'program', 'template', 'study'])

export default function PostCard({ item, onVote, onToggleSave }) {
  const navigate = useNavigate()
  const meta = KIND_META[item.kind] || KIND_META.discussion
  const hasHero = HERO_KINDS.has(item.kind) && item.attachment
  const hot = isHot(item)
  const replies = item.comment_count || 0
  function open() { navigate(`/post/${item.id}`) }

  // Full-bleed feed item (DESIGN.md): content-first, separated by a hairline, no
  // floating card. Order: meta marker → headline → graph → explanation → byline.
  return (
    <article className="px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
      {/* meta line — type-marker dot + kind + time (the "notifier") */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-micro font-bold uppercase tracking-wide" style={{ background: meta.fill, color: meta.on }}>{meta.label}</span>
        <span className="text-caption font-mono text-[var(--text-muted)]">{timeAgo(item.created_at)}</span>
        {hot && (
          <span className="ml-1 inline-flex items-center gap-1 text-micro font-bold text-[var(--brass)]"><IconFlame size={11} /> Hot</span>
        )}
      </div>

      {/* headline — the loudest element */}
      <button onClick={open} className="mt-1.5 block w-full text-left">
        <Headline item={item} />
      </button>

      {/* graph / attachment hero, full-width with rounded media corners */}
      {hasHero && (
        <button onClick={open} className="mt-3 block w-full text-left">
          <Attachment item={item} />
        </button>
      )}

      {/* explanation — the data payoff under the graph */}
      <Explanation item={item} />

      {/* labels */}
      {item.labels?.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {item.labels.slice(0, 3).map(l => (
            <span key={l} className="inline-flex items-center text-micro font-semibold px-2 py-0.5 rounded-full" style={labelStyle(l)}>{l}</span>
          ))}
        </div>
      )}

      {/* byline + flat actions on one row — no pills, no footer bar */}
      <div className="mt-3.5 flex items-center gap-2.5">
        <button onClick={() => navigate(`/user/${item.username}`)} className="flex min-w-0 items-center gap-2" aria-label={`View ${item.username}`}>
          <Avatar username={item.username} size="sm" />
          <span className="truncate text-caption font-bold text-[var(--text)]">{item.username}</span>
        </button>
        <div className="ml-auto flex items-center gap-1">
          <VotePill score={item.score} vote={item.viewer_vote} onVote={v => onVote(item.id, v)} size="sm" />
          <CountAction icon={<IconComment size={18} />} count={replies} ariaLabel="View comments" onClick={open} />
          <IconAction icon={<IconShare size={18} />} ariaLabel="Share post" onClick={() => sharePost(item.id)} />
          <SaveButton saved={item.saved} onClick={() => onToggleSave(item.id, !item.saved)} flat />
        </div>
      </div>

      {/* standout-reply pull — keeps the "poster for a conversation" hook, flat */}
      {item.top_comment && (
        <button onClick={open} className="mt-2.5 block w-full border-l-2 pl-2.5 text-left" style={{ borderColor: 'var(--border-strong)' }}>
          <p className="text-body text-[var(--text-muted)] line-clamp-2">
            <span className="font-semibold text-[var(--ink-soft)]">{item.top_comment.username}</span> {item.top_comment.body}
          </p>
        </button>
      )}
    </article>
  )
}

// Headline text: the kind marker already states the type, so the headline leads
// with the title/body that entices. Workout/PR carry their text in `body`.
function headlineText(item) {
  if (item.kind === 'workout' || item.kind === 'pr') return item.body || item.title || ''
  return item.title || item.body || ''
}

function Headline({ item }) {
  const text = headlineText(item)
  if (!text) return null
  return <h2 className="text-lead font-extrabold text-[var(--text)] line-clamp-3" style={{ textWrap: 'balance' }}>{text}</h2>
}

// Explanation: the secondary body line below the graph. Suppressed when the body
// was already promoted to the headline (no title) or already shown (workout/pr).
function Explanation({ item }) {
  if (item.kind === 'workout' || item.kind === 'pr') return null
  if (!item.title || !item.body) return null
  return <p className="mt-2 text-read text-[var(--text-muted)] line-clamp-3">{item.body}</p>
}

function CountAction({ icon, count, ariaLabel, onClick }) {
  return (
    <button onClick={onClick} aria-label={ariaLabel}
      className="inline-flex h-9 items-center gap-1 rounded-full px-2 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">
      {icon}{count > 0 && <span className="font-mono tabular-nums">{count}</span>}
    </button>
  )
}

function IconAction({ icon, ariaLabel, onClick }) {
  return (
    <button onClick={onClick} aria-label={ariaLabel}
      className="grid h-9 w-9 place-items-center rounded-full text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">
      {icon}
    </button>
  )
}

export function AvatarWithDot({ username, dot, size = 'md' }) {
  return (
    <span className="relative inline-block">
      <Avatar username={username} size={size} />
      <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white" style={{ background: dot }} />
    </span>
  )
}

// Horizontal vote pill on a dark surface-alt shell with a hairline. Upvote active
// = moss green, downvote active = steel/azure (Dark Jewel semantic pair — no red).
// `size="sm"` is the compact variant used in the feed byline and inline on
// comments so a post and its replies share one vote language. `flat` keeps a
// chrome-less arrows-only variant for the tightest contexts.
export function VotePill({ score, vote, onVote, size = 'md', ariaSuffix = '', flat = false }) {
  const up = vote === 1
  const down = vote === -1
  // Flat variant: bare arrows + score, no pill chrome (moss up / azure down).
  if (flat) {
    return (
      <div className="inline-flex items-center">
        <button onClick={() => onVote(up ? 0 : 1)} aria-pressed={up} aria-label={'Upvote' + ariaSuffix}
          className="grid h-9 w-7 place-items-center transition-colors"
          style={{ color: up ? 'var(--moss-ink)' : 'var(--text-muted)' }}>
          <IconArrow dir="up" size={18} />
        </button>
        <span className="min-w-[1.6rem] text-center text-sm font-bold font-mono tabular-nums"
          style={{ color: up ? 'var(--moss-ink)' : down ? 'var(--azure-ink)' : 'var(--text)' }}>{score}</span>
        <button onClick={() => onVote(down ? 0 : -1)} aria-pressed={down} aria-label={'Downvote' + ariaSuffix}
          className="grid h-9 w-7 place-items-center transition-colors"
          style={{ color: down ? 'var(--azure-ink)' : 'var(--text-muted)' }}>
          <IconArrow dir="down" size={18} />
        </button>
      </div>
    )
  }
  const sm = size === 'sm'
  const box = sm ? 'h-8 w-7' : 'h-9 w-9'
  const icon = sm ? 16 : 18
  const num = sm ? 'text-xs min-w-[1.7rem]' : 'text-sm min-w-[2.2rem]'
  return (
    <div className={'inline-flex items-center rounded-full overflow-hidden border ' + (sm ? 'h-8' : 'h-9')}
      style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}>
      <button onClick={() => onVote(up ? 0 : 1)} aria-pressed={up} aria-label={'Upvote' + ariaSuffix}
        className={box + ' grid place-items-center transition-colors'}
        style={{ color: up ? 'var(--moss-ink)' : 'var(--text-muted)', background: up ? 'var(--moss-soft)' : 'transparent' }}>
        <IconArrow dir="up" size={icon} />
      </button>
      <span className={'font-bold font-mono tabular-nums px-0.5 text-center ' + num}
        style={{ color: up ? 'var(--moss-ink)' : down ? 'var(--azure-ink)' : 'var(--text)' }}>{score}</span>
      <button onClick={() => onVote(down ? 0 : -1)} aria-pressed={down} aria-label={'Downvote' + ariaSuffix}
        className={box + ' grid place-items-center transition-colors'}
        style={{ color: down ? 'var(--azure-ink)' : 'var(--text-muted)', background: down ? 'var(--azure-soft)' : 'transparent' }}>
        <IconArrow dir="down" size={icon} />
      </button>
    </div>
  )
}

export function SaveButton({ saved, onClick, flat = false }) {
  if (flat) {
    return (
      <button onClick={onClick} aria-pressed={saved} aria-label={saved ? 'Unsave' : 'Save'}
        className={'grid h-9 w-9 place-items-center rounded-full transition-colors ' + (saved ? 'text-[var(--brass)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]')}>
        <IconBookmark size={18} filled={saved} />
      </button>
    )
  }
  return (
    <button onClick={onClick} aria-pressed={saved} aria-label={saved ? 'Unsave' : 'Save'}
      className={'ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-semibold transition-colors ' + (saved ? 'text-amber-800 bg-amber-100' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/10')}>
      <IconBookmark size={17} filled={saved} /><span>{saved ? 'Saved' : 'Save'}</span>
    </button>
  )
}

function sharePost(id) {
  const url = `${window.location.origin}${import.meta.env.BASE_URL}post/${id}`.replace(/([^:]\/)\/+/g, '$1')
  if (navigator.share) { navigator.share({ url }).catch(() => {}); return }
  navigator.clipboard?.writeText(url).catch(() => {})
}

// Attachments rendered inside a Pulse "hero frame": rounded, lifted off the card surface.
function Attachment({ item }) {
  const a = item.attachment
  if (!a) return null
  if (item.kind === 'workout') {
    return (
      <HeroFrame>
        <div className="flex items-baseline gap-2">
          <span className="font-mono tabular-nums font-extrabold text-[var(--text)] text-3xl">{a.duration_min ?? '-'}</span>
          <span className="text-sm font-semibold text-[var(--text-muted)]">min</span>
          <span className="ml-auto text-caption font-semibold" style={{ color: KIND_META.workout.ink }}>{a.exercise_count || 0} exercises · {a.set_count || 0} sets</span>
        </div>
      </HeroFrame>
    )
  }
  if (item.kind === 'program') {
    return (
      <HeroFrame>
        <div className="font-bold text-[var(--text)] truncate">{a.name}</div>
        <div className="mt-1 text-caption font-semibold" style={{ color: KIND_META.program.ink }}>{a.enrollment_count || 0} started · open-ended</div>
      </HeroFrame>
    )
  }
  if (item.kind === 'template') {
    return (
      <HeroFrame>
        <div className="font-bold text-[var(--text)] truncate">{a.name}</div>
        <div className="mt-1 text-caption font-semibold" style={{ color: KIND_META.template.ink }}>{a.exercise_count || 0} exercises · used {a.usage_count || 0}x</div>
      </HeroFrame>
    )
  }
  if (item.kind === 'study') return <StudyAttachment a={a} compact />
  return null
}

export function HeroFrame({ children }) {
  // Inline color-mix rather than a Tailwind `/80` opacity modifier: Tailwind
  // can't inject alpha into an arbitrary var() color, so `bg-[var(--x)]/80`
  // silently renders transparent. color-mix keeps the soft 80% surface fill.
  return (
    <div className="rounded-2xl border border-[var(--border)] p-3.5" style={{ background: 'color-mix(in srgb, var(--surface-alt) 80%, transparent)' }}>
      {children}
    </div>
  )
}

export function StudyAttachment({ a, compact = false }) {
  if (!a) return null
  if (a.error) {
    return <div className="rounded-2xl bg-gray-950/60 border border-gray-800 p-3 text-xs text-gray-500">{a.error}</div>
  }
  if (compact) return <CompactStudyPreview a={a} />
  return (
    <div className="rounded-2xl p-3 overflow-hidden" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
      <div className="mb-2 flex items-center justify-between text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
        <span>{a.mode === 'compare' ? 'cohort comparison' : `n=${a.totalCohortSize || 0}`}</span>
        <span className="min-w-0 truncate text-right">{a.measure}</span>
      </div>
      <div className="min-w-0 min-h-[260px]">
        {a.mode === 'compare' ? (
          <CompareResultChart cohortA={a.cohortA} cohortB={a.cohortB} measure={a.measure} groupBy={a.groupBy} />
        ) : (
          <SingleResultChart buckets={a.buckets || []} measure={a.measure} groupBy={a.groupBy} totalCohortSize={a.totalCohortSize || 0} />
        )}
      </div>
    </div>
  )
}

function CompactStudyPreview({ a }) {
  const rows = a.mode === 'compare'
    ? [
        { label: a.cohortA?.label || 'A', n: a.cohortA?.totalCohortSize || 0, value: avgOf(a.cohortA?.buckets) },
        { label: a.cohortB?.label || 'B', n: a.cohortB?.totalCohortSize || 0, value: avgOf(a.cohortB?.buckets) },
      ]
    : (a.buckets || []).slice(0, 4).map(b => ({ label: b.label, n: b.n, value: b.avg_measure }))
  const max = Math.max(...rows.map(r => Math.abs(r.value || 0)), 0.001)
  return (
    <div className="rounded-2xl p-3" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
        <span>{a.mode === 'compare' ? 'comparison' : `n=${a.totalCohortSize || 0}`}</span>
        <span>{a.measure}</span>
      </div>
      <div className="mt-3 space-y-2">
        {rows.map(r => (
          <div key={r.label} className="grid grid-cols-[72px_1fr_42px] items-center gap-2 text-[11px] font-mono">
            <span className="truncate" style={{ color: 'var(--text)' }}>{prettyStudyLabel(r.label)}</span>
            <span className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface)' }}>
              <span className="block h-full rounded-full" style={{ width: `${Math.max(8, Math.round((Math.abs(r.value || 0) / max) * 100))}%`, background: '#6fcab8' }} />
            </span>
            <span className="text-right" style={{ color: 'var(--text-muted)' }}>n={r.n}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function avgOf(buckets = []) {
  if (!buckets.length) return 0
  return buckets.reduce((sum, b) => sum + (b.avg_measure || 0), 0) / buckets.length
}

function prettyStudyLabel(label = '') {
  return String(label).replaceAll('_', ' ')
}

/* ---- icons ---- */

export function IconArrow({ dir = 'up', size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ transform: dir === 'down' ? 'rotate(180deg)' : 'none' }}>
      <polyline points="6 14 12 8 18 14" />
    </svg>
  )
}

export function IconFlame({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2c1 3-1 4.5-2.5 6.2C8 10 7 11.6 7 13.5a5 5 0 0 0 10 0c0-2-1-3.7-2.3-5.2.5 1.4.1 2.6-.7 3.2.2-2.2-1-4.3-2-5.5C11.6 4.7 12.3 3.3 12 2z" />
    </svg>
  )
}

export function IconComment({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 1 1 17 0z" />
    </svg>
  )
}

export function IconShare({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
    </svg>
  )
}

export function IconBookmark({ size = 18, filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}
