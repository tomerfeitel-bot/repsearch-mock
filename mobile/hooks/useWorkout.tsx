import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

// Session-1 shell of src/hooks/useWorkout.jsx: just enough state to drive the
// global FloatingWorkoutBar and RestTimerPill overlays. Session 3 replaces the
// stub workout with the real ActiveWorkout state machine + API persistence.
type StubWorkout = {
  startedAt: string;
  finalizedAt: string | null;
};

type RestTimerState = {
  active: boolean;
  durationSec: number;
  startedAt: number;
};

type WorkoutContextValue = {
  workout: StubWorkout | null;
  elapsedSec: number;
  restTimer: RestTimerState;
  startRestTimer: (durationSec?: number) => void;
  dismissRestTimer: () => void;
  // Temporary Session-1 helpers so the overlays can be exercised on-device
  // before the real workout flow exists. Removed in Session 3.
  startDummyWorkout: () => void;
  endDummyWorkout: () => void;
};

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [workout, setWorkout] = useState<StubWorkout | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [restTimer, setRestTimer] = useState<RestTimerState>({
    active: false,
    durationSec: 90,
    startedAt: 0,
  });

  useEffect(() => {
    if (!workout || workout.finalizedAt) {
      setElapsedSec(0);
      return;
    }
    const startedMs = new Date(workout.startedAt).getTime();
    const tick = () => setElapsedSec(Math.max(0, Math.floor((Date.now() - startedMs) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [workout]);

  const startRestTimer = useCallback((durationSec = 90) => {
    setRestTimer({ active: true, durationSec, startedAt: Date.now() });
  }, []);

  const dismissRestTimer = useCallback(() => {
    setRestTimer((prev) => ({ ...prev, active: false }));
  }, []);

  const startDummyWorkout = useCallback(() => {
    setWorkout({ startedAt: new Date().toISOString(), finalizedAt: null });
  }, []);

  const endDummyWorkout = useCallback(() => {
    setWorkout(null);
  }, []);

  return (
    <WorkoutContext.Provider
      value={{ workout, elapsedSec, restTimer, startRestTimer, dismissRestTimer, startDummyWorkout, endDummyWorkout }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used inside WorkoutProvider');
  return ctx;
}
