// Port of the Results section of src/pages/Study.jsx — ranked scan findings
// (single + compare variants), the single/compare result charts, and the
// RelationshipDetail drill-in (per-bucket bars with ~0.4 SD error whiskers,
// the web's Recharts ErrorBar).
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BarsChart } from '@/components/charts';
import {
  PERSONAL_BUCKET_FROM_USER,
  STUDY_ACCENT,
  STUDY_ACCENT_DIM,
  STUDY_ACCENT_FAINT,
  STUDY_BG,
  STUDY_BORDER,
  STUDY_CARD,
  STUDY_COMPARE_B,
  STUDY_DIM,
  STUDY_MUTED,
  STUDY_TEXT,
  describeQuery,
  detectPattern,
  prettyBucket,
  prettyGroupBy,
  prettyMeasure,
} from '@/lib/researchTheme';
import { type QueryState, populationLabel } from '@/lib/studyState';
import { monoFont } from '@/lib/theme';
import { CompareResultChart, SingleResultChart } from './ResultsChart';
import { BrandButton, EmptyText, EvidenceBadge, SectionTitle } from './studyUi';

export default function ResultsBlock({
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
}: {
  state: QueryState;
  queryResult: any;
  compareResult: any;
  scanResult: any;
  compareScanResult: any;
  selectedScan: any;
  setSelectedScan: (row: any) => void;
  user: any;
  showPersonal: boolean;
  exerciseName: string;
  onSaveQuery: () => void;
  onSaveScan: () => void;
  resultReady: boolean;
  scanKeys: string[];
  setStep?: (step: string) => void;
  populationMode: string;
}) {
  const activeScanResult = state.mode === 'compare' ? compareScanResult : scanResult;
  return (
    <View style={{ gap: 16 }}>
      <SectionTitle title="Results" body="Population evidence is observational and bucketed by minimum cohort size." />

      {activeScanResult ? (
        <View style={{ gap: 12, borderRadius: 16, padding: 16, backgroundColor: STUDY_CARD, borderWidth: 1, borderColor: STUDY_BORDER }}>
          <StudyRecipeChips state={state} scanKeys={scanKeys} populationMode={populationMode} setStep={setStep} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <SectionTitle
              title="Ranked findings"
              body={`${activeScanResult.results?.length || 0} variables checked against ${prettyMeasure(state.measure)}.`}
            />
            <Pressable
              onPress={onSaveScan}
              style={{ flexShrink: 0, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#0B7A43' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#ffffff' }}>Save study</Text>
            </Pressable>
          </View>
          <View style={{ gap: 8 }}>
            {(activeScanResult.results || []).map((row: any) =>
              state.mode === 'compare' ? (
                <CompareScanResultRow
                  key={row.groupBy}
                  row={row}
                  active={selectedScan?.groupBy === row.groupBy}
                  onPress={() => setSelectedScan(selectedScan?.groupBy === row.groupBy ? null : row)}
                />
              ) : (
                <ResultRow
                  key={row.groupBy}
                  row={row}
                  active={selectedScan?.groupBy === row.groupBy}
                  user={user}
                  onPress={() => setSelectedScan(selectedScan?.groupBy === row.groupBy ? null : row)}
                />
              ),
            )}
          </View>
          {state.mode !== 'compare' && selectedScan?.buckets?.length > 0 && (
            <RelationshipDetail row={selectedScan} measure={state.measure} user={user} onClose={() => setSelectedScan(null)} />
          )}
        </View>
      ) : resultReady ? (
        <View style={{ gap: 12, borderRadius: 16, padding: 16, backgroundColor: STUDY_CARD, borderWidth: 1, borderColor: STUDY_BORDER }}>
          <Text style={{ fontSize: 14, color: STUDY_TEXT }}>
            {state.mode === 'compare'
              ? `${prettyMeasure(state.measure)} by ${prettyGroupBy(state.groupBy).toLowerCase()}`
              : describeQuery({
                  filters: queryResult?.query?.filters || [],
                  groupBy: state.groupBy,
                  measure: state.measure,
                  exerciseId: state.exerciseId,
                  exerciseName,
                  muscle: state.muscle,
                })}
          </Text>
          {state.mode === 'compare' ? (
            <CompareResultChart
              cohortA={compareResult?.cohortA}
              cohortB={compareResult?.cohortB}
              measure={state.measure}
              groupBy={state.groupBy}
              user={user}
              showPersonal={showPersonal}
            />
          ) : (
            <SingleResultChart
              buckets={queryResult?.buckets || []}
              measure={state.measure}
              groupBy={state.groupBy}
              totalCohortSize={queryResult?.totalCohortSize || 0}
              user={user}
              showPersonal={showPersonal}
            />
          )}
          <BrandButton onPress={onSaveQuery}>Save query</BrandButton>
        </View>
      ) : (
        <EmptyText>Run a scan to rank your selected factors.</EmptyText>
      )}
    </View>
  );
}

function StudyRecipeChips({
  state,
  scanKeys = [],
  populationMode,
  setStep,
}: {
  state: QueryState;
  scanKeys: string[];
  populationMode: string;
  setStep?: (step: string) => void;
}) {
  const chips: [string, string, string][] = [
    ['in', 'In', state.exerciseId || state.muscle || state.targetType || 'all'],
    ['measure', 'Measure', prettyMeasure(state.measure)],
    ['variables', 'Variables', `${scanKeys.length} selected`],
    ['population', 'Population', populationLabel(populationMode)],
    ['review', 'Rules', `min n=${state.minCohort}`],
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {chips.map(([key, label, value]) => (
        <Pressable
          key={key}
          onPress={() => setStep?.(key)}
          style={{
            flexShrink: 0,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: STUDY_BG,
            borderWidth: 1,
            borderColor: STUDY_BORDER,
          }}>
          <Text style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: STUDY_MUTED }}>{label}</Text>
          <Text numberOfLines={1} style={{ marginTop: 4, maxWidth: 128, fontSize: 12, fontWeight: '600', color: STUDY_TEXT }}>
            {value}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function CompareScanResultRow({ row, active, onPress }: { row: any; active: boolean; onPress: () => void }) {
  const a = row.cohortA;
  const b = row.cohortB;
  return (
    <Pressable
      onPress={onPress}
      style={{
        gap: 12,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: active ? STUDY_ACCENT_FAINT : STUDY_BG,
        borderWidth: 1,
        borderColor: active ? STUDY_ACCENT : STUDY_BORDER,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: STUDY_TEXT }}>{prettyGroupBy(row.groupBy)}</Text>
          <Text style={{ fontSize: 12, color: STUDY_MUTED }}>
            {row.available ? 'Compared across both cohorts' : row.error || 'Not enough buckets'}
          </Text>
        </View>
        <EvidenceBadge status={row.evidenceStatus} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[a, b].map((cohort: any, index: number) => (
          <View
            key={index}
            style={{
              flex: 1,
              borderRadius: 12,
              padding: 12,
              backgroundColor: STUDY_CARD,
              borderWidth: 1,
              borderColor: index === 0 ? STUDY_ACCENT_DIM : STUDY_COMPARE_B,
            }}>
            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '600', color: STUDY_TEXT }}>
              {cohort?.label || (index === 0 ? 'A' : 'B')}
            </Text>
            <Text style={{ marginTop: 4, fontFamily: monoFont, fontSize: 11, color: STUDY_MUTED }}>
              n={cohort?.totalCohortSize || 0}
            </Text>
            <Text style={{ marginTop: 4, fontFamily: monoFont, fontSize: 11, color: STUDY_MUTED }}>
              strength {cohort?.strength || 0}/100
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function ResultRow({ row, active, user, onPress }: { row: any; active: boolean; user: any; onPress: () => void }) {
  const pattern = detectPattern(row.buckets);
  const direction = pattern === 'Negative' ? 'negative' : 'positive';
  const worst = (row.buckets || []).find((b: any) => b.label === row.worstBucket);
  const adjustedImpact =
    worst && worst.avg_measure
      ? `${row.effect >= 0 ? '+' : ''}${Math.round((row.effect / Math.abs(worst.avg_measure)) * 100)}%`
      : null;
  const youBucket = PERSONAL_BUCKET_FROM_USER[row.groupBy]?.(user || {});
  const sparse = row.evidenceStatus === 'Sparse' || row.evidenceStatus === 'Not enough';
  const barColor = direction === 'negative' ? STUDY_COMPARE_B : STUDY_ACCENT;

  return (
    <Pressable
      onPress={onPress}
      style={{
        gap: 12,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: active ? STUDY_ACCENT_FAINT : STUDY_BG,
        borderWidth: 1,
        borderColor: active ? STUDY_ACCENT : STUDY_BORDER,
        opacity: sparse ? 0.8 : 1,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: STUDY_TEXT }}>{prettyGroupBy(row.groupBy)}</Text>
          <Text style={{ fontSize: 12, color: STUDY_MUTED }}>
            {row.available ? `Pattern: ${pattern}` : row.error || 'Not enough buckets'}
          </Text>
        </View>
        <EvidenceBadge status={row.evidenceStatus} />
      </View>
      {row.available && (
        <>
          <View>
            <View style={{ height: 8, overflow: 'hidden', borderRadius: 4, backgroundColor: STUDY_CARD }}>
              <View style={{ height: '100%', borderRadius: 4, width: `${row.strength || 0}%`, backgroundColor: barColor }} />
            </View>
            <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: monoFont, fontSize: 12, color: STUDY_MUTED }}>{row.strength || 0}/100</Text>
              <Text style={{ fontFamily: monoFont, fontSize: 12, color: STUDY_MUTED }}>n={row.totalCohortSize || 0}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {adjustedImpact && (
              <Text style={{ borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, color: STUDY_TEXT, backgroundColor: STUDY_CARD, overflow: 'hidden' }}>
                Impact {adjustedImpact}
              </Text>
            )}
            {row.bestBucket && (
              <Text style={{ borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, color: STUDY_TEXT, backgroundColor: STUDY_CARD, overflow: 'hidden' }}>
                Best: {prettyBucket(row.bestBucket)}
              </Text>
            )}
            {youBucket && (
              <Text
                style={{
                  borderRadius: 12,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  fontSize: 12,
                  color: STUDY_ACCENT,
                  backgroundColor: STUDY_ACCENT_FAINT,
                  borderWidth: 1,
                  borderColor: STUDY_ACCENT,
                  overflow: 'hidden',
                }}>
                You: {prettyBucket(youBucket)}
              </Text>
            )}
          </View>
        </>
      )}
    </Pressable>
  );
}

function RelationshipDetail({ row, measure, user, onClose }: { row: any; measure: string; user: any; onClose: () => void }) {
  const [focusedBuckets, setFocusedBuckets] = useState<string[]>([]);
  const youBucket = PERSONAL_BUCKET_FROM_USER[row.groupBy]?.(user || {});
  const pattern = detectPattern(row.buckets);
  const chartData = (row.buckets || []).map((b: any) => ({
    label: prettyBucket(b.label),
    rawLabel: String(b.label),
    avg: b.avg_measure,
    n: b.n,
    errorY: b.sd != null ? Math.round(b.sd * 0.4 * 10000) / 10000 : 0,
    isUser: youBucket != null && b.label === youBucket,
    focused: focusedBuckets.length === 0 || focusedBuckets.includes(b.label),
  }));

  function toggleFocus(label: string) {
    setFocusedBuckets((labels) => (labels.includes(label) ? labels.filter((item) => item !== label) : [...labels, label]));
  }

  return (
    <View style={{ gap: 16, borderRadius: 16, padding: 16, backgroundColor: STUDY_BG, borderWidth: 1, borderColor: STUDY_BORDER }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <SectionTitle title={prettyGroupBy(row.groupBy)} body={`Pattern: ${pattern} · ${prettyMeasure(measure)}`} />
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={{ fontSize: 12, color: STUDY_MUTED }}>Close</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <EvidenceBadge status={row.evidenceStatus} />
        <Text style={{ fontFamily: monoFont, fontSize: 12, color: STUDY_MUTED }}>n={row.totalCohortSize || 0}</Text>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5, color: STUDY_MUTED }}>
          Focus buckets after running
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(row.buckets || []).map((bucket: any) => {
            const active = focusedBuckets.length === 0 || focusedBuckets.includes(bucket.label);
            return (
              <Pressable
                key={bucket.label}
                onPress={() => toggleFocus(bucket.label)}
                style={{
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: active ? STUDY_ACCENT_FAINT : STUDY_CARD,
                  borderWidth: 1,
                  borderColor: active ? STUDY_ACCENT : STUDY_BORDER,
                }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: active ? STUDY_TEXT : STUDY_MUTED }}>
                  {prettyBucket(bucket.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <BarsChart
        height={220}
        data={chartData.map((d: any) => ({
          label: d.label,
          value: d.avg,
          error: d.errorY || null,
          color: d.focused ? (d.isUser ? STUDY_ACCENT : STUDY_ACCENT_DIM) : STUDY_DIM,
          opacity: d.focused ? 1 : 0.35,
        }))}
        errorColor={STUDY_MUTED}
        readout={(d) => {
          const rowData = chartData.find((x: any) => x.label === d.label);
          return [d.label, `${Number(d.value ?? 0).toFixed(3)} (n=${rowData?.n ?? 0}) · ${prettyMeasure(measure)}`];
        }}
      />
      {youBucket && (
        <View style={{ borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: STUDY_ACCENT_FAINT, borderWidth: 1, borderColor: STUDY_ACCENT }}>
          <Text style={{ fontSize: 12, color: STUDY_ACCENT }}>
            You&apos;re in <Text style={{ fontWeight: '600' }}>{prettyBucket(youBucket)}</Text>
          </Text>
        </View>
      )}
      <Text style={{ fontSize: 12, lineHeight: 17, color: STUDY_MUTED }}>
        Observational population evidence, bucketed by minimum cohort size. Error bars show roughly 0.4 SD.
      </Text>
    </View>
  );
}
