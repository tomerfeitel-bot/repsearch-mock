import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWorkout } from '@/hooks/useWorkout';
import { colors } from '@/lib/theme';

// Session-1 placeholder. The real ActiveWorkout screen is Session 3 (the big
// one). The two buttons below are temporary: they exercise the global
// RestTimerPill and FloatingWorkoutBar overlays so Session 1 can be verified
// on-device. Remove them in Session 3.
export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const wo = useWorkout();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 24, paddingHorizontal: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>Workout</Text>
      <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 21, color: colors.textMuted }}>
        The full workout logger arrives in Session 3. Until then, these buttons test the global overlays:
      </Text>

      <Pressable
        onPress={() => wo.startRestTimer(90)}
        style={{
          marginTop: 24,
          minHeight: 48,
          borderRadius: 16,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ fontWeight: '600', color: colors.accentInk }}>Test rest timer (90s + haptic)</Text>
      </Pressable>

      <Pressable
        onPress={() => (wo.workout ? wo.endDummyWorkout() : wo.startDummyWorkout())}
        style={{
          marginTop: 12,
          minHeight: 48,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ fontWeight: '600', color: colors.text }}>
          {wo.workout ? 'End test workout' : 'Start test workout (shows floating bar on other tabs)'}
        </Text>
      </Pressable>

      {wo.workout ? (
        <Text style={{ marginTop: 12, fontSize: 13, color: colors.inkSoft }}>
          Workout running — switch to another tab to see the floating bar.
        </Text>
      ) : null}
    </View>
  );
}
