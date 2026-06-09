import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProgress } from '../hooks/useProgress.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import OverviewTab from '../components/progress/OverviewTab.jsx'
import LiftsTab from '../components/progress/LiftsTab.jsx'
import BodyTab from '../components/progress/BodyTab.jsx'
import RecordsTab from '../components/progress/RecordsTab.jsx'
import CompareTab from '../components/progress/CompareTab.jsx'
import { ModeSwitch } from '../components/progress/ui.jsx'
import FlatHeader from '../components/ui/FlatHeader.jsx'
import UnderlineTabs from '../components/ui/UnderlineTabs.jsx'

const TABS = ['overview', 'lifts', 'body', 'records']
const TAB_LABELS = { overview: 'Overview', lifts: 'Lifts', body: 'Body', records: 'Records' }
// Legacy deep links map onto the regrouped surface (DESIGN.md: ≤4 tabs).
const LEGACY = { history: 'overview', compare: 'lifts' }

function uniqueOptions(values = []) {
  return [...new Set(values || [])].sort((a, b) => a.localeCompare(b)).map(value => ({ id: value, name: value }))
}

const LIFT_MODES = [{ value: 'single', label: 'Single lift' }, { value: 'compare', label: 'Compare' }]

export default function Progress() {
  const toast = useToast()
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const rawTab = params.get('tab')
  const tab = TABS.includes(rawTab) ? rawTab : (LEGACY[rawTab] || 'overview')
  const highlight = useMemo(() => (params.get('highlight') || '').split(',').filter(Boolean), [params])
  const seed = params.get('seed') || ''
  const [liftQuery, setLiftQuery] = useState({ metric: 'top_set', group_by: 'session' })
  // Lifts hosts a mode switch (Single lift / Compare); a seed or a legacy
  // ?tab=compare deep link opens straight into Compare. `compareSeed` is the
  // source of truth for the seeded lift — set synchronously so CompareTab mounts
  // with it, rather than reading the URL param (which lags a render behind).
  const [liftMode, setLiftMode] = useState(() => (rawTab === 'compare' || seed) ? 'compare' : 'single')
  const [compareSeed, setCompareSeed] = useState(seed)

  const {
    summary, history, lifts, body, records, compare, lifestyle,
    loadSummary, loadHistory, loadLifts, loadBody, loadRecords, loadCompare, loadLifestyle, logBodyMetric,
  } = useProgress(toast)

  const exercises = useMemo(() => lifts.data?.exercises || [], [lifts.data])
  const muscleOptions = useMemo(() => uniqueOptions(exercises.map(ex => ex.primary_muscle).filter(Boolean)), [exercises])
  const equipmentOptions = useMemo(() => uniqueOptions(exercises.map(ex => ex.equipment_type).filter(Boolean)), [exercises])

  useEffect(() => {
    loadSummary()
    loadHistory()
  }, [loadSummary, loadHistory])

  useEffect(() => {
    if (tab === 'lifts') loadLifts(liftQuery)
    if (tab === 'body') { loadBody(); loadLifestyle() }
    if (tab === 'records') loadRecords()
  }, [tab, liftQuery, loadLifts, loadBody, loadRecords, loadLifestyle])

  function setTab(t) {
    const next = new URLSearchParams(params)
    next.set('tab', t)
    if (t !== 'lifts') { next.delete('highlight'); next.delete('seed'); setLiftMode('single'); setCompareSeed('') }
    setParams(next, { replace: true })
  }

  function updateLiftQuery(nextQuery) {
    setLiftQuery(prev => ({ ...prev, ...nextQuery }))
  }

  function openCompare(exerciseId) {
    setCompareSeed(exerciseId)
    setLiftMode('compare')
    const next = new URLSearchParams(params)
    next.set('tab', 'lifts')
    next.set('seed', exerciseId)
    next.delete('highlight')
    setParams(next, { replace: true })
  }

  function changeLiftMode(mode) {
    setLiftMode(mode)
    if (mode === 'single') {
      setCompareSeed('')
      if (seed) { const next = new URLSearchParams(params); next.delete('seed'); setParams(next, { replace: true }) }
    }
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <FlatHeader
        title="Progress"
        titleColor="var(--emerald-ink)"
        tabs={
          <UnderlineTabs
            tabs={TABS.map(t => ({ value: t, label: TAB_LABELS[t] }))}
            value={tab}
            onChange={setTab}
            accent="var(--emerald-ink)"
            activeColor="var(--emerald-ink)"
            inactiveColor="var(--text-muted)"
            borderColor="var(--border)"
            ariaLabel="Progress sections"
          />
        }
      />

      <main className="px-4 pt-4">
        {tab === 'overview' && (
          <OverviewTab
            summary={summary}
            history={history}
            onRetry={() => { loadSummary(); loadHistory() }}
          />
        )}
        {tab === 'lifts' && (
          <div className="space-y-5">
            <ModeSwitch options={LIFT_MODES} value={liftMode} onChange={changeLiftMode} ariaLabel="Lift view" />
            {liftMode === 'single' ? (
              <LiftsTab
                resource={lifts}
                query={liftQuery}
                highlight={highlight}
                onQueryChange={updateLiftQuery}
                onRetry={() => loadLifts(liftQuery)}
                onCompare={openCompare}
              />
            ) : (
              <CompareTab
                key={compareSeed || 'blank'}
                resource={compare}
                exercises={exercises}
                muscles={muscleOptions}
                equipment={equipmentOptions}
                seed={compareSeed}
                onRun={loadCompare}
              />
            )}
          </div>
        )}
        {tab === 'body' && (
          <BodyTab
            resource={body}
            lifestyle={lifestyle}
            supplements={user?.supplements_json}
            onLog={logBodyMetric}
            onRetry={() => { loadBody(); loadLifestyle() }}
          />
        )}
        {tab === 'records' && (
          <RecordsTab
            resource={records}
            onRetry={() => loadRecords()}
          />
        )}
      </main>
    </div>
  )
}
