import '../global.css';

import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FloatingWorkoutBar from '@/components/FloatingWorkoutBar';
import RestTimerPill from '@/components/RestTimerPill';
import { ScreenSpinner } from '@/components/ui/Spinner';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { WorkoutProvider, useWorkout } from '@/hooks/useWorkout';
import { colors } from '@/lib/theme';

// Recreation of the guard logic in src/App.jsx: signed out -> /auth, signed in
// but not onboarded -> /onboarding, otherwise the tabs. The web used <Navigate>
// per-route; here one segment watcher redirects whenever auth state and the
// current section disagree.
function useAuthGuard() {
  const { token, user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const section = segments[0] as string | undefined;
    if (!token) {
      if (section !== 'auth') router.replace('/auth');
    } else if (user && !user.onboarded) {
      if (section !== 'onboarding') router.replace('/onboarding');
    } else if (user && (section === 'auth' || section === 'onboarding')) {
      router.replace('/community');
    }
  }, [token, user, loading, segments, router]);
}

// Mirrors the overlay placement in src/App.jsx: FloatingWorkoutBar hides on
// its own paths; RestTimerPill stacks above the bar when both are visible.
const FLOATING_BAR_HIDDEN_PATHS = ['/auth', '/onboarding', '/workout'];

function GlobalOverlays() {
  const wo = useWorkout();
  const pathname = usePathname();
  const showFloatingBar =
    !!wo.workout && !wo.workout.finalizedAt && !FLOATING_BAR_HIDDEN_PATHS.includes(pathname);

  return (
    <>
      <FloatingWorkoutBar />
      <RestTimerPill
        active={wo.restTimer.active}
        durationSec={wo.restTimer.durationSec}
        startedAt={wo.restTimer.startedAt}
        stacked={showFloatingBar}
        onRestart={wo.startRestTimer}
        onDismiss={wo.dismissRestTimer}
      />
    </>
  );
}

function RootNavigator() {
  const { loading } = useAuth();
  useAuthGuard();

  if (loading) return <ScreenSpinner />;

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
      <GlobalOverlays />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <AuthProvider>
          {/* ToastProvider sits above WorkoutProvider: useWorkout toasts save errors. */}
          <ToastProvider>
            <WorkoutProvider>
              <StatusBar style="light" />
              <RootNavigator />
            </WorkoutProvider>
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
