// Port of the Explore (builder) surface from src/pages/Study.jsx: the 5-step
// study builder (In → Measure → Variables → Population → Review) with the
// natural-language search bar on top and the results block below.
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  PEOPLE_FILTERS,
  PEOPLE_FILTER_BY_KEY,
  STUDY_ACCENT,
  STUDY_ACCENT_DIM,
  STUDY_ACCENT_FAINT,
  STUDY_BG,
  STUDY_BORDER,
  STUDY_BORDER_STRONG,
  STUDY_BRAND,
  STUDY_CARD,
  STUDY_COMPARE_B,
  STUDY_DIM,
  STUDY_MUTED,
  STUDY_ON_BRAND,
  STUDY_TEXT,
  type MatchValue,
  type ResearchFilter,
  defaultMatchValue,
  peopleToFilters,
  prettyBucket,
  prettyGroupBy,
  prettyMeasure,
} from '@/lib/researchTheme';
import { EQUIPMENT_TYPES, SEED_EXERCISES } from '@/lib/exercises';
import {
  BUILDER_STEPS_FLOW,
  RULE_OPTIONS,
  SESSION_FOCUS,
  TARGET_TYPES,
  TOP_MUSCLES,
  UNAVAILABLE_BUILDER_OPTIONS,
  type QueryState,
  canAdvanceBuilder,
  confidenceFor,
  defaultFilter,
  evidenceStatus,
  measureFitText,
  outcomesForTarget,
  populationLabel,
  rankVariableFamilies,
  sanitizeFilters,
  studyQuestion,
  targetPayloadParts,
  targetSummary,
} from '@/lib/studyState';
import { monoFont } from '@/lib/theme';
import ExploreSearchBar from './ExploreSearchBar';
import FilterRow from './FilterRow';
import ResultsBlock from './ResultsBlock';
import { BrandButton, Chip, Field, MiniMetric, StepCard } from './studyUi';

export default function Explore(props: {
  state: QueryState;
  setState: (updater: (current: QueryState) => QueryState) => void;
  scanKeys: string[];
  setScanKeys: (updater: (keys: string[]) => string[]) => void;
  selectedScan: any;
  setSelectedScan: (row: any) => void;
  runCurrentScan: () => Promise<any>;
  saveCurrentQuestion: (mode?: string) => Promise<void>;
  loading: boolean;
  queryResult: any;
  compareResult: any;
  scanResult: any;
  compareScanResult: any;
  previewResult: any;
  previewLoading: boolean;
  activeSavedId: string | null;
  user: any;
  exerciseName: string;
  personalSupported: boolean;
  populationMode: string;
  setPopulationMode: (mode: string) => void;
  matchKeys: string[];
  setMatchKeys: (updater: (keys: string[]) => string[]) => void;
  matchValues: Record<string, MatchValue>;
  setMatchValues: (updater: (values: Record<string, MatchValue>) => Record<string, MatchValue>) => void;
  previewStudy: (params: any) => Promise<any>;
  ruleFilters: ResearchFilter[];
  setRuleFilters: (filters: ResearchFilter[]) => void;
  onSearchSelect: (config: any) => void;
}) {
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
    onSearchSelect,
  } = props;
  const [step, setStep] = useState('in');
  const [activeFamilyKey, setActiveFamilyKey] = useState('set');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [unavailableOpen, setUnavailableOpen] = useState(false);
  const [showPersonal, setShowPersonal] = useState(false);
  const resultReady = state.mode === 'compare' ? Boolean(compareResult) : Boolean(scanResult) || Boolean(queryResult);
  const rankedFamilies = useMemo(() => rankVariableFamilies(state.targetType, state.measure), [state.targetType, state.measure]);
  const activeFamily = rankedFamilies.find((f) => f.key === activeFamilyKey) || rankedFamilies[0];
  const allPreviewKeys = useMemo(() => [...new Set(rankedFamilies.flatMap((f) => f.keys))], [rankedFamilies]);
  const previewByKey = useMemo(() => {
    const m: Record<string, any> = {};
    (previewResult?.variables || []).forEach((item: any) => {
      m[item.groupBy] = item;
    });
    return m;
  }, [previewResult]);
  const selectedPreview = scanKeys.map((key) => previewByKey[key]).filter(Boolean);
  const reviewN = selectedPreview.length
    ? Math.min(...selectedPreview.map((item: any) => item.after || 0))
    : previewResult?.baseMatchedUsers || 0;
  const reviewStatus = evidenceStatus(reviewN);
  const reviewConfidence = confidenceFor(reviewN);
  const biggestReducer =
    [...selectedPreview].sort((a: any, b: any) => (b.removed || 0) - (a.removed || 0))[0] || previewResult?.biggestReducer;
  const question = studyQuestion({ state, scanKeys, populationMode, exerciseName });
  const currentStepIndex = BUILDER_STEPS_FLOW.findIndex((item) => item.key === step);
  const isLastStep = step === 'review';

  function patch(patchValue: Partial<QueryState>) {
    setState((current) => ({ ...current, mode: 'single', filtersB: [], ...patchValue }));
  }

  function toggleScanKey(key: string) {
    setScanKeys((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]));
  }

  function toggleRule(rule: (typeof RULE_OPTIONS)[number]) {
    const matches = (f: ResearchFilter) =>
      f.field === rule.filter.field && f.op === rule.filter.op && String(f.value) === String(rule.filter.value);
    const exists = ruleFilters.some(matches);
    setRuleFilters(exists ? ruleFilters.filter((f) => !matches(f)) : [...ruleFilters, rule.filter]);
  }

  useEffect(() => {
    const filters =
      populationMode === 'people_like_me'
        ? peopleToFilters(user, matchKeys, matchValues)
        : populationMode === 'custom'
          ? sanitizeFilters(state.filtersA)
          : [];
    const target = targetPayloadParts(state);
    previewStudy({
      filters: [...filters, ...ruleFilters, ...target.filters],
      groupBys: allPreviewKeys,
      measure: state.measure,
      exerciseId: target.exerciseId,
      muscle: target.muscle,
      minCohort: state.minCohort,
    });
  }, [allPreviewKeys, matchKeys, matchValues, populationMode, previewStudy, ruleFilters, state, user]);

  useEffect(() => {
    if (!rankedFamilies.some((f) => f.key === activeFamilyKey)) setActiveFamilyKey(rankedFamilies[0]?.key || 'set');
  }, [activeFamilyKey, rankedFamilies]);

  return (
    <View style={{ gap: 16 }}>
      <ExploreSearchBar
        onSelect={(config) => {
          onSearchSelect(config);
          setStep('review');
        }}
      />
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
      {step === 'in' && (
        <StepCard number="1" title="In" body="Choose the part of the opted-in training dataset this study should look inside.">
          <TargetControls state={state} patch={patch} />
        </StepCard>
      )}
      {step === 'measure' && (
        <StepCard number="2" title="Measure" body="Pick the outcome the selected variables will be tested against.">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {outcomesForTarget(state.targetType).map((option) => (
              <Pressable
                key={option.value}
                onPress={() => patch({ measure: option.value })}
                style={{
                  width: '48.5%',
                  minHeight: 96,
                  borderRadius: 12,
                  padding: 12,
                  backgroundColor: state.measure === option.value ? STUDY_ACCENT_FAINT : STUDY_CARD,
                  borderWidth: 1,
                  borderColor: state.measure === option.value ? STUDY_ACCENT : STUDY_BORDER,
                }}>
                <Text style={{ fontSize: 12, fontWeight: '600', lineHeight: 15, color: STUDY_TEXT }}>{option.label}</Text>
                <Text style={{ marginTop: 4, fontFamily: monoFont, fontSize: 10, color: STUDY_MUTED }}>
                  {option.units || 'outcome'}
                </Text>
                <Text style={{ marginTop: 8, fontSize: 11, lineHeight: 15, color: STUDY_MUTED }}>
                  {measureFitText(option.value, state.targetType)}
                </Text>
              </Pressable>
            ))}
          </View>
          <UnavailableDrawer open={unavailableOpen} setOpen={setUnavailableOpen} />
        </StepCard>
      )}
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
        <StepCard number="4" title="Population" body="Choose who counts in this study. Comparisons happen later by saving studies in Evidence.">
          <PopulationModePicker value={populationMode} onChange={setPopulationMode} />
          {populationMode === 'people_like_me' && (
            <PeopleMatchEditor
              user={user}
              matchKeys={matchKeys}
              setMatchKeys={setMatchKeys}
              matchValues={matchValues}
              setMatchValues={setMatchValues}
            />
          )}
          {populationMode === 'custom' && (
            <FilterPanel title="Custom population" filters={state.filtersA} setFilters={(filtersA) => patch({ filtersA })} />
          )}
          <Text
            style={{
              borderRadius: 12,
              padding: 12,
              fontSize: 12,
              lineHeight: 17,
              color: STUDY_MUTED,
              backgroundColor: STUDY_BG,
              borderWidth: 1,
              borderColor: STUDY_BORDER,
              overflow: 'hidden',
            }}>
            Save separate studies when you want to compare different exercises, populations, or scopes.
          </Text>
        </StepCard>
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
      <BuilderPager step={step} setStep={setStep} canGoNext={canAdvanceBuilder(step, state, scanKeys)} nextLabel={isLastStep ? 'Ready' : 'Next'} />
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
    </View>
  );
}

function BuilderProgressHeader({ step }: { step: string }) {
  const index = BUILDER_STEPS_FLOW.findIndex((item) => item.key === step);
  const current = BUILDER_STEPS_FLOW[index] || BUILDER_STEPS_FLOW[0];
  const pct = Math.round(((index + 1) / BUILDER_STEPS_FLOW.length) * 100);
  return (
    <View style={{ borderRadius: 16, padding: 16, backgroundColor: STUDY_CARD, borderWidth: 1, borderColor: STUDY_BORDER }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View>
          <Text style={{ fontFamily: monoFont, fontSize: 12, color: STUDY_ACCENT }}>
            Step {index + 1} of {BUILDER_STEPS_FLOW.length}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 18, fontWeight: '600', color: STUDY_TEXT }}>{current.label}</Text>
        </View>
        <View style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: STUDY_BG, borderWidth: 1, borderColor: STUDY_BORDER }}>
          <Text style={{ fontFamily: monoFont, fontSize: 12, color: STUDY_MUTED }}>{pct}%</Text>
        </View>
      </View>
      <View style={{ marginTop: 12, height: 6, overflow: 'hidden', borderRadius: 3, backgroundColor: STUDY_BG }}>
        <View style={{ height: '100%', borderRadius: 3, width: `${pct}%`, backgroundColor: STUDY_BRAND }} />
      </View>
    </View>
  );
}

function BuilderSummary({
  open,
  setOpen,
  state,
  scanKeys,
  populationMode,
  ruleFilters,
  exerciseName,
  setStep,
  currentStepIndex,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  state: QueryState;
  scanKeys: string[];
  populationMode: string;
  ruleFilters: ResearchFilter[];
  exerciseName: string;
  setStep: (step: string) => void;
  currentStepIndex: number;
}) {
  const rows = [
    { step: 'in', label: 'In', value: targetSummary(state, exerciseName) },
    { step: 'measure', label: 'Measure', value: prettyMeasure(state.measure) },
    { step: 'variables', label: 'Variables', value: scanKeys.length ? `${scanKeys.length} selected` : 'None yet' },
    { step: 'population', label: 'Population', value: populationLabel(populationMode) },
    { step: 'review', label: 'Rules', value: ruleFilters.length ? `${ruleFilters.length} rule${ruleFilters.length === 1 ? '' : 's'}` : `min n=${state.minCohort}` },
  ];
  return (
    <View style={{ borderRadius: 16, padding: 12, backgroundColor: STUDY_CARD, borderWidth: 1, borderColor: STUDY_BORDER }}>
      <Pressable onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5, color: STUDY_MUTED }}>
          Study so far
        </Text>
        <Text style={{ fontSize: 12, color: STUDY_TEXT }}>{open ? 'Hide' : 'Show'}</Text>
      </Pressable>
      {open && (
        <View style={{ marginTop: 12, gap: 8 }}>
          {rows.map((row, index) => {
            const disabled = index > currentStepIndex;
            return (
              <Pressable
                key={row.step}
                disabled={disabled}
                onPress={() => setStep(row.step)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: STUDY_BG,
                  borderWidth: 1,
                  borderColor: STUDY_BORDER,
                  opacity: disabled ? 0.45 : 1,
                }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: STUDY_MUTED }}>{row.label}</Text>
                  <Text numberOfLines={1} style={{ marginTop: 2, maxWidth: 200, fontSize: 12, fontWeight: '600', color: STUDY_TEXT }}>
                    {row.value}
                  </Text>
                </View>
                {!disabled && <Text style={{ fontSize: 11, color: STUDY_MUTED }}>Edit</Text>}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function BuilderPager({
  step,
  setStep,
  canGoNext,
  nextLabel,
}: {
  step: string;
  setStep: (step: string) => void;
  canGoNext: boolean;
  nextLabel: string;
}) {
  const index = BUILDER_STEPS_FLOW.findIndex((item) => item.key === step);
  const prev = BUILDER_STEPS_FLOW[index - 1]?.key;
  const next = BUILDER_STEPS_FLOW[index + 1]?.key;
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <BrandButton secondary disabled={!prev} onPress={() => prev && setStep(prev)}>
        Back
      </BrandButton>
      <BrandButton disabled={!next || !canGoNext} onPress={() => next && setStep(next)}>
        {next ? nextLabel : 'Ready'}
      </BrandButton>
    </View>
  );
}

function TargetControls({ state, patch }: { state: QueryState; patch: (patch: Partial<QueryState>) => void }) {
  const [search, setSearch] = useState('');
  const [muscleGroupFilter, setMuscleGroupFilter] = useState('');
  const [sessionFocus, setSessionFocus] = useState('whole_session');

  const currentExercise = SEED_EXERCISES.find((ex: any) => ex.id === state.exerciseId);

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SEED_EXERCISES.filter((ex: any) => {
      const matchesMuscle = !muscleGroupFilter || ex.primary_muscle === muscleGroupFilter;
      const matchesSearch = !q || ex.name.toLowerCase().includes(q) || ex.primary_muscle.toLowerCase().includes(q);
      return matchesMuscle && matchesSearch;
    });
  }, [search, muscleGroupFilter]);

  function selectTargetType(key: string) {
    patch({ targetType: key, exerciseId: '', muscle: '' });
    setSearch('');
    setMuscleGroupFilter('');
  }

  return (
    <View style={{ gap: 12 }}>
      {/* Target type selector */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TARGET_TYPES.map((t) => {
          const active = state.targetType === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => selectTargetType(t.key)}
              style={{
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: active ? STUDY_BRAND : STUDY_CARD,
                borderWidth: 1,
                borderColor: active ? STUDY_BRAND : STUDY_BORDER,
              }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: active ? STUDY_ON_BRAND : STUDY_TEXT }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Exercise browser */}
      {state.targetType === 'exercise' && (
        <View style={{ gap: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            <MuscleChip label="All" active={!muscleGroupFilter} onPress={() => setMuscleGroupFilter('')} />
            {TOP_MUSCLES.map((m) => (
              <MuscleChip key={m} label={m} active={muscleGroupFilter === m} onPress={() => setMuscleGroupFilter(muscleGroupFilter === m ? '' : m)} />
            ))}
          </ScrollView>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises…"
            placeholderTextColor={STUDY_MUTED}
            style={{
              borderRadius: 12,
              backgroundColor: '#101311',
              paddingHorizontal: 12,
              paddingVertical: 12,
              fontSize: 14,
              color: STUDY_TEXT,
            }}
          />
          {currentExercise && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: STUDY_ACCENT_FAINT,
                borderWidth: 1,
                borderColor: STUDY_ACCENT_DIM,
              }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: STUDY_TEXT }}>{currentExercise.name}</Text>
              <Pressable onPress={() => patch({ exerciseId: '', muscle: '' })} hitSlop={8}>
                <Text style={{ fontSize: 12, color: STUDY_MUTED }}>× Clear</Text>
              </Pressable>
            </View>
          )}
          <View style={{ maxHeight: 192, borderRadius: 12, overflow: 'hidden', backgroundColor: STUDY_CARD, borderWidth: 1, borderColor: STUDY_BORDER }}>
            <ScrollView nestedScrollEnabled>
              {filteredExercises.length === 0 && (
                <Text style={{ paddingHorizontal: 12, paddingVertical: 12, fontSize: 12, color: STUDY_MUTED }}>No exercises found.</Text>
              )}
              {filteredExercises.map((ex: any) => {
                const selected = state.exerciseId === ex.id;
                return (
                  <Pressable
                    key={ex.id}
                    onPress={() => {
                      patch({ exerciseId: ex.id, muscle: '' });
                      setSearch('');
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: selected ? STUDY_ACCENT_FAINT : 'transparent',
                      borderBottomWidth: 1,
                      borderBottomColor: STUDY_BORDER,
                    }}>
                    <Text style={{ flex: 1, fontSize: 12, fontWeight: selected ? '600' : '400', color: selected ? STUDY_ACCENT : STUDY_TEXT }}>
                      {ex.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: STUDY_MUTED }}>
                      {ex.primary_muscle}
                      {selected ? ' ✓' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Muscle group chip grid */}
      {state.targetType === 'muscle' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TOP_MUSCLES.map((m) => (
            <MuscleChip key={m} label={m} active={state.muscle === m} onPress={() => patch({ muscle: state.muscle === m ? '' : m, exerciseId: '' })} />
          ))}
        </View>
      )}

      {/* Equipment chip grid */}
      {state.targetType === 'equipment' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {EQUIPMENT_TYPES.map((eq: string) => (
            <MuscleChip key={eq} label={eq} active={state.muscle === eq} onPress={() => patch({ muscle: state.muscle === eq ? '' : eq, exerciseId: '' })} />
          ))}
        </View>
      )}

      {/* Session focus */}
      {state.targetType === 'session' && (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SESSION_FOCUS.map((sf) => {
              const active = sessionFocus === sf.key && !sf.comingSoon;
              return (
                <Pressable
                  key={sf.key}
                  disabled={sf.comingSoon}
                  onPress={() => !sf.comingSoon && setSessionFocus(sf.key)}
                  style={{
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: active ? STUDY_BRAND : STUDY_CARD,
                    borderWidth: 1,
                    borderColor: active ? STUDY_BRAND : STUDY_BORDER,
                    opacity: sf.comingSoon ? 0.45 : 1,
                  }}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: sf.comingSoon ? STUDY_MUTED : active ? STUDY_ON_BRAND : STUDY_TEXT }}>
                    {sf.label}
                    {sf.comingSoon ? ' ·soon' : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ fontSize: 12, lineHeight: 17, color: STUDY_MUTED }}>
            Whole session analysis covers all exercises in a session. Advanced focus options require position tracking — coming soon.
          </Text>
        </View>
      )}

      {/* All training */}
      {state.targetType === 'all' && (
        <Text style={{ fontSize: 12, lineHeight: 17, color: STUDY_MUTED }}>
          Analysis covers all logged training across the opted-in population. No exercise or muscle filter is applied.
        </Text>
      )}
    </View>
  );
}

function MuscleChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexShrink: 0,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: active ? STUDY_BRAND : STUDY_CARD,
        borderWidth: 1,
        borderColor: active ? STUDY_BRAND : STUDY_BORDER,
      }}>
      <Text style={{ fontSize: 12, fontWeight: '500', color: active ? STUDY_ON_BRAND : STUDY_TEXT }}>{label}</Text>
    </Pressable>
  );
}

function BuilderVariablesStep({
  rankedFamilies,
  activeFamily,
  setActiveFamilyKey,
  scanKeys,
  toggleScanKey,
  previewByKey,
  previewResult,
  previewLoading,
  unavailableOpen,
  setUnavailableOpen,
}: {
  rankedFamilies: { key: string; label: string; keys: string[] }[];
  activeFamily: { key: string; label: string; keys: string[] };
  setActiveFamilyKey: (key: string) => void;
  scanKeys: string[];
  toggleScanKey: (key: string) => void;
  previewByKey: Record<string, any>;
  previewResult: any;
  previewLoading: boolean;
  unavailableOpen: boolean;
  setUnavailableOpen: (open: boolean) => void;
}) {
  const noQualifiedBase = !previewLoading && previewResult && Number(previewResult.baseMatchedUsers || 0) === 0;
  return (
    <StepCard number="3" title="Variables" body="Pick multiple factors to scan. Families are ranked for the scope and outcome you chose.">
      {noQualifiedBase && (
        <Text
          style={{
            borderRadius: 12,
            padding: 12,
            fontSize: 12,
            lineHeight: 17,
            color: STUDY_MUTED,
            backgroundColor: STUDY_BG,
            borderWidth: 1,
            borderColor: STUDY_BORDER,
            overflow: 'hidden',
          }}>
          No qualified lifters match this scope and outcome yet. You can still choose variables, but the study needs a broader scope or more logged data before it can run.
        </Text>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {rankedFamilies.map((family) => (
          <Chip key={family.key} active={activeFamily.key === family.key} onPress={() => setActiveFamilyKey(family.key)}>
            {family.label}
          </Chip>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {activeFamily.keys.map((key) => (
          <VariablePickCard key={key} groupBy={key} active={scanKeys.includes(key)} preview={previewByKey[key]} onPress={() => toggleScanKey(key)} />
        ))}
      </View>
      <SelectedVariableChips scanKeys={scanKeys} onToggle={toggleScanKey} />
      <UnavailableDrawer open={unavailableOpen} setOpen={setUnavailableOpen} />
    </StepCard>
  );
}

function VariablePickCard({ groupBy, active, preview, onPress }: { groupBy: string; active: boolean; preview: any; onPress: () => void }) {
  const before = Number(preview?.before || 0);
  const after = Number(preview?.after || 0);
  const removed = Number(preview?.removed || 0);
  const warn = before > 0 && preview?.crossesThreshold && removed > 0;
  const showCut = before > 0 && removed > 0 && (warn || removed / before >= 0.15);
  const unavailable = preview && !preview.available;
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: '48.5%',
        minHeight: 112,
        borderRadius: 12,
        padding: 12,
        backgroundColor: active ? STUDY_ACCENT_FAINT : STUDY_CARD,
        borderWidth: 1,
        borderColor: active ? STUDY_ACCENT : warn ? STUDY_COMPARE_B : STUDY_BORDER,
      }}>
      <Text style={{ fontSize: 12, fontWeight: '600', lineHeight: 15, color: STUDY_TEXT }}>{prettyGroupBy(groupBy)}</Text>
      <Text style={{ marginTop: 8, fontFamily: monoFont, fontSize: 11, color: warn ? STUDY_COMPARE_B : STUDY_MUTED }}>
        {showCut ? `n=${before} -> ${after}` : unavailable ? `below min n=${preview.minCohort || 10}` : preview ? preview.evidenceStatus : 'checking'}
      </Text>
      {showCut && (
        <Text style={{ marginTop: 4, fontSize: 11, lineHeight: 15, color: STUDY_MUTED }}>
          Selecting this removes {removed} matched lifters.
        </Text>
      )}
      {unavailable && !showCut && (
        <Text style={{ marginTop: 4, fontSize: 11, lineHeight: 15, color: STUDY_MUTED }}>
          Valid axis, but not enough qualified buckets yet.
        </Text>
      )}
      {active && (
        <Text style={{ marginTop: 8, fontSize: 10, textTransform: 'uppercase', color: STUDY_ACCENT }}>Selected</Text>
      )}
    </Pressable>
  );
}

function SelectedVariableChips({ scanKeys, onToggle }: { scanKeys: string[]; onToggle: (key: string) => void }) {
  return (
    <View style={{ borderRadius: 12, padding: 12, backgroundColor: STUDY_BG, borderWidth: 1, borderColor: STUDY_BORDER }}>
      <Text style={{ fontSize: 12, fontWeight: '500', color: STUDY_MUTED }}>Selected variables</Text>
      <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {scanKeys.length === 0 && <Text style={{ fontSize: 12, color: STUDY_MUTED }}>None selected yet.</Text>}
        {scanKeys.map((key) => (
          <Pressable key={key} onPress={() => onToggle(key)} style={{ borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: STUDY_CARD }}>
            <Text style={{ fontSize: 12, color: STUDY_TEXT }}>
              {prettyGroupBy(key)} <Text style={{ color: STUDY_MUTED }}>×</Text>
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function UnavailableDrawer({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <Pressable onPress={() => setOpen(!open)} hitSlop={6}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: STUDY_MUTED }}>
          {open ? 'Hide unavailable options' : 'Unavailable for this study'}
        </Text>
      </Pressable>
      {open && (
        <View style={{ gap: 8, borderRadius: 12, padding: 12, backgroundColor: STUDY_BG, borderWidth: 1, borderColor: STUDY_BORDER }}>
          {UNAVAILABLE_BUILDER_OPTIONS.map((item) => (
            <View key={item.label} style={{ borderRadius: 12, padding: 12, backgroundColor: STUDY_CARD }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: STUDY_TEXT }}>{item.label}</Text>
              <Text style={{ marginTop: 4, fontSize: 11, lineHeight: 15, color: STUDY_MUTED }}>{item.reason}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function PopulationModePicker({ value, onChange }: { value: string; onChange: (mode: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[
        ['all', 'All qualified'],
        ['people_like_me', 'People like me'],
        ['custom', 'Custom'],
      ].map(([key, label]) => {
        const active = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={{
              flex: 1,
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 12,
              alignItems: 'center',
              backgroundColor: active ? STUDY_ACCENT_FAINT : STUDY_CARD,
              borderWidth: 1,
              borderColor: active ? STUDY_ACCENT : STUDY_BORDER,
            }}>
            <Text style={{ fontSize: 12, fontWeight: '600', textAlign: 'center', color: active ? STUDY_TEXT : STUDY_MUTED }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PeopleMatchEditor({
  user,
  matchKeys,
  setMatchKeys,
  matchValues,
  setMatchValues,
}: {
  user: any;
  matchKeys: string[];
  setMatchKeys: (updater: (keys: string[]) => string[]) => void;
  matchValues: Record<string, MatchValue>;
  setMatchValues: (updater: (values: Record<string, MatchValue>) => Record<string, MatchValue>) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);

  function toggle(key: string) {
    setMatchKeys((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]));
  }
  function setRange(key: string, side: 'minus' | 'plus', value: string) {
    const filter = PEOPLE_FILTER_BY_KEY[key];
    const base = matchValues[key] ?? defaultMatchValue(filter);
    const num = Number(value);
    setMatchValues((v) => ({ ...v, [key]: { ...(base || { minus: 0, plus: 0 }), [side]: Number.isFinite(num) ? Math.max(0, num) : 0 } }));
  }

  const active = PEOPLE_FILTERS.filter((f) => matchKeys.includes(f.key));
  const inactive = PEOPLE_FILTERS.filter((f) => !matchKeys.includes(f.key));
  const filterRows = peopleToFilters(user, matchKeys, matchValues);

  return (
    <View style={{ borderRadius: 12, padding: 12, gap: 12, backgroundColor: STUDY_BG, borderWidth: 1, borderColor: STUDY_BORDER }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 12, fontWeight: '500', color: STUDY_TEXT }}>People like me</Text>
          <Text style={{ fontSize: 12, color: STUDY_MUTED }}>Traits that define a cohort similar to you.</Text>
        </View>
        <Pressable
          onPress={() => setShowAdd((s) => !s)}
          style={{ flexShrink: 0, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: STUDY_CARD }}>
          <Text style={{ fontSize: 12, color: STUDY_TEXT }}>{showAdd ? 'Done' : 'Add more'}</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {active.length === 0 && <Text style={{ fontSize: 12, color: STUDY_MUTED }}>No traits — whole opted-in population.</Text>}
        {active.map((f) => {
          const uv = f.userValue(user);
          return (
            <View key={f.key} style={{ flexDirection: 'row', alignItems: 'center', overflow: 'hidden', borderRadius: 12, backgroundColor: STUDY_CARD }}>
              <Text style={{ paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, color: STUDY_TEXT }}>
                {f.label}
                {uv ? `: ${prettyBucket(String(uv))}` : ''}
              </Text>
              <Pressable
                onPress={() => toggle(f.key)}
                accessibilityLabel={`Remove ${f.label}`}
                style={{ paddingHorizontal: 8, paddingVertical: 6, borderLeftWidth: 1, borderLeftColor: STUDY_BORDER }}>
                <Text style={{ fontSize: 12, color: STUDY_MUTED }}>×</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {active
        .filter((f) => f.matchKind === 'number')
        .map((f) => {
          const val = matchValues[f.key] ?? defaultMatchValue(f);
          return (
            <View key={f.key} style={{ flexDirection: 'row', gap: 8, borderRadius: 12, padding: 12, backgroundColor: STUDY_CARD }}>
              <Field label={`${f.label} lower by`}>
                <RangeInput value={String(val?.minus ?? 0)} onChange={(v) => setRange(f.key, 'minus', v)} />
              </Field>
              <Field label={`higher by (${f.unit})`}>
                <RangeInput value={String(val?.plus ?? 0)} onChange={(v) => setRange(f.key, 'plus', v)} />
              </Field>
            </View>
          );
        })}

      {showAdd && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: STUDY_BORDER, paddingTop: 12 }}>
          {inactive.map((f) => {
            const uv = f.userValue(user);
            const disabled = uv == null || uv === '';
            return (
              <Pressable
                key={f.key}
                disabled={disabled}
                onPress={() => toggle(f.key)}
                style={{
                  width: '48%',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: STUDY_CARD,
                  borderWidth: 1,
                  borderColor: STUDY_BORDER,
                  opacity: disabled ? 0.5 : 1,
                }}>
                <Text style={{ fontSize: 12, color: disabled ? STUDY_DIM : STUDY_TEXT }}>{f.label}</Text>
                <Text style={{ marginTop: 4, fontSize: 12, color: STUDY_MUTED }}>
                  {disabled ? 'Not logged yet' : `You: ${prettyBucket(String(uv))}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={{ fontFamily: monoFont, fontSize: 12, color: STUDY_MUTED }}>
        {filterRows.length} filter row{filterRows.length === 1 ? '' : 's'} applied
      </Text>
    </View>
  );
}

function RangeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <TextInput
      keyboardType="decimal-pad"
      inputMode="decimal"
      value={value}
      onChangeText={onChange}
      style={{
        borderRadius: 12,
        backgroundColor: '#101311',
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: STUDY_TEXT,
      }}
    />
  );
}

export function FilterPanel({
  title,
  filters,
  setFilters,
}: {
  title: string;
  filters: ResearchFilter[];
  setFilters: (filters: ResearchFilter[]) => void;
}) {
  function update(index: number, next: ResearchFilter) {
    setFilters(filters.map((filter, i) => (i === index ? next : filter)));
  }
  function remove(index: number) {
    setFilters(filters.filter((_, i) => i !== index));
  }
  return (
    <View style={{ gap: 12, borderRadius: 16, padding: 12, backgroundColor: STUDY_CARD, borderWidth: 1, borderColor: STUDY_BORDER }}>
      <Text style={{ fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5, color: STUDY_MUTED }}>
        {title}
      </Text>
      {filters.length === 0 && (
        <Text style={{ paddingVertical: 8, fontSize: 12, fontFamily: monoFont, color: STUDY_MUTED }}>
          Whole opted-in population.
        </Text>
      )}
      {filters.map((filter, index) => (
        <FilterRow key={`${filter.field}-${index}`} filter={filter} onChange={(next) => update(index, next)} onRemove={() => remove(index)} />
      ))}
      <Pressable
        onPress={() => setFilters([...filters, defaultFilter()])}
        style={{
          alignSelf: 'flex-start',
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: STUDY_BORDER_STRONG,
        }}>
        <Text style={{ fontSize: 12, color: STUDY_TEXT }}>Add filter</Text>
      </Pressable>
    </View>
  );
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
}: {
  state: QueryState;
  patch: (patch: Partial<QueryState>) => void;
  question: string;
  reviewN: number;
  reviewStatus: string;
  reviewConfidence: number;
  biggestReducer: any;
  previewLoading: boolean;
  rulesOpen: boolean;
  setRulesOpen: (updater: (open: boolean) => boolean) => void;
  ruleFilters: ResearchFilter[];
  toggleRule: (rule: (typeof RULE_OPTIONS)[number]) => void;
  loading: boolean;
  scanKeys: string[];
  runCurrentScan: () => Promise<any>;
  activeSavedId: string | null;
  showPersonal: boolean;
  setShowPersonal: (value: boolean) => void;
  personalSupported: boolean;
}) {
  return (
    <StepCard number="5" title="Review Study" body="Check the generated question, evidence strength, optional qualification rules, then run.">
      <View style={{ borderRadius: 16, padding: 16, backgroundColor: STUDY_BG, borderWidth: 1, borderColor: STUDY_BORDER }}>
        <Text style={{ fontSize: 16, fontWeight: '600', lineHeight: 21, color: STUDY_TEXT }}>{question}</Text>
        <View style={{ marginTop: 16, flexDirection: 'row', gap: 8 }}>
          <MiniMetric label="Matched" value={previewLoading ? '...' : `n=${reviewN}`} />
          <MiniMetric label="Evidence" value={reviewStatus} />
          <MiniMetric label="Conf." value={`${reviewConfidence}%`} />
        </View>
        {biggestReducer && biggestReducer.removed > 0 && (
          <Text style={{ marginTop: 12, fontSize: 12, lineHeight: 17, color: STUDY_MUTED }}>
            Biggest reducer: {prettyGroupBy(biggestReducer.groupBy)} removes {biggestReducer.removed} matched lifters.
          </Text>
        )}
      </View>
      <Pressable
        onPress={() => setRulesOpen((open) => !open)}
        style={{
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 12,
          alignItems: 'center',
          backgroundColor: STUDY_CARD,
          borderWidth: 1,
          borderColor: STUDY_BORDER_STRONG,
        }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: STUDY_TEXT }}>
          {rulesOpen ? 'Hide qualification rules' : `Qualification rules (${ruleFilters.length})`}
        </Text>
      </Pressable>
      {rulesOpen && (
        <View style={{ gap: 8, borderRadius: 16, padding: 12, backgroundColor: STUDY_BG, borderWidth: 1, borderColor: STUDY_BORDER }}>
          {RULE_OPTIONS.map((rule) => {
            const active = ruleFilters.some(
              (f) => f.field === rule.filter.field && f.op === rule.filter.op && String(f.value) === String(rule.filter.value),
            );
            return (
              <Pressable
                key={rule.key}
                onPress={() => toggleRule(rule)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  backgroundColor: active ? STUDY_ACCENT_FAINT : STUDY_CARD,
                  borderWidth: 1,
                  borderColor: active ? STUDY_ACCENT : STUDY_BORDER,
                }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: STUDY_TEXT }}>{rule.label}</Text>
                <Text style={{ fontFamily: monoFont, fontSize: 11, color: STUDY_MUTED }}>{active ? 'on' : 'off'}</Text>
              </Pressable>
            );
          })}
          <Field label="Minimum cohort">
            <TextInput
              keyboardType="number-pad"
              inputMode="numeric"
              value={String(state.minCohort)}
              onChangeText={(v) => patch({ minCohort: Math.max(10, Number(v) || 10) })}
              style={{
                borderRadius: 12,
                backgroundColor: '#101311',
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: STUDY_TEXT,
              }}
            />
          </Field>
        </View>
      )}
      <Pressable
        disabled={!personalSupported}
        onPress={() => setShowPersonal(!showPersonal)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: showPersonal && personalSupported ? STUDY_ACCENT : 'transparent',
            borderWidth: 1,
            borderColor: personalSupported ? STUDY_ACCENT : STUDY_BORDER,
          }}>
          {showPersonal && personalSupported ? <Text style={{ fontSize: 12, color: '#0c0c0c' }}>✓</Text> : null}
        </View>
        <Text style={{ fontSize: 12, color: personalSupported ? STUDY_TEXT : STUDY_MUTED }}>Show my bucket when available</Text>
      </Pressable>
      <BrandButton
        disabled={loading || !scanKeys.length || reviewN < 10}
        onPress={() => {
          runCurrentScan();
        }}
        paddingVertical={16}>
        {loading ? 'Running...' : reviewN < 10 ? 'Not enough qualified lifters' : 'Run study'}
      </BrandButton>
      {activeSavedId ? <Text style={{ fontSize: 12, color: STUDY_ACCENT }}>Opened from saved Evidence.</Text> : null}
    </StepCard>
  );
}
