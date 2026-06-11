// Pure state/query helpers for the Study page, ported from the top and bottom
// of src/pages/Study.jsx (everything that isn't a component): the explorer
// state shape, featured/finding/saved → state mappers, payload builders, the
// builder-flow metadata, and the evidence math.
import {
  FIELD_BY_VALUE,
  MEASURE_OPTIONS,
  OPERATORS,
  OUTCOME_OPTIONS,
  type ResearchFilter,
  prettyGroupBy,
  prettyMeasure,
} from './researchTheme';

export type QueryState = {
  mode: 'single' | 'compare';
  filtersA: ResearchFilter[];
  filtersB: ResearchFilter[];
  cohortALabel: string;
  cohortBLabel: string;
  groupBy: string;
  measure: string;
  exerciseId: string;
  muscle: string;
  targetType: string;
  minCohort: number;
};

export const DEFAULT_SCAN_KEYS = ['split_type', 'frequency_bucket', 'sleep_quality_quartile', 'protein_bucket'];

export const DEFAULT_QUERY: QueryState = {
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
};

export const SESSION_FOCUS = [
  { key: 'whole_session', label: 'Whole session', comingSoon: false },
  { key: 'exercises_after', label: 'Exercises after anchor', comingSoon: true },
  { key: 'muscles_after', label: 'Muscles after anchor', comingSoon: true },
  { key: 'exercises_before', label: 'Exercises before anchor', comingSoon: true },
  { key: 'position', label: 'Position in session', comingSoon: true },
];

// Top-level muscle groups to show in the exercise browser chips.
export const TOP_MUSCLES = ['Chest', 'Back', 'Shoulders', 'Quads', 'Hamstrings', 'Glutes', 'Triceps', 'Biceps', 'Core', 'Traps', 'Forearms', 'Calves'];

export const TARGET_TYPES = [
  { key: 'exercise', label: 'Exercise' },
  { key: 'muscle', label: 'Muscle Group' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'session', label: 'Session' },
  { key: 'all', label: 'All Training' },
];

export const BUILDER_STEPS_FLOW = [
  { key: 'in', label: 'In' },
  { key: 'measure', label: 'Measure' },
  { key: 'variables', label: 'Variables' },
  { key: 'population', label: 'Population' },
  { key: 'review', label: 'Review' },
];

export const VARIABLE_FAMILIES = [
  { key: 'set', label: 'Set log', keys: ['rest_period_bucket', 'rir_bucket', 'rep_range_bucket', 'session_set_order_bucket'] },
  { key: 'training', label: 'Training', keys: ['frequency_bucket', 'session_position_bucket', 'split_type', 'rir_use'] },
  { key: 'lifestyle', label: 'Lifestyle', keys: ['sleep_duration_bucket', 'sleep_quality_quartile', 'stress_bucket', 'cardio_load_quartile', 'protein_bucket', 'nutrition_phase', 'creatine_use'] },
  { key: 'profile', label: 'Profile', keys: ['experience_level', 'goal', 'gender', 'age_range', 'enhancement_status', 'training_age_bucket', 'physical_labor_level', 'sport_primary', 'sport_frequency_bucket'] },
  { key: 'exercise', label: 'Exercise meta', keys: ['equipment_type', 'movement_pattern', 'force_vector', 'bilateral'] },
];

export const RULE_OPTIONS = [
  { key: 'sessions', label: '8+ sessions in scope', filter: { field: 'user_exercise_profile.total_sessions', op: '>=', value: 8 } },
  { key: 'weeks', label: '6+ logged weeks', filter: { field: 'user_exercise_profile.weeks_of_data', op: '>=', value: 6 } },
  { key: 'rirCoverage', label: '70%+ RIR coverage', filter: { field: 'user_exercise_profile.rir_logging_rate', op: '>=', value: 0.7 } },
];

export const UNAVAILABLE_BUILDER_OPTIONS = [
  { label: 'Program adherence', reason: 'Program tables exist, but the research engine does not join program runs yet.' },
  { label: 'Machine model', reason: 'The set column exists, but it is not whitelisted as a scan axis yet.' },
  { label: 'Body measurement history', reason: 'Body metric history is logged, but not aggregated into queryable study axes yet.' },
];

export function sanitizeFilters(filters: ResearchFilter[]): ResearchFilter[] {
  return filters.filter((f) => {
    if (!f.field || !f.op) return false;
    const op = OPERATORS.find((o) => o.value === f.op);
    if (!op) return false;
    return !op.needsValue || !(f.value === '' || f.value === undefined || f.value === null);
  });
}

export function defaultFilter(): ResearchFilter {
  return {
    field: 'users.experience_level',
    op: '=',
    value: FIELD_BY_VALUE['users.experience_level'].enum![0],
  };
}

function inferTargetType(q: any): string {
  return q.targetType || (q.exerciseId ? 'exercise' : q.muscle ? 'muscle' : 'exercise');
}

export function featuredToState(question: any): QueryState {
  const q = question.query || {};
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
      targetType: inferTargetType(q),
      minCohort: q.minCohort || DEFAULT_QUERY.minCohort,
    };
  }
  return {
    ...DEFAULT_QUERY,
    mode: 'single',
    filtersA: q.filters || [],
    groupBy: q.groupBy || DEFAULT_QUERY.groupBy,
    measure: q.measure || DEFAULT_QUERY.measure,
    exerciseId: q.exerciseId || '',
    muscle: q.muscle || '',
    targetType: inferTargetType(q),
    minCohort: q.minCohort || DEFAULT_QUERY.minCohort,
  };
}

export function findingToState(finding: any): QueryState {
  const q = finding.query_json || {};
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
      targetType: inferTargetType(q),
      minCohort: q.minCohort || DEFAULT_QUERY.minCohort,
    };
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
  };
}

export function savedToState(saved: any): QueryState {
  const q = saved.query || {};
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
    };
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
    };
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
  };
}

export function targetPayloadParts(state: QueryState) {
  return {
    filters:
      state.targetType === 'equipment' && state.muscle
        ? [{ field: 'exercises.equipment_type', op: '=', value: state.muscle }]
        : [],
    exerciseId: state.targetType === 'exercise' ? state.exerciseId || undefined : undefined,
    muscle: state.targetType === 'muscle' ? state.muscle || undefined : undefined,
  };
}

export function stateToPayload(state: QueryState) {
  const target = targetPayloadParts(state);

  const common = {
    groupBy: state.groupBy,
    measure: state.measure,
    exerciseId: target.exerciseId,
    muscle: target.muscle,
    targetType: state.targetType,
    minCohort: state.minCohort,
  };
  if (state.mode === 'compare') {
    return {
      mode: 'compare' as const,
      cohortA: { label: state.cohortALabel || 'A', filters: sanitizeFilters([...state.filtersA, ...target.filters]) },
      cohortB: { label: state.cohortBLabel || 'B', filters: sanitizeFilters([...state.filtersB, ...target.filters]) },
      ...common,
    };
  }
  return {
    mode: 'single' as const,
    filters: sanitizeFilters([...state.filtersA, ...target.filters]),
    ...common,
  };
}

export function currentEvidence(mode: string, queryResult: any, compareResult: any) {
  if (mode === 'compare') {
    const a = compareResult?.cohortA?.totalCohortSize || 0;
    const b = compareResult?.cohortB?.totalCohortSize || 0;
    return { status: evidenceStatus(Math.min(a, b)), qualifiedUsers: a + b, matchedUsers: Math.min(a, b) };
  }
  const n = queryResult?.totalCohortSize || 0;
  return { status: evidenceStatus(n), qualifiedUsers: n, matchedUsers: n };
}

export function canAdvanceBuilder(step: string, state: QueryState, scanKeys: string[]) {
  if (step === 'in') {
    if (state.targetType === 'exercise') return Boolean(state.exerciseId);
    if (state.targetType === 'muscle' || state.targetType === 'equipment') return Boolean(state.muscle);
    return true;
  }
  if (step === 'measure') return Boolean(state.measure);
  if (step === 'variables') return scanKeys.length > 0;
  return true;
}

export function targetSummary(state: QueryState, exerciseName: string) {
  if (state.targetType === 'exercise') return exerciseName || 'Choose exercise';
  if (state.targetType === 'muscle') return state.muscle || 'Choose muscle';
  if (state.targetType === 'equipment') return state.muscle || 'Choose equipment';
  if (state.targetType === 'session') return 'Whole session';
  return 'All training';
}

export function savedStudyFacts(study: any) {
  const query = study.query || {};
  const filters = query.filters || query.cohortA?.filters || [];
  const target = query.exerciseId || query.muscle || query.targetType || 'all training';
  const variables = Array.isArray(query.groupBys)
    ? query.groupBys.map(prettyGroupBy).join(', ')
    : prettyGroupBy(query.groupBy || 'selected variables');
  const population = query.cohortA && query.cohortB
    ? `${query.cohortA.label || 'A'} vs ${query.cohortB.label || 'B'}`
    : filters.length
      ? `${filters.length} population rule${filters.length === 1 ? '' : 's'}`
      : 'All qualified';
  return [
    { label: 'In', value: target },
    { label: 'Measure', value: prettyMeasure(query.measure || 'progression_rate') },
    { label: 'Variables', value: variables || 'Saved relationship' },
    { label: 'Population', value: population },
  ];
}

export function savedStudyRecipe(study: any) {
  return savedStudyFacts(study)
    .map((fact) => `${fact.label}: ${fact.value}`)
    .join(' / ');
}

export function populationLabel(mode: string) {
  if (mode === 'people_like_me') return 'People like me';
  if (mode === 'custom') return 'Custom';
  return 'All qualified';
}

export function confidenceFor(n: number) {
  if (n >= 100) return 86;
  if (n >= 30) return Math.max(52, Math.min(78, Math.round(n * 1.4)));
  if (n >= 10) return Math.max(28, Math.min(48, Math.round(n * 2.4)));
  return 0;
}

export function rankVariableFamilies(targetType: string, measure: string) {
  const scores: Record<string, number> = {
    set: targetType === 'session' || String(measure).startsWith('set_') ? 5 : targetType === 'exercise' ? 4 : 2,
    training: targetType === 'exercise' || targetType === 'muscle' ? 4 : 3,
    lifestyle: ['progression_rate', 'top_set_pct_change', 'recovery_volume_tolerance'].includes(measure) ? 3 : 1,
    profile: targetType === 'all' ? 4 : 2,
    exercise: targetType === 'equipment' || targetType === 'muscle' || targetType === 'all' ? 4 : 2,
  };
  return [...VARIABLE_FAMILIES].sort((a, b) => (scores[b.key] || 0) - (scores[a.key] || 0));
}

export function outcomesForTarget(targetType: string) {
  const setKeys = ['set_volume_load', 'set_weight_kg', 'set_reps', 'set_rir', 'set_rest_seconds'];
  const profileKeys = OUTCOME_OPTIONS.map((option) => option.value);
  const keys =
    targetType === 'session'
      ? [...setKeys, 'volume_load', 'progression_rate']
      : targetType === 'all'
        ? ['progression_rate', 'estimated_1rm', 'top_set_pct_change', 'improvement_frequency', 'recovery_volume_tolerance', 'volume_load']
        : profileKeys;
  return keys
    .map((key) => MEASURE_OPTIONS.find((option) => option.value === key))
    .filter(Boolean) as { value: string; label: string; units?: string }[];
}

export function measureFitText(measure: string, targetType: string) {
  if (String(measure).startsWith('set_')) {
    return targetType === 'session' ? 'Best for session and set-level questions.' : 'Runs on set logs inside the selected scope.';
  }
  if (measure === 'volume_load') return 'Uses average exercise volume from qualified logs.';
  return 'Uses qualified exercise history and weekly aggregates.';
}

export function studyQuestion({
  state,
  scanKeys,
  populationMode,
  exerciseName,
}: {
  state: QueryState;
  scanKeys: string[];
  populationMode: string;
  exerciseName: string;
}) {
  const target = exerciseName || state.muscle || (state.targetType === 'all' ? 'all logged training' : state.targetType);
  const vars = scanKeys.length ? scanKeys.map((key) => prettyGroupBy(key).toLowerCase()).join(', ') : 'selected variables';
  const population = populationLabel(populationMode).toLowerCase();
  return `For ${population}, which of ${vars} best relates to ${target} ${prettyMeasure(state.measure).toLowerCase()}?`;
}

export function evidenceStatus(n: number) {
  if (n >= 100) return 'Strong';
  if (n >= 30) return 'Good';
  if (n >= 10) return 'Sparse';
  return 'Not enough';
}
