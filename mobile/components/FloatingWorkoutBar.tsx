import { usePathname, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatElapsed } from '@/lib/formatTime';
import { useWorkout } from '@/hooks/useWorkout';

const HIDE_PATHS = ['/auth', '/onboarding', '/workout'];

// Port of src/components/FloatingWorkoutBar.jsx: the pill that floats above
// the tab bar while a workout is running on another screen.
export default function FloatingWorkoutBar() {
  const { workout, elapsedSec } = useWorkout();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (!workout || workout.finalizedAt) return null;
  if (HIDE_PATHS.includes(pathname)) return null;

  return (
    <Pressable
      onPress={() => router.navigate('/workout')}
      style={{
        position: 'absolute',
        left: 8,
        right: 8,
        bottom: insets.bottom + 72,
        zIndex: 30,
        backgroundColor: 'rgba(36, 40, 37, 0.97)',
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff' }} />
      <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '500' }}>Workout in progress</Text>
      <Text style={{ marginLeft: 'auto', color: '#ffffff', fontSize: 14, fontVariant: ['tabular-nums'] }}>
        {formatElapsed(elapsedSec)}
      </Text>
    </Pressable>
  );
}
