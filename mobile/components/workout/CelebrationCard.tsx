import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { muscleColor } from '@/lib/musclePalette';
import { colors, monoFont } from '@/lib/theme';
import type { WorkoutSummary } from '@/lib/workoutSummary';

// Port of src/components/workout/CelebrationCard.jsx: the GSAP scale+fade
// entrance becomes Reanimated ZoomIn/FadeIn (works in Expo Go).
export default function CelebrationCard({
  visible,
  prsHit = [],
  summary,
  onDone,
  onViewProgress,
  onSaveTemplate,
  onSharePost,
}: {
  visible: boolean;
  prsHit?: any[];
  summary?: WorkoutSummary | null;
  onDone: () => void;
  onViewProgress: () => void;
  onSaveTemplate: () => void;
  onSharePost: () => void;
}) {
  if (!visible) return null;

  const hasPR = prsHit.length > 0;
  const directGroups = summary?.muscleBreakdown?.directGroups || [];
  const secondary = summary?.muscleBreakdown?.secondary || [];

  return (
    <Modal visible transparent animationType="none" onRequestClose={onDone}>
      <Animated.View
        entering={FadeIn.duration(200)}
        style={{
          flex: 1,
          backgroundColor: 'rgba(8, 9, 10, 0.95)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}>
        <Animated.View
          entering={ZoomIn.springify().damping(18).stiffness(220)}
          style={{
            maxHeight: '92%',
            width: '100%',
            maxWidth: 448,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.bg,
            overflow: 'hidden',
          }}>
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingVertical: 16 }}>
            <Text style={{ fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, color: colors.emeraldInk }}>
              {hasPR ? 'PRs hit' : 'Session complete'}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 24, fontWeight: '700', color: colors.text }}>Post-workout summary</Text>
          </View>

          <ScrollView>
            <View style={{ padding: 16, gap: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Stat label="Min" value={summary?.durationMin || 0} />
                <Stat label="Sets" value={summary?.workingSetCount || 0} />
                <Stat label="Volume" value={summary?.volume || 0} />
                <Stat label="Adh" value={summary?.adherence == null ? '-' : `${summary.adherence}%`} />
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Panel label="Exercises" value={summary?.exerciseCount || 0} />
                <Panel label="Planned vs done" value={`${summary?.completedPlannedSets || 0}/${summary?.plannedSets || 0}`} />
              </View>

              {hasPR && (
                <View style={{ gap: 8 }}>
                  <SectionTitle>PRs</SectionTitle>
                  {prsHit.map((pr, i) => (
                    <View
                      key={i}
                      style={{
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(52, 190, 115, 0.45)',
                        backgroundColor: colors.emeraldSoft,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: colors.emeraldInk }}>
                        {pr.exercise_name || pr.exercise_id}
                      </Text>
                      <Text style={{ fontFamily: monoFont, fontVariant: ['tabular-nums'], fontSize: 15, color: colors.text }}>
                        {pr.weight_kg}kg x {pr.reps}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {(summary?.removedExercises?.length || 0) > 0 && (
                <View style={{ gap: 8 }}>
                  <SectionTitle>Removed</SectionTitle>
                  <View
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: 'rgba(245, 158, 11, 0.3)',
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}>
                    <Text style={{ fontSize: 14, color: '#fde9c8' }}>
                      {summary!.removedExercises.map((ex: any) => ex.exerciseName || ex.exerciseId).join(', ')}
                    </Text>
                  </View>
                </View>
              )}

              <View style={{ gap: 8 }}>
                <SectionTitle>Muscle breakdown</SectionTitle>
                {directGroups.length === 0 ? (
                  <View style={CARD}>
                    <Text style={{ fontSize: 14, color: colors.inkSoft }}>No working sets to count.</Text>
                  </View>
                ) : (
                  directGroups.map((group) => (
                    <View key={group.group} style={CARD}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: muscleColor(group.group) }}>{group.group}</Text>
                        <Text style={{ fontFamily: monoFont, fontVariant: ['tabular-nums'], fontSize: 14, color: colors.textMuted }}>
                          {group.total} sets
                        </Text>
                      </View>
                      <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                        {group.specific.map((row) => (
                          <View
                            key={row.muscle}
                            style={{
                              width: '48%',
                              flexGrow: 1,
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              borderRadius: 8,
                              backgroundColor: colors.bg,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                            }}>
                            <Text style={{ fontSize: 12, color: colors.textMuted }}>{row.muscle}</Text>
                            <Text style={{ fontFamily: monoFont, fontSize: 12, color: colors.text }}>{row.count}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))
                )}
                {secondary.length > 0 && (
                  <View style={CARD}>
                    <Text style={[SECTION_LABEL, { marginBottom: 8 }]}>Also hit</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {secondary.map((row) => (
                        <View
                          key={row.muscle}
                          style={{
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: colors.borderStrong,
                            backgroundColor: colors.bg,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            flexDirection: 'row',
                            gap: 4,
                          }}>
                          <Text style={{ fontSize: 12, color: colors.textMuted }}>{row.muscle}</Text>
                          <Text style={{ fontFamily: monoFont, fontSize: 12, color: colors.textMuted }}>{row.count}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
                <ActionButton primary onPress={onViewProgress}>
                  View progress
                </ActionButton>
                <ActionButton onPress={onSaveTemplate}>Save template</ActionButton>
                <ActionButton emerald onPress={onSharePost}>
                  Share to feed
                </ActionButton>
                <ActionButton onPress={onDone}>Done</ActionButton>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function ActionButton({
  children,
  onPress,
  primary = false,
  emerald = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  primary?: boolean;
  emerald?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: '48%',
        flexGrow: 1,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        ...(primary
          ? { backgroundColor: colors.emerald }
          : emerald
            ? { borderWidth: 1, borderColor: 'rgba(52, 190, 115, 0.45)', backgroundColor: colors.emeraldSoft }
            : { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceAlt }),
      }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          color: primary ? colors.onEmerald : emerald ? colors.emeraldInk : colors.text,
        }}>
        {children}
      </Text>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={{ flex: 1, borderRadius: 12, backgroundColor: colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 12, alignItems: 'center' }}>
      <Text numberOfLines={1} style={{ fontFamily: monoFont, fontVariant: ['tabular-nums'], fontSize: 18, fontWeight: '700', color: colors.text }}>
        {value}
      </Text>
      <Text style={{ marginTop: 4, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: colors.inkSoft }}>{label}</Text>
    </View>
  );
}

function Panel({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={[CARD, { flex: 1 }]}>
      <Text style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: colors.inkSoft }}>{label}</Text>
      <Text style={{ marginTop: 4, fontFamily: monoFont, fontVariant: ['tabular-nums'], fontSize: 18, fontWeight: '600', color: colors.text }}>
        {value}
      </Text>
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={SECTION_LABEL}>{children}</Text>;
}

const CARD = {
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surfaceAlt,
  paddingHorizontal: 12,
  paddingVertical: 12,
};

const SECTION_LABEL = {
  fontSize: 10,
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8,
  color: colors.inkSoft,
};
