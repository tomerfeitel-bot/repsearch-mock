import { useNavigate } from 'react-router-dom'
import { Avatar } from '../ui/Avatar.jsx'
import { timeAgo } from '../../lib/timeAgo.js'
import { SingleResultChart, CompareResultChart } from '../study/ResultsChart.jsx'

// Kind metadata: a colored status dot for the avatar + a soft badge pill. Colors
// are drawn from the Rubber Brass token family (graphite / brass / sage and the
// retuned semantic hexes) so the badges read as one palette instead of reaching
// for stock Tailwind jewel tones. `dot` and the pill text share a hue; the pill
// background is a soft same-hue tint. Discussion — the conversation type — gets
// the warm brass signature accent rather than the most ignorable gray. PR — the
// celebration type — takes the warm energetic action accent.
//
// `accent` + `wash` carry the color onto the post's content surfaces (the
// HeroFrame edge + fill, the ConversationBar strip), so each post reads with its
// own color — the chrome stays neutral, the content comes alive.
export const KIND_META = {
  discussion: { label: 'Discussion', dot: '#a77b3f', text: '#7a5a2c', tint: 'var(--brass-soft)', accent: '#a77b3f', wash: 'rgba(167,123,63,0.12)' },
  workout: { label: 'Workout', dot: '#2f6e4a', text: '#2f6e4a', tint: 'rgba(47,110,74,0.12)', accent: '#2f6e4a', wash: 'rgba(47,110,74,0.10)' },
  program: { label: 'Program', dot: '#6f655a', text: '#5f564c', tint: 'var(--accent-soft)', accent: '#6f655a', wash: 'rgba(111,101,90,0.10)' },
  template: { label: 'Template', dot: '#2b6a86', text: '#2b6a86', tint: 'rgba(43,106,134,0.12)', accent: '#2b6a86', wash: 'rgba(43,106,134,0.10)' },
  study: { label: 'Study', dot: '#46624b', text: '#46624b', tint: 'rgba(124,169,130,0.18)', accent: '#46624b', wash: 'rgba(124,169,130,0.14)' },
  pr: { label: 'PR', dot: '#c2410c', text: '#a8380a', tint: 'rgba(194,65,12,0.12)', accent: '#c2410c', wash: 'rgba(194,65,12,0.10)' },
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

  function open() { navigate(`/post/${item.id}`) }

  const hot = isHot(item)

  return (
    <div className="mb-3.5 rounded-3xl overflow-hidden bg-white/75 border border-[var(--border)] shadow-[0_1px_2px_rgba(21,24,23,0.08),0_18px_34px_-28px_rgba(21,24,23,0.42)] backdrop-blur-sm">
      <div className="p-4 pb-0">
        <PostHeader item={item} meta={meta} navigate={navigate} />

        <button onClick={open} className="mt-3 block w-full text-left">
          <PostLead item={item} />
        </button>

        {(hot || item.labels?.length > 0) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {hot && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brass-soft)] px-2 py-0.5 text-micro font-bold text-[var(--brass)]">
                <IconFlame size={11} /> Hot
              </span>
            )}
            {item.labels?.slice(0, 3).map(l => (
              <span key={l} className="text-micro text-[var(--text-muted)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-full">{l}</span>
            ))}
          </div>
        )}
      </div>

      {hasHero && (
        <button onClick={open} className="block w-full px-4 pt-3 text-left">
          <Attachment item={item} />
        </button>
      )}

      <div className="px-4 pt-3">
        <ConversationBar item={item} onOpen={open} meta={meta} />
      </div>

      <div className="p-3 pt-3 flex items-center gap-1.5">
        <VotePill score={item.score} vote={item.viewer_vote} onVote={v => onVote(item.id, v)} />
        <Action icon={<IconShare size={18} />} label="Share" ariaLabel="Share post" onClick={() => sharePost(item.id)} />
        <SaveButton saved={item.saved} onClick={() => onToggleSave(item.id, !item.saved)} />
      </div>
    </div>
  )
}

// The card's primary call to action: a tappable strip that makes the
// conversation the loudest engagement signal on the card. Shows a labeled reply
// count + last-activity time (or an invitation to start, when empty) and — for
// posts with a standout reply — a one-line preview to pull the reader in.
function ConversationBar({ item, onOpen, meta }) {
  const replies = item.comment_count || 0
  const activity = item.last_activity_at || item.created_at
  const empty = replies === 0
  const emptyPrompt = item.kind === 'discussion' ? 'Start the discussion' : 'Be the first to comment'
  // Use the AA-tuned `text` hue (not the vivid `accent`) for the on-tint label —
  // the lightest kinds (discussion brass, pr orange) only clear 4.5:1 when darkened.
  const accent = meta?.text || 'var(--brass)'
  return (
    <button
      onClick={onOpen}
      aria-label="Open thread"
      className="block w-full text-left rounded-2xl px-3.5 py-2.5 transition-colors"
      style={{ background: meta?.tint || 'var(--accent-soft)' }}
    >
      <div className="flex items-center gap-2 text-[var(--ink-soft)]">
        <IconComment size={16} />
        <span className="text-sm font-bold text-[var(--text)]">
          {empty ? emptyPrompt : `${replies} ${replies === 1 ? 'reply' : 'replies'}`}
        </span>
        {!empty && (
          <span className="text-caption text-[var(--text-muted)] truncate">· active {timeAgo(activity)}</span>
        )}
        <span className="ml-auto shrink-0 text-caption font-bold" style={{ color: accent }}>{empty ? 'Reply →' : 'Join thread →'}</span>
      </div>
      {item.top_comment && (
        <div className="mt-2 border-l-2 border-[var(--border-strong)] pl-2.5">
          <p className="text-body text-[var(--text-muted)] line-clamp-2">
            <span className="font-semibold text-[var(--ink-soft)]">{item.top_comment.username}</span>{' '}
            {item.top_comment.body}
          </p>
        </div>
      )}
    </button>
  )
}

function PostHeader({ item, meta, navigate }) {
  return (
    <div className="flex items-center gap-2.5">
      <button onClick={() => navigate(`/user/${item.username}`)} className="shrink-0" aria-label={`View ${item.username}`}>
        <AvatarWithDot username={item.username} dot={meta.dot} />
      </button>
      <button onClick={() => navigate(`/user/${item.username}`)} className="min-w-0 flex-1 text-left">
        <div className="text-sm font-bold leading-tight truncate text-[var(--text)]">{item.username}</div>
        <div className="text-caption truncate text-[var(--text-muted)] font-mono">{timeAgo(item.created_at)}</div>
      </button>
      <span className="inline-flex items-center h-6 px-2.5 rounded-full text-micro font-bold shrink-0" style={{ color: meta.text, background: meta.tint }}>{meta.label}</span>
    </div>
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

// Horizontal vote pill: upvote glows warm (the energetic action accent),
// downvote stays neutral graphite so the two read as distinct, not two warms.
// `size="sm"` is the compact variant used inline on comments so the post and its
// replies share one vote language instead of two.
export function VotePill({ score, vote, onVote, size = 'md', ariaSuffix = '' }) {
  const up = vote === 1
  const down = vote === -1
  const sm = size === 'sm'
  const box = sm ? 'h-8 w-8' : 'h-9 w-9'
  const icon = sm ? 16 : 18
  const num = sm ? 'text-xs min-w-[1.8rem]' : 'text-sm min-w-[2.2rem]'
  return (
    <div className={'inline-flex items-center rounded-full overflow-hidden border ' + (sm ? 'h-8 ' : 'h-9 ') + (up ? 'bg-orange-100 border-orange-300' : 'bg-white/70 border-[var(--border)]')}>
      <button onClick={() => onVote(up ? 0 : 1)} aria-pressed={up} aria-label={'Upvote' + ariaSuffix}
        className={box + ' grid place-items-center transition-colors ' + (up ? 'text-orange-700' : 'text-[var(--text-muted)] hover:text-[var(--text)]')}>
        <IconArrow dir="up" size={icon} />
      </button>
      <span className={'font-bold font-mono tabular-nums px-0.5 text-center ' + num + ' ' + (up ? 'text-orange-700' : down ? 'text-[var(--text)]' : 'text-[var(--text)]')}>{score}</span>
      <button onClick={() => onVote(down ? 0 : -1)} aria-pressed={down} aria-label={'Downvote' + ariaSuffix}
        className={box + ' grid place-items-center transition-colors ' + (down ? 'text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]')}>
        <IconArrow dir="down" size={icon} />
      </button>
    </div>
  )
}

function Action({ icon, label, ariaLabel, onClick }) {
  return (
    <button onClick={onClick} aria-label={ariaLabel}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/60 transition-colors">
      {icon}<span>{label}</span>
    </button>
  )
}

export function SaveButton({ saved, onClick }) {
  return (
    <button onClick={onClick} aria-pressed={saved} aria-label={saved ? 'Unsave' : 'Save'}
      className={'ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-semibold transition-colors ' + (saved ? 'text-amber-800 bg-amber-100' : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/60')}>
      <IconBookmark size={17} filled={saved} /><span>{saved ? 'Saved' : 'Save'}</span>
    </button>
  )
}

function sharePost(id) {
  const url = `${window.location.origin}${import.meta.env.BASE_URL}post/${id}`.replace(/([^:]\/)\/+/g, '$1')
  if (navigator.share) { navigator.share({ url }).catch(() => {}); return }
  navigator.clipboard?.writeText(url).catch(() => {})
}

// The hook line. The kind is already stated once by the header pill, so the lead
// no longer repeats it ("Achievement" / "Workout shared") — it leads straight
// with the title/body that actually entices a reader.
function PostLead({ item }) {
  const title = item.title || (item.kind === 'pr' ? item.body : '')
  if (item.kind === 'workout') {
    if (!item.body) return null
    return <div className="text-title font-bold text-[var(--text)] line-clamp-2" style={{ textWrap: 'balance' }}>{item.body}</div>
  }
  return (
    <div>
      {title && <div className="text-title font-bold text-[var(--text)] line-clamp-2" style={{ textWrap: 'balance' }}>{title}</div>}
      {item.kind !== 'pr' && item.body && <div className={'text-body text-[var(--text-muted)] line-clamp-3' + (title ? ' mt-1.5' : '')}>{item.body}</div>}
    </div>
  )
}

// Attachments rendered inside a Pulse "hero frame": rounded, lifted off the card surface.
function Attachment({ item }) {
  const a = item.attachment
  if (!a) return null
  const meta = KIND_META[item.kind] || KIND_META.discussion
  if (item.kind === 'workout') {
    return (
      <HeroFrame accent={meta.accent} wash={meta.wash}>
        <div className="flex items-baseline gap-2">
          <span className="font-mono tabular-nums font-extrabold text-[var(--text)] text-3xl">{a.duration_min ?? '-'}</span>
          <span className="text-sm font-semibold text-[var(--text-muted)]">min</span>
          <span className="ml-auto text-caption" style={{ color: meta.accent }}>{a.exercise_count || 0} exercises · {a.set_count || 0} sets</span>
        </div>
      </HeroFrame>
    )
  }
  if (item.kind === 'program') {
    return (
      <HeroFrame accent={meta.accent} wash={meta.wash}>
        <div className="font-bold text-[var(--text)] truncate">{a.name}</div>
        <div className="mt-1 text-caption" style={{ color: meta.accent }}>{a.enrollment_count || 0} started · open-ended</div>
      </HeroFrame>
    )
  }
  if (item.kind === 'template') {
    return (
      <HeroFrame accent={meta.accent} wash={meta.wash}>
        <div className="font-bold text-[var(--text)] truncate">{a.name}</div>
        <div className="mt-1 text-caption" style={{ color: meta.accent }}>{a.exercise_count || 0} exercises · used {a.usage_count || 0}x</div>
      </HeroFrame>
    )
  }
  if (item.kind === 'study') return <StudyAttachment a={a} compact />
  return null
}

// The "hero frame" lifts a post's attachment off the card and gives it the post
// kind's own color: a soft same-hue `wash` fill + a solid `accent` left edge.
// Falls back to the neutral surface tint when no kind color is supplied.
export function HeroFrame({ children, accent, wash }) {
  // Inline color-mix rather than a Tailwind `/80` opacity modifier: Tailwind
  // can't inject alpha into an arbitrary var() color, so `bg-[var(--x)]/80`
  // silently renders transparent. color-mix keeps the soft 80% surface fill.
  return (
    <div
      className="rounded-2xl border border-[var(--border)] p-3.5"
      style={{
        background: wash || 'color-mix(in srgb, var(--surface-alt) 80%, transparent)',
        borderLeftColor: accent || undefined,
        borderLeftWidth: accent ? '3px' : undefined,
      }}
    >
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
    <div className="rounded-2xl p-3 overflow-hidden" style={{ background: '#0d1117', border: '1px solid #263527' }}>
      <div className="mb-2 flex items-center justify-between text-[11px] font-mono" style={{ color: '#9db49f' }}>
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
    <div className="rounded-2xl p-3" style={{ background: '#0d1117', border: '1px solid #263527' }}>
      <div className="flex items-center justify-between text-[11px] font-mono" style={{ color: '#9db49f' }}>
        <span>{a.mode === 'compare' ? 'comparison' : `n=${a.totalCohortSize || 0}`}</span>
        <span>{a.measure}</span>
      </div>
      <div className="mt-3 space-y-2">
        {rows.map(r => (
          <div key={r.label} className="grid grid-cols-[72px_1fr_42px] items-center gap-2 text-[11px] font-mono">
            <span className="truncate" style={{ color: '#b8c9ba' }}>{prettyStudyLabel(r.label)}</span>
            <span className="h-2 overflow-hidden rounded-full bg-gray-900">
              <span className="block h-full rounded-full bg-[#7CA982]" style={{ width: `${Math.max(8, Math.round((Math.abs(r.value || 0) / max) * 100))}%` }} />
            </span>
            <span className="text-right" style={{ color: '#9db49f' }}>n={r.n}</span>
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
