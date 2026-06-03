import { useNavigate } from 'react-router-dom'
import { Avatar } from '../ui/Avatar.jsx'
import { timeAgo } from '../../lib/timeAgo.js'
import { SingleResultChart, CompareResultChart } from '../study/ResultsChart.jsx'

// Pulse-style kind metadata: a colored status dot for the avatar + a soft badge pill.
// Pills/dots use the retuned `-300` accent shades (tuned to read on the light surface)
// plus a soft same-hue tint behind them.
const KIND_META = {
  discussion: { label: 'Discussion', dot: '#8a948c', pill: 'text-gray-200 bg-gray-700/50' },
  workout: { label: 'Workout', dot: '#2f6e4a', pill: 'text-emerald-300 bg-emerald-600/15' },
  program: { label: 'Program', dot: '#454c47', pill: 'text-indigo-300 bg-indigo-600/12' },
  template: { label: 'Template', dot: '#2b6a86', pill: 'text-sky-300 bg-sky-600/15' },
  study: { label: 'Study', dot: '#7CA982', pill: 'text-[#46624b] bg-[rgba(124,169,130,0.18)]' },
  pr: { label: 'PR', dot: '#8a6010', pill: 'text-amber-300 bg-amber-600/15' },
}

const HERO_KINDS = new Set(['workout', 'program', 'template', 'study'])

export default function PostCard({ item, onVote, onToggleSave }) {
  const navigate = useNavigate()
  const meta = KIND_META[item.kind] || KIND_META.discussion
  const hasHero = HERO_KINDS.has(item.kind) && item.attachment

  function open() { navigate(`/post/${item.id}`) }

  return (
    <div className="mb-3.5 rounded-3xl overflow-hidden bg-gray-900 border border-gray-800 shadow-[0_1px_2px_rgba(0,0,0,0.3),0_14px_26px_-16px_rgba(0,0,0,0.55)]">
      <div className="p-4 pb-0">
        <PostHeader item={item} meta={meta} navigate={navigate} />

        <button onClick={open} className="mt-3 block w-full text-left">
          <PostLead item={item} />
        </button>

        {item.labels?.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {item.labels.slice(0, 3).map(l => (
              <span key={l} className="text-[10px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">{l}</span>
            ))}
          </div>
        )}
      </div>

      {hasHero && (
        <button onClick={open} className="block w-full px-4 pt-3 text-left">
          <Attachment item={item} />
        </button>
      )}

      <div className="p-3 pt-3.5 flex items-center gap-1.5">
        <VotePill score={item.score} vote={item.viewer_vote} onVote={v => onVote(item.id, v)} />
        <Action icon={<IconComment size={18} />} label={item.comment_count} ariaLabel="Open thread" onClick={open} />
        <Action icon={<IconShare size={18} />} label="Share" ariaLabel="Share post" onClick={() => sharePost(item.id)} />
        <SaveButton saved={item.saved} onClick={() => onToggleSave(item.id, !item.saved)} />
      </div>
    </div>
  )
}

function PostHeader({ item, meta, navigate }) {
  return (
    <div className="flex items-center gap-2.5">
      <button onClick={() => navigate(`/user/${item.username}`)} className="shrink-0" aria-label={`View ${item.username}`}>
        <AvatarWithDot username={item.username} dot={meta.dot} />
      </button>
      <button onClick={() => navigate(`/user/${item.username}`)} className="min-w-0 flex-1 text-left">
        <div className="text-sm font-bold leading-tight truncate text-gray-100">{item.username}</div>
        <div className="text-xs truncate text-gray-500 font-mono">{timeAgo(item.created_at)}</div>
      </button>
      <span className={'inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-bold shrink-0 ' + meta.pill}>{meta.label}</span>
    </div>
  )
}

export function AvatarWithDot({ username, dot, size = 'md' }) {
  return (
    <span className="relative inline-block">
      <Avatar username={username} size={size} />
      <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-gray-900" style={{ background: dot }} />
    </span>
  )
}

// Horizontal vote pill — upvote glows orange, downvote indigo, matching the app's accents.
export function VotePill({ score, vote, onVote }) {
  const up = vote === 1
  const down = vote === -1
  return (
    <div className={'inline-flex items-center h-9 rounded-full overflow-hidden border ' + (up ? 'bg-orange-500/15 border-orange-500/40' : 'bg-gray-800 border-gray-700')}>
      <button onClick={() => onVote(up ? 0 : 1)} aria-pressed={up} aria-label="Upvote"
        className={'h-9 w-9 grid place-items-center transition-colors ' + (up ? 'text-orange-400' : 'text-gray-400 hover:text-gray-200')}>
        <IconArrow dir="up" size={18} />
      </button>
      <span className={'text-sm font-bold font-mono tabular-nums px-0.5 min-w-[2.2rem] text-center ' + (up ? 'text-orange-400' : down ? 'text-indigo-400' : 'text-gray-100')}>{score}</span>
      <button onClick={() => onVote(down ? 0 : -1)} aria-pressed={down} aria-label="Downvote"
        className={'h-9 w-9 grid place-items-center transition-colors ' + (down ? 'text-indigo-400' : 'text-gray-400 hover:text-gray-200')}>
        <IconArrow dir="down" size={18} />
      </button>
    </div>
  )
}

function Action({ icon, label, ariaLabel, onClick }) {
  return (
    <button onClick={onClick} aria-label={ariaLabel}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-semibold text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 transition-colors">
      {icon}<span className="font-mono tabular-nums">{label}</span>
    </button>
  )
}

function SaveButton({ saved, onClick }) {
  return (
    <button onClick={onClick} aria-pressed={saved} aria-label={saved ? 'Unsave' : 'Save'}
      className={'ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-semibold transition-colors ' + (saved ? 'text-amber-300 bg-amber-600/20' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60')}>
      <IconBookmark size={17} filled={saved} /><span>{saved ? 'Saved' : 'Save'}</span>
    </button>
  )
}

function sharePost(id) {
  const url = `${window.location.origin}${import.meta.env.BASE_URL}post/${id}`.replace(/([^:]\/)\/+/g, '$1')
  if (navigator.share) { navigator.share({ url }).catch(() => {}); return }
  navigator.clipboard?.writeText(url).catch(() => {})
}

function PostLead({ item }) {
  const title = item.title || (item.kind === 'pr' ? item.body : '')
  if (item.kind === 'workout') {
    return (
      <div>
        <div className="text-xs font-medium text-emerald-300">{item.attachment?.workout_day || 'Workout shared'}</div>
        {item.body && <div className="mt-1 text-[17px] font-bold leading-snug text-gray-100 line-clamp-2" style={{ textWrap: 'balance' }}>{item.body}</div>}
      </div>
    )
  }
  if (item.kind === 'pr') {
    return (
      <div>
        <div className="text-xs font-semibold text-amber-300">Achievement</div>
        {title && <div className="mt-1 text-[17px] font-bold text-gray-100 leading-snug line-clamp-2" style={{ textWrap: 'balance' }}>{title}</div>}
      </div>
    )
  }
  return (
    <div>
      {title && <div className="text-[17px] font-bold text-gray-100 leading-snug line-clamp-2" style={{ textWrap: 'balance' }}>{title}</div>}
      {item.body && <div className={'text-sm text-gray-400 leading-relaxed line-clamp-3' + (title ? ' mt-1.5' : '')}>{item.body}</div>}
    </div>
  )
}

// Attachments rendered inside a Pulse "hero frame": rounded, lifted off the card surface.
function Attachment({ item }) {
  const a = item.attachment
  if (!a) return null
  if (item.kind === 'workout') {
    return (
      <HeroFrame>
        <div className="flex items-baseline gap-2">
          <span className="font-mono tabular-nums font-extrabold text-gray-100 text-3xl">{a.duration_min ?? '-'}</span>
          <span className="text-sm font-semibold text-gray-500">min</span>
          <span className="ml-auto text-xs text-emerald-300">{a.exercise_count || 0} exercises · {a.set_count || 0} sets</span>
        </div>
      </HeroFrame>
    )
  }
  if (item.kind === 'program') {
    return (
      <HeroFrame>
        <div className="text-xs font-semibold text-gray-500">Program</div>
        <div className="font-bold text-gray-100 truncate">{a.name}</div>
        <div className="mt-1 text-xs text-indigo-300">{a.enrollment_count || 0} started · open-ended</div>
      </HeroFrame>
    )
  }
  if (item.kind === 'template') {
    return (
      <HeroFrame>
        <div className="text-xs font-semibold text-gray-500">Template</div>
        <div className="font-bold text-gray-100 truncate">{a.name}</div>
        <div className="mt-1 text-xs text-sky-300">{a.exercise_count || 0} exercises · used {a.usage_count || 0}x</div>
      </HeroFrame>
    )
  }
  if (item.kind === 'study') return <StudyAttachment a={a} compact />
  return null
}

function HeroFrame({ children }) {
  return (
    <div className="rounded-2xl bg-gray-950/60 border border-gray-800 p-3.5">
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
