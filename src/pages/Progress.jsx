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
import { PROGRESS_BG, PROGRESS_TEXT, PROGRESS_BORDER, PROGRESS_CARD, PROGRESS_MUTED } from '../lib/progressTheme.js'

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
    <div className="min-h-screen pb-24" style={{ background: PROGRESS_BG, color: PROGRESS_TEXT }}>
      <header className="sticky top-0 z-10 backdrop-blur" style={{ background: `${PROGRESS_BG}ee`, borderBottom: `1px solid ${PROGRESS_BORDER}` }}>
        <div className="px-4 safe-pt-4 pb-2">
          <h1 className="font-serif font-bold text-3xl" style={{ color: PROGRESS_TEXT }}>Progress</h1>
        </div>
        <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors capitalize"
              style={{
                background: tab === t ? PROGRESS_TEXT : 'transparent',
                color: tab === t ? PROGRESS_CARD : PROGRESS_MUTED,
                border: `1px solid ${tab === t ? PROGRESS_TEXT : PROGRESS_BORDER}`,
              }}
            >
              {TAB_LABELS[t] || t}
            </button>
          ))}
        </div>
      </header>

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
