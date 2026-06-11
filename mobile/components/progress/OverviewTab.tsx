// Port of src/components/progress/OverviewTab.jsx — headline cadence stats,
// the split-colored training calendar, and the sessions-per-week bar chart.
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BarsChart } from '@/components/charts';
import { Sheet } from '@/components/ui/Sheet';
import { PROGRESS_ACCENT, PROGRESS_BORDER, PROGRESS_MUTED, PROGRESS_TEXT, splitColor } from '@/lib/progressTheme';
import { monoFont } from '@/lib/theme';
import type { Resource } from '@/hooks/useProgress';
import {
  ChartBlock,
  DataRow,
  Empty,
  ErrorState,
  InlineWarning,
  PrimaryButton,
  Section,
  Skeleton,
  StatRow,
  StatTile,
} from './ui';

// The splits that actually appear on the calendar, for the color legend.
const LEGEND_SPLITS = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body'];

type Cell = { inMonth: boolean; day?: number; date?: string; count?: number; color?: string | null };

export default function OverviewTab({
  summary,
  history,
  onRetry,
}: {
  summary: Resource;
  history: Resource;
  onRetry: () => void;
}) {
  const workouts = useMemo(() => (Array.isArray(history.data) ? history.data : []), [history.data]);
  const data = summary.data || {};
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthLabel = new Date(cursor.y, cursor.m).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const monthWorkouts = useMemo(() => {
    const ym = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`;
    return workouts.filter((w: any) => w.date && w.date.startsWith(ym));
  }, [workouts, cursor]);
  const workoutsByDate = useMemo(() => groupByDate(workouts), [workouts]);
  const monthGrid = useMemo(() => buildMonthGrid(cursor.y, cursor.m, workoutsByDate), [cursor, workoutsByDate]);
  const selectedWorkouts = selectedDate ? workoutsByDate.get(selectedDate) || [] : [];
  const loading = history.loading || summary.loading;
  const error = history.error || summary.error;

  const weekly: { label: string; count: number }[] = data.weeklySessions || [];
  const weekAvg = weekly.length ? weekly.reduce((s, w) => s + w.count, 0) / weekly.length : 0;
  const peak = weekly.reduce((m, w) => Math.max(m, w.count), 0);
  const splitsThisMonth = useMemo(() => {
    const set = new Set(monthWorkouts.map((w: any) => w.workout_day).filter(Boolean));
    return LEGEND_SPLITS.filter((s) => set.has(s));
  }, [monthWorkouts]);

  if (loading && workouts.length === 0) return <Skeleton blocks={[64, 300, 180]} />;
  if (error && workouts.length === 0) return <ErrorState message={error} onRetry={onRetry} />;

  return (
    <View style={{ gap: 20 }}>
      {error ? <InlineWarning message={error} onRetry={onRetry} /> : null}

      {/* Headline cadence — three earned numbers, gridded, no boxes. */}
      <StatRow>
        <StatTile first label="This month" value={data.sessionsThisMonth ?? monthWorkouts.length} sub="sessions" />
        <StatTile label="This week" value={data.trainingDaysThisWeek ?? 0} sub="days trained" />
        <StatTile label="Last" value={formatShortDate(data.lastWorkout?.date)} sub={data.lastWorkout?.workout_day || '—'} />
      </StatRow>

      {/* Calendar — color encodes the split. */}
      <Section
        title="Training calendar"
        action={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <NavBtn onPress={() => setCursor((prev) => shiftMonth(prev, -1))} label="Previous month">
              ‹
            </NavBtn>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                fontFamily: monoFont,
                paddingHorizontal: 4,
                minWidth: 118,
                textAlign: 'center',
                color: PROGRESS_TEXT,
              }}>
              {monthLabel}
            </Text>
            <NavBtn onPress={() => setCursor((prev) => shiftMonth(prev, 1))} label="Next month">
              ›
            </NavBtn>
          </View>
        }>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <View key={i} style={{ width: `${100 / 7}%`, paddingBottom: 4, paddingHorizontal: 3 }}>
              <Text style={{ textAlign: 'center', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: PROGRESS_MUTED }}>
                {d}
              </Text>
            </View>
          ))}
          {monthGrid.map((cell, i) => {
            const active = (cell.count || 0) > 0;
            return (
              <View key={i} style={{ width: `${100 / 7}%`, padding: 3 }}>
                <Pressable
                  onPress={() => cell.date && active && setSelectedDate(cell.date)}
                  disabled={!cell.date || !active}
                  style={({ pressed }) => ({
                    aspectRatio: 1,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? cell.color || undefined : cell.inMonth ? 'rgba(255,255,255,0.03)' : 'transparent',
                    opacity: cell.inMonth ? 1 : 0,
                    transform: [{ scale: pressed && active ? 0.9 : 1 }],
                  })}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: monoFont,
                      fontWeight: active ? '700' : '400',
                      color: active ? '#fff' : cell.inMonth ? PROGRESS_MUTED : 'transparent',
                    }}>
                    {cell.day || ''}
                  </Text>
                  {(cell.count || 0) > 1 ? (
                    <Text style={{ position: 'absolute', bottom: 2, right: 4, fontSize: 9, fontWeight: '700', color: '#fff' }}>
                      ×{cell.count}
                    </Text>
                  ) : null}
                </Pressable>
              </View>
            );
          })}
        </View>
        {splitsThisMonth.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 6, marginTop: 12 }}>
            {splitsThisMonth.map((s) => (
              <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: splitColor(s) }} />
                <Text style={{ fontSize: 11, color: PROGRESS_MUTED }}>{s}</Text>
              </View>
            ))}
          </View>
        )}
      </Section>

      {/* Cadence trend — single-hue bars, opacity scaled to the peak week. */}
      {weekly.length > 0 && (
        <ChartBlock
          title="Sessions per week"
          caption={`Averaging ${weekAvg.toFixed(1)} sessions a week over the last ${weekly.length} weeks.`}
          height={140}>
          <BarsChart
            height={140}
            data={weekly.map((w) => ({
              label: w.label,
              value: w.count,
              color: PROGRESS_ACCENT,
              opacity: peak ? 0.4 + 0.6 * (w.count / peak) : 1,
            }))}
            readout={(d) => [d.label, `${d.value ?? 0} sessions`]}
          />
        </ChartBlock>
      )}

      {workouts.length === 0 && <Empty>No workouts logged yet.</Empty>}

      <DaySheet date={selectedDate} workouts={selectedWorkouts} onClose={() => setSelectedDate(null)} />
    </View>
  );
}

function NavBtn({ onPress, label, children }: { onPress: () => void; label: string; children: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={{
        height: 32,
        width: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: PROGRESS_BORDER,
      }}>
      <Text style={{ fontSize: 16, color: PROGRESS_MUTED }}>{children}</Text>
    </Pressable>
  );
}

function DaySheet({ date, workouts, onClose }: { date: string | null; workouts: any[]; onClose: () => void }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);

  function saveTemplate(workout: any) {
    onClose();
    router.push(`/templates/builder/new?workout=${encodeURIComponent(workout.id)}` as never);
  }

  return (
    <Sheet
      open={!!date}
      onClose={() => {
        setOpenId(null);
        onClose();
      }}
      title={date ? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}>
      <View style={{ padding: 16 }}>
        {workouts.map((workout) => {
          const expanded = openId === workout.id;
          const exercises = groupExercises(workout.sets || []);
          return (
            <View key={workout.id}>
              <DataRow
                dot={splitColor(workout.workout_day)}
                label={workout.workout_day || 'Workout'}
                sub={`${workout.exercise_count || exercises.length} exercises · ${workout.set_count || (workout.sets || []).length} sets`}
                value={`${workout.duration_min || 0}min`}
                valueColor={PROGRESS_MUTED}
                onPress={() => setOpenId(expanded ? null : workout.id)}
              />
              {expanded && (
                <View style={{ paddingLeft: 20, paddingBottom: 12, paddingTop: 4 }}>
                  <View style={{ gap: 6 }}>
                    {exercises.map((e, i) => (
                      <View key={e.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                        <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, color: PROGRESS_TEXT }}>
                          <Text style={{ fontFamily: monoFont, color: PROGRESS_MUTED }}>{i + 1}. </Text>
                          {e.name}
                        </Text>
                        <Text style={{ fontSize: 12, fontFamily: monoFont, color: PROGRESS_MUTED }}>{e.sets} sets</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ marginTop: 12 }}>
                    <PrimaryButton onPress={() => saveTemplate(workout)} paddingVertical={10}>
                      Save as template
                    </PrimaryButton>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Sheet>
  );
}

function groupExercises(sets: any[]) {
  const map = new Map<string, { id: string; name: string; sets: number }>();
  for (const set of sets) {
    if (!map.has(set.exercise_id)) {
      map.set(set.exercise_id, { id: set.exercise_id, name: set.exercise_name || set.exercise_id, sets: 0 });
    }
    map.get(set.exercise_id)!.sets += 1;
  }
  return [...map.values()];
}

function groupByDate(workouts: any[]) {
  const map = new Map<string, any[]>();
  for (const workout of workouts) {
    if (!map.has(workout.date)) map.set(workout.date, []);
    map.get(workout.date)!.push(workout);
  }
  return map;
}

function buildMonthGrid(year: number, monthIdx: number, workoutsByDate: Map<string, any[]>): Cell[] {
  const first = new Date(year, monthIdx, 1);
  const last = new Date(year, monthIdx + 1, 0);
  const cells: Cell[] = [];
  for (let i = 0; i < first.getDay(); i += 1) cells.push({ inMonth: false });
  for (let day = 1; day <= last.getDate(); day += 1) {
    const iso = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayWorkouts = workoutsByDate.get(iso) || [];
    cells.push({
      inMonth: true,
      day,
      date: iso,
      count: dayWorkouts.length,
      color: dayWorkouts.length ? splitColor(dayWorkouts[0].workout_day) : null,
    });
  }
  while (cells.length % 7 !== 0) cells.push({ inMonth: false });
  return cells;
}

function shiftMonth({ y, m }: { y: number; m: number }, by: number) {
  const next = new Date(y, m + by, 1);
  return { y: next.getFullYear(), m: next.getMonth() };
}

function formatShortDate(date?: string | null) {
  if (!date) return '—';
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
