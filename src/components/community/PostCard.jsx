import { useNavigate } from 'react-router-dom'
import { Avatar } from '../ui/Avatar.jsx'
import { timeAgo } from '../../lib/timeAgo.js'
import { SingleResultChart, CompareResultChart } from '../study/ResultsChart.jsx'

const KIND_BADGE = {
  discussion: { label: 'Discussion', cls: 'text-gray-100 bg-gray-700/60', card: 'bg-gray-900 border-gray-800' },
  workout: { label: 'Workout', cls: 'text-emerald-100 bg-emerald-600/25', card: 'bg-[#101a18] border-emerald-900/70' },
  program: { label: 'Program', cls: 'text-indigo-100 bg-indigo-600/25', card: 'bg-[#111426] border-indigo-900/70' },
  template: { label: 'Template', cls: 'text-sky-100 bg-sky-600/25', card: 'bg-[#0f1824] border-sky-900/70' },
  study: { label: 'Study', cls: 'text-[#d9f3dc] bg-[rgba(124,169,130,0.22)]', card: 'bg-[#101510] border-[#263527]' },
  pr: { label: 'PR', cls: 'text-amber-100 bg-amber-600/25', card: 'bg-[#1d1710] border-amber-900/70' },
}

export default function PostCard({ item, onVote, onToggleSave }) {
  const navigate = useNavigate()
  const badge = KIND_BADGE[item.kind] || KIND_BADGE.discussion
  const saveClass = item.saved
    ? 'text-amber-100 bg-amber-600/25'
    : 'text-gray-400 hover:text-gray-200'

  function open() { navigate(`/post/${item.id}`) }

  return (
    <div className={'border rounded-2xl mb-3 overflow-hidden shadow-[0_1px_0_rgba(255,255,255,0.03)] ' + badge.card}>
      <div className="flex">
        <VoteRail score={item.score} vote={item.viewer_vote} onVote={v => onVote(item.id, v)} />
        <div className="min-w-0 flex-1 p-3 pl-1.5">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className={'shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ' + badge.cls}>{badge.label}</span>
            {item.labels?.slice(0, 2).map(l => (
              <span key={l} className="min-w-0 truncate text-[10px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">{l}</span>
            ))}
            <span className="ml-auto shrink-0 text-[11px] text-gray-500 font-mono">{timeAgo(item.created_at)}</span>
          </div>

          <button onClick={open} className="block w-full text-left mt-2">
            <PostLead item={item} />
            <Attachment item={item} />
          </button>

          <div className="mt-3 flex items-center gap-2 text-gray-500">
            <button onClick={() => navigate(`/user/${item.username}`)} className="flex flex-1 items-center gap-1.5 min-w-0">
              <Avatar username={item.username} size="sm" />
              <span className="text-xs text-gray-400 truncate">{item.username}</span>
            </button>
            <button onClick={open} className="shrink-0 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200">
              <span className="font-mono">{item.comment_count}</span> replies
            </button>
            <button
              onClick={() => onToggleSave(item.id, !item.saved)}
              className={'shrink-0 text-xs px-2 py-1 rounded-md ' + saveClass}
            >
              {item.saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function VoteRail({ score, vote, onVote, vertical = true }) {
  return (
    <div className={vertical ? 'flex flex-col items-center pt-3 px-2 gap-0.5' : 'flex items-center gap-1'}>
      <button
        onClick={() => onVote(vote === 1 ? 0 : 1)}
        className={'leading-none text-lg ' + (vote === 1 ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300')}
        aria-label="Upvote"
      >▲</button>
      <span className={'text-xs font-mono tabular-nums ' + (vote === 1 ? 'text-orange-400' : vote === -1 ? 'text-indigo-400' : 'text-gray-400')}>{score}</span>
      <button
        onClick={() => onVote(vote === -1 ? 0 : -1)}
        className={'leading-none text-lg ' + (vote === -1 ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300')}
        aria-label="Downvote"
      >▼</button>
    </div>
  )
}

function PostLead({ item }) {
  const title = item.title || (item.kind === 'pr' ? item.body : '')
  if (item.kind === 'workout') {
    return (
      <div>
        <div className="text-xs font-medium text-emerald-200">{item.attachment?.workout_day || 'Workout shared'}</div>
        {item.body && <div className="mt-1 text-base font-semibold leading-snug text-white line-clamp-2">{item.body}</div>}
      </div>
    )
  }
  if (item.kind === 'study') {
    return (
      <div>
        {title && <div className="font-semibold text-[#edf8ef] leading-snug line-clamp-2">{title}</div>}
        {item.body && <div className="mt-1 text-sm text-[#b8c9ba] leading-relaxed line-clamp-2">{item.body}</div>}
      </div>
    )
  }
  if (item.kind === 'program' || item.kind === 'template') {
    return (
      <div>
        {title && <div className="font-semibold text-white leading-snug line-clamp-2">{title}</div>}
        {item.body && <div className="mt-1 text-sm text-gray-300 leading-relaxed line-clamp-2">{item.body}</div>}
      </div>
    )
  }
  if (item.kind === 'pr') {
    return (
      <div>
        <div className="text-xs font-semibold text-amber-200">Achievement</div>
        {title && <div className="mt-1 text-lg font-bold text-white leading-snug line-clamp-2">{title}</div>}
      </div>
    )
  }
  return (
    <div>
      {title && <div className="font-semibold text-white leading-snug line-clamp-2">{title}</div>}
      {item.body && <div className="mt-1 text-sm text-gray-300 leading-relaxed line-clamp-3">{item.body}</div>}
    </div>
  )
}

function Attachment({ item }) {
  const a = item.attachment
  if (!a) return null
  if (item.kind === 'workout') {
    return (
      <div className="mt-3 rounded-xl bg-gray-950/70 border border-emerald-900/70 p-3 flex items-baseline gap-2">
        <span className="font-mono tabular-nums font-bold text-white text-2xl">{a.duration_min ?? '-'}</span>
        <span className="text-xs text-gray-500">min</span>
        <span className="ml-auto text-xs text-emerald-100/80">
          {a.exercise_count || 0} exercises, {a.set_count || 0} sets
        </span>
      </div>
    )
  }
  if (item.kind === 'program') {
    return (
      <div className="mt-3 rounded-xl bg-gray-950/70 border border-indigo-900/70 p-3">
        <div className="font-semibold text-white truncate">{a.name}</div>
        <div className="mt-1 text-xs text-indigo-100/75">{a.enrollment_count || 0} started, open-ended</div>
      </div>
    )
  }
  if (item.kind === 'template') {
    return (
      <div className="mt-3 rounded-xl bg-gray-950/70 border border-sky-900/70 p-3">
        <div className="font-semibold text-white truncate">{a.name}</div>
        <div className="mt-1 text-xs text-sky-100/75">{a.exercise_count || 0} exercises, used {a.usage_count || 0}x</div>
      </div>
    )
  }
  if (item.kind === 'study') return <StudyAttachment a={a} compact />
  return null
}

export function StudyAttachment({ a, compact = false }) {
  if (!a) return null
  if (a.error) {
    return <div className="mt-3 rounded-xl bg-gray-950 border border-gray-800 p-3 text-xs text-gray-500">{a.error}</div>
  }
  if (compact) return <CompactStudyPreview a={a} />
  return (
    <div className="mt-3 rounded-xl p-3 overflow-hidden" style={{ background: '#0d1117', border: '1px solid #263527' }}>
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
    <div className="mt-3 rounded-xl p-3" style={{ background: '#0d1117', border: '1px solid #263527' }}>
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
