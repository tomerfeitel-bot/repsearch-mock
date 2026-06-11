// Port of src/pages/Study.jsx (the live surface only — the web file's
// ConceptLab/LegacyExplore dead code is not ported): four workspaces under a
// framed mode switch — For You (findings + featured questions), Explore (the
// 5-step study builder), Evidence (saved questions), Library (exercises, per
// D7 without the web's 3D muscle model).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Evidence from '@/components/study/Evidence';
import ExerciseLibrary from '@/components/study/ExerciseLibrary';
import Explore from '@/components/study/Explore';
import ForYou from '@/components/study/ForYou';
import { Notice } from '@/components/study/studyUi';
import FlatHeader, { useDirectionalCollapse } from '@/components/ui/FlatHeader';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useResearch } from '@/hooks/useResearch';
import { SEED_EXERCISES } from '@/lib/exercises';
import {
  PERSONAL_BUCKET_FROM_USER,
  STUDY_BG,
  STUDY_BORDER_STRONG,
  STUDY_BRAND,
  STUDY_BRAND_INK,
  STUDY_MUTED,
  STUDY_ON_BRAND,
  type MatchValue,
  type ResearchFilter,
  describeQuery,
  peopleToFilters,
  prettyMeasure,
} from '@/lib/researchTheme';
import {
  DEFAULT_QUERY,
  DEFAULT_SCAN_KEYS,
  type QueryState,
  currentEvidence,
  featuredToState,
  findingToState,
  sanitizeFilters,
  savedToState,
  stateToPayload,
  targetPayloadParts,
} from '@/lib/studyState';
import { DEFAULT_MATCH_KEYS } from '@/lib/researchTheme';
import { monoFont } from '@/lib/theme';

export default function StudyScreen() {
  const toast = useToast();
  const router = useRouter();
  const params = useLocalSearchParams<{ program?: string; tab?: string }>();
  const { user } = useAuth();
  const research = useResearch(toast);
  const { collapse, onScroll } = useDirectionalCollapse();
  const [tab, setTab] = useState('foryou');
  const [queryState, setQueryState] = useState<QueryState>(DEFAULT_QUERY);
  const [scanKeys, setScanKeys] = useState<string[]>(DEFAULT_SCAN_KEYS);
  const [selectedScan, setSelectedScan] = useState<any>(null);
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);
  const [populationMode, setPopulationMode] = useState('all');
  const populationBMode = 'custom';
  const [matchKeys, setMatchKeys] = useState<string[]>(DEFAULT_MATCH_KEYS);
  const [matchValues, setMatchValues] = useState<Record<string, MatchValue>>({});
  const [ruleFilters, setRuleFilters] = useState<ResearchFilter[]>([]);
  const programId = typeof params.program === 'string' ? params.program : '';

  const {
    loadFeaturedQuestions,
    loadFindings,
    loadSavedQuestions,
    runQuery,
    compareCohorts,
    runScan,
    compareScan,
    previewStudy,
  } = research;

  useEffect(() => {
    loadFeaturedQuestions();
    loadFindings();
    loadSavedQuestions();
  }, [loadFeaturedQuestions, loadFindings, loadSavedQuestions]);

  // Deep link: PostComposer "+ Create new" study lands on the builder.
  useEffect(() => {
    if (typeof params.tab === 'string' && ['foryou', 'explore', 'evidence', 'library'].includes(params.tab)) {
      setTab(params.tab);
      router.setParams({ tab: undefined } as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tab]);

  const exerciseName = useMemo(
    () => SEED_EXERCISES.find((ex: any) => ex.id === queryState.exerciseId)?.name || '',
    [queryState.exerciseId],
  );
  const personalSupported = Boolean(PERSONAL_BUCKET_FROM_USER[queryState.groupBy]);
  const loading = research.queryLoading || research.compareLoading || research.scanLoading || research.compareScanLoading;

  // In "people like me" mode the cohort is compiled from the user's profile
  // into whitelisted filter rows; custom mode uses the builder's own filters.
  const populationFilters = useCallback(
    (mode: string, filters: ResearchFilter[] = []) => {
      if (mode === 'all') return [];
      if (mode === 'people_like_me') return peopleToFilters(user, matchKeys, matchValues);
      return sanitizeFilters(filters);
    },
    [user, matchKeys, matchValues],
  );

  const buildEffective = useCallback(
    (state: QueryState): QueryState => {
      const filtersA = [...populationFilters(populationMode, state.filtersA), ...ruleFilters];
      if (state.mode === 'compare') {
        return { ...state, filtersA, filtersB: [...populationFilters(populationBMode, state.filtersB), ...ruleFilters] };
      }
      return { ...state, mode: 'single', filtersA };
    },
    [populationFilters, populationMode, populationBMode, ruleFilters],
  );

  const runCurrentScan = useCallback(async () => {
    setActiveSavedId(null);
    setSelectedScan(null);
    const eff = buildEffective(queryState);
    const target = targetPayloadParts(queryState);
    const result = await runScan({
      filters: sanitizeFilters([...eff.filtersA, ...target.filters]),
      groupBys: scanKeys,
      measure: queryState.measure,
      exerciseId: target.exerciseId,
      muscle: target.muscle,
      minCohort: queryState.minCohort,
    });
    if (result?.results?.[0]) setSelectedScan(result.results[0]);
    return result;
  }, [buildEffective, queryState, runScan, scanKeys]);

  async function openFeatured(question: any) {
    const next = featuredToState(question);
    setPopulationMode('custom');
    setQueryState(next);
    setTab('explore');
    const payload = stateToPayload(next);
    if (payload.mode === 'compare') await compareCohorts(payload);
    else await runQuery(payload);
  }

  async function openFinding(finding: any) {
    const next = findingToState(finding);
    if (!next.groupBy || !next.measure) {
      toast('This finding has no replayable query.', 'info');
      return;
    }
    setPopulationMode('custom');
    setQueryState(next);
    setTab('explore');
    const payload = stateToPayload(next);
    if (payload.mode === 'compare') await compareCohorts(payload);
    else await runQuery(payload);
  }

  async function openSaved(saved: any) {
    const next = savedToState(saved);
    setPopulationMode('custom');
    setQueryState(next);
    setActiveSavedId(saved.id);
    setTab('explore');
    if (saved.mode === 'scan' && saved.query?.groupBys?.length) {
      setScanKeys(saved.query.groupBys);
      if (saved.query?.cohortA && saved.query?.cohortB) await compareScan(saved.query);
      else await runScan(saved.query);
    } else {
      const payload = stateToPayload(next);
      if (payload.mode === 'compare') await compareCohorts(payload);
      else await runQuery(payload);
    }
  }

  async function saveCurrentQuestion(mode: string = queryState.mode) {
    const isScan = mode === 'scan';
    const eff = buildEffective(queryState);
    const target = targetPayloadParts(queryState);
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
      : stateToPayload(eff);
    const evidence = isScan
      ? {
          status: research.scanResult?.results?.[0]?.evidenceStatus || 'Not enough',
          qualifiedUsers: research.scanResult?.results?.[0]?.totalCohortSize || 0,
          matchedUsers: research.scanResult?.results?.[0]?.totalCohortSize || 0,
        }
      : currentEvidence(queryState.mode, research.queryResult, research.compareResult);
    const label = isScan
      ? `Scan ${scanKeys.length} variables for ${prettyMeasure(queryState.measure)}`
      : describeQuery({ ...(query as any), exerciseName });
    const saved = await research.saveQuestion({ label, mode: isScan ? 'scan' : queryState.mode, query, evidence });
    if (saved) setActiveSavedId(saved.id);
  }

  return (
    <View style={{ flex: 1, backgroundColor: STUDY_BG }}>
      <FlatHeader
        title="Study"
        titleColor={STUDY_BRAND_INK}
        collapse={collapse}
        action={
          <Pressable
            onPress={() => setTab('explore')}
            style={{
              height: 36,
              paddingHorizontal: 16,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: STUDY_BRAND,
            }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: STUDY_ON_BRAND }}>New study</Text>
          </Pressable>
        }
        tabs={<StudyModeSwitch value={tab} onChange={setTab} />}
        tabsMaxHeight={72}
      />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 120, gap: 24 }}>
        {programId ? (
          <Notice>Program evidence view opened. Study can compare this plan as matching program data becomes qualified.</Notice>
        ) : null}
        {user && !user.research_opt_in ? (
          <Notice>Your research opt-in is off. Your logs are not contributing to population evidence.</Notice>
        ) : null}

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
            onSearchSelect={(config) => {
              setPopulationMode('custom');
              // queryParser configs carry exerciseId/muscle but no targetType
              // (the web leaves it undefined and drops the scope at payload
              // time — see stateToPayload); infer it so the scope sticks.
              setQueryState({
                ...DEFAULT_QUERY,
                ...config,
                targetType: config.exerciseId ? 'exercise' : config.muscle ? 'muscle' : 'all',
              });
            }}
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

        {tab === 'library' && <ExerciseLibrary />}
      </Animated.ScrollView>
    </View>
  );
}

// Study sub-nav is a MODE SWITCH, not pills: a framed, segmented instrument
// selector — four workspaces, the active segment carries the brand emerald
// fill, a mono sub-label gives the Lab voice.
function StudyModeSwitch({ value, onChange }: { value: string; onChange: (tab: string) => void }) {
  const modes = [
    { value: 'foryou', label: 'For You', hint: 'findings' },
    { value: 'explore', label: 'Explore', hint: 'builder' },
    { value: 'evidence', label: 'Evidence', hint: 'saved' },
    { value: 'library', label: 'Library', hint: 'exercises' },
  ];
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 2 }}>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          overflow: 'hidden',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: STUDY_BORDER_STRONG,
          backgroundColor: STUDY_BG,
        }}>
        {modes.map((m, i) => {
          const active = m.value === value;
          return (
            <Pressable
              key={m.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(m.value)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                paddingHorizontal: 4,
                paddingVertical: 8,
                backgroundColor: active ? STUDY_BRAND : 'transparent',
                borderLeftWidth: i ? 1 : 0,
                borderLeftColor: STUDY_BORDER_STRONG,
              }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: active ? STUDY_ON_BRAND : STUDY_MUTED }}>{m.label}</Text>
              <Text
                style={{
                  fontFamily: monoFont,
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: active ? STUDY_ON_BRAND : STUDY_MUTED,
                  opacity: 0.75,
                }}>
                {m.hint}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
