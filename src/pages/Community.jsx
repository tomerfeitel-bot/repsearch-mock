import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '../components/ui/Toast.jsx'
import { usePosts } from '../hooks/usePosts.js'
import { useSocial } from '../hooks/useSocial.js'
import { useDailyCheckin } from '../hooks/useDailyCheckin.js'
import PostCard from '../components/community/PostCard.jsx'
import PostComposer from '../components/community/PostComposer.jsx'
import DailyCheckinModal from '../components/community/DailyCheckinModal.jsx'
import { Sheet } from '../components/ui/Sheet.jsx'
import { POST_LABELS } from '../lib/postLabels.js'

const TOP_TABS = [{ v: 'feed', label: 'Feed' }, { v: 'saved', label: 'Saved' }]
const SCOPES = [{ v: 'following', label: 'Following' }, { v: 'global', label: 'Global' }]
const SORTS = [{ v: 'hot', label: 'Hot' }, { v: 'new', label: 'New' }, { v: 'top', label: 'Top' }]
const KINDS = [{ v: '', label: 'All' }, { v: 'discussion', label: 'Discussion' }, { v: 'workout', label: 'Workout' }, { v: 'program', label: 'Program' }, { v: 'template', label: 'Template' }, { v: 'study', label: 'Study' }]

export default function Community() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const initialTab = TOP_TABS.some(t => t.v === params.get('tab')) ? params.get('tab') : 'feed'
  const [tab, setTab] = useState(initialTab)
  const { feed, feedLoading, feedMeta, loadFeed, loadMore, patchFeedItem, votePost, setSaved, loadSaved } = usePosts(toast)
  const { loadFollowing } = useSocial(toast)
  const {
    showModal: showDailyModal, loading: dailyLoading, loadToday, scheduleModalIfNeeded, dismissModal, submitCheckin,
  } = useDailyCheckin(toast)

  const [scope, setScope] = useState(null)
  const [sort, setSort] = useState('hot')
  const [kind, setKind] = useState('')
  const [label, setLabel] = useState('')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeKind, setComposeKind] = useState(null)
  const [composeWorkoutId, setComposeWorkoutId] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [saved, setSavedList] = useState([])
  const [savedLoading, setSavedLoading] = useState(false)

  // Deep links: ?compose=<kind> (from build-new return) and ?shareWorkout=<id> (finish hook).
  useEffect(() => {
    const c = params.get('compose')
    const sw = params.get('shareWorkout')
    if (c || sw) {
      setComposeKind(sw ? 'workout' : c)
      setComposeWorkoutId(sw || null)
      setComposeOpen(true)
      const p = new URLSearchParams(params); p.delete('compose'); p.delete('shareWorkout'); setParams(p, { replace: true })
    }
  }, [params, setParams])

  useEffect(() => {
    loadFollowing().then(users => setScope(prev => prev ?? (users.length > 0 ? 'following' : 'global')))
    loadToday().then(log => { if (!log) scheduleModalIfNeeded() })
  }, [loadFollowing, loadToday, scheduleModalIfNeeded])

  useEffect(() => {
    if (scope && tab === 'feed') loadFeed({ scope, sort, kind, label, q, limit: 20 })
  }, [scope, sort, kind, label, q, tab, loadFeed])

  const refreshSaved = useCallback(() => {
    setSavedLoading(true)
    loadSaved().then(items => setSavedList(items)).finally(() => setSavedLoading(false))
  }, [loadSaved])

  useEffect(() => { if (tab === 'saved') refreshSaved() }, [tab, refreshSaved])

  function changeTab(next) {
    setTab(next)
    const p = new URLSearchParams(params); p.set('tab', next); setParams(p, { replace: true })
  }

  async function onVote(id, value) {
    const res = await votePost(id, value)
    if (res) {
      patchFeedItem(id, { score: res.score, viewer_vote: res.viewer_vote })
      setSavedList(prev => prev.map(p => p.id === id ? { ...p, score: res.score, viewer_vote: res.viewer_vote } : p))
    }
  }
  async function onToggleSave(id, next) {
    await setSaved(id, next)
    patchFeedItem(id, { saved: next })
    if (tab === 'saved' && !next) setSavedList(prev => prev.filter(p => p.id !== id))
  }

  async function handleLoadMore() {
    if (!scope || loadingMore || feedLoading) return
    setLoadingMore(true)
    try { await loadMore({ scope, sort, kind, label, q, limit: 20 }) } finally { setLoadingMore(false) }
  }

  function runSearch(e) {
    e?.preventDefault()
    setQ(search.trim())
  }

  function clearFilters() {
    setSort('hot')
    setKind('')
    setLabel('')
  }

  const activeFilters = [
    scope && scope !== 'following' ? SCOPES.find(s => s.v === scope)?.label : null,
    sort !== 'hot' ? SORTS.find(s => s.v === sort)?.label : null,
    kind ? KINDS.find(k => k.v === kind)?.label : null,
    label || null,
    q ? `Search: ${q}` : null,
  ].filter(Boolean)
  const filterCount = [sort !== 'hot', !!kind, !!label, scope === 'global'].filter(Boolean).length

  const list = tab === 'saved' ? saved : feed
  const listLoading = tab === 'saved' ? savedLoading : feedLoading

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="px-4 safe-pt-4 pb-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white flex-1">Community</h1>
          <button
            onClick={() => { setComposeKind(null); setComposeWorkoutId(null); setComposeOpen(true) }}
            className="w-9 h-9 rounded-full border border-gray-800 bg-gray-900 text-gray-200 hover:border-indigo-500 hover:text-white transition-colors"
            aria-label="Create a post"
          >+</button>
        </div>
        <div className="px-4 pb-3 flex gap-1">
          {TOP_TABS.map(t => (
            <button key={t.v} onClick={() => changeTab(t.v)} className={'px-4 py-1.5 text-sm font-medium border-b-2 transition-colors ' + (tab === t.v ? 'text-white border-indigo-500' : 'text-gray-500 border-transparent hover:text-gray-300')}>{t.label}</button>
          ))}
        </div>
      </header>

      {tab === 'feed' && (
        <div className="px-4 pt-4 space-y-2">
          <form onSubmit={runSearch} className="flex gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts" className="min-h-10 min-w-0 w-0 flex-1 rounded-2xl bg-gray-900 border border-gray-800 px-4 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-indigo-500" />
            <button type="button" onClick={() => setFiltersOpen(true)} className="relative min-h-10 shrink-0 px-3 rounded-2xl bg-gray-900 border border-gray-800 text-sm font-semibold text-gray-200 hover:border-indigo-500">
              Filter
              {filterCount > 0 && <span className="ml-1 text-indigo-300">{filterCount}</span>}
            </button>
          </form>
          {(activeFilters.length > 0 || q) && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {activeFilters.map(f => (
                <span key={f} className="shrink-0 rounded-full border border-gray-800 bg-gray-900 px-2.5 py-1 text-xs text-gray-300">{f}</span>
              ))}
              {(activeFilters.length > 0 || q) && (
                <button type="button" onClick={() => { clearFilters(); setSearch(''); setQ('') }} className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-gray-400 hover:text-gray-200">Clear</button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="px-4 pt-4">
        {listLoading && list.length === 0 && <Skeleton />}
        {!listLoading && list.length === 0 && (
          <div className="text-center py-16 text-sm text-gray-500 space-y-4">
            <div>{tab === 'saved' ? 'No saved posts yet.' : 'Nothing here yet — start a discussion or share your training.'}</div>
            {tab === 'feed' && <button onClick={() => setComposeOpen(true)} className="px-4 py-2 rounded-full bg-gray-900 border border-gray-800 text-gray-200 text-xs font-semibold hover:border-indigo-500">Create a post</button>}
          </div>
        )}
        {list.map(item => <PostCard key={item.id} item={item} onVote={onVote} onToggleSave={onToggleSave} />)}

        {tab === 'feed' && feedMeta.hasMore && (
          <button onClick={handleLoadMore} disabled={loadingMore || feedLoading} className="w-full mt-2 py-3 rounded-2xl bg-gray-900 border border-gray-800 text-sm font-semibold text-gray-300 disabled:opacity-60">
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        )}
      </div>

      <DailyCheckinModal open={showDailyModal} loading={dailyLoading} onClose={dismissModal} onSubmit={submitCheckin} />
      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        scope={scope}
        setScope={setScope}
        sort={sort}
        setSort={setSort}
        kind={kind}
        setKind={setKind}
        label={label}
        setLabel={setLabel}
        clearFilters={clearFilters}
      />
      <PostComposer
        open={composeOpen}
        initialKind={composeKind}
        initialWorkoutId={composeWorkoutId}
        onClose={() => setComposeOpen(false)}
        onPosted={() => { setComposeOpen(false); if (scope) loadFeed({ scope, sort, kind, label, q, limit: 20 }); if (tab === 'saved') refreshSaved() }}
      />
    </div>
  )
}

function Skeleton() {
  return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-36 bg-gray-900 border border-gray-800 rounded-2xl animate-pulse" />)}</div>
}

function FilterSheet({ open, onClose, scope, setScope, sort, setSort, kind, setKind, label, setLabel, clearFilters }) {
  return (
    <Sheet open={open} onClose={onClose} title="Filter Community">
      <div className="p-4 space-y-5">
        <FilterGroup title="Audience">
          <SegmentedOptions options={SCOPES} value={scope || 'global'} onChange={setScope} />
        </FilterGroup>
        <FilterGroup title="Sort">
          <SegmentedOptions options={SORTS} value={sort} onChange={setSort} />
        </FilterGroup>
        <FilterGroup title="Post type">
          <div className="grid grid-cols-2 gap-2">
            {KINDS.map(k => (
              <FilterChoice key={k.v} active={kind === k.v} onClick={() => setKind(k.v)}>{k.label}</FilterChoice>
            ))}
          </div>
        </FilterGroup>
        <FilterGroup title="Labels">
          <div className="flex flex-wrap gap-2">
            <FilterChoice active={label === ''} onClick={() => setLabel('')}>All labels</FilterChoice>
            {POST_LABELS.map(l => (
              <FilterChoice key={l} active={label === l} onClick={() => setLabel(l)}>{l}</FilterChoice>
            ))}
          </div>
        </FilterGroup>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button type="button" onClick={clearFilters} className="min-h-11 rounded-2xl border border-gray-800 bg-gray-950 text-sm font-semibold text-gray-300">Reset</button>
          <button type="button" onClick={onClose} className="min-h-11 rounded-2xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500">Show posts</button>
        </div>
      </div>
    </Sheet>
  )
}

function FilterGroup({ title, children }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold text-gray-400">{title}</h3>
      {children}
    </section>
  )
}

function SegmentedOptions({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(o => (
        <FilterChoice key={o.v} active={value === o.v} onClick={() => onChange(o.v)}>{o.label}</FilterChoice>
      ))}
    </div>
  )
}

function FilterChoice({ active, onClick, children }) {
  const activeClass = 'border-indigo-500 bg-indigo-600 text-white'
  const inactiveClass = 'border-gray-800 bg-gray-950 text-gray-300 hover:border-gray-700'
  return (
    <button
      type="button"
      onClick={onClick}
      className={'min-h-10 rounded-2xl border px-3 text-sm font-semibold transition-colors ' + (active ? activeClass : inactiveClass)}
    >
      {children}
    </button>
  )
}
