import { View } from 'react-native';
import ActiveWorkout from '@/components/workout/ActiveWorkout';
import StartScreen from '@/components/workout/StartScreen';
import { ScreenSpinner } from '@/components/ui/Spinner';
import { useWorkout } from '@/hooks/useWorkout';
import { colors } from '@/lib/theme';

// Port of src/pages/Workout.jsx: StartScreen until a workout is running, then
// the ActiveWorkout logger.
export default function WorkoutScreen() {
  const { workout, startWorkout, loading, restoreError } = useWorkout();

  if (loading) return <ScreenSpinner />;

  if (!workout) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StartScreen onStart={startWorkout} restoreError={restoreError} />
      </View>
    );
  }

  return <ActiveWorkout />;
}
