import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { SEED_EXERCISES } from '@/lib/exercises';
import { muscleColor } from '@/lib/musclePalette';
import { colors, monoFont } from '@/lib/theme';
import { timeAgo } from '@/lib/timeAgo';

// Port of src/pages/PublicWorkout.jsx — someone else's workout with the
// viewer's best per exercise pulled alongside (the "compare" view).
const exerciseById = new Map(SEED_EXERCISES.map((e: any) => [e.id, e]));

export default function PublicWorkoutScreen() {
  const { username, id } = useLocalSearchParams<{ username: string; id: string }>();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/public/workouts/${encodeURIComponent(id)}`)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) {
          toast(err.message || 'Failed to load workout', 'error');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, toast]);

  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const set of data?.sets || []) {
      if (!map.has(set.exercise_id)) map.set(set.exercise_id, []);
      map.get(set.exercise_id)!.push(set);
    }
    return [...map.entries()];
  }, [data]);

  const owner = data?.owner;
  const workout = data?.workout;
  const viewerBest = data?.viewer_best || {};
  const totalSets = data?.sets?.length || 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* sticky owner header */}
      <View
        style={{
          paddingTop: insets.top,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 6,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.bg,
          zIndex: 10,
        }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Back"
          style={{ height: 40, width: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Line x1={19} y1={12} x2={5} y2={12} stroke={colors.text} strokeWidth={1.8} strokeLinecap="round" />
            <Polyline points="12 19 5 12 12 5" stroke={colors.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/user/${owner?.username || username}`)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <Avatar username={owner?.username || username} size="sm" />
          <View style={{ minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
              {owner?.username || username}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 11, fontFamily: monoFont, color: colors.inkSoft }}>
              {workout?.created_at ? timeAgo(workout.created_at) : workout?.date || ''}
            </Text>
          </View>
        </Pressable>
      </View>

      {loading ? (
        <WorkoutSkeleton />
      ) : !data ? (
        <View style={{ padding: 16 }}>
          <View style={[CARD_STYLE, { padding: 32 }]}>
            <Text style={{ textAlign: 'center', fontSize: 14, color: colors.inkSoft }}>Workout not found.</Text>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 96 }}>
          <View style={[CARD_STYLE, { padding: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <View>
                <Text style={{ fontSize: 44, fontWeight: '700', fontFamily: monoFont, color: colors.text }}>
                  {workout.duration_min || 0}
                  <Text style={{ fontSize: 16, color: colors.inkSoft }}> min</Text>
                </Text>
                <Text style={{ marginTop: 8, fontSize: 14, color: colors.textMuted }}>
                  {workout.workout_day || workout.workout_split_type || 'Workout'}
                  <Text style={{ color: colors.inkSoft }}> · {totalSets} sets</Text>
                </Text>
              </View>
              <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.surfaceAlt }}>
                <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: colors.textMuted }}>
                  {workout.visibility}
                </Text>
              </View>
            </View>
            {workout.notes ? (
              <Text style={{ marginTop: 16, fontSize: 14, lineHeight: 21, color: colors.textMuted }}>{workout.notes}</Text>
            ) : null}
          </View>

          {groups.length === 0 ? (
            <View style={[CARD_STYLE, { padding: 24 }]}>
              <Text style={{ textAlign: 'center', fontSize: 14, color: colors.inkSoft }}>No set data on this workout.</Text>
            </View>
          ) : (
            groups.map(([exerciseId, sets]) => {
              const exercise: any = exerciseById.get(exerciseId);
              const best = viewerBest[exerciseId];
              return (
                <View key={exerciseId} style={[CARD_STYLE, { padding: 16 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ height: 10, width: 10, borderRadius: 5, backgroundColor: muscleColor(exercise?.primary_muscle) }} />
                        <Text numberOfLines={1} style={{ fontWeight: '600', color: colors.text, flexShrink: 1 }}>
                          {exercise?.name || exerciseId}
                        </Text>
                      </View>
                      <Text style={{ marginTop: 2, fontSize: 12, color: colors.inkSoft }}>
                        {exercise?.primary_muscle || 'Exercise'} · {exercise?.equipment_type || 'Equipment'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, fontFamily: monoFont, color: colors.inkSoft }}>{sets.length} sets</Text>
                  </View>
                  <View style={{ marginTop: 12, gap: 8 }}>
                    {sets.map((set: any, idx: number) => (
                      <View
                        key={set.id || idx}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          borderRadius: 12,
                          backgroundColor: colors.bg,
                          borderWidth: 1,
                          borderColor: colors.border,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}>
                        <Text style={{ width: 44, fontSize: 12, color: colors.inkSoft }}>Set {set.set_number || idx + 1}</Text>
                        <Text style={{ flex: 1, fontSize: 14, fontFamily: monoFont, color: colors.text }}>
                          {set.weight_kg ?? '-'}kg × {set.reps ?? '-'}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.inkSoft }}>{set.set_type || 'working'}</Text>
                      </View>
                    ))}
                  </View>
                  {best ? (
                    <Text style={{ marginTop: 12, fontSize: 12, color: colors.azureInk }}>
                      Your best: {best.best_kg}kg × {best.best_reps}
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}

          <Text style={{ textAlign: 'center', fontSize: 12, color: colors.inkSoft, paddingTop: 8 }}>
            Discussion lives on shared posts in the Community feed.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

function WorkoutSkeleton() {
  return (
    <View style={{ padding: 16, gap: 16 }}>
      {[80, 128, 224].map((h, i) => (
        <View key={i} style={[CARD_STYLE, { height: h, opacity: 0.5 }]} />
      ))}
    </View>
  );
}

const CARD_STYLE = {
  borderRadius: 16,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
};
