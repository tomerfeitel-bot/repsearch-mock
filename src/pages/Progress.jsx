import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProgress } from '../hooks/useProgress.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import HistoryTab from '../components/progress/HistoryTab.jsx'
import LiftsTab from '../components/progress/LiftsTab.jsx'
import BodyTab from '../components/progress/BodyTab.jsx'
import RecordsTab from '../components/progress/RecordsTab.jsx'
import CompareTab from '../components/progress/CompareTab.jsx'
import BubbleHeader from '../components/ui/BubbleHeader.jsx'
import PillTabs from '../components/ui/PillTabs.jsx'
import { PROGRESS_BG, PROGRESS_TEXT } from '../lib/progressTheme.js'

const TABS = ['history', 'lifts', 'body', 'records', 'compare']
const TAB_LABELS = { body: 'Lifestyle & Body' }

function uniqueOptions(values = []) {
  return [...new Set(values || [])].sort((a, b) => a.localeCompare(b)).map(value => ({ id: value, name: value }))
}

export default function Progress() {
  const toast = useToast()
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'history'
  const highlight = useMemo(() => (params.get('highlight') || '').split(',').filter(Boolean), [params])
  const seed = params.get('seed') || ''
  const [liftQuery, setLiftQuery] = useState({ metric: 'top_set', group_by: 'session' })

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
    if (tab === 'lifts' || tab === 'compare') loadLifts(liftQuery)
    if (tab === 'body') { loadBody(); loadLifestyle() }
    if (tab === 'records') loadRecords()
  }, [tab, liftQuery, loadLifts, loadBody, loadRecords, loadLifestyle])

  function setTab(t) {
    const next = new URLSearchParams(params)
    next.set('tab', t)
    if (t !== 'lifts') next.delete('highlight')
    if (t !== 'compare') next.delete('seed')
    setParams(next, { replace: true })
  }

  function updateLiftQuery(nextQuery) {
    setLiftQuery(prev => ({ ...prev, ...nextQuery }))
  }

  return (
    <div className="faded-page min-h-screen pb-24" style={{ background: PROGRESS_BG, color: PROGRESS_TEXT }}>
      <BubbleHeader label="Training log" title="Progress" floating />
      <div className="px-4 pb-3">
        <PillTabs
          tabs={TABS.map(t => ({ value: t, label: TAB_LABELS[t] || (t[0].toUpperCase() + t.slice(1)) }))}
          value={tab}
          onChange={setTab}
          scroll
          ariaLabel="Progress sections"
        />
      </div>

      <main className="p-4">
        {tab === 'history' && (
          <HistoryTab
            summary={summary}
            history={history}
            onRetry={() => { loadSummary(); loadHistory() }}
          />
        )}
        {tab === 'lifts' && (
          <LiftsTab
            resource={lifts}
            query={liftQuery}
            highlight={highlight}
            onQueryChange={updateLiftQuery}
            onRetry={() => loadLifts(liftQuery)}
          />
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
        {tab === 'compare' && (
          <CompareTab
            resource={compare}
            exercises={exercises}
            muscles={muscleOptions}
            equipment={equipmentOptions}
            seed={seed}
            onRun={loadCompare}
          />
        )}
      </main>
    </div>
  )
}
