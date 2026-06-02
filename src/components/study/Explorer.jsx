import { useState, useMemo, forwardRef } from 'react'
import FilterRow from './FilterRow.jsx'
import { SingleResultChart, CompareResultChart } from './ResultsChart.jsx'
import { SEED_EXERCISES } from '../../lib/exercises.js'
import {
  STUDY_CARD, STUDY_BORDER, STUDY_BORDER_STRONG, STUDY_TEXT, STUDY_MUTED, STUDY_ACCENT,
  STUDY_COMPARE_A, STUDY_COMPARE_B,
  GROUP_BY_OPTIONS, MEASURE_OPTIONS, FIELD_BY_VALUE, OPERATORS,
  PERSONAL_BUCKET_FROM_USER, describeQuery,
} from '../../lib/researchTheme.js'

const SELECT_CLS = 'w-full text-sm font-mono px-3 py-2 rounded bg-transparent focus:outline-none'

function defaultFilter() {
  return { field: 'users.experience_level', op: '=', value: FIELD_BY_VALUE['users.experience_level'].enum[0] }
}

function sanitizeFilters(filters) {
  return filters.filter(f => {
    if (!f.field || !f.op) return false
    const op = OPERATORS.find(o => o.value === f.op)
    if (!op) return false
    if (op.needsValue && (f.value === '' || f.value === undefined || f.value === null)) return false
    return true
  })
}

const Explorer = forwardRef(function Explorer({
  mode, setMode,
  filtersA, setFiltersA,
  filtersB, setFiltersB,
  cohortALabel, setCohortALabel,
  cohortBLabel, setCohortBLabel,
  groupBy, setGroupBy,
  measure, setMeasure,
  exerciseId, setExerciseId,
  minCohort, setMinCohort,
  onRun, loading,
  result, compareResult,
  user, showPersonal, setShowPersonal,
}, ref) {
  const [exerciseSearch, setExerciseSearch] = useState('')

  const exerciseName = useMemo(() => SEED_EXERCISES.find(e => e.id === exerciseId)?.name || null, [exerciseId])
  const filteredExercises = useMemo(() => {
    const q = exerciseSearch.trim().toLowerCase()
    const list = q
      ? SEED_EXERCISES.filter(e => e.name.toLowerCase().includes(q) || e.primary_muscle.toLowerCase().includes(q))
      : SEED_EXERCISES
    return list.slice(0, 50)
  }, [exerciseSearch])

  const personalSupported = !!PERSONAL_BUCKET_FROM_USER[groupBy]

  function run() {
    if (mode === 'single') {
      onRun({
        mode: 'single',
        filters: sanitizeFilters(filtersA),
        groupBy, measure, exerciseId: exerciseId || undefined, minCohort,
      })
    } else {
      onRun({
        mode: 'compare',
        cohortA: { label: cohortALabel || 'A', filters: sanitizeFilters(filtersA) },
        cohortB: { label: cohortBLabel || 'B', filters: sanitizeFilters(filtersB) },
        groupBy, measure, exerciseId: exerciseId || undefined, minCohort,
      })
    }
  }

  return (
    <section ref={ref} className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold" style={{ color: STUDY_TEXT }}>Explorer</h2>
        <div className="inline-flex rounded-full p-0.5" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
          <button
            onClick={() => setMode('single')}
            className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide rounded-full transition-colors"
            style={{
              background: mode === 'single' ? STUDY_ACCENT : 'transparent',
              color: mode === 'single' ? '#0d1117' : STUDY_MUTED,
            }}
          >
            Single
          </button>
          <button
            onClick={() => setMode('compare')}
            className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide rounded-full transition-colors"
            style={{
              background: mode === 'compare' ? STUDY_ACCENT : 'transparent',
              color: mode === 'compare' ? '#0d1117' : STUDY_MUTED,
            }}
          >
            Compare cohorts
          </button>
        </div>
      </div>

      {mode === 'single' ? (
        <FilterPanel
          title="Filters"
          filters={filtersA}
          setFilters={setFiltersA}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FilterPanel
            title="Cohort A"
            label={cohortALabel}
            setLabel={setCohortALabel}
            filters={filtersA}
            setFilters={setFiltersA}
            accent={STUDY_COMPARE_A}
          />
          <FilterPanel
            title="Cohort B"
            label={cohortBLabel}
            setLabel={setCohortBLabel}
            filters={filtersB}
            setFilters={setFiltersB}
            accent={STUDY_COMPARE_B}
          />
        </div>
      )}

      {/* Shared controls */}
      <div className="rounded-xl p-3 grid grid-cols-2 gap-3" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
        <Field label="Group by">
          <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className={SELECT_CLS} style={{ color: STUDY_TEXT }}>
            {GROUP_BY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Measure">
          <select value={measure} onChange={e => setMeasure(e.target.value)} className={SELECT_CLS} style={{ color: STUDY_TEXT }}>
            {MEASURE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Exercise (optional)">
          <input
            value={exerciseSearch || exerciseName || ''}
            onChange={e => { setExerciseSearch(e.target.value); setExerciseId('') }}
            placeholder="Search…"
            className={SELECT_CLS}
            style={{ color: STUDY_TEXT, border: `1px solid ${STUDY_BORDER_STRONG}` }}
          />
          {(exerciseSearch && !exerciseId) && (
            <div className="mt-1 max-h-40 overflow-y-auto rounded" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
              {filteredExercises.map(e => (
                <button
                  key={e.id}
                  onClick={() => { setExerciseId(e.id); setExerciseSearch('') }}
                  className="block w-full text-left px-3 py-1.5 text-xs hover:opacity-80"
                  style={{ color: STUDY_TEXT, borderBottom: `1px solid ${STUDY_BORDER}` }}
                >
                  {e.name} <span style={{ color: STUDY_MUTED }}>· {e.primary_muscle}</span>
                </button>
              ))}
              {!filteredExercises.length && (
                <div className="px-3 py-2 text-xs" style={{ color: STUDY_MUTED }}>No matches.</div>
              )}
            </div>
          )}
          {exerciseId && (
            <button onClick={() => { setExerciseId(''); setExerciseSearch('') }} className="text-[11px] mt-1 underline" style={{ color: STUDY_MUTED }}>clear</button>
          )}
        </Field>
        <Field label="Min cohort">
          <input
            type="number"
            min={1}
            value={minCohort}
            onChange={e => setMinCohort(Math.max(1, Number(e.target.value) || 1))}
            className={SELECT_CLS}
            style={{ color: STUDY_TEXT, border: `1px solid ${STUDY_BORDER_STRONG}` }}
          />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs select-none" style={{ color: personalSupported ? STUDY_TEXT : STUDY_MUTED }}>
          <input
            type="checkbox"
            checked={showPersonal && personalSupported}
            onChange={e => setShowPersonal(e.target.checked)}
            disabled={!personalSupported}
            className="accent-current"
            style={{ accentColor: STUDY_ACCENT }}
          />
          Show my data
          {!personalSupported && <span className="text-[10px]" style={{ color: STUDY_MUTED }}>(unavailable for this group-by)</span>}
        </label>
        <button
          onClick={run}
          disabled={loading}
          className="px-5 py-2 rounded text-sm font-semibold uppercase tracking-wide transition-opacity disabled:opacity-50"
          style={{ background: STUDY_ACCENT, color: '#0d1117' }}
        >
          {loading ? 'Running…' : 'Run query'}
        </button>
      </div>

      {/* Results */}
      <ResultsPanel
        mode={mode}
        loading={loading}
        result={result}
        compareResult={compareResult}
        measure={measure}
        groupBy={groupBy}
        exerciseId={exerciseId}
        exerciseName={exerciseName}
        user={user}
        showPersonal={showPersonal && personalSupported}
      />
    </section>
  )
})

export default Explorer

function FilterPanel({ title, label, setLabel, filters, setFilters, accent }) {
  function update(i, next) { setFilters(filters.map((f, idx) => idx === i ? next : f)) }
  function remove(i) { setFilters(filters.filter((_, idx) => idx !== i)) }
  function add() { setFilters([...filters, defaultFilter()]) }

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: STUDY_CARD, border: `1px solid ${accent || STUDY_BORDER}` }}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest" style={{ color: accent || STUDY_MUTED }}>{title}</h3>
        {setLabel && (
          <input
            value={label || ''}
            onChange={e => setLabel(e.target.value)}
            placeholder="Label"
            className="text-xs font-mono px-2 py-0.5 rounded bg-transparent focus:outline-none"
            style={{ color: STUDY_TEXT, border: `1px solid ${STUDY_BORDER_STRONG}`, maxWidth: 120 }}
          />
        )}
      </div>
      <div className="space-y-2">
        {filters.length === 0 && (
          <div className="text-[11px] font-mono py-2" style={{ color: STUDY_MUTED }}>
            No filters — whole opted-in population.
          </div>
        )}
        {filters.map((f, i) => (
          <FilterRow key={i} filter={f} onChange={next => update(i, next)} onRemove={() => remove(i)} />
        ))}
        <button
          onClick={add}
          className="text-xs px-3 py-1.5 rounded transition-colors"
          style={{ color: STUDY_TEXT, border: `1px dashed ${STUDY_BORDER_STRONG}` }}
        >
          + Add filter
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: STUDY_MUTED }}>{label}</span>
      {children}
    </label>
  )
}

function ResultsPanel({ mode, loading, result, compareResult, measure, groupBy, exerciseId, exerciseName, user, showPersonal }) {
  if (loading) {
    return (
      <div className="rounded-xl p-4 space-y-3 animate-pulse" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
        <div className="h-3 rounded w-3/4" style={{ background: STUDY_BORDER_STRONG }} />
        <div className="h-48 rounded" style={{ background: STUDY_BORDER }} />
      </div>
    )
  }

  if (mode === 'single' && result) {
    return (
      <div className="rounded-xl p-4 space-y-3" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
        <p className="text-sm" style={{ color: STUDY_TEXT }}>
          {describeQuery({ filters: result.query?.filters, groupBy, measure, exerciseId, exerciseName })}
        </p>
        <SingleResultChart
          buckets={result.buckets || []}
          measure={measure}
          groupBy={groupBy}
          totalCohortSize={result.totalCohortSize || 0}
          user={user}
          showPersonal={showPersonal}
        />
      </div>
    )
  }

  if (mode === 'compare' && compareResult) {
    return (
      <div className="rounded-xl p-4 space-y-3" style={{ background: STUDY_CARD, border: `1px solid ${STUDY_BORDER}` }}>
        <p className="text-sm" style={{ color: STUDY_TEXT }}>
          {describeQuery({ groupBy, measure, exerciseId, exerciseName })}
          <span style={{ color: STUDY_MUTED }}> · </span>
          <span style={{ color: STUDY_COMPARE_A }}>{compareResult.cohortA?.label}</span>
          <span style={{ color: STUDY_MUTED }}> vs </span>
          <span style={{ color: STUDY_COMPARE_B }}>{compareResult.cohortB?.label}</span>
        </p>
        <CompareResultChart
          cohortA={compareResult.cohortA}
          cohortB={compareResult.cohortB}
          measure={measure}
          groupBy={groupBy}
          user={user}
          showPersonal={showPersonal}
        />
      </div>
    )
  }

  return (
    <div className="rounded-xl p-6 text-center text-xs font-mono" style={{ background: STUDY_CARD, border: `1px dashed ${STUDY_BORDER}`, color: STUDY_MUTED }}>
      Tap Run query to see results.
    </div>
  )
}
