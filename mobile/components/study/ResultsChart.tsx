// Port of src/components/study/ResultsChart.jsx — the Recharts→Victory
// template for the Study result charts. SingleResultChart highlights the
// user's own bucket with the bright accent + outline; CompareResultChart is
// grouped cohort bars with an optional "your bucket" reference line.
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { BarsChart, GroupedBarsChart } from '@/components/charts';
import {
  MEASURE_OPTIONS,
  PERSONAL_BUCKET_FROM_USER,
  STUDY_ACCENT,
  STUDY_ACCENT_DIM,
  STUDY_BORDER,
  STUDY_CARD,
  STUDY_COMPARE_A,
  STUDY_COMPARE_B,
  STUDY_MUTED,
  STUDY_TEXT,
  prettyBucket,
} from '@/lib/researchTheme';
import { monoFont } from '@/lib/theme';

function measureUnits(measure?: string) {
  return MEASURE_OPTIONS.find((m) => m.value === measure)?.units || '';
}

function personalBucketFor(showPersonal: boolean | undefined, user: any, groupBy?: string): string | null {
  if (!showPersonal || !user || !groupBy) return null;
  const fn = PERSONAL_BUCKET_FROM_USER[groupBy];
  if (!fn) return null;
  const raw = fn(user);
  return raw == null ? null : String(raw);
}

export function SingleResultChart({
  buckets,
  measure,
  groupBy,
  totalCohortSize,
  user,
  showPersonal,
}: {
  buckets: any[];
  measure?: string;
  groupBy?: string;
  totalCohortSize: number;
  user?: any;
  showPersonal?: boolean;
}) {
  const personalBucket = personalBucketFor(showPersonal, user, groupBy);
  const data = useMemo(
    () =>
      buckets.map((b: any) => ({
        label: prettyBucket(b.label),
        rawLabel: String(b.label),
        value: b.avg_measure,
        n: b.n,
      })),
    [buckets],
  );

  if (!data.length) return <NotEnoughData />;

  return (
    <View style={{ gap: 12 }}>
      <BarsChart
        height={260}
        data={data.map((d) => ({
          label: d.label,
          value: d.value,
          color: personalBucket && d.rawLabel === personalBucket ? STUDY_ACCENT : STUDY_ACCENT_DIM,
        }))}
        readout={(d) => {
          const row = data.find((x) => x.label === d.label);
          return [d.label, `${Number(d.value ?? 0).toFixed(3)} ${measureUnits(measure)} · n=${row?.n ?? 0}`];
        }}
      />
      <CohortCaption totalCohortSize={totalCohortSize} buckets={data.length} measure={measure} personalBucket={personalBucket} />
    </View>
  );
}

export function CompareResultChart({
  cohortA,
  cohortB,
  measure,
  groupBy,
  user,
  showPersonal,
}: {
  cohortA: any;
  cohortB: any;
  measure?: string;
  groupBy?: string;
  user?: any;
  showPersonal?: boolean;
}) {
  const data = useMemo(() => {
    const byBucket = new Map<string, { label: string; rawLabel: string; a: number | null; b: number | null; aN?: number; bN?: number }>();
    for (const b of cohortA?.buckets || []) {
      byBucket.set(b.label, { label: prettyBucket(b.label), rawLabel: String(b.label), a: b.avg_measure, b: null, aN: b.n });
    }
    for (const b of cohortB?.buckets || []) {
      const cur = byBucket.get(b.label) || { label: prettyBucket(b.label), rawLabel: String(b.label), a: null, b: null };
      cur.b = b.avg_measure;
      cur.bN = b.n;
      byBucket.set(b.label, cur);
    }
    return [...byBucket.values()].sort((x, y) => x.label.localeCompare(y.label));
  }, [cohortA, cohortB]);

  const personalBucket = personalBucketFor(showPersonal, user, groupBy);

  if (!data.length) return <NotEnoughData />;

  return (
    <View style={{ gap: 12 }}>
      <GroupedBarsChart
        height={280}
        data={data.map((d) => ({ label: d.label, a: d.a, b: d.b }))}
        aColor={STUDY_COMPARE_A}
        bColor={STUDY_COMPARE_B}
        referenceLabel={personalBucket ? prettyBucket(personalBucket) : null}
        referenceColor={STUDY_TEXT}
        readout={(d) => {
          const row = data.find((x) => x.label === d.label);
          const u = measureUnits(measure);
          return [
            d.label,
            `${cohortA?.label || 'A'}: ${d.a != null ? `${Number(d.a).toFixed(3)} ${u} · n=${row?.aN ?? 0}` : '—'}`,
            `${cohortB?.label || 'B'}: ${d.b != null ? `${Number(d.b).toFixed(3)} ${u} · n=${row?.bN ?? 0}` : '—'}`,
          ];
        }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'center', columnGap: 14 }}>
        <LegendSwatch color={STUDY_COMPARE_A} label={cohortA?.label || 'A'} />
        <LegendSwatch color={STUDY_COMPARE_B} label={cohortB?.label || 'B'} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, fontFamily: monoFont, color: STUDY_MUTED }}>
          {cohortA?.label || 'A'}: n={cohortA?.totalCohortSize ?? 0}
        </Text>
        <Text style={{ fontSize: 11, fontFamily: monoFont, color: STUDY_MUTED }}>
          {cohortB?.label || 'B'}: n={cohortB?.totalCohortSize ?? 0}
        </Text>
      </View>
      {personalBucket ? (
        <Text style={{ fontSize: 11, fontFamily: monoFont, color: STUDY_ACCENT }}>▍ your bucket: {prettyBucket(personalBucket)}</Text>
      ) : null}
    </View>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
      <Text numberOfLines={1} style={{ fontSize: 11, maxWidth: 140, color: STUDY_MUTED }}>
        {label}
      </Text>
    </View>
  );
}

function CohortCaption({
  totalCohortSize,
  buckets,
  measure,
  personalBucket,
}: {
  totalCohortSize: number;
  buckets: number;
  measure?: string;
  personalBucket: string | null;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <Text style={{ fontSize: 11, fontFamily: monoFont, color: STUDY_MUTED }}>
        n={totalCohortSize} · {buckets} buckets · {measureUnits(measure)}
      </Text>
      {personalBucket ? (
        <Text numberOfLines={1} style={{ fontSize: 11, fontFamily: monoFont, color: STUDY_ACCENT }}>
          ● your bucket: {prettyBucket(personalBucket)}
        </Text>
      ) : null}
    </View>
  );
}

export function NotEnoughData() {
  return (
    <View
      style={{
        borderRadius: 8,
        padding: 32,
        backgroundColor: STUDY_CARD,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: STUDY_BORDER,
      }}>
      <Text style={{ textAlign: 'center', fontSize: 14, fontFamily: monoFont, color: STUDY_MUTED }}>
        Not enough data. No buckets met the minimum cohort size.
      </Text>
    </View>
  );
}
