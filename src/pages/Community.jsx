import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '../components/ui/Toast.jsx'
import { usePosts } from '../hooks/usePosts.js'
import { useSocial } from '../hooks/useSocial.js'
import { useDailyCheckin } from '../hooks/useDailyCheckin.js'
import PostCard from '../components/community/PostCard.jsx'
import PostComposer from '../components/community/PostComposer.jsx'
import DailyCheckinModal from '../components/community/DailyCheckinModal.jsx'
import { Sheet } from '../components/ui/Sheet.jsx'
import FlatHeader from '../components/ui/FlatHeader.jsx'
import UnderlineTabs from '../components/ui/UnderlineTabs.jsx'
import PlansTab from '../components/community/PlansTab.jsx'
import { POST_LABELS } from '../lib/postLabels.js'

const TOP_TABS = [{ v: 'feed', label: 'Feed' }, { v: 'saved', label: 'Saved' }]
const SCOPES = [{ v: 'following', label: 'Following' }, { v: 'global', label: 'Global' }]
const SORTS = [{ v: 'hot', label: 'Hot' }, { v: 'new', label: 'New' }, { v: 'top', label: 'Top' }]
const KINDS = [{ v: '', label: 'All' }, { v: 'discussion', label: 'Discussion' }, { v: 'workout', label: 'Workout' }, { v: 'study', label: 'Study' }]
const PLAN_TYPES = [{ v: 'programs', label: 'Programs' }, { v: 'templates', label: 'Templates' }]
const PLAN_SOURCES = [{ v: 'for_you', label: 'For you' }, { v: 'following', label: 'Following' }]

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
  const [searchOpen, setSearchOpen] = useState(false)
  const [planMode, setPlanMode] = useState(false)
  const [planType, setPlanType] = useState('programs')
  const [planSource, setPlanSource] = useState('for_you')
  const searchInputRef = useRef(null)

  // Focus the field when the overlay opens (it stays mounted-but-clipped, so a
  // plain autoFocus would only fire once on first mount).
  useEffect(() => { if (searchOpen) searchInputRef.current?.focus() }, [searchOpen])
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
    if (next !== 'feed') setPlanMode(false) // plan mode is a feed-only filter
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
  const planFilterCount = [planType !== 'programs', planSource !== 'for_you'].filter(Boolean).length

  const list = tab === 'saved' ? saved : feed
  const listLoading = tab === 'saved' ? savedLoading : feedLoading

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <FlatHeader
        title="Community"
        titleColor="var(--emerald-ink)"
        action={
          <button
            type="button"
            onClick={() => { setComposeKind(null); setComposeWorkoutId(null); setComposeOpen(true) }}
            className="h-9 px-5 text-sm font-bold rounded-full transition-transform active:scale-95 disabled:opacity-40"
            style={{ background: 'var(--emerald)', color: 'var(--on-emerald)' }}
            aria-label="Create a post"
          >+ Post</button>
        }
        tabs={
          <div className="relative">
            <UnderlineTabs
              tabs={TOP_TABS.map(t => ({ value: t.v, label: t.label }))}
              value={tab}
              onChange={changeTab}
              accent="var(--emerald-ink)"
              activeColor="var(--emerald-ink)"
              inactiveColor="var(--text-muted)"
              borderColor="var(--border)"
              ariaLabel="Community feed scope"
            />
            {/* search icon, in line at the right end of the Feed/Saved row */}
            <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search posts" aria-expanded={searchOpen}
              className="absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-[var(--emerald-soft)]"
              style={{ color: 'var(--emerald-ink)' }}>
              <IconSearch size={18} />
            </button>
            {/* overlay search bar — wipes in from the right over the tabs */}
            <div className="search-overlay absolute inset-0 flex items-center gap-2 pl-4 pr-2"
              style={{ background: 'var(--bg)', clipPath: searchOpen ? 'inset(0 0 0 0)' : 'inset(0 0 0 100%)', opacity: searchOpen ? 1 : 0, pointerEvents: searchOpen ? 'auto' : 'none', color: 'var(--emerald-ink)', borderBottom: '1px solid var(--border)' }}>
              <IconSearch size={17} />
              <form onSubmit={runSearch} className="flex-1 min-w-0">
                <input ref={searchInputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts"
                  className="w-full bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none" />
              </form>
              <button type="button" onClick={() => { setSearchOpen(false); if (q) { setSearch(''); setQ('') } }} aria-label="Close search"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-[var(--emerald-soft)]" style={{ color: 'var(--emerald-ink)' }}>
                <IconClose size={18} />
              </button>
            </div>
          </div>
        }
      />

      {tab === 'feed' && (
        <div className="px-4 pt-3 space-y-2">
          {/* Toolbar: the Plans mode toggle ("more visible filtering") on the left,
              Filter on the right. In plan mode the Filter sheet switches to
              Programs/Templates + Source. */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPlanMode(p => !p)} aria-pressed={planMode}
              className="inline-flex items-center gap-1.5 min-h-10 shrink-0 px-4 rounded-2xl text-sm font-bold transition-colors border"
              style={planMode
                ? { background: 'var(--emerald)', color: 'var(--on-emerald)', borderColor: 'var(--emerald)' }
                : { background: 'rgba(255,255,255,0.10)', color: 'var(--text)', borderColor: 'var(--border)' }}>
              <IconPlans size={16} /> Plans
            </button>
            <button type="button" onClick={() => setFiltersOpen(true)} className="ml-auto inline-flex items-center min-h-10 shrink-0 px-4 rounded-2xl bg-white/10 border border-[var(--border)] text-sm font-semibold text-[var(--text)] shadow-sm hover:border-[var(--emerald)]">
              Filter
              {(planMode ? planFilterCount : filterCount) > 0 && <span className="ml-1.5 inline-grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--emerald)] text-[var(--on-emerald)] text-micro font-bold">{planMode ? planFilterCount : filterCount}</span>}
            </button>
          </div>
          {planMode ? (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ borderColor: 'var(--emerald)', background: 'var(--emerald)', color: 'var(--on-emerald)' }}>{PLAN_TYPES.find(t => t.v === planType)?.label}</span>
              {planType === 'programs' && <span className="shrink-0 rounded-full border border-[var(--border)] bg-white/10 px-2.5 py-1 text-xs text-[var(--text-muted)]">{PLAN_SOURCES.find(s => s.v === planSource)?.label}</span>}
            </div>
          ) : (activeFilters.length > 0 || q) && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {activeFilters.map(f => (
                <span key={f} className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm" style={{ borderColor: 'var(--emerald)', background: 'var(--emerald)', color: 'var(--on-emerald)' }}>{f}</span>
              ))}
              {(activeFilters.length > 0 || q) && (
                <button type="button" onClick={() => { clearFilters(); setSearch(''); setQ('') }} className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">Clear</button>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'feed' && planMode ? (
        <PlansTab type={planType} source={planSource} hideControls />
      ) : (
        <div className="pt-1">
          {listLoading && list.length === 0 && <div className="px-4 pt-3"><Skeleton /></div>}
          {!listLoading && list.length === 0 && (
            <div className="px-4 text-center py-16 text-sm text-[var(--text-muted)] space-y-4">
              <div>{tab === 'saved' ? 'No saved posts yet.' : 'Nothing here yet. Start a discussion or share your training.'}</div>
              {tab === 'feed' && <button onClick={() => setComposeOpen(true)} className="px-4 py-2 rounded-full text-xs font-semibold shadow-sm hover:opacity-90" style={{ background: 'var(--emerald)', color: 'var(--on-emerald)', border: '1px solid var(--emerald)' }}>Create a post</button>}
            </div>
          )}
          {list.map(item => <PostCard key={item.id} item={item} onVote={onVote} onToggleSave={onToggleSave} />)}

          {tab === 'feed' && feedMeta.hasMore && (
            <div className="px-4 pt-3">
              <button onClick={handleLoadMore} disabled={loadingMore || feedLoading} className="w-full py-3 rounded-2xl bg-white/10 border border-[var(--border)] text-sm font-semibold text-[var(--text)] shadow-sm disabled:opacity-60">
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}

      <DailyCheckinModal open={showDailyModal} loading={dailyLoading} onClose={dismissModal} onSubmit={submitCheckin} />
      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        planMode={planMode}
        planType={planType}
        setPlanType={setPlanType}
        planSource={planSource}
        setPlanSource={setPlanSource}
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

function IconSearch({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function IconClose({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function Skeleton() {
  return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-36 bg-white/5 border border-[var(--border)] rounded-2xl animate-pulse" />)}</div>
}

function FilterSheet({ open, onClose, planMode, planType, setPlanType, planSource, setPlanSource, scope, setScope, sort, setSort, kind, setKind, label, setLabel, clearFilters }) {
  if (planMode) {
    return (
      <Sheet open={open} onClose={onClose} title="Filter plans">
        <div className="p-4 space-y-5">
          <FilterGroup title="Type">
            <SegmentedOptions options={PLAN_TYPES} value={planType} onChange={setPlanType} />
          </FilterGroup>
          {planType === 'programs' && (
            <FilterGroup title="Source">
              <SegmentedOptions options={PLAN_SOURCES} value={planSource} onChange={setPlanSource} />
            </FilterGroup>
          )}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button type="button" onClick={() => { setPlanType('programs'); setPlanSource('for_you') }} className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] text-sm font-semibold text-[var(--text)]">Reset</button>
            <button type="button" onClick={onClose} className="min-h-11 rounded-2xl text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>Show plans</button>
          </div>
        </div>
      </Sheet>
    )
  }
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
          <button type="button" onClick={clearFilters} className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] text-sm font-semibold text-[var(--text)]">Reset</button>
          <button type="button" onClick={onClose} className="min-h-11 rounded-2xl text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>Show posts</button>
        </div>
      </div>
    </Sheet>
  )
}

function FilterGroup({ title, children }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold text-[var(--text-muted)]">{title}</h3>
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
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-10 rounded-2xl border px-3 text-sm font-semibold transition-colors"
      style={active
        ? { borderColor: 'var(--emerald)', background: 'var(--emerald)', color: 'var(--on-emerald)' }
        : { borderColor: 'var(--border)', background: 'var(--surface-alt)', color: 'var(--text)' }}
    >
      {children}
    </button>
  )
}

function IconPlans({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" /><line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  )
}
