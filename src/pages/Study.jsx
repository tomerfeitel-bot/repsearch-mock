import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bar, BarChart, Cell, ErrorBar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useResearch } from '../hooks/useResearch.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import FilterRow from '../components/study/FilterRow.jsx'
import ExploreSearchBar from '../components/study/ExploreSearchBar.jsx'
import ExerciseLibrary from '../components/study/ExerciseLibrary.jsx'
import { SingleResultChart, CompareResultChart } from '../components/study/ResultsChart.jsx'
import FlatHeader, { FlatAction } from '../components/ui/FlatHeader.jsx'
import { timeAgo } from '../lib/timeAgo.js'
import { SEED_EXERCISES, EQUIPMENT_TYPES } from '../lib/exercises.js'
import {
  STUDY_ACCENT,
  STUDY_ACCENT_DIM,
  STUDY_ACCENT_FAINT,
  STUDY_BG,
  STUDY_BORDER,
  STUDY_BORDER_STRONG,
  STUDY_BRAND,
  STUDY_BRAND_FAINT,
  STUDY_BRAND_INK,
  STUDY_CARD,
  STUDY_COMPARE_A,
  STUDY_COMPARE_B,
  STUDY_DIM,
  STUDY_MUTED,
  STUDY_ON_BRAND,
  STUDY_TEXT,
  FIELD_BY_VALUE,
  GROUP_BY_OPTIONS,
  MEASURE_OPTIONS,
  OUTCOME_OPTIONS,
  OPERATORS,
  PERSONAL_BUCKET_FROM_USER,
  VARIABLE_CATEGORIES,
  PEOPLE_FILTERS,
  PEOPLE_FILTER_BY_KEY,
  DEFAULT_MATCH_KEYS,
  defaultMatchValue,
  peopleToFilters,
  detectPattern,
  describeQuery,
  studyTopicForQuery,
  prettyBucket,
  prettyGroupBy,
  prettyMeasure,
} from '../lib/researchTheme.js'

const DEFAULT_SCAN_KEYS = ['split_type', 'frequency_bucket', 'sleep_quality_quartile', 'protein_bucket']
const DEFAULT_QUERY = {
  mode: 'single',
  filtersA: [],
  filtersB: [],
  cohortALabel: 'A',
  cohortBLabel: 'B',
  groupBy: 'split_type',
  measure: 'progression_rate',
  exerciseId: '',
  muscle: '',
  targetType: 'exercise',
  minCohort: 10,
}

const SESSION_FOCUS = [
  { key: 'whole_session', label: 'Whole session', comingSoon: false },
  { key: 'exercises_after', label: 'Exercises after anchor', comingSoon: true },
  { key: 'muscles_after', label: 'Muscles after anchor', comingSoon: true },
  { key: 'exercises_before', label: 'Exercises before anchor', comingSoon: true },
  { key: 'position', label: 'Position in session', comingSoon: true },
]

// Top-level muscle groups to show in the exercise browser chips
const TOP_MUSCLES = ['Chest', 'Back', 'Shoulders', 'Quads', 'Hamstrings', 'Glutes', 'Triceps', 'Biceps', 'Core', 'Traps', 'Forearms', 'Calves']

const SELECT_CLS = 'w-full rounded-xl bg-gray-900 px-3 py-3 text-sm text-gray-100 outline-none'

const BRAND_BUTTON_STYLE = { background: STUDY_BRAND, color: STUDY_ON_BRAND }
const BRAND_ACTIVE_STYLE = { background: STUDY_BRAND, color: STUDY_ON_BRAND, border: `1px solid ${STUDY_BRAND}` }

function sanitizeFilters(filters) {
  return filters.filter(f => {
    if (!f.field || !f.op) return false
    const op = OPERATORS.find(o => o.value === f.op)
    if (!op) return false
    return !op.needsValue || !(f.value === '' || f.value === undefined || f.value === null)
  })
}

function defaultFilter() {
  return {
    field: 'users.experience_level',
    op: '=',
    value: FIELD_BY_VALUE['users.experience_level'].enum[0],
  }
}

function featuredToState(question) {
  const q = question.query || {}
  if (question.type === 'compare') {
    return {
      ...DEFAULT_QUERY,
      mode: 'compare',
      filtersA: q.cohortA?.filters || [],
      filtersB: q.cohortB?.filters || [],
      cohortALabel: q.cohortA?.label || 'A',
      cohortBLabel: q.cohortB?.label || 'B',
      groupBy: q.groupBy || DEFAULT_QUERY.groupBy,
      measure: q.measure || DEFAULT_QUERY.measure,
      exerciseId: q.exerciseId || '',
      muscle: q.muscle || '',
      targetType: q.targetType || (q.exerciseId ? 'exercise' : q.muscle ? 'muscle' : 'exercise'),
      minCohort: q.minCohort || DEFAULT_QUERY.minCohort,
    }
  }
  return {
    ...DEFAULT_QUERY,
    mode: 'single',
    filtersA: q.filters || [],
    groupBy: q.groupBy || DEFAULT_QUERY.groupBy,
    measure: q.measure || DEFAULT_QUERY.measure,
    exerciseId: q.exerciseId || '',
    muscle: q.muscle || '',
    targetType: q.targetType || (q.exerciseId ? 'exercise' : q.muscle ? 'muscle' : 'exercise'),
    minCohort: q.minCohort || DEFAULT_QUERY.minCohort,
  }
}

function findingToState(finding) {
  const q = finding.query_json || {}
  if (q.cohortA && q.cohortB) {
    return {
      ...DEFAULT_QUERY,
      mode: 'compare',
      filtersA: q.cohortA.filters || [],
      filtersB: q.cohortB.filters || [],
      cohortALabel: q.cohortA.label || 'A',
      cohortBLabel: q.cohortB.label || 'B',
      groupBy: q.groupBy || DEFAULT_QUERY.groupBy,
      measure: q.measure || DEFAULT_QUERY.measure,
      exerciseId: q.exerciseId || '',
      muscle: q.muscle || '',
      targetType: q.targetType || (q.exerciseId ? 'exercise' : q.muscle ? 'muscle' : 'exercise'),
      minCohort: q.minCohort || DEFAULT_QUERY.minCohort,
    }
  }
  return {
    ...DEFAULT_QUERY,
    filtersA: q.filters || [],
    groupBy: q.groupBy || DEFAULT_QUERY.groupBy,
    measure: q.measure || DEFAULT_QUERY.measure,
    exerciseId: q.exerciseId || '',
    muscle: q.muscle || '',
    targetType: q.targetType || (q.exerciseId ? 'exercise' : q.muscle ? 'muscle' : 'exercise'),
    minCohort: q.minCohort || DEFAULT_QUERY.minCohort,
  }
}

function stateToPayload(state) {
  const target = targetPayloadParts(state)

  const common = {
    groupBy: state.groupBy,
    measure: state.measure,
    exerciseId: target.exerciseId,
    muscle: target.muscle,
    targetType: state.targetType,
    minCohort: state.minCohort,
  }
  if (state.mode === 'compare') {
    return {
      mode: 'compare',
      cohortA: { label: state.cohortALabel || 'A', filters: sanitizeFilters([...state.filtersA, ...target.filters]) },
      cohortB: { label: state.cohortBLabel || 'B', filters: sanitizeFilters([...state.filtersB, ...target.filters]) },
      ...common,
    }
  }
  return {
    mode: 'single',
    filters: sanitizeFilters([...state.filtersA, ...target.filters]),
    ...common,
  }
}

function targetPayloadParts(state) {
  return {
    filters: state.targetType === 'equipment' && state.muscle
      ? [{ field: 'exercises.equipment_type', op: '=', value: state.muscle }]
      : [],
    exerciseId: state.targetType === 'exercise' ? (state.exerciseId || undefined) : undefined,
    muscle: state.targetType === 'muscle' ? (state.muscle || undefined) : undefined,
  }
}

function savedToState(saved) {
  const q = saved.query || {}
  const inferTargetType = q => q.targetType || (q.exerciseId ? 'exercise' : q.muscle ? 'muscle' : 'exercise')
  if (saved.mode === 'scan' && q.groupBys?.[0]) {
    return {
      ...DEFAULT_QUERY,
      filtersA: q.filters || [],
      groupBy: q.groupBys[0],
      measure: q.measure || DEFAULT_QUERY.measure,
      exerciseId: q.exerciseId || '',
      muscle: q.muscle || '',
      targetType: inferTargetType(q),
      minCohort: q.minCohort || DEFAULT_QUERY.minCohort,
    }
  }
  if (saved.mode === 'compare') {
    return {
      ...DEFAULT_QUERY,
      mode: 'compare',
      filtersA: q.cohortA?.filters || [],
      filtersB: q.cohortB?.filters || [],
      cohortALabel: q.cohortA?.label || 'A',
      cohortBLabel: q.cohortB?.label || 'B',
      groupBy: q.groupBy || DEFAULT_QUERY.groupBy,
      measure: q.measure || DEFAULT_QUERY.measure,
      exerciseId: q.exerciseId || '',
      muscle: q.muscle || '',
      targetType: inferTargetType(q),
      minCohort: q.minCohort || DEFAULT_QUERY.minCohort,
    }
  }
  return {
    ...DEFAULT_QUERY,
    filtersA: q.filters || [],
    groupBy: q.groupBy || DEFAULT_QUERY.groupBy,
    measure: q.measure || DEFAULT_QUERY.measure,
    exerciseId: q.exerciseId || '',
    muscle: q.muscle || '',
    targetType: inferTargetType(q),
    minCohort: q.minCohort || DEFAULT_QUERY.minCohort,
  }
}

export default function Study() {
  const toast = useToast()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const research = useResearch(toast)
  const [tab, setTab] = useState('foryou')
  const [queryState, setQueryState] = useState(DEFAULT_QUERY)
  const [scanKeys, setScanKeys] = useState(DEFAULT_SCAN_KEYS)
  const [selectedScan, setSelectedScan] = useState(null)
  const [activeSavedId, setActiveSavedId] = useState(null)
  const [populationMode, setPopulationMode] = useState('all')
  const [populationBMode] = useState('custom')
  const [matchKeys, setMatchKeys] = useState(DEFAULT_MATCH_KEYS)
  const [matchValues, setMatchValues] = useState({})
  const [ruleFilters, setRuleFilters] = useState([])
  const programId = params.get('program')

  const {
    loadFeaturedQuestions,
    loadFindings,
    loadSavedQuestions,
    runQuery,
    compareCohorts,
    runScan,
    compareScan,
    previewStudy,
  } = research

  useEffect(() => {
    loadFeaturedQuestions()
    loadFindings()
    loadSavedQuestions()
  }, [loadFeaturedQuestions, loadFindings, loadSavedQuestions])

  const exerciseName = useMemo(
    () => SEED_EXERCISES.find(ex => ex.id === queryState.exerciseId)?.name || '',
    [queryState.exerciseId],
  )
  const personalSupported = Boolean(PERSONAL_BUCKET_FROM_USER[queryState.groupBy])
  const loading = research.queryLoading || research.compareLoading || research.scanLoading || research.compareScanLoading

  // In "people like me" mode the cohort is compiled from the user's profile
  // into whitelisted filter rows; custom mode uses the builder's own filters.
  const populationFilters = useCallback((mode, filters = []) => {
    if (mode === 'all') return []
    if (mode === 'people_like_me') return peopleToFilters(user, matchKeys, matchValues)
    return sanitizeFilters(filters)
  }, [user, matchKeys, matchValues])

  const buildEffective = useCallback((state) => {
    const filtersA = [...populationFilters(populationMode, state.filtersA), ...ruleFilters]
    if (state.mode === 'compare') {
      return { ...state, filtersA, filtersB: [...populationFilters(populationBMode, state.filtersB), ...ruleFilters] }
    }
    return { ...state, mode: 'single', filtersA }
  }, [populationFilters, populationMode, populationBMode, ruleFilters])

  const runCurrent = useCallback(async (state = queryState) => {
    setActiveSavedId(null)
    setSelectedScan(null)
    const payload = stateToPayload(buildEffective(state))
    if (payload.mode === 'compare') return compareCohorts(payload)
    return runQuery(payload)
  }, [buildEffective, compareCohorts, queryState, runQuery])

  const runCurrentScan = useCallback(async () => {
    setActiveSavedId(null)
    setSelectedScan(null)
    const eff = buildEffective(queryState)
    const target = targetPayloadParts(queryState)
    const result = await runScan({
      filters: sanitizeFilters([...eff.filtersA, ...target.filters]),
      groupBys: scanKeys,
      measure: queryState.measure,
      exerciseId: target.exerciseId,
      muscle: target.muscle,
      minCohort: queryState.minCohort,
    })
    if (result?.results?.[0]) setSelectedScan(result.results[0])
    return result
  }, [buildEffective, queryState, runScan, scanKeys])

  async function openFeatured(question) {
    const next = featuredToState(question)
    setPopulationMode('custom')
    setQueryState(next)
    setTab('explore')
    const payload = stateToPayload(next)
    if (payload.mode === 'compare') await compareCohorts(payload)
    else await runQuery(payload)
  }

  async function openFinding(finding) {
    const next = findingToState(finding)
    if (!next.groupBy || !next.measure) {
      toast('This finding has no replayable query.', 'info')
      return
    }
    setPopulationMode('custom')
    setQueryState(next)
    setTab('explore')
    const payload = stateToPayload(next)
    if (payload.mode === 'compare') await compareCohorts(payload)
    else await runQuery(payload)
  }

  async function openSaved(saved) {
    const next = savedToState(saved)
    setPopulationMode('custom')
    setQueryState(next)
    setActiveSavedId(saved.id)
    setTab('explore')
    if (saved.mode === 'scan' && saved.query?.groupBys?.length) {
      setScanKeys(saved.query.groupBys)
      if (saved.query?.cohortA && saved.query?.cohortB) await compareScan(saved.query)
      else await runScan(saved.query)
    } else {
      const payload = stateToPayload(next)
      if (payload.mode === 'compare') await compareCohorts(payload)
      else await runQuery(payload)
    }
  }

  async function saveCurrentQuestion(mode = queryState.mode) {
    const isScan = mode === 'scan'
    const eff = buildEffective(queryState)
    const target = targetPayloadParts(queryState)
    const query = isScan
      ? {
          filters: sanitizeFilters([...eff.filtersA, ...target.filters]),
          groupBys: scanKeys,
          measure: queryState.measure,
          exerciseId: target.exerciseId,
          muscle: target.muscle,
          targetType: queryState.targetType,
          minCohort: queryState.minCohort,
        }
      : stateToPayload(eff)
    const evidence = isScan
      ? {
          status: research.scanResult?.results?.[0]?.evidenceStatus || 'Not enough',
          qualifiedUsers: research.scanResult?.results?.[0]?.totalCohortSize || 0,
          matchedUsers: research.scanResult?.results?.[0]?.totalCohortSize || 0,
        }
      : currentEvidence(queryState.mode, research.queryResult, research.compareResult)
    const label = isScan
      ? `Scan ${scanKeys.length} variables for ${prettyMeasure(queryState.measure)}`
      : describeQuery({ ...query, exerciseName })
    const saved = await research.saveQuestion({ label, mode: isScan ? 'scan' : queryState.mode, query, evidence })
    if (saved) setActiveSavedId(saved.id)
  }

  return (
    <div
      className="faded-page min-h-screen pb-28"
      style={{
        '--accent': STUDY_BRAND,
        '--accent-ink': STUDY_ON_BRAND,
        '--surface': STUDY_CARD,
        '--surface-alt': '#1b211a',
        '--border': STUDY_BORDER,
        '--border-strong': STUDY_BORDER_STRONG,
        '--text': STUDY_TEXT,
        '--text-muted': STUDY_MUTED,
        backgroundImage: 'radial-gradient(125% 65% at 100% -5%, rgba(11, 122, 67, 0.23) 0%, transparent 58%), linear-gradient(180deg, #0d1310 0%, #08090a 60%)',
        backgroundColor: STUDY_BG,
        backgroundAttachment: 'fixed',
        color: STUDY_TEXT,
      }}
    >
      <FlatHeader
        title="Study"
        titleColor={STUDY_BRAND_INK}
        action={<FlatAction onClick={() => setTab('explore')}>New study</FlatAction>}
        tabs={<StudyModeSwitch value={tab} onChange={setTab} />}
      />

      <main className="space-y-6 px-4 py-5">
        {programId && (
          <Notice>
            Program evidence view opened. Study can compare this plan as matching program data becomes qualified.
          </Notice>
        )}
        {user && !user.research_opt_in && (
          <Notice>
            Your research opt-in is off. Your logs are not contributing to population evidence.
          </Notice>
        )}

        {tab === 'foryou' && (
          <ForYou
            questions={research.featuredQuestions}
            findings={research.findings}
            findingsLoading={research.findingsLoading}
            onFeatured={openFeatured}
            onFinding={openFinding}
          />
        )}

        {tab === 'explore' && (
          <Explore
            state={queryState}
            setState={setQueryState}
            scanKeys={scanKeys}
            setScanKeys={setScanKeys}
            selectedScan={selectedScan}
            setSelectedScan={setSelectedScan}
            runCurrent={runCurrent}
            runCurrentScan={runCurrentScan}
            saveCurrentQuestion={saveCurrentQuestion}
            loading={loading}
            queryResult={research.queryResult}
            compareResult={research.compareResult}
            scanResult={research.scanResult}
            compareScanResult={research.compareScanResult}
            previewResult={research.previewResult}
            previewLoading={research.previewLoading}
            activeSavedId={activeSavedId}
            user={user}
            exerciseName={exerciseName}
            personalSupported={personalSupported}
            populationMode={populationMode}
            setPopulationMode={setPopulationMode}
            matchKeys={matchKeys}
            setMatchKeys={setMatchKeys}
            matchValues={matchValues}
            setMatchValues={setMatchValues}
            previewStudy={previewStudy}
            ruleFilters={ruleFilters}
            setRuleFilters={setRuleFilters}
          />
        )}

        {tab === 'evidence' && (
          <Evidence
            savedQuestions={research.savedQuestions}
            savedLoading={research.savedLoading}
            findings={research.findings}
            onOpenSaved={openSaved}
            onDeleteSaved={research.deleteSavedQuestion}
            onOpenFinding={openFinding}
          />
        )}

        {tab === 'library' && (
          <ExerciseLibrary />
        )}
      </main>
    </div>
  )
}

// Study sub-nav is a MODE SWITCH (DESIGN.md Tier 1), not pills: a framed,
// segmented instrument selector that reads heavier than Community's underline
// tabs — three workspaces (findings / builder / saved), not peer feed views.
// A dark framed track on the page ground; the active segment carries the brand
// emerald fill (the app's selection color); a mono sub-label gives the Lab voice.
function StudyModeSwitch({ value, onChange }) {
  const modes = [
    { value: 'foryou', label: 'For You', hint: 'findings' },
    { value: 'explore', label: 'Explore', hint: 'builder' },
    { value: 'evidence', label: 'Evidence', hint: 'saved' },
    { value: 'library', label: 'Library', hint: 'exercises' },
  ]
  return (
    <div className="px-4 pb-3 pt-0.5">
      <div
        role="tablist"
        aria-label="Study workspaces"
        className="grid grid-cols-4 overflow-hidden rounded-xl"
        style={{ border: `1px solid ${STUDY_BORDER_STRONG}`, background: STUDY_BG }}
      >
        {modes.map((m, i) => {
          const active = m.value === value
          return (
            <button
              key={m.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(m.value)}
              className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors"
              style={{
                background: active ? STUDY_BRAND : 'transparent',
                color: active ? STUDY_ON_BRAND : STUDY_MUTED,
                borderLeft: i ? `1px solid ${STUDY_BORDER_STRONG}` : 'none',
              }}
            >
              <span className="text-[13px] font-bold leading-none sm:text-sm">{m.label}</span>
              <span className="font-mono text-[10px] uppercase tracking-wide leading-none" style={{ opacity: 0.75 }}>{m.hint}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// For You is the Lab's front page: an editorial poster wall, not a card grid.
// One loud hero finding leads; the rest read as a full-bleed answer stream; then
// vetted questions sit as a distinct prompt list. Findings carry a chart (the
// color hero) so a confused user sees the *shape* of the relationship at a glance.
function ForYou({ questions, findings, findingsLoading, onFeatured, onFinding }) {
  const ranked = useMemo(() => [...findings].sort((a, b) => (b.strength || 0) - (a.strength || 0)), [findings])
  const hero = ranked[0]
  const rest = ranked.slice(1)

  return (
    <div className="space-y-9">
      {findingsLoading && <SkeletonRows />}
      {!findingsLoading && hero && <FindingHero finding={hero} onOpen={onFinding} />}

      {!findingsLoading && rest.length > 0 && (
        <section className="space-y-1">
          <PosterSectionHead
            title="More findings"
            body="Relationships surfaced from qualified, opted-in training logs. Tap one to rebuild it in the builder."
          />
          <div className="-mx-4 mt-3" style={{ borderTop: `1px solid ${STUDY_BORDER}` }}>
            {rest.map(finding => (
              <FindingPoster key={finding.id} finding={finding} onClick={() => onFinding(finding)} />
            ))}
          </div>
        </section>
      )}

      {!findingsLoading && !findings.length && (
        <EmptyText>No findings discovered yet. Opt in and keep logging — relationships surface here as qualified data accumulates.</EmptyText>
      )}

      <section className="space-y-1">
        <PosterSectionHead
          title="Start a question"
          body="Vetted starting points. Pick one to run it, then narrow the population in the builder."
        />
        <FeaturedDeck questions={questions} onOpen={onFeatured} />
      </section>
    </div>
  )
}

function PosterSectionHead({ title, body }) {
  return (
    <div>
      <h2 className="text-head font-extrabold leading-tight" style={{ color: STUDY_TEXT }}>{title}</h2>
      {body && <p className="mt-1 max-w-[60ch] text-body leading-relaxed" style={{ color: STUDY_MUTED }}>{body}</p>}
    </div>
  )
}

// Solid topic chip — the de-bubble color law: solid fill + contrasting ink, never
// the retired tint-behind-same-hue-text pill.
function TopicBadge({ topic }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-micro font-bold uppercase tracking-wide"
      style={{ background: topic.fill, color: topic.on }}
    >
      {topic.label}
    </span>
  )
}

// Deterministic ascending bar shape for a finding. The seeded findings here are
// all positive monotonic relationships, so an upward ramp honestly conveys
// "more of X tracks with more outcome"; the top bar carries the topic pigment as
// the color hero, the rest sit in the data-viz tint. Stable per finding id.
function trendBars(seed, groupBy, count = 5) {
  let h = 2166136261
  for (const ch of String(seed) + '|' + String(groupBy)) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619) >>> 0
  }
  const bars = []
  let level = 0.34 + (h % 16) / 100
  for (let i = 0; i < count; i++) {
    const jitter = ((h >> (i * 4)) % 9) / 100
    level = Math.min(1, level + 0.11 + jitter)
    bars.push(level)
  }
  return bars
}

const RELATIONSHIP_ENDS = {
  rest_period_bucket: ['short rest', 'long rest'],
  sleep_quality_quartile: ['poor sleep', 'great sleep'],
  sleep_duration_bucket: ['less sleep', 'more sleep'],
  frequency_bucket: ['fewer days', 'more days'],
  protein_bucket: ['less protein', 'more protein'],
  rir_use: ['no RIR', 'logs RIR'],
  rir_bucket: ['near failure', 'far from failure'],
  rep_range_bucket: ['low reps', 'high reps'],
}

function relationshipEnds(groupBy) {
  return RELATIONSHIP_ENDS[groupBy] || ['lower', 'higher']
}

// The Chart Block (DESIGN.md): titled by its surrounding poster, captioned by the
// finding detail, color carried by the topic hue. Rounded media corners only.
function TrendMotif({ finding, topic, height = 96 }) {
  const bars = trendBars(finding.id, finding.groupBy)
  const max = Math.max(...bars)
  const [lowEnd, highEnd] = relationshipEnds(finding.groupBy)
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'color-mix(in srgb, var(--surface-alt) 72%, transparent)', border: `1px solid ${STUDY_BORDER}` }}
    >
      <div className="flex items-end gap-1.5" style={{ height }}>
        {bars.map((value, i) => {
          const top = i === bars.length - 1
          return (
            <div
              key={i}
              className="flex-1 rounded-t-md transition-[height]"
              style={{
                height: `${Math.max(12, Math.round((value / max) * 100))}%`,
                background: top ? topic.fill : topic.tint,
                boxShadow: top ? `inset 0 0 0 1.5px ${topic.color}` : 'none',
              }}
            />
          )
        })}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-wide" style={{ color: STUDY_DIM }}>
        <span>{lowEnd}</span>
        <span style={{ color: topic.color }}>{highEnd}</span>
      </div>
    </div>
  )
}

function findingStatus(finding) {
  const s = finding.strength || 0
  return s >= 80 ? 'Strong' : s >= 50 ? 'Good' : 'Sparse'
}

// The loud lead poster — the strongest finding, colorized by its topic, the
// headline and chart sharing top billing. This is the For You hero.
function FindingHero({ finding, onOpen }) {
  const topic = studyTopicForQuery(finding.query_json || finding.query || {})
  return (
    <section
      className="-mx-4 px-4 pb-7 pt-1"
      style={{
        borderBottom: `1px solid ${STUDY_BORDER}`,
        background: `radial-gradient(135% 90% at 0% 0%, ${topic.tint} 0%, transparent 62%)`,
      }}
    >
      <div className="flex items-center gap-2">
        <TopicBadge topic={topic} />
        <span className="text-micro font-bold uppercase tracking-widest" style={{ color: topic.color }}>Strongest signal</span>
        <span className="ml-auto"><EvidenceBadge status={findingStatus(finding)} /></span>
      </div>

      <button type="button" onClick={() => onOpen(finding)} className="mt-3 block w-full text-left">
        <h2 className="text-display font-extrabold leading-[1.12]" style={{ color: STUDY_TEXT, textWrap: 'balance' }}>{finding.headline}</h2>
      </button>

      <button type="button" onClick={() => onOpen(finding)} className="mt-4 block w-full text-left">
        <TrendMotif finding={finding} topic={topic} height={140} />
      </button>

      <p className="mt-3 max-w-[60ch] text-read leading-relaxed" style={{ color: STUDY_MUTED }}>{finding.detail}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          onClick={() => onOpen(finding)}
          className="rounded-full px-5 py-2.5 text-sm font-bold transition-transform active:scale-95"
          style={BRAND_BUTTON_STYLE}
        >
          Open in builder
        </button>
        <span className="font-mono text-caption tabular-nums" style={{ color: STUDY_DIM }}>
          {prettyMeasure(finding.measure)} · signal {finding.strength || 0}/100
        </span>
      </div>
    </section>
  )
}

// One finding in the answer stream — a full-bleed Feed Item (DESIGN.md): meta
// line → bold headline → chart → payoff → quiet meta. No floating card.
function FindingPoster({ finding, onClick }) {
  const topic = studyTopicForQuery(finding.query_json || finding.query || {})
  return (
    <article className="px-4 py-5" style={{ borderBottom: `1px solid ${STUDY_BORDER}` }}>
      <div className="flex items-center gap-2">
        <TopicBadge topic={topic} />
        {finding.discovered_at && (
          <span className="font-mono text-caption" style={{ color: STUDY_DIM }}>{timeAgo(finding.discovered_at)}</span>
        )}
        <span className="ml-auto"><EvidenceBadge status={findingStatus(finding)} /></span>
      </div>

      <button type="button" onClick={onClick} className="mt-2 block w-full text-left">
        <h3 className="text-lead font-extrabold leading-tight" style={{ color: STUDY_TEXT, textWrap: 'balance' }}>
          {finding.headline || finding.title || 'Discovered relationship'}
        </h3>
      </button>

      <button type="button" onClick={onClick} className="mt-3 block w-full text-left">
        <TrendMotif finding={finding} topic={topic} height={84} />
      </button>

      {finding.detail && <p className="mt-3 max-w-[60ch] text-read leading-relaxed" style={{ color: STUDY_MUTED }}>{finding.detail}</p>}

      <div className="mt-3 flex items-center gap-2 font-mono text-caption" style={{ color: STUDY_DIM }}>
        <span style={{ color: topic.color }}>{prettyMeasure(finding.measure)}</span>
        <span aria-hidden="true">·</span>
        <span className="truncate">by {prettyGroupBy(finding.groupBy).toLowerCase()}</span>
        <button type="button" onClick={onClick} className="ml-auto shrink-0 font-sans font-bold" style={{ color: STUDY_ACCENT }}>
          Open →
        </button>
      </div>
    </article>
  )
}

// Featured questions are prompts, not answers — so they get a distinct shape: a
// de-bubbled List Row stream with a solid topic glyph, the question loud, the
// subtitle as "what you'll learn", and a clear go-affordance. No chart.
function FeaturedDeck({ questions, onOpen }) {
  if (!questions.length) return <EmptyText>No featured questions available right now.</EmptyText>
  return (
    <div className="-mx-4 mt-3" style={{ borderTop: `1px solid ${STUDY_BORDER}` }}>
      {questions.map(question => {
        const topic = studyTopicForQuery(question.query, question.type)
        return (
          <button
            key={question.id}
            type="button"
            onClick={() => onOpen(question)}
            className="flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors active:bg-white/[0.03]"
            style={{ borderBottom: `1px solid ${STUDY_BORDER}` }}
          >
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-mono text-sm font-bold tabular-nums"
              style={{ background: topic.fill, color: topic.on }}
              aria-hidden="true"
            >
              {topic.symbol}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-title font-bold leading-snug" style={{ color: STUDY_TEXT, textWrap: 'balance' }}>{question.title}</span>
              <span className="mt-0.5 block text-body leading-snug" style={{ color: STUDY_MUTED }}>{question.subtitle}</span>
            </span>
            <span className="shrink-0 text-xl font-bold" style={{ color: topic.color }} aria-hidden="true">→</span>
          </button>
        )
      })}
    </div>
  )
}

const CONCEPTS = [
  { key: 'builder', label: 'Builder', title: 'Study Builder', body: 'A progressive workbench: outcome, target, variables, people, inclusion rules, then evidence.' },
  { key: 'canvas', label: 'Canvas', title: 'Research Canvas', body: 'A visual map where measured things, cohorts, and outcomes connect into valid or weak study paths.' },
  { key: 'notebook', label: 'Notebook', title: 'Lab Notebook', body: 'A question-first notebook for saving, branching, comparing, and refining studies over time.' },
]

const BUILDER_STEPS = [
  {
    key: 'outcome',
    label: 'Outcome',
    title: 'What should improve?',
    detail: 'Weight progression for bench press, normalized against each lifter baseline.',
    chips: ['Progression rate', 'Top set increase', 'Estimated 1RM'],
  },
  {
    key: 'scope',
    label: 'Scope',
    title: 'Where should the study look?',
    detail: 'Bench press logs, people like me, barbell only. Search stays available but is not the workflow.',
    chips: ['Bench press', 'People like me', 'Barbell'],
  },
  {
    key: 'variables',
    label: 'Variables',
    title: 'Which factors should it test?',
    detail: 'Scan any tracked training, recovery, nutrition, profile, cardio, body, workout, set, or exercise variable.',
    chips: ['Set log', 'Daily log', 'Body', 'Profile', 'Exercise meta'],
  },
  {
    key: 'rules',
    label: 'Rules',
    title: 'Who qualifies?',
    detail: 'At least 8 bench sessions, 6 logged weeks, 70% set completion, and RIR logged for RIR studies.',
    chips: ['8+ sessions', '6+ weeks', '70% complete', 'RIR logged'],
  },
]

const BUILDER_OUTCOMES = [
  { key: 'progression_rate', label: 'Weight progression', detail: 'Slope of qualified working-weight progress.', units: '%/wk' },
  { key: 'top_set_pct_change', label: 'Top-set increase', detail: 'Percent change from each lifter baseline.', units: '%' },
  { key: 'estimated_1rm', label: 'Estimated 1RM', detail: 'Rep-based strength estimate with broad coverage.', units: 'kg' },
  { key: 'improvement_frequency', label: 'Improvement frequency', detail: 'How often weight or reps improve.', units: 'rate' },
  { key: 'recovery_volume_tolerance', label: 'Volume tolerance', detail: 'Sustained work before progress drops.', units: 'kg x reps' },
  { key: 'set_volume_load', label: 'Set volume', detail: 'Weight multiplied by reps at set level.', units: 'kg x reps' },
]

const BUILDER_VARIABLE_GROUPS = [
  {
    key: 'profile',
    label: 'Profile',
    variables: [
      { key: 'experience_level', label: 'Experience level', source: 'users.experience_level', status: 'Strong', n: 624, impact: '+5.2%', requires: 'onboarding profile' },
      { key: 'goal', label: 'Training goal', source: 'users.goal', status: 'Strong', n: 598, impact: '+4.8%', requires: 'onboarding profile' },
      { key: 'split_type', label: 'Split type', source: 'users.split_type', status: 'Strong', n: 552, impact: '+6.9%', requires: 'weekly split set' },
      { key: 'training_age_years', label: 'Training age', source: 'users.training_age_years', status: 'Good', n: 417, impact: '+7.1%', requires: 'training history set' },
      { key: 'gym_type', label: 'Gym type', source: 'users.gym_type', status: 'Good', n: 363, impact: '+2.1%', requires: 'profile gym type' },
      { key: 'age_range', label: 'Age range', source: 'users.age_range', status: 'Good', n: 331, impact: '+3.5%', requires: 'age range set' },
      { key: 'gender', label: 'Gender', source: 'users.gender', status: 'Good', n: 309, impact: '+2.8%', requires: 'profile field set' },
      { key: 'enhancement_status', label: 'Enhancement status', source: 'users.enhancement_status', status: 'Sparse', n: 74, impact: '+9.6%', requires: 'private profile field set' },
      { key: 'height_cm', label: 'Height', source: 'users.height_cm', status: 'Sparse', n: 86, impact: '+1.4%', requires: 'body profile set' },
      { key: 'bodyweight_profile', label: 'Profile bodyweight', source: 'users.bodyweight_kg', status: 'Good', n: 288, impact: '+2.7%', requires: 'profile bodyweight set' },
    ],
  },
  {
    key: 'lifestyle',
    label: 'Lifestyle',
    variables: [
      { key: 'sleep_hours', label: 'Self-reported sleep', source: 'users.sleep_hours', status: 'Good', n: 216, impact: '+4.0%', requires: 'sleep set on profile' },
      { key: 'stress_level', label: 'Self-reported stress', source: 'users.stress_level', status: 'Good', n: 198, impact: '-3.6%', requires: 'stress set on profile' },
      { key: 'nutrition_phase', label: 'Nutrition phase', source: 'users.nutrition_phase', status: 'Good', n: 252, impact: '+5.7%', requires: 'bulk, cut, or maintenance set' },
      { key: 'protein_g_per_kg', label: 'Protein intake', source: 'users.protein_g_per_kg', status: 'Sparse', n: 97, impact: '+3.2%', requires: 'protein g/kg set' },
      { key: 'protein_consistency', label: 'Protein consistency', source: 'users.protein_consistency', status: 'Sparse', n: 66, impact: '+2.9%', requires: 'nutrition profile set' },
      { key: 'creatine_use', label: 'Creatine use', source: 'users.creatine_use', status: 'Good', n: 183, impact: '+2.4%', requires: 'supplement profile set' },
      { key: 'physical_labor_level', label: 'Physical labor', source: 'users.physical_labor_level', status: 'Sparse', n: 52, impact: '-2.0%', requires: 'work profile set' },
      { key: 'avg_daily_steps', label: 'Average daily steps', source: 'users.avg_daily_steps', status: 'Sparse', n: 43, impact: '+1.8%', requires: 'steps set on profile' },
      { key: 'vo2_max', label: 'VO2 max', source: 'users.vo2_max', status: 'Sparse', n: 31, impact: '+2.2%', requires: 'VO2 max set' },
    ],
  },
  {
    key: 'daily',
    label: 'Daily log',
    variables: [
      { key: 'avg_sleep_duration', label: 'Logged sleep duration', source: 'user_systemic_profile.avg_sleep_duration', status: 'Good', n: 178, impact: '+4.7%', requires: '4+ daily sleep logs' },
      { key: 'avg_sleep_quality', label: 'Sleep quality', source: 'user_systemic_profile.avg_sleep_quality', status: 'Good', n: 171, impact: '+4.1%', requires: '4+ sleep quality logs' },
      { key: 'sleep_variance', label: 'Sleep variance', source: 'user_systemic_profile.sleep_variance', status: 'Sparse', n: 83, impact: '-3.3%', requires: 'multiple weekly sleep logs' },
      { key: 'avg_nutrition_quality', label: 'Nutrition quality', source: 'user_systemic_profile.avg_nutrition_quality', status: 'Good', n: 156, impact: '+3.9%', requires: 'daily nutrition rating' },
      { key: 'avg_stress', label: 'Logged stress', source: 'user_systemic_profile.avg_stress', status: 'Good', n: 142, impact: '-4.4%', requires: 'daily stress rating' },
      { key: 'hydration', label: 'Hydration', source: 'daily_log.hydration', status: 'Sparse', n: 58, impact: '+1.6%', requires: 'daily hydration logs' },
      { key: 'subjective_energy', label: 'Subjective energy', source: 'daily_log.subjective_energy', status: 'Sparse', n: 61, impact: '+3.1%', requires: 'daily energy logs' },
      { key: 'illness_flag', label: 'Illness flag', source: 'daily_log.illness_flag', status: 'Weak', n: 39, impact: '-6.5%', requires: 'illness logged in same week' },
    ],
  },
  {
    key: 'cardio',
    label: 'Cardio',
    variables: [
      { key: 'sport_primary', label: 'Primary sport', source: 'users.sport_primary', status: 'Good', n: 121, impact: '-1.9%', requires: 'sport profile set' },
      { key: 'sport_sessions_per_week', label: 'Sport sessions / week', source: 'users.sport_sessions_per_week', status: 'Sparse', n: 70, impact: '-2.6%', requires: 'sport frequency set' },
      { key: 'total_cardio_minutes', label: 'Cardio minutes', source: 'user_systemic_profile.total_cardio_minutes', status: 'Good', n: 111, impact: '-2.8%', requires: 'activity logs in same weeks' },
      { key: 'total_cardio_load', label: 'Cardio load', source: 'user_systemic_profile.total_cardio_load', status: 'Weak', n: 61, impact: '-3.4%', requires: 'cardio duration and intensity' },
      { key: 'running_load', label: 'Running load', source: 'user_systemic_profile.running_load', status: 'Sparse', n: 44, impact: '-4.2%', requires: 'running activity logs' },
      { key: 'cycling_load', label: 'Cycling load', source: 'user_systemic_profile.cycling_load', status: 'Sparse', n: 37, impact: '-1.5%', requires: 'cycling activity logs' },
      { key: 'swimming_load', label: 'Swimming load', source: 'user_systemic_profile.swimming_load', status: 'Sparse', n: 18, impact: '-0.8%', requires: 'swimming activity logs' },
      { key: 'activity_intensity', label: 'Activity intensity', source: 'activity_log.intensity', status: 'Sparse', n: 55, impact: '-2.1%', requires: 'activity intensity logged' },
    ],
  },
  {
    key: 'body',
    label: 'Body',
    variables: [
      { key: 'bodyweight_history', label: 'Bodyweight trend', source: 'user_systemic_profile.bodyweight_trend', status: 'Good', n: 184, impact: '+2.6%', requires: 'bodyweight history' },
      { key: 'arm_cm', label: 'Arm measurement', source: 'body_metrics_history.arm_cm', status: 'Sparse', n: 48, impact: '+3.7%', requires: 'arm measurement history' },
      { key: 'chest_cm', label: 'Chest measurement', source: 'body_metrics_history.chest_cm', status: 'Sparse', n: 45, impact: '+3.5%', requires: 'chest measurement history' },
      { key: 'waist_cm', label: 'Waist measurement', source: 'body_metrics_history.waist_cm', status: 'Sparse', n: 59, impact: '-1.2%', requires: 'waist measurement history' },
      { key: 'thigh_cm', label: 'Thigh measurement', source: 'body_metrics_history.thigh_cm', status: 'Sparse', n: 36, impact: '+2.9%', requires: 'thigh measurement history' },
      { key: 'calf_cm', label: 'Calf measurement', source: 'body_metrics_history.calf_cm', status: 'Sparse', n: 29, impact: '+1.6%', requires: 'calf measurement history' },
    ],
  },
  {
    key: 'workout',
    label: 'Workout',
    variables: [
      { key: 'duration_min', label: 'Session duration', source: 'workouts.duration_min', status: 'Good', n: 401, impact: '+4.5%', requires: 'finished workout duration' },
      { key: 'workout_day', label: 'Workout day', source: 'workouts.workout_day', status: 'Good', n: 358, impact: '+2.6%', requires: 'workout day label' },
      { key: 'workout_split_type', label: 'Workout split type', source: 'workouts.workout_split_type', status: 'Good', n: 339, impact: '+3.8%', requires: 'split saved on workout' },
      { key: 'session_effort', label: 'Session effort', source: 'workouts.session_effort', status: 'Sparse', n: 77, impact: '+5.5%', requires: 'post-workout effort rating' },
      { key: 'feel_rating', label: 'Feel rating', source: 'workouts.feel_rating', status: 'Sparse', n: 68, impact: '+4.9%', requires: 'post-workout feel rating' },
      { key: 'adherence', label: 'Adherence', source: 'workouts.adherence', status: 'Sparse', n: 73, impact: '+3.4%', requires: 'program adherence logged' },
      { key: 'substitutions_note', label: 'Substitutions', source: 'workouts.substitutions_note', status: 'Weak', n: 41, impact: '-1.7%', requires: 'substitution notes' },
      { key: 'soreness_note', label: 'Soreness notes', source: 'workouts.soreness_note', status: 'Weak', n: 34, impact: '-2.4%', requires: 'soreness notes' },
    ],
  },
  {
    key: 'exercise',
    label: 'Exercise',
    variables: [
      { key: 'total_sessions', label: 'Total sessions', source: 'user_exercise_profile.total_sessions', status: 'Strong', n: 482, impact: '+7.9%', requires: 'exercise history' },
      { key: 'weeks_of_data', label: 'Weeks of data', source: 'user_exercise_profile.weeks_of_data', status: 'Strong', n: 477, impact: '+6.6%', requires: 'weekly aggregation' },
      { key: 'avg_weekly_frequency', label: 'Weekly frequency', source: 'user_exercise_profile.avg_weekly_frequency', status: 'Strong', n: 482, impact: '+10.2%', requires: '6+ logged training weeks' },
      { key: 'avg_session_position', label: 'Session position', source: 'user_exercise_profile.avg_session_position', status: 'Good', n: 366, impact: '+4.3%', requires: 'exercise order data' },
      { key: 'avg_reps', label: 'Average reps', source: 'user_exercise_profile.avg_reps', status: 'Good', n: 395, impact: '+3.1%', requires: 'working sets logged' },
      { key: 'avg_weight_kg', label: 'Average weight', source: 'user_exercise_profile.avg_weight_kg', status: 'Good', n: 392, impact: '+4.6%', requires: 'working sets logged' },
      { key: 'estimated_1rm_variable', label: 'Estimated 1RM level', source: 'user_exercise_profile.estimated_1rm', status: 'Good', n: 371, impact: '+5.8%', requires: 'weight and reps logged' },
      { key: 'rir_logging_rate', label: 'RIR logging rate', source: 'user_exercise_profile.rir_logging_rate', status: 'Good', n: 219, impact: '+6.1%', requires: 'RIR on 70% of sets' },
      { key: 'typical_equipment', label: 'Typical equipment', source: 'user_exercise_profile.typical_equipment', status: 'Good', n: 302, impact: '+2.5%', requires: 'exercise equipment known' },
    ],
  },
  {
    key: 'set',
    label: 'Set log',
    variables: [
      { key: 'session_set_order', label: 'Session set order', source: 'sets.session_set_order', status: 'Good', n: 318, impact: '+3.0%', requires: 'set order captured' },
      { key: 'session_position', label: 'Exercise position', source: 'sets.session_position', status: 'Good', n: 354, impact: '+4.0%', requires: 'exercise order captured' },
      { key: 'set_number', label: 'Set number', source: 'sets.set_number', status: 'Strong', n: 506, impact: '-2.2%', requires: 'sets logged' },
      { key: 'weight_kg', label: 'Set weight', source: 'sets.weight_kg', status: 'Strong', n: 512, impact: '+5.9%', requires: 'weight logged' },
      { key: 'reps', label: 'Set reps', source: 'sets.reps', status: 'Strong', n: 512, impact: '+3.7%', requires: 'reps logged' },
      { key: 'rir', label: 'Set RIR', source: 'sets.rir', status: 'Good', n: 219, impact: '+6.1%', requires: 'RIR logged' },
      { key: 'failure', label: 'Set to failure', source: 'sets.failure', status: 'Good', n: 246, impact: '+2.8%', requires: 'failure flag logged' },
      { key: 'rest_seconds', label: 'Rest period', source: 'sets.rest_seconds', status: 'Good', n: 318, impact: '+8.4%', requires: 'rest logged on working sets' },
      { key: 'pain_flag', label: 'Pain flag', source: 'sets.pain_flag', status: 'Sparse', n: 64, impact: '-5.1%', requires: 'pain flag logged' },
      { key: 'set_type', label: 'Set type', source: 'sets.set_type', status: 'Good', n: 338, impact: '+2.9%', requires: 'working, warmup, drop, or amrap' },
      { key: 'rom_category', label: 'ROM category', source: 'sets.rom_category', status: 'Sparse', n: 88, impact: '+4.4%', requires: 'ROM category logged' },
      { key: 'tempo_tag', label: 'Tempo tag', source: 'sets.tempo_tag', status: 'Sparse', n: 71, impact: '+3.3%', requires: 'tempo tag logged' },
      { key: 'intensity_technique', label: 'Intensity technique', source: 'sets.intensity_technique', status: 'Sparse', n: 49, impact: '+2.0%', requires: 'advanced set tag logged' },
      { key: 'equipment_type_set', label: 'Set equipment', source: 'sets.equipment_type', status: 'Good', n: 301, impact: '+2.7%', requires: 'equipment captured on set' },
    ],
  },
  {
    key: 'exercise_meta',
    label: 'Exercise meta',
    variables: [
      { key: 'primary_muscle', label: 'Primary muscle', source: 'exercises.primary_muscle', status: 'Strong', n: 619, impact: '+4.7%', requires: 'seed or custom exercise' },
      { key: 'secondary_muscle', label: 'Secondary muscle', source: 'exercises.secondary_muscle', status: 'Good', n: 411, impact: '+2.2%', requires: 'exercise metadata' },
      { key: 'movement_pattern', label: 'Movement pattern', source: 'exercises.movement_pattern', status: 'Strong', n: 593, impact: '+3.6%', requires: 'exercise metadata' },
      { key: 'equipment_type', label: 'Exercise equipment', source: 'exercises.equipment_type', status: 'Strong', n: 584, impact: '+3.8%', requires: 'exercise metadata' },
      { key: 'force_vector', label: 'Force vector', source: 'exercises.force_vector', status: 'Good', n: 376, impact: '+2.9%', requires: 'exercise metadata' },
      { key: 'bilateral', label: 'Bilateral / unilateral', source: 'exercises.bilateral', status: 'Good', n: 389, impact: '+1.9%', requires: 'exercise metadata' },
      { key: 'variation_details', label: 'Variation details', source: 'sets.variation_details', status: 'Sparse', n: 53, impact: '+2.4%', requires: 'variation text logged' },
      { key: 'machine_brand', label: 'Machine brand', source: 'sets.machine_brand', status: 'Sparse', n: 26, impact: '+1.8%', requires: 'machine details logged' },
      { key: 'machine_model', label: 'Machine model', source: 'sets.machine_model', status: 'Sparse', n: 21, impact: '+1.5%', requires: 'machine details logged' },
    ],
  },
]

const MOCK_VARIABLES = BUILDER_VARIABLE_GROUPS.flatMap(group => group.variables.map(variable => ({ ...variable, family: group.label })))

const MOCK_RULES = [
  { key: 'sessions', label: '8+ bench sessions', delta: 74 },
  { key: 'weeks', label: '6+ logged weeks', delta: 46 },
  { key: 'completion', label: '70% set completion', delta: 28 },
  { key: 'rirLogging', label: 'Require RIR for RIR questions', delta: -33 },
]

const CANVAS_NODES = [
  { key: 'bench', label: 'Bench press', kind: 'Target', status: 'strong', column: 'exercise_id' },
  { key: 'rest', label: 'Rest period', kind: 'Set log', status: 'strong', column: 'sets.rest_seconds' },
  { key: 'sleep', label: 'Sleep quality', kind: 'Lifestyle', status: 'sparse', column: 'user_systemic_profile.avg_sleep_quality' },
  { key: 'rir', label: 'RIR discipline', kind: 'Behavior', status: 'weak', column: 'user_exercise_profile.rir_logging_rate' },
  { key: 'progress', label: 'Progression', kind: 'Outcome', status: 'strong', column: 'user_exercise_profile.progression_rate' },
  { key: 'cardio', label: 'Cardio load', kind: 'Systemic', status: 'invalid', column: 'user_systemic_profile.total_cardio_load' },
]

const NOTEBOOK_BRANCHES = [
  { key: 'base', title: 'Does rest length change bench progression?', status: 'Good', n: 482, note: 'Saved from logged bench history.', variables: ['Rest period'], result: '+8.4% for 3-5 min rest' },
  { key: 'people', title: 'Same question for people like me', status: 'Sparse', n: 42, note: 'Narrows to intermediate hypertrophy lifters.', variables: ['Rest period', 'People like me'], result: '+5.1%, wide confidence band' },
  { key: 'rir', title: 'Branch: account for RIR discipline', status: 'Good', n: 219, note: 'Adds RIR logging requirement before comparing rest buckets.', variables: ['Rest period', 'RIR discipline'], result: '+6.8% after RIR filter' },
  { key: 'sleep', title: 'Branch: sleep x rest interaction', status: 'Weak', n: 31, note: 'Valid but underpowered. Keep as watchlist.', variables: ['Rest period', 'Sleep duration'], result: 'Directional only' },
]

export function ConceptLab() {
  const [active, setActive] = useState('builder')
  const concept = CONCEPTS.find(c => c.key === active) || CONCEPTS[0]

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Explorer concepts"
        body="Three mobile-first clickable directions for making the research space feel vast, valid, and approachable."
      />

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {CONCEPTS.map(c => (
            <button
              key={c.key}
              type="button"
              onClick={() => setActive(c.key)}
              className="min-w-32 rounded-2xl px-4 py-3 text-left"
              style={{ background: active === c.key ? STUDY_ACCENT_FAINT : STUDY_CARD, border: `1px solid ${active === c.key ? STUDY_ACCENT : STUDY_BORDER}` }}
            >
              <span className="block text-xs font-semibold" style={{ color: active === c.key ? STUDY_TEXT : STUDY_MUTED }}>{c.label}</span>
              <span className="mt-1 block text-[11px]" style={{ color: STUDY_MUTED }}>{c.title}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-2xl p-4" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
        <div className="mb-4">
          <p className="text-base font-semibold" style={{ color: STUDY_TEXT }}>{concept.title}</p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: STUDY_MUTED }}>{concept.body}</p>
        </div>
        {active === 'builder' && <BuilderConcept />}
        {active === 'canvas' && <CanvasConcept />}
        {active === 'notebook' && <NotebookConcept />}
      </section>
    </div>
  )
}

function BuilderConcept() {
  const [step, setStep] = useState('variables')
  const [outcome, setOutcome] = useState('progression_rate')
  const [variables, setVariables] = useState(['rest_seconds', 'rir', 'avg_weekly_frequency', 'avg_sleep_duration'])
  const [rules, setRules] = useState(['sessions', 'weeks', 'completion'])
  const [population, setPopulation] = useState('people_like_me')
  const [ran, setRan] = useState(false)
  const current = BUILDER_STEPS.find(s => s.key === step) || BUILDER_STEPS[0]
  const stepIndex = BUILDER_STEPS.findIndex(s => s.key === current.key)
  const selectedOutcome = BUILDER_OUTCOMES.find(item => item.key === outcome) || BUILDER_OUTCOMES[0]
  const selectedVariables = MOCK_VARIABLES.filter(v => variables.includes(v.key))
  const selectedRules = MOCK_RULES.filter(r => rules.includes(r.key))
  const hasSparse = selectedVariables.some(v => v.status === 'Sparse' || v.status === 'Weak')
  const selectedFloor = selectedVariables.length ? Math.min(...selectedVariables.map(v => v.n)) : 560
  const qualified = Math.max(12, Math.min(selectedFloor, 560) - selectedRules.reduce((sum, rule) => sum + rule.delta, 0) - selectedVariables.length * 7 - (population === 'people_like_me' ? 42 : 0))
  const status = qualified >= 120 && !hasSparse ? 'Strong' : qualified >= 60 ? 'Good' : 'Sparse'
  const confidence = Math.min(88, Math.max(24, Math.round(qualified / 4) - (hasSparse ? 10 : 0)))
  const rankedVariables = [...selectedVariables].sort((a, b) => b.n - a.n).slice(0, 8)

  function toggleValue(value, list, setter) {
    setter(list.includes(value) ? list.filter(item => item !== value) : [...list, value])
    setRan(false)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {BUILDER_STEPS.map((s, index) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStep(s.key)}
            className="rounded-xl px-2 py-2 text-center text-[11px] font-semibold"
            style={step === s.key ? BRAND_ACTIVE_STYLE : { background: STUDY_BG, color: STUDY_MUTED, border: `1px solid ${STUDY_BORDER}` }}
          >
            {index + 1}. {s.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl p-4" style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}>
        <p className="text-xs font-mono" style={{ color: STUDY_ACCENT }}>Step {stepIndex + 1} of {BUILDER_STEPS.length}</p>
        <h3 className="mt-2 text-lg font-semibold leading-tight" style={{ color: STUDY_TEXT }}>{current.title}</h3>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: STUDY_MUTED }}>{current.detail}</p>
        {step === 'outcome' && <BuilderOutcome outcome={outcome} setOutcome={value => { setOutcome(value); setRan(false) }} />}
        {step === 'scope' && <BuilderScope population={population} setPopulation={value => { setPopulation(value); setRan(false) }} />}
        {step === 'variables' && <BuilderVariablePicker variables={variables} onToggle={key => toggleValue(key, variables, setVariables)} />}
        {step === 'rules' && <BuilderRulePicker rules={rules} onToggle={key => toggleValue(key, rules, setRules)} />}
      </div>

      <div className="rounded-2xl p-4" style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: STUDY_TEXT }}>Current study</p>
            <p className="mt-1 text-xs" style={{ color: STUDY_MUTED }}>{selectedOutcome.label} across {selectedVariables.length} tracked variables.</p>
          </div>
          <span className="rounded-xl px-3 py-1.5 font-mono text-[11px]" style={{ background: STUDY_CARD, color: STUDY_MUTED }}>{selectedOutcome.units}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedVariables.slice(0, 10).map(variable => (
            <span key={variable.key} className="rounded-xl px-3 py-1.5 text-xs" style={{ background: STUDY_CARD, color: STUDY_TEXT, border: `1px solid ${STUDY_BORDER}` }}>
              {variable.label}
            </span>
          ))}
          {selectedVariables.length > 10 && (
            <span className="rounded-xl px-3 py-1.5 text-xs" style={{ background: STUDY_CARD, color: STUDY_MUTED, border: `1px solid ${STUDY_BORDER}` }}>
              +{selectedVariables.length - 10} more
            </span>
          )}
        </div>
      </div>

      <GuardrailCard
        title={ran ? 'Mock result' : 'Evidence forecast'}
        status={status}
        body={hasSparse
          ? 'Valid, but at least one selected variable is sparse. The study can still run with an evidence warning and a watchlist result.'
          : `Selected variables and qualification rules are compatible for ${selectedOutcome.label.toLowerCase()}.`}
        n={qualified}
        confidence={confidence}
      />

      {ran && (
        <div className="space-y-3 rounded-2xl p-4" style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}>
          <p className="text-sm font-semibold" style={{ color: STUDY_TEXT }}>Ranked factors</p>
          {rankedVariables.map(variable => (
            <ResultMiniRow key={variable.key} label={variable.label} status={variable.status} n={variable.n} value={variable.impact} />
          ))}
          {selectedVariables.length > rankedVariables.length && (
            <p className="text-xs" style={{ color: STUDY_MUTED }}>{selectedVariables.length - rankedVariables.length} additional variables saved to the mock scan.</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setRan(true)} className="rounded-xl py-3 text-sm font-semibold" style={BRAND_BUTTON_STYLE}>
          {ran ? 'Run again' : 'Run study'}
        </button>
        <button type="button" onClick={() => setStep('rules')} className="rounded-xl py-3 text-sm font-semibold" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER_STRONG}`, color: STUDY_TEXT }}>
          Edit rules
        </button>
      </div>
    </div>
  )
}

function CanvasConcept() {
  const [selected, setSelected] = useState('rest')
  const [chosen, setChosen] = useState(['bench', 'rest', 'progress'])
  const node = CANVAS_NODES.find(n => n.key === selected) || CANVAS_NODES[0]
  const chosenNodes = CANVAS_NODES.filter(n => chosen.includes(n.key))
  const edgeStatus = node.status === 'invalid' ? 'Invalid in this context' : node.status === 'sparse' ? 'Valid but sparse' : node.status === 'weak' ? 'Valid, weak signal' : 'Valid and qualified'

  function toggleNode(key) {
    if (key === 'bench' || key === 'progress') return
    setChosen(items => items.includes(key) ? items.filter(item => item !== key) : [...items, key])
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-3" style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}>
        <p className="text-xs font-semibold" style={{ color: STUDY_TEXT }}>Canvas query</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {chosenNodes.map(n => (
            <span key={n.key} className="rounded-xl px-3 py-1.5 text-xs" style={{ background: STUDY_CARD, color: STUDY_TEXT, border: `1px solid ${statusColor(n.status)}` }}>
              {n.label}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-3" style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}>
        <div className="grid grid-cols-2 gap-3">
          {CANVAS_NODES.map(n => (
            <button
              key={n.key}
              type="button"
              onClick={() => { setSelected(n.key); toggleNode(n.key) }}
              className="min-h-24 rounded-2xl p-3 text-left"
              style={{
                background: chosen.includes(n.key) ? STUDY_ACCENT_FAINT : STUDY_CARD,
                border: `1px solid ${selected === n.key ? STUDY_ACCENT : statusColor(n.status)}`,
              }}
            >
              <span className="text-[10px] font-mono uppercase" style={{ color: STUDY_MUTED }}>{n.kind}</span>
              <span className="mt-2 block text-sm font-semibold leading-tight" style={{ color: STUDY_TEXT }}>{n.label}</span>
              <span className="mt-2 block text-[11px]" style={{ color: statusColor(n.status) }}>{statusLabel(n.status)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: STUDY_TEXT }}>{node.label} to Progression</p>
            <p className="mt-1 text-xs" style={{ color: STUDY_MUTED }}>{edgeStatus}</p>
          </div>
          <EvidenceBadge status={node.status === 'strong' ? 'Good' : node.status === 'invalid' ? 'Not enough' : 'Sparse'} />
        </div>
        <div className="mt-4 space-y-2">
          <CanvasEdge label="Measured as" value={node.column} />
          <CanvasEdge label="Requires" value={node.key === 'rir' ? 'RIR logging rate >= 70%' : node.key === 'sleep' ? '4+ weeks daily logs' : node.key === 'cardio' ? 'Exercise-specific target missing' : '6+ qualified weeks'} />
          <CanvasEdge label="Allowed action" value={node.status === 'invalid' ? 'Explain and suggest target switch' : 'Run anyway with evidence label'} />
          <CanvasEdge label="Current cohort" value={node.status === 'strong' ? 'n=318' : node.status === 'sparse' ? 'n=27' : node.status === 'weak' ? 'n=74' : 'n=0'} />
        </div>
      </div>

      <div className="space-y-2 rounded-2xl p-4" style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}>
        <p className="text-sm font-semibold" style={{ color: STUDY_TEXT }}>Relationships</p>
        {chosen.filter(key => !['bench', 'progress'].includes(key)).map(key => {
          const item = CANVAS_NODES.find(n => n.key === key)
          return <ResultMiniRow key={key} label={`${item.label} with progression`} status={item.status === 'strong' ? 'Good' : item.status === 'invalid' ? 'Invalid' : item.status === 'weak' ? 'Weak' : 'Sparse'} n={item.status === 'invalid' ? 0 : item.status === 'sparse' ? 27 : item.status === 'weak' ? 74 : 318} value={item.status === 'invalid' ? 'Switch target' : item.status === 'sparse' ? 'Watch' : 'Run'} />
        })}
      </div>

      <button type="button" className="w-full rounded-xl py-3 text-sm font-semibold" style={node.status === 'invalid' ? { background: STUDY_CARD, border: `1px solid ${STUDY_BORDER_STRONG}`, color: STUDY_MUTED } : BRAND_ACTIVE_STYLE}>
        {node.status === 'invalid' ? 'Show compatible paths' : 'Build study from canvas'}
      </button>
    </div>
  )
}

function NotebookConcept() {
  const [active, setActive] = useState('rir')
  const [branches, setBranches] = useState(NOTEBOOK_BRANCHES)
  const branch = branches.find(b => b.key === active) || branches[0]

  function addBranch() {
    const key = `branch-${branches.length + 1}`
    const next = {
      key,
      title: `Branch: ${branch.variables[0]} plus protein intake`,
      status: 'Sparse',
      n: Math.max(24, branch.n - 58),
      note: 'Mock branch from the selected saved study.',
      variables: [...new Set([...branch.variables, 'Protein intake'])],
      result: 'Needs more qualified logs',
    }
    setBranches(items => [...items, next])
    setActive(key)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}>
        <p className="text-[10px] font-mono uppercase" style={{ color: STUDY_ACCENT }}>Notebook question</p>
        <h3 className="mt-2 text-lg font-semibold leading-tight" style={{ color: STUDY_TEXT }}>Why do some lifters progress faster on bench?</h3>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: STUDY_MUTED }}>Start from a real logged-data question, then branch into narrower cohorts and multi-variable explanations.</p>
      </div>

      <div className="space-y-2">
        {branches.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActive(item.key)}
            className="w-full rounded-2xl p-3 text-left"
            style={{ background: active === item.key ? STUDY_ACCENT_FAINT : STUDY_BG, border: `1px solid ${active === item.key ? STUDY_ACCENT : STUDY_BORDER}` }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold leading-snug" style={{ color: STUDY_TEXT }}>{item.title}</p>
              <EvidenceBadge status={item.status} />
            </div>
            <p className="mt-1 text-xs" style={{ color: STUDY_MUTED }}>{item.note}</p>
            <p className="mt-2 font-mono text-xs" style={{ color: STUDY_MUTED }}>n={item.n}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl p-4" style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}>
        <p className="text-sm font-semibold" style={{ color: STUDY_TEXT }}>{branch.title}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {branch.variables.map(variable => (
            <span key={variable} className="rounded-xl px-3 py-1.5 text-xs" style={{ background: STUDY_CARD, color: STUDY_TEXT }}>{variable}</span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <MiniMetric label="Evidence" value={branch.status} />
          <MiniMetric label="Cohort" value={`n=${branch.n}`} />
          <MiniMetric label="Result" value={branch.result} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={addBranch} className="rounded-xl py-3 text-sm font-semibold" style={BRAND_BUTTON_STYLE}>
            Branch
          </button>
          <button type="button" className="rounded-xl py-3 text-sm font-semibold" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER_STRONG}`, color: STUDY_TEXT }}>
            Compare
          </button>
        </div>
      </div>
    </div>
  )
}

function BuilderOutcome({ outcome, setOutcome }) {
  const selected = BUILDER_OUTCOMES.find(item => item.key === outcome) || BUILDER_OUTCOMES[0]

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-xl p-3" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_ACCENT}` }}>
        <p className="text-xs font-semibold" style={{ color: STUDY_TEXT }}>Selected outcome</p>
        <p className="mt-1 text-sm" style={{ color: STUDY_MUTED }}>{selected.detail}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {BUILDER_OUTCOMES.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => setOutcome(item.key)}
            className="rounded-xl px-3 py-2 text-left text-xs"
            style={{ background: outcome === item.key ? STUDY_ACCENT_FAINT : STUDY_CARD, color: STUDY_TEXT, border: `1px solid ${outcome === item.key ? STUDY_ACCENT : STUDY_BORDER}` }}
          >
            <span className="block font-semibold">{item.label}</span>
            <span className="mt-1 block font-mono text-[10px]" style={{ color: STUDY_MUTED }}>{item.units}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function BuilderScope({ population, setPopulation }) {
  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {[
          ['people_like_me', 'People like me'],
          ['all_opted_in', 'All opted-in'],
        ].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setPopulation(key)} className="rounded-xl px-3 py-3 text-left text-xs font-semibold" style={{ background: population === key ? STUDY_ACCENT_FAINT : STUDY_CARD, color: STUDY_TEXT, border: `1px solid ${population === key ? STUDY_ACCENT : STUDY_BORDER}` }}>
            {label}
          </button>
        ))}
      </div>
      <div className="rounded-xl p-3" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
        <p className="text-xs font-semibold" style={{ color: STUDY_TEXT }}>Target</p>
        <p className="mt-1 text-xs" style={{ color: STUDY_MUTED }}>Bench press, barbell, hypertrophy goal, intermediate lifters.</p>
      </div>
    </div>
  )
}

function BuilderVariablePicker({ variables, onToggle }) {
  const [groupKey, setGroupKey] = useState('set')
  const group = BUILDER_VARIABLE_GROUPS.find(item => item.key === groupKey) || BUILDER_VARIABLE_GROUPS[0]

  return (
    <div className="mt-4 space-y-3">
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {BUILDER_VARIABLE_GROUPS.map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => setGroupKey(item.key)}
              className="min-w-fit rounded-xl px-3 py-2 text-xs font-semibold"
              style={{ background: group.key === item.key ? STUDY_ACCENT_FAINT : STUDY_CARD, color: group.key === item.key ? STUDY_TEXT : STUDY_MUTED, border: `1px solid ${group.key === item.key ? STUDY_ACCENT : STUDY_BORDER}` }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
        <span className="text-xs font-semibold" style={{ color: STUDY_TEXT }}>{group.label} variables</span>
        <span className="font-mono text-[11px]" style={{ color: STUDY_MUTED }}>{variables.length} selected</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
      {group.variables.map(variable => {
        const active = variables.includes(variable.key)
        return (
          <button
            key={variable.key}
            type="button"
            onClick={() => onToggle(variable.key)}
            className="min-h-28 rounded-xl p-3 text-left"
            style={{ background: active ? STUDY_ACCENT_FAINT : STUDY_CARD, border: `1px solid ${active ? STUDY_ACCENT : STUDY_BORDER}` }}
          >
            <span className="block text-xs font-semibold leading-tight" style={{ color: STUDY_TEXT }}>{variable.label}</span>
            <span className="mt-1 block truncate font-mono text-[10px]" style={{ color: STUDY_MUTED }}>{variable.source}</span>
            <span className="mt-2 block font-mono text-[11px]" style={{ color: statusTextColor(variable.status) }}>{variable.status} / n={variable.n}</span>
            <span className="mt-1 block text-[11px] leading-snug" style={{ color: STUDY_MUTED }}>{variable.requires}</span>
          </button>
        )
      })}
      </div>
    </div>
  )
}

function BuilderRulePicker({ rules, onToggle }) {
  return (
    <div className="mt-4 space-y-2">
      {MOCK_RULES.map(rule => {
        const active = rules.includes(rule.key)
        return (
          <button
            key={rule.key}
            type="button"
            onClick={() => onToggle(rule.key)}
            className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left"
            style={{ background: active ? STUDY_ACCENT_FAINT : STUDY_CARD, border: `1px solid ${active ? STUDY_ACCENT : STUDY_BORDER}` }}
          >
            <span className="text-xs font-semibold" style={{ color: STUDY_TEXT }}>{rule.label}</span>
            <span className="font-mono text-[11px]" style={{ color: STUDY_MUTED }}>{rule.delta > 0 ? '-' : '+'}{Math.abs(rule.delta)} users</span>
          </button>
        )
      })}
    </div>
  )
}

function GuardrailCard({ title, status, body, n, confidence }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: STUDY_TEXT }}>{title}</p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: STUDY_MUTED }}>{body}</p>
        </div>
        <EvidenceBadge status={status.includes('Good') ? 'Good' : 'Sparse'} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniMetric label="Matched users" value={`n=${n}`} />
        <MiniMetric label="Confidence" value={`${confidence}%`} />
      </div>
    </div>
  )
}

function ResultMiniRow({ label, status, n, value }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 rounded-xl p-3" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
      <div>
        <p className="text-xs font-semibold" style={{ color: STUDY_TEXT }}>{label}</p>
        <p className="mt-1 font-mono text-[11px]" style={{ color: STUDY_MUTED }}>n={n}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-xs font-semibold" style={{ color: statusTextColor(status) }}>{value}</p>
        <p className="mt-1 text-[10px] uppercase" style={{ color: statusTextColor(status) }}>{status}</p>
      </div>
    </div>
  )
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl p-3" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
      <p className="text-[10px] uppercase tracking-widest" style={{ color: STUDY_MUTED }}>{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold" style={{ color: STUDY_TEXT }}>{value}</p>
    </div>
  )
}

function CanvasEdge({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ background: STUDY_CARD }}>
      <span className="text-xs" style={{ color: STUDY_MUTED }}>{label}</span>
      <span className="text-right text-xs font-medium" style={{ color: STUDY_TEXT }}>{value}</span>
    </div>
  )
}

function statusLabel(status) {
  if (status === 'strong') return 'qualified'
  if (status === 'sparse') return 'sparse'
  if (status === 'weak') return 'weak signal'
  return 'invalid edge'
}

function statusTextColor(status) {
  if (status === 'Strong' || status === 'Good' || status === 'strong') return STUDY_ACCENT
  if (status === 'Sparse' || status === 'Weak' || status === 'weak' || status === 'sparse') return STUDY_COMPARE_B
  if (status === 'Invalid' || status === 'invalid') return STUDY_DIM
  return STUDY_MUTED
}

function statusColor(status) {
  if (status === 'strong') return STUDY_ACCENT
  if (status === 'sparse') return STUDY_COMPARE_B
  if (status === 'weak') return '#d6b96d'
  return STUDY_DIM
}

const CONTROL_CHIPS = ['Baseline strength', 'Bodyweight', 'Weekly sessions', 'Proximity to failure', 'Sleep duration', 'Protein intake']

const BUILDER_STEPS_FLOW = [
  { key: 'in', label: 'In' },
  { key: 'measure', label: 'Measure' },
  { key: 'variables', label: 'Variables' },
  { key: 'population', label: 'Population' },
  { key: 'review', label: 'Review' },
]

const VARIABLE_FAMILIES = [
  { key: 'set', label: 'Set log', keys: ['rest_period_bucket', 'rir_bucket', 'rep_range_bucket', 'session_set_order_bucket'] },
  { key: 'training', label: 'Training', keys: ['frequency_bucket', 'session_position_bucket', 'split_type', 'rir_use'] },
  { key: 'lifestyle', label: 'Lifestyle', keys: ['sleep_duration_bucket', 'sleep_quality_quartile', 'stress_bucket', 'cardio_load_quartile', 'protein_bucket', 'nutrition_phase', 'creatine_use'] },
  { key: 'profile', label: 'Profile', keys: ['experience_level', 'goal', 'gender', 'age_range', 'enhancement_status', 'training_age_bucket', 'physical_labor_level', 'sport_primary', 'sport_frequency_bucket'] },
  { key: 'exercise', label: 'Exercise meta', keys: ['equipment_type', 'movement_pattern', 'force_vector', 'bilateral'] },
]

const RULE_OPTIONS = [
  { key: 'sessions', label: '8+ sessions in scope', filter: { field: 'user_exercise_profile.total_sessions', op: '>=', value: 8 } },
  { key: 'weeks', label: '6+ logged weeks', filter: { field: 'user_exercise_profile.weeks_of_data', op: '>=', value: 6 } },
  { key: 'rirCoverage', label: '70%+ RIR coverage', filter: { field: 'user_exercise_profile.rir_logging_rate', op: '>=', value: 0.7 } },
]

const UNAVAILABLE_BUILDER_OPTIONS = [
  { label: 'Program adherence', reason: 'Program tables exist, but the research engine does not join program runs yet.' },
  { label: 'Machine model', reason: 'The set column exists, but it is not whitelisted as a scan axis yet.' },
  { label: 'Body measurement history', reason: 'Body metric history is logged, but not aggregated into queryable study axes yet.' },
]

function Explore(props) {
  const {
    state,
    setState,
    scanKeys,
    setScanKeys,
    selectedScan,
    setSelectedScan,
    runCurrentScan,
    saveCurrentQuestion,
    loading,
    queryResult,
    compareResult,
    scanResult,
    compareScanResult,
    previewResult,
    previewLoading,
    activeSavedId,
    user,
    exerciseName,
    personalSupported,
    populationMode,
    setPopulationMode,
    matchKeys,
    setMatchKeys,
    matchValues,
    setMatchValues,
    previewStudy,
    ruleFilters,
    setRuleFilters,
  } = props
  const [step, setStep] = useState('in')
  const [activeFamilyKey, setActiveFamilyKey] = useState('set')
  const [rulesOpen, setRulesOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [unavailableOpen, setUnavailableOpen] = useState(false)
  const [showPersonal, setShowPersonal] = useState(false)
  const resultReady = state.mode === 'compare' ? Boolean(compareResult) : Boolean(scanResult) || Boolean(queryResult)
  const rankedFamilies = useMemo(() => rankVariableFamilies(state.targetType, state.measure), [state.targetType, state.measure])
  const activeFamily = rankedFamilies.find(f => f.key === activeFamilyKey) || rankedFamilies[0]
  const allPreviewKeys = useMemo(() => [...new Set(rankedFamilies.flatMap(f => f.keys))], [rankedFamilies])
  const previewByKey = useMemo(() => {
    const m = {}
    ;(previewResult?.variables || []).forEach(item => { m[item.groupBy] = item })
    return m
  }, [previewResult])
  const selectedPreview = scanKeys.map(key => previewByKey[key]).filter(Boolean)
  const reviewN = selectedPreview.length ? Math.min(...selectedPreview.map(item => item.after || 0)) : (previewResult?.baseMatchedUsers || 0)
  const reviewStatus = evidenceStatus(reviewN)
  const reviewConfidence = confidenceFor(reviewN)
  const biggestReducer = selectedPreview.sort((a, b) => (b.removed || 0) - (a.removed || 0))[0] || previewResult?.biggestReducer
  const question = studyQuestion({ state, scanKeys, populationMode, exerciseName })
  const currentStepIndex = BUILDER_STEPS_FLOW.findIndex(item => item.key === step)
  const isLastStep = step === 'review'

  function patch(patchValue) {
    setState(current => ({ ...current, mode: 'single', filtersB: [], ...patchValue }))
  }

  function toggleScanKey(key) {
    setScanKeys(keys => (keys.includes(key) ? keys.filter(k => k !== key) : [...keys, key]))
  }

  function toggleRule(rule) {
    const exists = ruleFilters.some(f => f.field === rule.filter.field && f.op === rule.filter.op && String(f.value) === String(rule.filter.value))
    setRuleFilters(exists
      ? ruleFilters.filter(f => !(f.field === rule.filter.field && f.op === rule.filter.op && String(f.value) === String(rule.filter.value)))
      : [...ruleFilters, rule.filter])
  }

  useEffect(() => {
    const filters = populationMode === 'people_like_me'
      ? peopleToFilters(user, matchKeys, matchValues)
      : populationMode === 'custom'
        ? sanitizeFilters(state.filtersA)
        : []
    const target = targetPayloadParts(state)
    previewStudy({
      filters: [...filters, ...ruleFilters, ...target.filters],
      groupBys: allPreviewKeys,
      measure: state.measure,
      exerciseId: target.exerciseId,
      muscle: target.muscle,
      minCohort: state.minCohort,
    })
  }, [allPreviewKeys, matchKeys, matchValues, populationMode, previewStudy, ruleFilters, state, user])

  useEffect(() => {
    if (!rankedFamilies.some(f => f.key === activeFamilyKey)) setActiveFamilyKey(rankedFamilies[0]?.key || 'set')
  }, [activeFamilyKey, rankedFamilies])

  return (
    <div className="space-y-4">
      <ExploreSearchBar onSelect={config => { setPopulationMode('custom'); setState(config); setStep('review') }} />
      <BuilderProgressHeader step={step} />
      <BuilderSummary
        open={summaryOpen}
        setOpen={setSummaryOpen}
        state={state}
        scanKeys={scanKeys}
        populationMode={populationMode}
        ruleFilters={ruleFilters}
        exerciseName={exerciseName}
        setStep={setStep}
        currentStepIndex={currentStepIndex}
      />
      {step === 'in' && <BuilderInStep state={state} patch={patch} />}
      {step === 'measure' && <BuilderMeasureStep state={state} patch={patch} unavailableOpen={unavailableOpen} setUnavailableOpen={setUnavailableOpen} />}
      {step === 'variables' && (
        <BuilderVariablesStep
          rankedFamilies={rankedFamilies}
          activeFamily={activeFamily}
          setActiveFamilyKey={setActiveFamilyKey}
          scanKeys={scanKeys}
          toggleScanKey={toggleScanKey}
          previewByKey={previewByKey}
          previewResult={previewResult}
          previewLoading={previewLoading}
          unavailableOpen={unavailableOpen}
          setUnavailableOpen={setUnavailableOpen}
        />
      )}
      {step === 'population' && (
        <BuilderPopulationStep
          state={state}
          patch={patch}
          user={user}
          populationMode={populationMode}
          setPopulationMode={setPopulationMode}
          matchKeys={matchKeys}
          setMatchKeys={setMatchKeys}
          matchValues={matchValues}
          setMatchValues={setMatchValues}
        />
      )}
      {step === 'review' && (
        <BuilderReviewStep
          state={state}
          patch={patch}
          question={question}
          reviewN={reviewN}
          reviewStatus={reviewStatus}
          reviewConfidence={reviewConfidence}
          biggestReducer={biggestReducer}
          previewLoading={previewLoading}
          rulesOpen={rulesOpen}
          setRulesOpen={setRulesOpen}
          ruleFilters={ruleFilters}
          toggleRule={toggleRule}
          loading={loading}
          scanKeys={scanKeys}
          runCurrentScan={runCurrentScan}
          activeSavedId={activeSavedId}
          showPersonal={showPersonal}
          setShowPersonal={setShowPersonal}
          personalSupported={personalSupported}
        />
      )}
      <BuilderPager
        step={step}
        setStep={setStep}
        canGoNext={canAdvanceBuilder(step, state, scanKeys)}
        nextLabel={isLastStep ? 'Ready' : 'Next'}
      />
      <ResultsBlock
        state={state}
        queryResult={queryResult}
        compareResult={compareResult}
        scanResult={scanResult}
        compareScanResult={compareScanResult}
        selectedScan={selectedScan}
        setSelectedScan={setSelectedScan}
        user={user}
        showPersonal={showPersonal && personalSupported}
        exerciseName={exerciseName}
        onSaveQuery={() => saveCurrentQuestion(state.mode)}
        onSaveScan={() => saveCurrentQuestion('scan')}
        resultReady={resultReady}
        scanKeys={scanKeys}
        setStep={setStep}
        populationMode={populationMode}
      />
    </div>
  )
}

function BuilderProgressHeader({ step }) {
  const index = BUILDER_STEPS_FLOW.findIndex(item => item.key === step)
  const current = BUILDER_STEPS_FLOW[index] || BUILDER_STEPS_FLOW[0]
  return (
    <div className="rounded-2xl p-4" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs" style={{ color: STUDY_ACCENT }}>Step {index + 1} of {BUILDER_STEPS_FLOW.length}</p>
          <h2 className="mt-1 text-lg font-semibold" style={{ color: STUDY_TEXT }}>{current.label}</h2>
        </div>
        <span className="rounded-full px-3 py-1 font-mono text-xs" style={{ background: STUDY_BG, color: STUDY_MUTED, border: `1px solid ${STUDY_BORDER}` }}>
          {Math.round(((index + 1) / BUILDER_STEPS_FLOW.length) * 100)}%
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: STUDY_BG }}>
        <div className="h-full rounded-full" style={{ width: `${((index + 1) / BUILDER_STEPS_FLOW.length) * 100}%`, background: STUDY_BRAND }} />
      </div>
    </div>
  )
}

function BuilderSummary({ open, setOpen, state, scanKeys, populationMode, ruleFilters, exerciseName, setStep, currentStepIndex }) {
  const rows = [
    { step: 'in', label: 'In', value: targetSummary(state, exerciseName) },
    { step: 'measure', label: 'Measure', value: prettyMeasure(state.measure) },
    { step: 'variables', label: 'Variables', value: scanKeys.length ? `${scanKeys.length} selected` : 'None yet' },
    { step: 'population', label: 'Population', value: populationLabel(populationMode) },
    { step: 'review', label: 'Rules', value: ruleFilters.length ? `${ruleFilters.length} rule${ruleFilters.length === 1 ? '' : 's'}` : `min n=${state.minCohort}` },
  ]
  return (
    <div className="rounded-2xl p-3" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: STUDY_MUTED }}>Study so far</span>
        <span className="text-xs" style={{ color: STUDY_TEXT }}>{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {rows.map((row, index) => (
            <button
              key={row.step}
              type="button"
              disabled={index > currentStepIndex}
              onClick={() => setStep(row.step)}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left disabled:opacity-45"
              style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}
            >
              <span>
                <span className="block text-[10px] uppercase tracking-widest" style={{ color: STUDY_MUTED }}>{row.label}</span>
                <span className="mt-0.5 block max-w-48 truncate text-xs font-semibold" style={{ color: STUDY_TEXT }}>{row.value}</span>
              </span>
              {index <= currentStepIndex && <span className="text-[11px]" style={{ color: STUDY_MUTED }}>Edit</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function BuilderPager({ step, setStep, canGoNext, nextLabel }) {
  const index = BUILDER_STEPS_FLOW.findIndex(item => item.key === step)
  const prev = BUILDER_STEPS_FLOW[index - 1]?.key
  const next = BUILDER_STEPS_FLOW[index + 1]?.key
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        disabled={!prev}
        onClick={() => prev && setStep(prev)}
        className="rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
        style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER_STRONG}`, color: STUDY_TEXT }}
      >
        Back
      </button>
      <button
        type="button"
        disabled={!next || !canGoNext}
        onClick={() => next && setStep(next)}
        className="rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
        style={BRAND_BUTTON_STYLE}
      >
        {next ? nextLabel : 'Ready'}
      </button>
    </div>
  )
}

function BuilderInStep({ state, patch }) {
  return (
    <StepCard number="1" title="In" body="Choose the part of the opted-in training dataset this study should look inside.">
      <TargetControls state={state} patch={patch} />
    </StepCard>
  )
}

function BuilderMeasureStep({ state, patch, unavailableOpen, setUnavailableOpen }) {
  return (
    <StepCard number="2" title="Measure" body="Pick the outcome the selected variables will be tested against.">
      <div className="grid grid-cols-2 gap-2">
        {outcomesForTarget(state.targetType).map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => patch({ measure: option.value })}
            className="min-h-24 rounded-xl p-3 text-left"
            style={{ background: state.measure === option.value ? STUDY_ACCENT_FAINT : STUDY_CARD, border: `1px solid ${state.measure === option.value ? STUDY_ACCENT : STUDY_BORDER}` }}
          >
            <span className="block text-xs font-semibold leading-tight" style={{ color: STUDY_TEXT }}>{option.label}</span>
            <span className="mt-1 block font-mono text-[10px]" style={{ color: STUDY_MUTED }}>{option.units || 'outcome'}</span>
            <span className="mt-2 block text-[11px] leading-snug" style={{ color: STUDY_MUTED }}>{option.description || measureFitText(option.value, state.targetType)}</span>
          </button>
        ))}
      </div>
      <UnavailableDrawer open={unavailableOpen} setOpen={setUnavailableOpen} />
    </StepCard>
  )
}

function BuilderVariablesStep({ rankedFamilies, activeFamily, setActiveFamilyKey, scanKeys, toggleScanKey, previewByKey, previewResult, previewLoading, unavailableOpen, setUnavailableOpen }) {
  const noQualifiedBase = !previewLoading && previewResult && Number(previewResult.baseMatchedUsers || 0) === 0
  return (
    <StepCard number="3" title="Variables" body="Pick multiple factors to scan. Families are ranked for the scope and outcome you chose.">
      {noQualifiedBase && (
        <p className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: STUDY_BG, color: STUDY_MUTED, border: `1px solid ${STUDY_BORDER}` }}>
          No qualified lifters match this scope and outcome yet. You can still choose variables, but the study needs a broader scope or more logged data before it can run.
        </p>
      )}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {rankedFamilies.map(family => (
            <Chip key={family.key} active={activeFamily.key === family.key} onClick={() => setActiveFamilyKey(family.key)}>{family.label}</Chip>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {activeFamily.keys.map(key => (
          <VariablePickCard
            key={key}
            groupBy={key}
            active={scanKeys.includes(key)}
            preview={previewByKey[key]}
            onClick={() => toggleScanKey(key)}
          />
        ))}
      </div>
      <SelectedVariableChips scanKeys={scanKeys} onToggle={toggleScanKey} />
      <UnavailableDrawer open={unavailableOpen} setOpen={setUnavailableOpen} />
    </StepCard>
  )
}

function BuilderPopulationStep({
  state,
  patch,
  user,
  populationMode,
  setPopulationMode,
  matchKeys,
  setMatchKeys,
  matchValues,
  setMatchValues,
}) {
  return (
    <StepCard number="4" title="Population" body="Choose who counts in this study. Comparisons happen later by saving studies in Evidence.">
      <PopulationModePicker value={populationMode} onChange={setPopulationMode} />
      {populationMode === 'people_like_me' && (
        <PeopleMatchEditor user={user} matchKeys={matchKeys} setMatchKeys={setMatchKeys} matchValues={matchValues} setMatchValues={setMatchValues} />
      )}
      {populationMode === 'custom' && (
        <FilterPanel title="Custom population" filters={state.filtersA} setFilters={filtersA => patch({ filtersA })} />
      )}
      <p className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: STUDY_BG, color: STUDY_MUTED, border: `1px solid ${STUDY_BORDER}` }}>
        Save separate studies when you want to compare different exercises, populations, or scopes.
      </p>
    </StepCard>
  )
}

function BuilderReviewStep({
  state,
  patch,
  question,
  reviewN,
  reviewStatus,
  reviewConfidence,
  biggestReducer,
  previewLoading,
  rulesOpen,
  setRulesOpen,
  ruleFilters,
  toggleRule,
  loading,
  scanKeys,
  runCurrentScan,
  activeSavedId,
  showPersonal,
  setShowPersonal,
  personalSupported,
}) {
  return (
    <StepCard number="5" title="Review Study" body="Check the generated question, evidence strength, optional qualification rules, then run.">
      <div className="rounded-2xl p-4" style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}>
        <p className="text-base font-semibold leading-tight" style={{ color: STUDY_TEXT }}>{question}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <MiniMetric label="Matched" value={previewLoading ? '...' : `n=${reviewN}`} />
          <MiniMetric label="Evidence" value={reviewStatus} />
          <MiniMetric label="Conf." value={`${reviewConfidence}%`} />
        </div>
        {biggestReducer && biggestReducer.removed > 0 && (
          <p className="mt-3 text-xs leading-relaxed" style={{ color: STUDY_MUTED }}>
            Biggest reducer: {prettyGroupBy(biggestReducer.groupBy)} removes {biggestReducer.removed} matched lifters.
          </p>
        )}
      </div>
      <button type="button" onClick={() => setRulesOpen(open => !open)} className="w-full rounded-xl px-3 py-3 text-sm font-semibold" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER_STRONG}`, color: STUDY_TEXT }}>
        {rulesOpen ? 'Hide qualification rules' : `Qualification rules (${ruleFilters.length})`}
      </button>
      {rulesOpen && (
        <div className="space-y-2 rounded-2xl p-3" style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}>
          {RULE_OPTIONS.map(rule => {
            const active = ruleFilters.some(f => f.field === rule.filter.field && f.op === rule.filter.op && String(f.value) === String(rule.filter.value))
            return (
              <button
                key={rule.key}
                type="button"
                onClick={() => toggleRule(rule)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left"
                style={{ background: active ? STUDY_ACCENT_FAINT : STUDY_CARD, border: `1px solid ${active ? STUDY_ACCENT : STUDY_BORDER}` }}
              >
                <span className="text-xs font-semibold" style={{ color: STUDY_TEXT }}>{rule.label}</span>
                <span className="font-mono text-[11px]" style={{ color: STUDY_MUTED }}>{active ? 'on' : 'off'}</span>
              </button>
            )
          })}
          <Field label="Minimum cohort">
            <input type="number" min="10" value={state.minCohort} onChange={e => patch({ minCohort: Math.max(10, Number(e.target.value) || 10) })} className={SELECT_CLS} />
          </Field>
        </div>
      )}
      <label className="flex items-center gap-2 text-xs" style={{ color: personalSupported ? STUDY_TEXT : STUDY_MUTED }}>
        <input type="checkbox" checked={showPersonal && personalSupported} disabled={!personalSupported} onChange={e => setShowPersonal(e.target.checked)} style={{ accentColor: STUDY_ACCENT }} />
        Show my bucket when available
      </label>
      <button type="button" disabled={loading || !scanKeys.length || reviewN < 10} onClick={runCurrentScan} className="w-full rounded-xl py-4 text-sm font-semibold disabled:opacity-50" style={BRAND_BUTTON_STYLE}>
        {loading ? 'Running...' : reviewN < 10 ? 'Not enough qualified lifters' : 'Run study'}
      </button>
      {activeSavedId && <p className="text-xs" style={{ color: STUDY_ACCENT }}>Opened from saved Evidence.</p>}
    </StepCard>
  )
}

function PopulationModePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        ['all', 'All qualified'],
        ['people_like_me', 'People like me'],
        ['custom', 'Custom'],
      ].map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className="rounded-xl px-2 py-3 text-xs font-semibold"
          style={{ background: value === key ? STUDY_ACCENT_FAINT : STUDY_CARD, color: value === key ? STUDY_TEXT : STUDY_MUTED, border: `1px solid ${value === key ? STUDY_ACCENT : STUDY_BORDER}` }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function VariablePickCard({ groupBy, active, preview, onClick }) {
  const before = Number(preview?.before || 0)
  const after = Number(preview?.after || 0)
  const removed = Number(preview?.removed || 0)
  const warn = before > 0 && preview?.crossesThreshold && removed > 0
  const showCut = before > 0 && removed > 0 && (warn || removed / before >= 0.15)
  const unavailable = preview && !preview.available
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-28 rounded-xl p-3 text-left"
      style={{ background: active ? STUDY_ACCENT_FAINT : STUDY_CARD, border: `1px solid ${active ? STUDY_ACCENT : warn ? STUDY_COMPARE_B : STUDY_BORDER}` }}
    >
      <span className="block text-xs font-semibold leading-tight" style={{ color: STUDY_TEXT }}>{prettyGroupBy(groupBy)}</span>
      <span className="mt-2 block font-mono text-[11px]" style={{ color: warn ? STUDY_COMPARE_B : STUDY_MUTED }}>
        {showCut ? `n=${before} -> ${after}` : unavailable ? `below min n=${preview.minCohort || 10}` : preview ? preview.evidenceStatus : 'checking'}
      </span>
      {showCut && <span className="mt-1 block text-[11px] leading-snug" style={{ color: STUDY_MUTED }}>Selecting this removes {removed} matched lifters.</span>}
      {unavailable && !showCut && <span className="mt-1 block text-[11px] leading-snug" style={{ color: STUDY_MUTED }}>Valid axis, but not enough qualified buckets yet.</span>}
      {active && <span className="mt-2 block text-[10px] uppercase" style={{ color: STUDY_ACCENT }}>Selected</span>}
    </button>
  )
}

function SelectedVariableChips({ scanKeys, onToggle }) {
  return (
    <div className="rounded-xl p-3" style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}>
      <p className="text-xs font-medium" style={{ color: STUDY_MUTED }}>Selected variables</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {scanKeys.length === 0 && <span className="text-xs" style={{ color: STUDY_MUTED }}>None selected yet.</span>}
        {scanKeys.map(key => (
          <button key={key} type="button" onClick={() => onToggle(key)} className="rounded-xl px-3 py-1.5 text-xs" style={{ background: STUDY_CARD, color: STUDY_TEXT }}>
            {prettyGroupBy(key)} <span style={{ color: STUDY_MUTED }}>x</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function UnavailableDrawer({ open, setOpen }) {
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => setOpen(!open)} className="text-xs font-semibold" style={{ color: STUDY_MUTED }}>
        {open ? 'Hide unavailable options' : 'Unavailable for this study'}
      </button>
      {open && (
        <div className="space-y-2 rounded-xl p-3" style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}>
          {UNAVAILABLE_BUILDER_OPTIONS.map(item => (
            <div key={item.label} className="rounded-xl p-3" style={{ background: STUDY_CARD }}>
              <p className="text-xs font-semibold" style={{ color: STUDY_TEXT }}>{item.label}</p>
              <p className="mt-1 text-[11px] leading-snug" style={{ color: STUDY_MUTED }}>{item.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LegacyExplore({
  state,
  setState,
  scanKeys,
  setScanKeys,
  selectedScan,
  setSelectedScan,
  runCurrent,
  runCurrentScan,
  saveCurrentQuestion,
  loading,
  queryResult,
  compareResult,
  scanResult,
  activeSavedId,
  user,
  exerciseName,
  personalSupported,
  populationMode,
  setPopulationMode,
  matchKeys,
  setMatchKeys,
  matchValues,
  setMatchValues,
}) {
  const [showPersonal, setShowPersonal] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Training')
  const [openSplit, setOpenSplit] = useState(false)
  const [openControls, setOpenControls] = useState(false)
  const [controls, setControls] = useState([])
  const resultReady = state.mode === 'compare' ? Boolean(compareResult) : Boolean(queryResult)

  function patch(patchValue) {
    setState(current => ({ ...current, ...patchValue }))
  }

  function toggleScanKey(key) {
    setScanKeys(keys => (keys.includes(key) ? keys.filter(k => k !== key) : [...keys, key]))
  }

  const measureLabel = prettyMeasure(state.measure)
  const factorText = scanKeys.length
    ? scanKeys.map(k => prettyGroupBy(k).toLowerCase()).join(', ')
    : 'selected factors'
  const targetText = exerciseName || state.muscle || 'all logged training'
  const popText = populationMode === 'people_like_me' ? 'people like me' : 'a custom population'
  const previewQuestion = `For ${popText}, how do ${factorText} relate to ${targetText} ${measureLabel.toLowerCase()}?`

  return (
    <div className="space-y-4">
      <ExploreSearchBar onSelect={config => { setPopulationMode('custom'); setState(config); runCurrent(config) }} />

      <StepCard number="1" title="Measure" body="Choose the result every scan is ranked against.">
        <div className="grid grid-cols-2 gap-2">
          {OUTCOME_OPTIONS.map(option => (
            <Chip key={option.value} active={state.measure === option.value} onClick={() => patch({ measure: option.value })}>
              {option.label}
            </Chip>
          ))}
        </div>
        <p className="text-xs leading-relaxed" style={{ color: STUDY_MUTED }}>
          {OUTCOME_OPTIONS.find(option => option.value === state.measure)?.description}
        </p>
      </StepCard>

      <StepCard number="2" title="In" body="Choose whether to focus on a specific exercise, muscle group, equipment type, or all training.">
        <TargetControls state={state} patch={patch} />
      </StepCard>

      <StepCard number="3" title="Test relationships with" body="Pick factors to scan. Study ranks which relationships look strongest.">
        <VariableCategoryTabs
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          scanKeys={scanKeys}
          toggleScanKey={toggleScanKey}
        />
        <div className="rounded-xl p-3" style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}>
          <p className="text-xs font-medium" style={{ color: STUDY_MUTED }}>Selected factors</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {scanKeys.length === 0 && <span className="text-xs" style={{ color: STUDY_MUTED }}>None selected yet.</span>}
            {scanKeys.map(key => (
              <button key={key} type="button" onClick={() => toggleScanKey(key)} className="rounded-xl px-3 py-1.5 text-xs" style={{ background: STUDY_CARD, color: STUDY_TEXT }}>
                {prettyGroupBy(key)} <span style={{ color: STUDY_MUTED }}>✕</span>
              </button>
            ))}
          </div>
        </div>
      </StepCard>

      <StepCard number="4" title="For" body="People like me builds a matched cohort from your profile. Custom uses explicit filters.">
        <div className="grid grid-cols-2 gap-2">
          <Chip active={populationMode === 'people_like_me'} onClick={() => setPopulationMode('people_like_me')}>People like me</Chip>
          <Chip active={populationMode === 'custom'} onClick={() => setPopulationMode('custom')}>Custom population</Chip>
        </div>
        {populationMode === 'people_like_me' ? (
          <PeopleMatchEditor
            user={user}
            matchKeys={matchKeys}
            setMatchKeys={setMatchKeys}
            matchValues={matchValues}
            setMatchValues={setMatchValues}
          />
        ) : (
          <FilterPanel title="Population filters" filters={state.filtersA} setFilters={filtersA => patch({ filtersA })} />
        )}
      </StepCard>

      <StepCard number="5" title="Optional: single relationship" body="Run one factor as a single chart with your own bucket overlaid.">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-xl px-3 py-1.5 text-xs" style={{ background: STUDY_ACCENT_FAINT, border: `1px solid ${STUDY_ACCENT}`, color: STUDY_ACCENT }}>
            {prettyGroupBy(state.groupBy)}
          </span>
          <button type="button" onClick={() => setOpenSplit(open => !open)} className="rounded-xl px-3 py-2 text-xs" style={{ background: STUDY_CARD, color: STUDY_TEXT }}>
            {openSplit ? 'Hide options' : 'Change'}
          </button>
        </div>
        {openSplit && (
          <div className="flex flex-wrap gap-2">
            {GROUP_BY_OPTIONS.map(option => (
              <Chip key={option.value} active={state.groupBy === option.value} onClick={() => patch({ groupBy: option.value })}>{option.label}</Chip>
            ))}
          </div>
        )}
      </StepCard>

      <StepCard number="6" title="Optional: account for differences" body="Note balancing intent. Adjustment is display-only in this build.">
        <button type="button" onClick={() => setOpenControls(open => !open)} className="rounded-xl px-3 py-2 text-xs" style={{ background: STUDY_CARD, color: STUDY_TEXT }}>
          {openControls ? 'Hide balancing' : `Balancing (${controls.length})`}
        </button>
        {openControls && (
          <div className="grid grid-cols-2 gap-2">
            {CONTROL_CHIPS.map(label => {
              const active = controls.includes(label)
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setControls(items => (items.includes(label) ? items.filter(i => i !== label) : [...items, label]))}
                  className="rounded-xl px-3 py-3 text-left text-xs font-medium"
                  style={{ background: active ? STUDY_ACCENT_FAINT : STUDY_CARD, border: `1px solid ${active ? STUDY_ACCENT : STUDY_BORDER}`, color: active ? STUDY_TEXT : STUDY_MUTED }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}
      </StepCard>

      <StepCard number="7" title="Query preview" body="The exact request stays inside the v2 research whitelist.">
        <div className="rounded-xl p-3 space-y-2" style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}>
          <p className="text-sm leading-relaxed" style={{ color: STUDY_TEXT }}>{previewQuestion}</p>
          <p className="text-xs font-mono" style={{ color: STUDY_MUTED }}>
            measure {state.measure} · {scanKeys.length} scan variable{scanKeys.length === 1 ? '' : 's'} · min cohort {state.minCohort}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min cohort">
            <input
              type="number"
              min="1"
              value={state.minCohort}
              onChange={e => patch({ minCohort: Math.max(1, Number(e.target.value) || 1) })}
              className={SELECT_CLS}
            />
          </Field>
          <label className="flex items-end gap-2 pb-3 text-xs" style={{ color: personalSupported ? STUDY_TEXT : STUDY_MUTED }}>
            <input
              type="checkbox"
              checked={showPersonal && personalSupported}
              disabled={!personalSupported}
              onChange={e => setShowPersonal(e.target.checked)}
              style={{ accentColor: STUDY_ACCENT }}
            />
            Show my bucket
          </label>
        </div>
      </StepCard>

      <StepCard number="8" title="Run" body="Scan the selected factors, or run a single relationship.">
        <div className="grid grid-cols-2 gap-3">
          <button type="button" disabled={loading || !scanKeys.length} onClick={runCurrentScan} className="rounded-xl py-3 text-sm font-semibold disabled:opacity-50" style={BRAND_BUTTON_STYLE}>
            {loading ? 'Running' : 'Run scan'}
          </button>
          <button type="button" disabled={loading} onClick={() => runCurrent()} className="rounded-xl py-3 text-sm font-semibold disabled:opacity-50" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER_STRONG}`, color: STUDY_TEXT }}>
            Run single relationship
          </button>
        </div>
        {activeSavedId && <p className="text-xs" style={{ color: STUDY_ACCENT }}>Opened from saved Evidence.</p>}
      </StepCard>

      <ResultsBlock
        state={state}
        queryResult={queryResult}
        compareResult={compareResult}
        scanResult={scanResult}
        selectedScan={selectedScan}
        setSelectedScan={setSelectedScan}
        user={user}
        showPersonal={showPersonal && personalSupported}
        exerciseName={exerciseName}
        onSaveQuery={() => saveCurrentQuestion(state.mode)}
        onSaveScan={() => saveCurrentQuestion('scan')}
        resultReady={resultReady}
      />
    </div>
  )
}

function VariableCategoryTabs({ activeCategory, setActiveCategory, scanKeys, toggleScanKey }) {
  const category = VARIABLE_CATEGORIES.find(c => c.name === activeCategory) || VARIABLE_CATEGORIES[0]
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto">
        {VARIABLE_CATEGORIES.map(c => (
          <Chip key={c.name} active={activeCategory === c.name} onClick={() => setActiveCategory(c.name)}>{c.name}</Chip>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {category.keys.map(key => {
          const active = scanKeys.includes(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleScanKey(key)}
              className="rounded-xl px-3 py-3 text-left text-xs font-medium"
              style={{ background: active ? STUDY_ACCENT_FAINT : STUDY_CARD, border: `1px solid ${active ? STUDY_ACCENT : STUDY_BORDER}`, color: active ? STUDY_TEXT : STUDY_MUTED }}
            >
              {prettyGroupBy(key)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

;[LegacyExplore, VariableCategoryTabs, CONTROL_CHIPS].forEach(() => {})

function PeopleMatchEditor({ user, matchKeys, setMatchKeys, matchValues, setMatchValues }) {
  const [showAdd, setShowAdd] = useState(false)

  function toggle(key) {
    setMatchKeys(keys => (keys.includes(key) ? keys.filter(k => k !== key) : [...keys, key]))
  }
  function setRange(key, side, value) {
    const filter = PEOPLE_FILTER_BY_KEY[key]
    const base = matchValues[key] ?? defaultMatchValue(filter)
    const num = Number(value)
    setMatchValues(v => ({ ...v, [key]: { ...base, [side]: Number.isFinite(num) ? Math.max(0, num) : 0 } }))
  }

  const active = PEOPLE_FILTERS.filter(f => matchKeys.includes(f.key))
  const inactive = PEOPLE_FILTERS.filter(f => !matchKeys.includes(f.key))
  const filterRows = peopleToFilters(user, matchKeys, matchValues)

  return (
    <div className="rounded-xl p-3 space-y-3" style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium" style={{ color: STUDY_TEXT }}>People like me</p>
          <p className="text-xs" style={{ color: STUDY_MUTED }}>Traits that define a cohort similar to you.</p>
        </div>
        <button type="button" onClick={() => setShowAdd(s => !s)} className="shrink-0 rounded-xl px-3 py-2 text-xs" style={{ background: STUDY_CARD, color: STUDY_TEXT }}>
          {showAdd ? 'Done' : 'Add more'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {active.length === 0 && <span className="text-xs" style={{ color: STUDY_MUTED }}>No traits — whole opted-in population.</span>}
        {active.map(f => {
          const uv = f.userValue(user)
          return (
            <div key={f.key} className="flex items-center overflow-hidden rounded-xl text-xs" style={{ background: STUDY_CARD }}>
              <span className="px-3 py-1.5" style={{ color: STUDY_TEXT }}>{f.label}{uv ? `: ${prettyBucket(String(uv))}` : ''}</span>
              <button type="button" onClick={() => toggle(f.key)} className="px-2 py-1.5" style={{ color: STUDY_MUTED, borderLeft: `1px solid ${STUDY_BORDER}` }} aria-label={`Remove ${f.label}`}>✕</button>
            </div>
          )
        })}
      </div>

      {active.filter(f => f.matchKind === 'number').map(f => {
        const val = matchValues[f.key] ?? defaultMatchValue(f)
        return (
          <div key={f.key} className="grid grid-cols-2 gap-2 rounded-xl p-3" style={{ background: STUDY_CARD }}>
            <Field label={`${f.label} lower by`}>
              <input type="number" min="0" step={f.step} value={val.minus} onChange={e => setRange(f.key, 'minus', e.target.value)} className={SELECT_CLS} />
            </Field>
            <Field label={`higher by (${f.unit})`}>
              <input type="number" min="0" step={f.step} value={val.plus} onChange={e => setRange(f.key, 'plus', e.target.value)} className={SELECT_CLS} />
            </Field>
          </div>
        )
      })}

      {showAdd && (
        <div className="grid grid-cols-2 gap-2 border-t pt-3" style={{ borderColor: STUDY_BORDER }}>
          {inactive.map(f => {
            const uv = f.userValue(user)
            const disabled = uv == null || uv === ''
            return (
              <button
                key={f.key}
                type="button"
                disabled={disabled}
                onClick={() => toggle(f.key)}
                className="rounded-xl px-3 py-2 text-left text-xs"
                style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}`, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
              >
                <span className="block" style={{ color: disabled ? STUDY_DIM : STUDY_TEXT }}>{f.label}</span>
                <span className="mt-1 block" style={{ color: STUDY_MUTED }}>{disabled ? 'Not logged yet' : `You: ${prettyBucket(String(uv))}`}</span>
              </button>
            )
          })}
        </div>
      )}

      <p className="font-mono text-xs" style={{ color: STUDY_MUTED }}>{filterRows.length} filter row{filterRows.length === 1 ? '' : 's'} applied</p>
    </div>
  )
}

const TARGET_TYPES = [
  { key: 'exercise', label: 'Exercise' },
  { key: 'muscle', label: 'Muscle Group' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'session', label: 'Session' },
  { key: 'all', label: 'All Training' },
]

function TargetControls({ state, patch }) {
  const [search, setSearch] = useState('')
  const [muscleGroupFilter, setMuscleGroupFilter] = useState('')
  const [sessionFocus, setSessionFocus] = useState('whole_session')

  const currentExercise = SEED_EXERCISES.find(ex => ex.id === state.exerciseId)

  // Filtered exercise list for the browser
  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase()
    return SEED_EXERCISES.filter(ex => {
      const matchesMuscle = !muscleGroupFilter || ex.primary_muscle === muscleGroupFilter
      const matchesSearch = !q || ex.name.toLowerCase().includes(q) || ex.primary_muscle.toLowerCase().includes(q)
      return matchesMuscle && matchesSearch
    })
  }, [search, muscleGroupFilter])

  function selectTargetType(key) {
    // Clear selection when switching types
    patch({ targetType: key, exerciseId: '', muscle: '' })
    setSearch('')
    setMuscleGroupFilter('')
  }

  return (
    <div className="space-y-3">
      {/* Target type selector */}
      <div className="flex flex-wrap gap-2">
        {TARGET_TYPES.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => selectTargetType(t.key)}
            className="rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: state.targetType === t.key ? STUDY_BRAND : STUDY_CARD,
              color: state.targetType === t.key ? STUDY_ON_BRAND : STUDY_TEXT,
              border: `1px solid ${state.targetType === t.key ? STUDY_BRAND : STUDY_BORDER}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Exercise browser */}
      {state.targetType === 'exercise' && (
        <div className="space-y-2">
          {/* Muscle group chip strip */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              type="button"
              onClick={() => setMuscleGroupFilter('')}
              className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium"
              style={{
                background: !muscleGroupFilter ? STUDY_BRAND : STUDY_CARD,
                color: !muscleGroupFilter ? STUDY_ON_BRAND : STUDY_TEXT,
                border: `1px solid ${!muscleGroupFilter ? STUDY_BRAND : STUDY_BORDER}`,
              }}
            >
              All
            </button>
            {TOP_MUSCLES.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMuscleGroupFilter(muscleGroupFilter === m ? '' : m)}
                className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium"
                style={{
                  background: muscleGroupFilter === m ? STUDY_BRAND : STUDY_CARD,
                  color: muscleGroupFilter === m ? STUDY_ON_BRAND : STUDY_TEXT,
                  border: `1px solid ${muscleGroupFilter === m ? STUDY_BRAND : STUDY_BORDER}`,
                }}
              >
                {m}
              </button>
            ))}
          </div>
          {/* Search input */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search exercises…"
            className={SELECT_CLS}
          />
          {/* Selected exercise display */}
          {currentExercise && (
            <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: STUDY_ACCENT_FAINT, border: `1px solid ${STUDY_ACCENT_DIM}` }}>
              <span className="text-xs font-medium" style={{ color: STUDY_TEXT }}>{currentExercise.name}</span>
              <button type="button" onClick={() => patch({ exerciseId: '', muscle: '' })} className="text-xs" style={{ color: STUDY_MUTED }}>✕ Clear</button>
            </div>
          )}
          {/* Exercise list */}
          <div className="max-h-48 overflow-y-auto rounded-xl" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
            {filteredExercises.length === 0 && (
              <p className="px-3 py-3 text-xs" style={{ color: STUDY_MUTED }}>No exercises found.</p>
            )}
            {filteredExercises.map(ex => (
              <button
                key={ex.id}
                type="button"
                onClick={() => { patch({ exerciseId: ex.id, muscle: '' }); setSearch('') }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs"
                style={{
                  color: state.exerciseId === ex.id ? STUDY_ACCENT : STUDY_TEXT,
                  background: state.exerciseId === ex.id ? STUDY_ACCENT_FAINT : 'transparent',
                  borderBottom: `1px solid ${STUDY_BORDER}`,
                  fontWeight: state.exerciseId === ex.id ? 600 : 400,
                }}
              >
                <span>{ex.name}</span>
                <span style={{ color: STUDY_MUTED }}>{ex.primary_muscle}{state.exerciseId === ex.id ? ' ✓' : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Muscle group chip grid */}
      {state.targetType === 'muscle' && (
        <div className="flex flex-wrap gap-2">
          {TOP_MUSCLES.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => patch({ muscle: state.muscle === m ? '' : m, exerciseId: '' })}
                className="rounded-xl px-3 py-1.5 text-xs font-medium"
                style={{
                background: state.muscle === m ? STUDY_BRAND : STUDY_CARD,
                color: state.muscle === m ? STUDY_ON_BRAND : STUDY_TEXT,
                border: `1px solid ${state.muscle === m ? STUDY_BRAND : STUDY_BORDER}`,
              }}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {/* Equipment chip grid */}
      {state.targetType === 'equipment' && (
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_TYPES.map(eq => (
            <button
              key={eq}
              type="button"
              onClick={() => patch({ muscle: state.muscle === eq ? '' : eq, exerciseId: '' })}
                className="rounded-xl px-3 py-1.5 text-xs font-medium"
                style={{
                background: state.muscle === eq ? STUDY_BRAND : STUDY_CARD,
                color: state.muscle === eq ? STUDY_ON_BRAND : STUDY_TEXT,
                border: `1px solid ${state.muscle === eq ? STUDY_BRAND : STUDY_BORDER}`,
              }}
            >
              {eq}
            </button>
          ))}
        </div>
      )}

      {/* Session focus */}
      {state.targetType === 'session' && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {SESSION_FOCUS.map(sf => (
              <button
                key={sf.key}
                type="button"
                disabled={sf.comingSoon}
                onClick={() => !sf.comingSoon && setSessionFocus(sf.key)}
                className="rounded-xl px-3 py-1.5 text-xs font-medium"
                style={{
                  background: sessionFocus === sf.key && !sf.comingSoon ? STUDY_BRAND : STUDY_CARD,
                  color: sf.comingSoon ? STUDY_MUTED : sessionFocus === sf.key ? STUDY_ON_BRAND : STUDY_TEXT,
                  border: `1px solid ${sessionFocus === sf.key && !sf.comingSoon ? STUDY_BRAND : STUDY_BORDER}`,
                  opacity: sf.comingSoon ? 0.45 : 1,
                  cursor: sf.comingSoon ? 'default' : 'pointer',
                }}
              >
                {sf.label}{sf.comingSoon ? ' ·soon' : ''}
              </button>
            ))}
          </div>
          <p className="text-xs" style={{ color: STUDY_MUTED }}>
            Whole session analysis covers all exercises in a session. Advanced focus options require position tracking — coming soon.
          </p>
        </div>
      )}

      {/* All training */}
      {state.targetType === 'all' && (
        <p className="text-xs leading-relaxed" style={{ color: STUDY_MUTED }}>
          Analysis covers all logged training across the opted-in population. No exercise or muscle filter is applied.
        </p>
      )}
    </div>
  )
}

function FilterPanel({ title, label, setLabel, filters, setFilters, accent = STUDY_BORDER }) {
  function update(index, next) {
    setFilters(filters.map((filter, i) => (i === index ? next : filter)))
  }
  function remove(index) {
    setFilters(filters.filter((_, i) => i !== index))
  }
  return (
    <div className="space-y-3 rounded-2xl p-3" style={{ background: STUDY_CARD, border: `1px solid ${accent}` }}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent === STUDY_BORDER ? STUDY_MUTED : accent }}>{title}</p>
        {setLabel && (
          <input value={label} onChange={e => setLabel(e.target.value)} className="max-w-[120px] rounded-lg bg-gray-900 px-2 py-1 text-xs text-gray-100 outline-none" />
        )}
      </div>
      {filters.length === 0 && <p className="py-2 text-xs font-mono" style={{ color: STUDY_MUTED }}>Whole opted-in population.</p>}
      {filters.map((filter, index) => (
        <FilterRow key={`${filter.field}-${index}`} filter={filter} onChange={next => update(index, next)} onRemove={() => remove(index)} />
      ))}
      <button type="button" onClick={() => setFilters([...filters, defaultFilter()])} className="rounded-xl px-3 py-2 text-xs" style={{ color: STUDY_TEXT, border: `1px dashed ${STUDY_BORDER_STRONG}` }}>
        Add filter
      </button>
    </div>
  )
}

function ResultsBlock({
  state,
  queryResult,
  compareResult,
  scanResult,
  compareScanResult,
  selectedScan,
  setSelectedScan,
  user,
  showPersonal,
  exerciseName,
  onSaveQuery,
  onSaveScan,
  resultReady,
  scanKeys,
  setStep,
  populationMode,
}) {
  const activeScanResult = state.mode === 'compare' ? compareScanResult : scanResult
  return (
    <section className="space-y-4">
      <SectionTitle title="Results" body="Population evidence is observational and bucketed by minimum cohort size." />

      {activeScanResult ? (
        <div className="space-y-3 rounded-2xl p-4" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
          <StudyRecipeChips state={state} scanKeys={scanKeys} populationMode={populationMode} setStep={setStep} />
          <div className="flex items-center justify-between gap-3">
            <SectionTitle title="Ranked findings" body={`${activeScanResult.results?.length || 0} variables checked against ${prettyMeasure(state.measure)}.`} />
            <button type="button" onClick={onSaveScan} className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold" style={BRAND_BUTTON_STYLE}>
              Save study
            </button>
          </div>
          <div className="space-y-2">
            {(activeScanResult.results || []).map(row => (
              state.mode === 'compare'
                ? <CompareScanResultRow key={row.groupBy} row={row} active={selectedScan?.groupBy === row.groupBy} onClick={() => setSelectedScan(selectedScan?.groupBy === row.groupBy ? null : row)} />
                : (
                  <ResultRow
                    key={row.groupBy}
                    row={row}
                    active={selectedScan?.groupBy === row.groupBy}
                    user={user}
                    onClick={() => setSelectedScan(selectedScan?.groupBy === row.groupBy ? null : row)}
                  />
                )
            ))}
          </div>
          {state.mode !== 'compare' && selectedScan?.buckets?.length > 0 && (
            <RelationshipDetail row={selectedScan} measure={state.measure} user={user} onClose={() => setSelectedScan(null)} />
          )}
        </div>
      ) : resultReady ? (
        <div className="space-y-3 rounded-2xl p-4" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
          <p className="text-sm" style={{ color: STUDY_TEXT }}>
            {state.mode === 'compare'
              ? `${prettyMeasure(state.measure)} by ${prettyGroupBy(state.groupBy).toLowerCase()}`
              : describeQuery({ filters: queryResult?.query?.filters || [], groupBy: state.groupBy, measure: state.measure, exerciseId: state.exerciseId, exerciseName, muscle: state.muscle })}
          </p>
          {state.mode === 'compare' ? (
            <CompareResultChart cohortA={compareResult?.cohortA} cohortB={compareResult?.cohortB} measure={state.measure} groupBy={state.groupBy} user={user} showPersonal={showPersonal} />
          ) : (
            <SingleResultChart buckets={queryResult?.buckets || []} measure={state.measure} groupBy={state.groupBy} totalCohortSize={queryResult?.totalCohortSize || 0} user={user} showPersonal={showPersonal} />
          )}
          <button type="button" onClick={onSaveQuery} className="w-full rounded-xl py-3 text-sm font-semibold" style={BRAND_BUTTON_STYLE}>
            Save query
          </button>
        </div>
      ) : (
        <EmptyText>Run a scan to rank your selected factors.</EmptyText>
      )}
    </section>
  )
}

function StudyRecipeChips({ state, scanKeys = [], populationMode, setStep }) {
  const chips = [
    ['in', 'In', state.exerciseId || state.muscle || state.targetType || 'all'],
    ['measure', 'Measure', prettyMeasure(state.measure)],
    ['variables', 'Variables', `${scanKeys.length} selected`],
    ['population', 'Population', populationLabel(populationMode)],
    ['review', 'Rules', `min n=${state.minCohort}`],
  ]
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex gap-2">
        {chips.map(([key, label, value]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStep?.(key)}
            className="shrink-0 rounded-xl px-3 py-2 text-left"
            style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}
          >
            <span className="block text-[10px] uppercase tracking-widest" style={{ color: STUDY_MUTED }}>{label}</span>
            <span className="mt-1 block max-w-32 truncate text-xs font-semibold" style={{ color: STUDY_TEXT }}>{value}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function CompareScanResultRow({ row, active, onClick }) {
  const a = row.cohortA
  const b = row.cohortB
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full space-y-3 rounded-2xl px-3 py-3 text-left"
      style={{ background: active ? STUDY_ACCENT_FAINT : STUDY_BG, border: `1px solid ${active ? STUDY_ACCENT : STUDY_BORDER}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: STUDY_TEXT }}>{prettyGroupBy(row.groupBy)}</p>
          <p className="text-xs" style={{ color: STUDY_MUTED }}>{row.available ? 'Compared across both cohorts' : (row.error || 'Not enough buckets')}</p>
        </div>
        <EvidenceBadge status={row.evidenceStatus} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[a, b].map((cohort, index) => (
          <div key={index} className="rounded-xl p-3" style={{ background: STUDY_CARD, border: `1px solid ${index === 0 ? STUDY_ACCENT_DIM : STUDY_COMPARE_B}` }}>
            <p className="truncate text-xs font-semibold" style={{ color: STUDY_TEXT }}>{cohort?.label || (index === 0 ? 'A' : 'B')}</p>
            <p className="mt-1 font-mono text-[11px]" style={{ color: STUDY_MUTED }}>n={cohort?.totalCohortSize || 0}</p>
            <p className="mt-1 font-mono text-[11px]" style={{ color: STUDY_MUTED }}>strength {cohort?.strength || 0}/100</p>
          </div>
        ))}
      </div>
    </button>
  )
}

function ResultRow({ row, active, user, onClick }) {
  const pattern = detectPattern(row.buckets)
  const direction = pattern === 'Negative' ? 'negative' : 'positive'
  const worst = (row.buckets || []).find(b => b.label === row.worstBucket)
  const adjustedImpact = worst && worst.avg_measure
    ? `${row.effect >= 0 ? '+' : ''}${Math.round((row.effect / Math.abs(worst.avg_measure)) * 100)}%`
    : null
  const youBucket = PERSONAL_BUCKET_FROM_USER[row.groupBy]?.(user || {})
  const sparse = row.evidenceStatus === 'Sparse' || row.evidenceStatus === 'Not enough'
  const barColor = direction === 'negative' ? STUDY_COMPARE_B : STUDY_ACCENT

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full space-y-3 rounded-2xl px-3 py-3 text-left"
      style={{ background: active ? STUDY_ACCENT_FAINT : STUDY_BG, border: `1px solid ${active ? STUDY_ACCENT : STUDY_BORDER}`, opacity: sparse ? 0.8 : 1 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: STUDY_TEXT }}>{prettyGroupBy(row.groupBy)}</p>
          <p className="text-xs" style={{ color: STUDY_MUTED }}>{row.available ? `Pattern: ${pattern}` : (row.error || 'Not enough buckets')}</p>
        </div>
        <EvidenceBadge status={row.evidenceStatus} />
      </div>
      {row.available && (
        <>
          <div>
            <div className="h-2 overflow-hidden rounded-full" style={{ background: STUDY_CARD }}>
              <div className="h-full rounded-full" style={{ width: `${row.strength || 0}%`, background: barColor }} />
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-mono text-xs" style={{ color: STUDY_MUTED }}>{row.strength || 0}/100</span>
              <span className="font-mono text-xs" style={{ color: STUDY_MUTED }}>n={row.totalCohortSize || 0}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {adjustedImpact && <span className="rounded-xl px-2 py-1 text-xs" style={{ background: STUDY_CARD, color: STUDY_TEXT }}>Impact {adjustedImpact}</span>}
            {row.bestBucket && <span className="rounded-xl px-2 py-1 text-xs" style={{ background: STUDY_CARD, color: STUDY_TEXT }}>Best: {prettyBucket(row.bestBucket)}</span>}
            {youBucket && <span className="rounded-xl px-2 py-1 text-xs" style={{ background: STUDY_ACCENT_FAINT, color: STUDY_ACCENT, border: `1px solid ${STUDY_ACCENT}` }}>You: {prettyBucket(youBucket)}</span>}
          </div>
        </>
      )}
    </button>
  )
}

function RelationshipDetail({ row, measure, user, onClose }) {
  const [focusedBuckets, setFocusedBuckets] = useState([])
  const youBucket = PERSONAL_BUCKET_FROM_USER[row.groupBy]?.(user || {})
  const pattern = detectPattern(row.buckets)
  const chartData = (row.buckets || []).map(b => ({
    label: prettyBucket(b.label),
    avg: b.avg_measure,
    n: b.n,
    errorY: b.sd != null ? Math.round(b.sd * 0.4 * 10000) / 10000 : 0,
    isUser: youBucket != null && b.label === youBucket,
    focused: focusedBuckets.length === 0 || focusedBuckets.includes(b.label),
  }))

  function toggleFocus(label) {
    setFocusedBuckets(labels => (labels.includes(label) ? labels.filter(item => item !== label) : [...labels, label]))
  }

  return (
    <div className="space-y-4 rounded-2xl p-4" style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}>
      <div className="flex items-start justify-between gap-3">
        <SectionTitle title={prettyGroupBy(row.groupBy)} body={`Pattern: ${pattern} · ${prettyMeasure(measure)}`} />
        <button type="button" onClick={onClose} className="shrink-0 text-xs" style={{ color: STUDY_MUTED }}>Close</button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <EvidenceBadge status={row.evidenceStatus} />
        <span className="font-mono text-xs" style={{ color: STUDY_MUTED }}>n={row.totalCohortSize || 0}</span>
      </div>
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: STUDY_MUTED }}>Focus buckets after running</p>
        <div className="flex flex-wrap gap-2">
          {(row.buckets || []).map(bucket => {
            const active = focusedBuckets.length === 0 || focusedBuckets.includes(bucket.label)
            return (
              <button
                key={bucket.label}
                type="button"
                onClick={() => toggleFocus(bucket.label)}
                className="rounded-xl px-3 py-2 text-xs font-semibold"
                style={{ background: active ? STUDY_ACCENT_FAINT : STUDY_CARD, border: `1px solid ${active ? STUDY_ACCENT : STUDY_BORDER}`, color: active ? STUDY_TEXT : STUDY_MUTED }}
              >
                {prettyBucket(bucket.label)}
              </button>
            )
          })}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} barCategoryGap="30%">
          <XAxis dataKey="label" tick={{ fill: STUDY_MUTED, fontSize: 10 }} interval={0} />
          <YAxis tick={{ fill: STUDY_MUTED, fontSize: 10 }} />
          <Tooltip
            contentStyle={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}`, borderRadius: 8, color: STUDY_TEXT }}
            formatter={(value, _name, props) => [`${Number(value).toFixed(3)} (n=${props.payload.n})`, prettyMeasure(measure)]}
          />
          <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
            {chartData.map((d, i) => <Cell key={i} fill={d.focused ? (d.isUser ? STUDY_ACCENT : STUDY_ACCENT_DIM) : STUDY_DIM} opacity={d.focused ? 1 : 0.35} />)}
            <ErrorBar dataKey="errorY" width={4} strokeWidth={1.5} stroke={STUDY_MUTED} direction="y" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {youBucket && (
        <div className="rounded-xl px-3 py-2" style={{ background: STUDY_ACCENT_FAINT, border: `1px solid ${STUDY_ACCENT}` }}>
          <p className="text-xs" style={{ color: STUDY_ACCENT }}>You're in <span className="font-semibold">{prettyBucket(youBucket)}</span></p>
        </div>
      )}
      <p className="text-xs leading-relaxed" style={{ color: STUDY_MUTED }}>
        Observational population evidence, bucketed by minimum cohort size. Error bars show roughly 0.4 SD.
      </p>
    </div>
  )
}

function Evidence({ savedQuestions, savedLoading, findings, onOpenSaved, onDeleteSaved, onOpenFinding }) {
  const [compareIds, setCompareIds] = useState([])
  const selectedStudies = compareIds.map(id => savedQuestions.find(question => question.id === id)).filter(Boolean)

  function toggleCompare(id) {
    setCompareIds(ids => {
      if (ids.includes(id)) return ids.filter(item => item !== id)
      if (ids.length >= 2) return [ids[1], id]
      return [...ids, id]
    })
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Evidence" body="Saved scans and discovered findings stay tied to the real v2 research query JSON." />
      <section className="space-y-3">
        <SectionTitle title="Compare saved studies" body="Select two saved studies to compare their scope, variables, population, and evidence side by side." />
        {selectedStudies.length < 2 ? (
          <EmptyText>{selectedStudies.length === 0 ? 'Pick two tracked questions below.' : 'Pick one more tracked question.'}</EmptyText>
        ) : (
          <SavedStudyComparison studies={selectedStudies} onOpenSaved={onOpenSaved} />
        )}
      </section>
      <section className="space-y-3">
        <SectionTitle title="Tracked questions" />
        {savedLoading && <SkeletonRows />}
        {!savedLoading && savedQuestions.length === 0 && <EmptyText>No saved questions yet.</EmptyText>}
        {savedQuestions.map(question => (
          <div key={question.id} className="rounded-2xl p-4" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
            <button type="button" onClick={() => onOpenSaved(question)} className="w-full text-left">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold leading-snug" style={{ color: STUDY_TEXT }}>{question.label}</p>
                <EvidenceBadge status={question.evidenceStatus} />
              </div>
              <p className="mt-2 text-xs font-mono" style={{ color: STUDY_MUTED }}>
                n={question.qualifiedUsers} / matched {question.matchedUsers}
              </p>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: STUDY_MUTED }}>{savedStudyRecipe(question)}</p>
            </button>
            <div className="mt-3 flex items-center justify-between gap-3">
              <button type="button" onClick={() => toggleCompare(question.id)} className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: compareIds.includes(question.id) ? STUDY_ACCENT_FAINT : STUDY_BG, border: `1px solid ${compareIds.includes(question.id) ? STUDY_ACCENT : STUDY_BORDER}`, color: STUDY_TEXT }}>
                {compareIds.includes(question.id) ? 'Selected to compare' : 'Compare'}
              </button>
              <button type="button" onClick={() => onDeleteSaved(question.id)} className="text-xs" style={{ color: STUDY_MUTED }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </section>
      <section className="space-y-3">
        <SectionTitle title="Discovered findings" />
        {!findings.length && <EmptyText>No findings yet.</EmptyText>}
        {findings.length > 0 && (
          <div className="-mx-4" style={{ borderTop: `1px solid ${STUDY_BORDER}` }}>
            {findings.map(finding => <FindingPoster key={finding.id} finding={finding} onClick={() => onOpenFinding(finding)} />)}
          </div>
        )}
      </section>
      <section className="grid grid-cols-2 gap-3">
        <Contribution title="Safe queries" value="Whitelist" body="Fields, axes, measures, and operators are validated server-side." />
        <Contribution title="Privacy" value="Opt-in" body="Only opted-in users contribute to aggregate evidence." />
      </section>
    </div>
  )
}

function SavedStudyComparison({ studies, onOpenSaved }) {
  return (
    <div className="space-y-3 rounded-2xl p-3" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
      <div className="grid grid-cols-2 gap-2">
        {studies.map((study, index) => (
          <div key={study.id} className="rounded-xl p-3" style={{ background: STUDY_BG, border: `1px solid ${index === 0 ? STUDY_COMPARE_A : STUDY_COMPARE_B}` }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: STUDY_MUTED }}>Study {index + 1}</p>
            <p className="mt-1 text-xs font-semibold leading-snug" style={{ color: STUDY_TEXT }}>{study.label}</p>
            <div className="mt-3 space-y-2">
              <MiniMetric label="Evidence" value={study.evidenceStatus} />
              <MiniMetric label="Matched" value={`n=${study.matchedUsers || study.qualifiedUsers || 0}`} />
            </div>
            <button type="button" onClick={() => onOpenSaved(study)} className="mt-3 w-full rounded-xl py-2 text-xs font-semibold" style={{ background: STUDY_CARD, color: STUDY_TEXT, border: `1px solid ${STUDY_BORDER_STRONG}` }}>
              Open
            </button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {studies.map(study => (
          <div key={`${study.id}-recipe`} className="rounded-xl p-3" style={{ background: STUDY_BG, border: `1px solid ${STUDY_BORDER}` }}>
            {savedStudyFacts(study).map(fact => (
              <div key={fact.label} className="border-b py-2 last:border-b-0" style={{ borderColor: STUDY_BORDER }}>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: STUDY_MUTED }}>{fact.label}</p>
                <p className="mt-1 text-xs font-semibold leading-snug" style={{ color: STUDY_TEXT }}>{fact.value}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="text-xs leading-relaxed" style={{ color: STUDY_MUTED }}>
        This compares the saved study recipes and evidence snapshots. Rerunning both as a single statistical contrast can be added later without turning the Builder back into a cohort tool.
      </p>
    </div>
  )
}

function currentEvidence(mode, queryResult, compareResult) {
  if (mode === 'compare') {
    const a = compareResult?.cohortA?.totalCohortSize || 0
    const b = compareResult?.cohortB?.totalCohortSize || 0
    return { status: evidenceStatus(Math.min(a, b)), qualifiedUsers: a + b, matchedUsers: Math.min(a, b) }
  }
  const n = queryResult?.totalCohortSize || 0
  return { status: evidenceStatus(n), qualifiedUsers: n, matchedUsers: n }
}

function canAdvanceBuilder(step, state, scanKeys) {
  if (step === 'in') {
    if (state.targetType === 'exercise') return Boolean(state.exerciseId)
    if (state.targetType === 'muscle' || state.targetType === 'equipment') return Boolean(state.muscle)
    return true
  }
  if (step === 'measure') return Boolean(state.measure)
  if (step === 'variables') return scanKeys.length > 0
  return true
}

function targetSummary(state, exerciseName) {
  if (state.targetType === 'exercise') return exerciseName || 'Choose exercise'
  if (state.targetType === 'muscle') return state.muscle || 'Choose muscle'
  if (state.targetType === 'equipment') return state.muscle || 'Choose equipment'
  if (state.targetType === 'session') return 'Whole session'
  return 'All training'
}

function savedStudyRecipe(study) {
  const facts = savedStudyFacts(study)
  return facts.map(fact => `${fact.label}: ${fact.value}`).join(' / ')
}

function savedStudyFacts(study) {
  const query = study.query || {}
  const filters = query.filters || query.cohortA?.filters || []
  const target = query.exerciseId || query.muscle || query.targetType || 'all training'
  const variables = Array.isArray(query.groupBys)
    ? query.groupBys.map(prettyGroupBy).join(', ')
    : prettyGroupBy(query.groupBy || 'selected variables')
  const population = query.cohortA && query.cohortB
    ? `${query.cohortA.label || 'A'} vs ${query.cohortB.label || 'B'}`
    : filters.length
      ? `${filters.length} population rule${filters.length === 1 ? '' : 's'}`
      : 'All qualified'
  return [
    { label: 'In', value: target },
    { label: 'Measure', value: prettyMeasure(query.measure || 'progression_rate') },
    { label: 'Variables', value: variables || 'Saved relationship' },
    { label: 'Population', value: population },
  ]
}

function populationLabel(mode) {
  if (mode === 'people_like_me') return 'People like me'
  if (mode === 'custom') return 'Custom'
  return 'All qualified'
}

function confidenceFor(n) {
  if (n >= 100) return 86
  if (n >= 30) return Math.max(52, Math.min(78, Math.round(n * 1.4)))
  if (n >= 10) return Math.max(28, Math.min(48, Math.round(n * 2.4)))
  return 0
}

function rankVariableFamilies(targetType, measure) {
  const scores = {
    set: targetType === 'session' || String(measure).startsWith('set_') ? 5 : targetType === 'exercise' ? 4 : 2,
    training: targetType === 'exercise' || targetType === 'muscle' ? 4 : 3,
    lifestyle: ['progression_rate', 'top_set_pct_change', 'recovery_volume_tolerance'].includes(measure) ? 3 : 1,
    profile: targetType === 'all' ? 4 : 2,
    exercise: targetType === 'equipment' || targetType === 'muscle' || targetType === 'all' ? 4 : 2,
  }
  return [...VARIABLE_FAMILIES].sort((a, b) => (scores[b.key] || 0) - (scores[a.key] || 0))
}

function outcomesForTarget(targetType) {
  const setKeys = ['set_volume_load', 'set_weight_kg', 'set_reps', 'set_rir', 'set_rest_seconds']
  const profileKeys = OUTCOME_OPTIONS.map(option => option.value)
  const keys = targetType === 'session'
    ? [...setKeys, 'volume_load', 'progression_rate']
    : targetType === 'all'
      ? ['progression_rate', 'estimated_1rm', 'top_set_pct_change', 'improvement_frequency', 'recovery_volume_tolerance', 'volume_load']
      : profileKeys
  return keys.map(key => MEASURE_OPTIONS.find(option => option.value === key)).filter(Boolean)
}

function measureFitText(measure, targetType) {
  if (String(measure).startsWith('set_')) return targetType === 'session' ? 'Best for session and set-level questions.' : 'Runs on set logs inside the selected scope.'
  if (measure === 'volume_load') return 'Uses average exercise volume from qualified logs.'
  return 'Uses qualified exercise history and weekly aggregates.'
}

function studyQuestion({ state, scanKeys, populationMode, exerciseName }) {
  const target = exerciseName || state.muscle || (state.targetType === 'all' ? 'all logged training' : state.targetType)
  const vars = scanKeys.length ? scanKeys.map(key => prettyGroupBy(key).toLowerCase()).join(', ') : 'selected variables'
  const population = populationLabel(populationMode).toLowerCase()
  return `For ${population}, which of ${vars} best relates to ${target} ${prettyMeasure(state.measure).toLowerCase()}?`
}

function evidenceStatus(n) {
  if (n >= 100) return 'Strong'
  if (n >= 30) return 'Good'
  if (n >= 10) return 'Sparse'
  return 'Not enough'
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="block text-[10px] font-semibold uppercase tracking-widest" style={{ color: STUDY_MUTED }}>{label}</span>
      {children}
    </label>
  )
}

function Chip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl px-3 py-2 text-xs font-semibold"
      style={{
        background: active ? STUDY_ACCENT_FAINT : STUDY_CARD,
        border: `1px solid ${active ? STUDY_ACCENT : STUDY_BORDER}`,
        color: active ? STUDY_TEXT : STUDY_MUTED,
      }}
    >
      {children}
    </button>
  )
}

function StepCard({ number, title, body, children }) {
  return (
    <section className="space-y-3 rounded-2xl p-4" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
      <div className="flex gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={BRAND_BUTTON_STYLE}>{number}</span>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: STUDY_TEXT }}>{title}</h2>
          {body && <p className="text-xs leading-relaxed" style={{ color: STUDY_MUTED }}>{body}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function SectionTitle({ title, body }) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: STUDY_TEXT }}>{title}</h2>
      {body && <p className="mt-1 text-xs leading-relaxed" style={{ color: STUDY_MUTED }}>{body}</p>}
    </div>
  )
}

function Notice({ children }) {
  return (
    <div className="rounded-2xl p-4 text-xs leading-relaxed" style={{ background: STUDY_BRAND_FAINT, border: `1px solid ${STUDY_BRAND}`, color: STUDY_TEXT }}>
      {children}
    </div>
  )
}

function EmptyText({ children }) {
  return (
    <div className="rounded-2xl p-6 text-center text-xs" style={{ background: STUDY_CARD, border: `1px dashed ${STUDY_BORDER}`, color: STUDY_MUTED }}>
      {children}
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="h-24 animate-pulse rounded-2xl" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }} />
      ))}
    </div>
  )
}

function EvidenceBadge({ status }) {
  const color = status === 'Strong' ? STUDY_ACCENT : status === 'Good' ? '#9cae7a' : status === 'Sparse' ? '#c08a5a' : STUDY_MUTED
  return (
    <span className="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide" style={{ background: `${color}22`, color, border: `1px solid ${color}66` }}>
      {status || 'Not enough'}
    </span>
  )
}

function Contribution({ title, value, body }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
      <p className="text-xs" style={{ color: STUDY_MUTED }}>{title}</p>
      <p className="mt-1 text-lg font-bold" style={{ color: STUDY_TEXT }}>{value}</p>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: STUDY_MUTED }}>{body}</p>
    </div>
  )
}
