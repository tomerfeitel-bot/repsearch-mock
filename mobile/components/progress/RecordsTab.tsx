// Port of src/components/progress/RecordsTab.jsx — pinned headline records +
// the all-records list. The web's localStorage pin store becomes AsyncStorage
// (hydrated async, so default pins only apply after the read resolves).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PROGRESS_BORDER, PROGRESS_MUTED, PROGRESS_TEXT, splitColor } from '@/lib/progressTheme';
import { colors, monoFont } from '@/lib/theme';
import type { Resource } from '@/hooks/useProgress';
import { DataRow, Empty, ErrorState, InlineWarning, Section, Skeleton } from './ui';

const PIN_STORAGE_KEY = 'repsearch.progress.pinnedLifts';

export default function RecordsTab({
  resource,
  onRetry,
  onOpenLift,
}: {
  resource: Resource;
  onRetry: () => void;
  // The web navigates to /progress?tab=lifts&highlight=<id>; on mobile the
  // Progress screen swaps tabs in place.
  onOpenLift: (exerciseId: string) => void;
}) {
  const data = resource.data || {};
  const records = useMemo(() => data.records || [], [data.records]);
  const defaultPins = useMemo(() => data.defaultPins || [], [data.defaultPins]);
  const [pinned, setPinned] = useState<string[]>([]);
  // null = AsyncStorage read still in flight; boolean = whether a stored value existed.
  const [stored, setStored] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(PIN_STORAGE_KEY).then((raw) => {
      if (cancelled) return;
      if (raw !== null) {
        try {
          const parsed = JSON.parse(raw);
          setPinned(Array.isArray(parsed) ? parsed.filter(Boolean) : []);
        } catch {
          setPinned([]);
        }
        setStored(true);
      } else {
        setStored(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // First run (nothing stored): seed with the server's default pins.
  useEffect(() => {
    if (stored !== false || !defaultPins.length) return;
    setPinned((prev) => (prev.length === 0 ? defaultPins.slice(0, 4) : prev));
    setStored(true);
  }, [stored, defaultPins]);

  useEffect(() => {
    if (stored === null) return;
    AsyncStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinned)).catch(() => {});
  }, [pinned, stored]);

  const recordByExercise = useMemo(() => new Map(records.map((record: any) => [record.exercise_id, record])), [records]);
  const pinnedRecords = pinned.map((id) => recordByExercise.get(id)).filter(Boolean) as any[];
  const unpinnedRecords = records.filter((record: any) => !pinned.includes(record.exercise_id));

  if (resource.loading && !resource.data) return <Skeleton blocks={[140, 260]} />;
  if (resource.error && !resource.data) return <ErrorState message={resource.error} onRetry={onRetry} />;

  function togglePin(exerciseId: string) {
    setPinned((prev) =>
      prev.includes(exerciseId) ? prev.filter((id) => id !== exerciseId) : [...prev, exerciseId].slice(0, 6),
    );
  }

  return (
    <View style={{ gap: 20 }}>
      {resource.error ? <InlineWarning message={resource.error} onRetry={onRetry} /> : null}

      {records.length === 0 ? (
        <Empty>No personal records yet. Log working sets to start building records.</Empty>
      ) : (
        <>
          <Section title="Pinned lifts" caption="Your headline one-rep records, color-coded by split." divider={false}>
            {pinnedRecords.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {pinnedRecords.map((record) => (
                  <PinnedStat
                    key={record.exercise_id}
                    record={record}
                    onOpen={() => onOpenLift(record.exercise_id)}
                    onUnpin={() => togglePin(record.exercise_id)}
                  />
                ))}
              </View>
            ) : (
              <Empty>Pin the lifts you care about most.</Empty>
            )}
          </Section>

          <Section title="All records">
            <View>
              {[...pinnedRecords, ...unpinnedRecords].map((record: any) => {
                const pinnedNow = pinned.includes(record.exercise_id);
                return (
                  <DataRow
                    key={record.exercise_id}
                    dot={splitColor(splitFor(record))}
                    label={record.exercise_name}
                    sub={`${record.primary_muscle || ''}${record.primary_muscle ? ' · ' : ''}${record.date}`}
                    onPress={() => onOpenLift(record.exercise_id)}
                    trailing={
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontFamily: monoFont, fontWeight: '700', fontSize: 14, color: PROGRESS_TEXT }}>
                            {record.weight_kg}kg
                          </Text>
                          <Text style={{ fontFamily: monoFont, fontSize: 11, color: PROGRESS_MUTED }}>× {record.reps}</Text>
                        </View>
                        <Pressable
                          onPress={() => togglePin(record.exercise_id)}
                          accessibilityLabel={pinnedNow ? `Unpin ${record.exercise_name}` : `Pin ${record.exercise_name}`}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: pinnedNow ? colors.emerald : 'transparent',
                            borderWidth: 1,
                            borderColor: pinnedNow ? colors.emerald : PROGRESS_BORDER,
                          }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: pinnedNow ? colors.onEmerald : PROGRESS_MUTED }}>
                            {pinnedNow ? '−' : '+'}
                          </Text>
                        </Pressable>
                      </View>
                    }
                  />
                );
              })}
            </View>
          </Section>
        </>
      )}
    </View>
  );
}

function PinnedStat({ record, onOpen, onUnpin }: { record: any; onOpen: () => void; onUnpin: () => void }) {
  return (
    <View style={{ width: '50%', paddingVertical: 12, paddingRight: 16, borderTopWidth: 1, borderTopColor: PROGRESS_BORDER }}>
      <Pressable onPress={onOpen}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: splitColor(splitFor(record)) }} />
          <Text style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: PROGRESS_MUTED }}>
            {record.primary_muscle || 'Record'}
          </Text>
        </View>
        <Text numberOfLines={1} style={{ fontWeight: '600', marginTop: 6, color: PROGRESS_TEXT }}>
          {record.exercise_name}
        </Text>
        <Text style={{ marginTop: 8, fontFamily: monoFont, fontWeight: '700', fontSize: 30, lineHeight: 32, color: PROGRESS_TEXT }}>
          {record.weight_kg}
          <Text style={{ fontSize: 16, fontWeight: '500', color: PROGRESS_MUTED }}> kg</Text>
        </Text>
        <Text style={{ fontSize: 11, marginTop: 4, fontFamily: monoFont, color: PROGRESS_MUTED }}>
          × {record.reps} · est. {record.estimated_1rm}kg
        </Text>
      </Pressable>
      <Pressable onPress={onUnpin} hitSlop={8} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: PROGRESS_MUTED }}>Unpin</Text>
      </Pressable>
    </View>
  );
}

const MUSCLE_TO_SPLIT: Record<string, string> = {
  Chest: 'Push', 'Upper Chest': 'Push', 'Mid Chest': 'Push', 'Lower Chest': 'Push',
  Shoulders: 'Push', 'Front Delts': 'Push', 'Side Delts': 'Push', Triceps: 'Push',
  Back: 'Pull', Lats: 'Pull', 'Upper Back': 'Pull', 'Lower Back': 'Pull', Traps: 'Pull',
  'Rear Delts': 'Pull', Biceps: 'Pull', Forearms: 'Pull',
  Quads: 'Legs', Hamstrings: 'Legs', Glutes: 'Legs', Calves: 'Legs',
};

function splitFor(record: any) {
  return MUSCLE_TO_SPLIT[record.primary_muscle] || 'Other';
}
