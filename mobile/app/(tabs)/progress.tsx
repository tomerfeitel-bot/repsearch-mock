// Port of src/pages/Progress.jsx — Overview / Lifts / Body / Records under a
// FlatHeader, with Lifts hosting the Single-lift / Compare mode switch. The
// web's URL params (tab, highlight, seed) arrive as route params so deep links
// (e.g. CelebrationCard "View progress", Records → Lifts) behave the same.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LiftsTab from '@/components/progress/LiftsTab';
import BodyTab from '@/components/progress/BodyTab';
import CompareTab from '@/components/progress/CompareTab';
import OverviewTab from '@/components/progress/OverviewTab';
import RecordsTab from '@/components/progress/RecordsTab';
import { ModeSwitch } from '@/components/progress/ui';
import FlatHeader, { useDirectionalCollapse } from '@/components/ui/FlatHeader';
import { useToast } from '@/components/ui/Toast';
import UnderlineTabs from '@/components/ui/UnderlineTabs';
import { useAuth } from '@/hooks/useAuth';
import { useProgress } from '@/hooks/useProgress';
import { colors } from '@/lib/theme';

const TABS = ['overview', 'lifts', 'body', 'records'];
const TAB_LABELS: Record<string, string> = { overview: 'Overview', lifts: 'Lifts', body: 'Body', records: 'Records' };
// Legacy deep links map onto the regrouped surface (≤4 tabs).
const LEGACY: Record<string, string> = { history: 'overview', compare: 'lifts' };

function uniqueOptions(values: (string | null | undefined)[] = []) {
  return [...new Set(values.filter(Boolean) as string[])]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ id: value, name: value }));
}

const LIFT_MODES = [
  { value: 'single', label: 'Single lift' },
  { value: 'compare', label: 'Compare' },
];

export default function ProgressScreen() {
  const toast = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; highlight?: string; seed?: string }>();
  const { collapse, onScroll } = useDirectionalCollapse();

  const rawTab = typeof params.tab === 'string' ? params.tab : '';
  const paramTab = TABS.includes(rawTab) ? rawTab : LEGACY[rawTab] || '';
  const [tab, setTabState] = useState(paramTab || 'overview');
  const [highlight, setHighlight] = useState<string[]>([]);
  const [liftQuery, setLiftQuery] = useState<{ metric: string; group_by: string; exercise_id?: string }>({
    metric: 'top_set',
    group_by: 'session',
  });
  // Lifts hosts a mode switch (Single lift / Compare); a seed deep link opens
  // straight into Compare with that lift preloaded.
  const [liftMode, setLiftMode] = useState<'single' | 'compare'>('single');
  const [compareSeed, setCompareSeed] = useState('');

  const {
    summary, history, lifts, body, records, compare, lifestyle,
    loadSummary, loadHistory, loadLifts, loadBody, loadRecords, loadCompare, loadLifestyle, logBodyMetric,
  } = useProgress(toast);

  const exercises = useMemo(() => lifts.data?.exercises || [], [lifts.data]);
  const muscleOptions = useMemo(
    () => uniqueOptions(exercises.map((ex: any) => ex.primary_muscle)),
    [exercises],
  );
  const equipmentOptions = useMemo(
    () => uniqueOptions(exercises.map((ex: any) => ex.equipment_type)),
    [exercises],
  );

  useEffect(() => {
    loadSummary();
    loadHistory();
  }, [loadSummary, loadHistory]);

  useEffect(() => {
    if (tab === 'lifts') loadLifts(liftQuery as Record<string, string>);
    if (tab === 'body') {
      loadBody();
      loadLifestyle();
    }
    if (tab === 'records') loadRecords();
  }, [tab, liftQuery, loadLifts, loadBody, loadRecords, loadLifestyle]);

  // Apply incoming deep-link params (tab swaps don't remount this screen, so
  // re-apply whenever they change), then clear them from the route.
  useEffect(() => {
    if (!rawTab && !params.highlight && !params.seed) return;
    if (paramTab) setTabState(paramTab);
    if (typeof params.highlight === 'string' && params.highlight) {
      setHighlight(params.highlight.split(',').filter(Boolean));
      setLiftMode('single');
    }
    if (typeof params.seed === 'string' && params.seed) {
      setCompareSeed(params.seed);
      setLiftMode('compare');
      setTabState('lifts');
    }
    router.setParams({ tab: undefined, highlight: undefined, seed: undefined } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawTab, params.highlight, params.seed]);

  function setTab(t: string) {
    setTabState(t);
    if (t !== 'lifts') {
      setHighlight([]);
      setLiftMode('single');
      setCompareSeed('');
    }
  }

  const updateLiftQuery = useCallback((nextQuery: Record<string, string>) => {
    setLiftQuery((prev) => ({ ...prev, ...nextQuery }));
  }, []);

  function openCompare(exerciseId: string) {
    setCompareSeed(exerciseId);
    setLiftMode('compare');
    setTabState('lifts');
    setHighlight([]);
  }

  function openLift(exerciseId: string) {
    setHighlight([exerciseId]);
    setLiftMode('single');
    setTabState('lifts');
  }

  function changeLiftMode(mode: string) {
    setLiftMode(mode as 'single' | 'compare');
    if (mode === 'single') setCompareSeed('');
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatHeader
        title="Progress"
        titleColor={colors.emeraldInk}
        collapse={collapse}
        tabs={
          <UnderlineTabs
            tabs={TABS.map((t) => ({ value: t, label: TAB_LABELS[t] }))}
            value={tab}
            onChange={setTab}
            accent={colors.emeraldInk}
            activeColor={colors.emeraldInk}
            inactiveColor={colors.textMuted}
            borderColor={colors.border}
          />
        }
      />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }}>
        {tab === 'overview' && (
          <OverviewTab
            summary={summary}
            history={history}
            onRetry={() => {
              loadSummary();
              loadHistory();
            }}
          />
        )}
        {tab === 'lifts' && (
          <View style={{ gap: 20 }}>
            <ModeSwitch options={LIFT_MODES} value={liftMode} onChange={changeLiftMode} />
            {liftMode === 'single' ? (
              <LiftsTab
                resource={lifts}
                query={liftQuery}
                highlight={highlight}
                onQueryChange={updateLiftQuery}
                onRetry={() => loadLifts(liftQuery as Record<string, string>)}
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
          </View>
        )}
        {tab === 'body' && (
          <BodyTab
            resource={body}
            lifestyle={lifestyle}
            supplements={user?.supplements_json}
            onLog={logBodyMetric}
            onRetry={() => {
              loadBody();
              loadLifestyle();
            }}
          />
        )}
        {tab === 'records' && <RecordsTab resource={records} onRetry={() => loadRecords()} onOpenLift={openLift} />}
      </Animated.ScrollView>
    </View>
  );
}
