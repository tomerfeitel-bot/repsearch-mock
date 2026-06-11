// Port of src/components/progress/LiftsTab.jsx — split chips, lift chips, the
// single-lift progression line chart, and the start/current/gain stat row.
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { LineSeriesChart, shortDateLabel } from '@/components/charts';
import { NEGATIVE_INK, POSITIVE_INK, splitColor } from '@/lib/progressTheme';
import type { Resource } from '@/hooks/useProgress';
import {
  ChartBlock,
  Chip,
  Empty,
  ErrorState,
  InlineWarning,
  PrimaryButton,
  Section,
  Skeleton,
  StatRow,
  StatTile,
} from './ui';

const SPLITS = ['Push', 'Pull', 'Legs', 'Other'];
const DEFAULT_METRICS = [
  { key: 'top_set', label: 'Top set' },
  { key: 'reps', label: 'Reps' },
];

export default function LiftsTab({
  resource,
  query,
  highlight = [],
  onQueryChange,
  onRetry,
  onCompare,
}: {
  resource: Resource;
  query: { metric: string; group_by: string; exercise_id?: string };
  highlight?: string[];
  onQueryChange: (next: Record<string, string>) => void;
  onRetry: () => void;
  onCompare?: (exerciseId: string) => void;
}) {
  const data = resource.data || {};
  const exercises = useMemo(() => data.exercises || [], [data.exercises]);
  const selectedExercise = query.exercise_id;
  const selected = exercises.find((e: any) => e.id === selectedExercise);
  const [split, setSplit] = useState('Push');

  const exercisesInSplit = useMemo(
    () => exercises.filter((ex: any) => (ex.split || 'Other') === split),
    [exercises, split],
  );
  const chartRows = useMemo(
    () => (data.series || []).map((point: any) => ({ ...point, value: Number(point.value) })),
    [data.series],
  );
  const hue = splitColor(split);

  function selectSplit(next: string) {
    if (next === split) return;
    setSplit(next);
    const first = exercises.find((ex: any) => (ex.split || 'Other') === next);
    onQueryChange({ exercise_id: first ? first.id : '' });
  }

  useEffect(() => {
    if (highlight.length && exercises.length) {
      const target = exercises.find((ex: any) => highlight.includes(ex.id));
      if (target) {
        setSplit(target.split || 'Other');
        if (target.id !== selectedExercise) onQueryChange({ exercise_id: target.id });
      }
    }
  }, [highlight, exercises, selectedExercise, onQueryChange]);

  useEffect(() => {
    if (!selectedExercise && exercisesInSplit.length) onQueryChange({ exercise_id: exercisesInSplit[0].id });
  }, [selectedExercise, exercisesInSplit, onQueryChange]);

  if (resource.loading && !data.exercises) return <Skeleton blocks={[40, 240, 64]} />;
  if (resource.error && !data.exercises) return <ErrorState message={resource.error} onRetry={onRetry} />;

  const stats = data.stats;
  const valueSuffix = query.metric === 'reps' ? '' : 'kg';
  const gainColor = stats ? (stats.gain >= 0 ? POSITIVE_INK : NEGATIVE_INK) : undefined;
  const gainPct = stats && stats.start ? Math.round((stats.gain / stats.start) * 100) : null;

  return (
    <View style={{ gap: 20 }}>
      {resource.error ? <InlineWarning message={resource.error} onRetry={onRetry} /> : null}

      {/* Split selector — active chip carries the split's own hue. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {SPLITS.map((s) => (
          <Chip key={s} active={split === s} accent={splitColor(s)} onAccent="#fff" onPress={() => selectSplit(s)}>
            {s}
          </Chip>
        ))}
      </ScrollView>

      {exercisesInSplit.length === 0 ? (
        <Empty>No official-library lifts logged for {split} yet.</Empty>
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {exercisesInSplit.map((ex: any) => (
              <Chip
                key={ex.id}
                size="sm"
                active={selectedExercise === ex.id}
                accent={hue}
                onAccent="#fff"
                onPress={() => onQueryChange({ exercise_id: ex.id })}>
                {ex.name}
              </Chip>
            ))}
          </View>

          <ChartBlock
            title={selected?.name || 'Selected lift'}
            caption={
              stats
                ? `${stats.gain >= 0 ? 'Up' : 'Down'} ${Math.abs(stats.gain)}${valueSuffix}${gainPct != null ? ` (${gainPct >= 0 ? '+' : ''}${gainPct}%)` : ''} since you started tracking — ${metricLabel(query.metric).toLowerCase()}.`
                : 'Pick a lift to see its progression.'
            }
            height={230}
            action={
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {DEFAULT_METRICS.map((metric) => (
                  <Chip
                    key={metric.key}
                    size="sm"
                    active={query.metric === metric.key}
                    accent={hue}
                    onAccent="#fff"
                    onPress={() => onQueryChange({ metric: metric.key })}>
                    {metric.label}
                  </Chip>
                ))}
              </View>
            }>
            {resource.loading ? (
              <Empty>Loading lift chart…</Empty>
            ) : chartRows.length > 0 ? (
              <LineSeriesChart
                height={230}
                rows={chartRows}
                xKey="date"
                series={[{ key: 'value', label: metricLabel(query.metric), color: hue }]}
                readout={(row) =>
                  query.metric === 'reps'
                    ? [
                        `${row.value} reps · ${row.weight_kg} kg`,
                        `${formatSetType(row.set_type)} · ${shortDateLabel(row.date)}`,
                      ]
                    : [shortDateLabel(row.date), `${metricLabel(query.metric)}: ${row.value}${valueSuffix}`]
                }
              />
            ) : (
              <Empty>No lift data for this selection yet.</Empty>
            )}
          </ChartBlock>

          {stats && (
            <StatRow>
              <StatTile first label="Start" value={stats.start} unit={valueSuffix} />
              <StatTile label="Current" value={stats.current} unit={valueSuffix} />
              <StatTile
                label="Gain"
                value={`${stats.gain >= 0 ? '+' : ''}${stats.gain}`}
                unit={valueSuffix}
                color={gainColor}
                sub={gainPct != null ? `${gainPct >= 0 ? '+' : ''}${gainPct}%` : undefined}
              />
            </StatRow>
          )}

          <Section title={null} divider>
            <PrimaryButton onPress={() => selectedExercise && onCompare?.(selectedExercise)} disabled={!selectedExercise}>
              Compare this lift against your data →
            </PrimaryButton>
          </Section>
        </>
      )}
    </View>
  );
}

function metricLabel(metric: string) {
  return DEFAULT_METRICS.find((m) => m.key === metric)?.label || metric;
}

function formatSetType(value?: string) {
  return String(value || 'working')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
