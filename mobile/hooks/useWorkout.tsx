import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { nanoid } from '@/lib/nanoid';
import type { WorkoutExercise, WorkoutSet } from '@/lib/workoutSummary';

// Full port of src/hooks/useWorkout.jsx (the ActiveWorkout state machine).
// localStorage becomes AsyncStorage: reads are async so the pinned values and
// the local active-workout fallback hydrate in effects; writes stay
// fire-and-forget like the web's synchronous setItem.
const PERSIST_KEY = 'repsearch_pinned_values';
const ACTIVE_WORKOUT_KEY = 'repsearch_active_workout_fallback';
const GLOBAL_PIN_SCOPE = '_global';
const RESEARCH_FIELD_KEYS = [
  'rir',
  'set_type',
  'rom_category',
  'tempo_tag',
  'rest_seconds',
  'failure',
  'pain_flag',
];

const WEIGHT_MIN = 0;
const WEIGHT_MAX = 1500;
const REPS_MIN = 0;
const REPS_MAX = 500;

export type ActiveWorkoutState = {
  startedAt: string;
  name?: string | null;
  dayLabel?: string | null;
  templateId?: string | null;
  programId?: string | null;
  programSessionId?: string | null;
  runClassification?: string;
  nextSessionSetOrder?: number;
  removedPlannedExercises?: any[];
  exercises: WorkoutExercise[];
  finalizedAt?: string | null;
  savedWorkoutId?: string | null;
  localUpdatedAt?: string | null;
  updatedAt?: string | null;
  [key: string]: any;
};

export type StartWorkoutOptions = {
  name?: string | null;
  dayLabel?: string | null;
  exercises?: any[];
  templateId?: string | null;
  programId?: string | null;
  programSessionId?: string | null;
  runClassification?: string;
  skipReplaceWarning?: boolean;
  copyPreviousValues?: boolean;
};

type RestTimerState = { active: boolean; durationSec: number; startedAt: number };

type PinnedValues = Record<string, Record<string, any>>;

function hasValue(value: unknown) {
  return value !== null && value !== undefined && value !== '';
}

function hasWeightAndReps(set: WorkoutSet) {
  return hasValue(set.weight_kg) && hasValue(set.reps);
}

function shouldSaveSet(set: WorkoutSet) {
  return set.done || hasWeightAndReps(set);
}

function saveableSetCount(exercise: WorkoutExercise | undefined) {
  return (exercise?.sets || []).filter((set) => hasWeightAndReps(set)).length;
}

function plannedSetCount(exercise: WorkoutExercise | undefined) {
  if (Number.isFinite(Number(exercise?.plannedSetCount))) return Number(exercise!.plannedSetCount);
  return (exercise?.sets || []).filter(
    (set) => set.template_set_id || set.planned_weight_kg != null || set.planned_reps != null || set.planned_rep_range,
  ).length;
}

function classifyProgramRun(workout: ActiveWorkoutState) {
  if (!workout?.programId) return workout?.runClassification || 'exact';
  if (workout.runClassification === 'derived') return 'derived';
  if ((workout.removedPlannedExercises || []).length > 0) return 'adapted';

  for (const exercise of workout.exercises || []) {
    const plannedExerciseId = exercise.plannedExerciseId || exercise.planned_exercise_id;
    const plannedSets = plannedSetCount(exercise);
    if (!plannedExerciseId) return 'adapted';
    if (plannedSets > 0 && saveableSetCount(exercise) < plannedSets) return 'adapted';
  }

  return 'exact';
}

function describeSetLocation(exercise: WorkoutExercise, setIdx: number) {
  return `${exercise.exerciseName || exercise.exerciseId || 'Exercise'} set ${setIdx + 1}`;
}

function validateWorkoutForSave(workout: ActiveWorkoutState) {
  const errors: string[] = [];
  let saveableSets = 0;

  for (const ex of workout?.exercises || []) {
    for (let idx = 0; idx < (ex.sets || []).length; idx += 1) {
      const set = ex.sets[idx];
      const hasWeight = hasValue(set.weight_kg);
      const hasReps = hasValue(set.reps);
      const location = describeSetLocation(ex, idx);

      if (!shouldSaveSet(set)) continue;
      if (set.done && !hasWeight && !hasReps) {
        errors.push(`${location} is marked complete but has no weight or reps.`);
        continue;
      }
      if (hasWeight && !hasReps) errors.push(`${location} has weight but no reps.`);
      if (hasReps && !hasWeight) errors.push(`${location} has reps but no weight.`);
      if (hasWeight) {
        const weight = Number(set.weight_kg);
        if (!Number.isFinite(weight) || weight < WEIGHT_MIN || weight > WEIGHT_MAX) {
          errors.push(`${location} weight must be between ${WEIGHT_MIN} and ${WEIGHT_MAX} kg.`);
        }
      }
      if (hasReps) {
        const reps = Number(set.reps);
        if (!Number.isInteger(reps) || reps < REPS_MIN || reps > REPS_MAX) {
          errors.push(`${location} reps must be a whole number between ${REPS_MIN} and ${REPS_MAX}.`);
        }
      }
      if (hasWeight && hasReps) saveableSets += 1;
    }
  }

  if (saveableSets === 0) errors.push('Add at least one set with weight and reps before saving.');
  return errors;
}

function activeWorkoutUpdatedAt(workout: ActiveWorkoutState | null) {
  return workout?.localUpdatedAt || workout?.updatedAt || workout?.startedAt || null;
}

type LocalCopy = { state: ActiveWorkoutState; updatedAt?: string } | null;

async function loadLocalActiveWorkout(): Promise<LocalCopy> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_WORKOUT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed?.state) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveLocalActiveWorkout(state: ActiveWorkoutState | null, updatedAt = new Date().toISOString()) {
  if (!state) {
    AsyncStorage.removeItem(ACTIVE_WORKOUT_KEY).catch(() => {});
    return null;
  }
  const nextState = { ...state, localUpdatedAt: updatedAt };
  AsyncStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify({ state: nextState, updatedAt })).catch(() => {});
  return nextState;
}

function clearLocalActiveWorkout() {
  AsyncStorage.removeItem(ACTIVE_WORKOUT_KEY).catch(() => {});
}

function isNewerLocalWorkout(localCopy: LocalCopy, serverState: ActiveWorkoutState | null, serverUpdatedAt?: string) {
  if (!localCopy?.state) return false;
  if (!serverState) return false;
  const localTime = Date.parse(localCopy.updatedAt || activeWorkoutUpdatedAt(localCopy.state) || '');
  const serverTime = Date.parse(serverUpdatedAt || activeWorkoutUpdatedAt(serverState) || '');
  return Number.isFinite(localTime) && (!Number.isFinite(serverTime) || localTime > serverTime);
}

function localDateString(iso: string) {
  const date = new Date(iso);
  const d = Number.isFinite(date.getTime()) ? date : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function loadPinned(): Promise<PinnedValues> {
  try {
    const raw = await AsyncStorage.getItem(PERSIST_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (Array.isArray(parsed)) return {};
    if (!parsed || typeof parsed !== 'object') return {};
    const looksNested = Object.values(parsed).some(
      (value) => value && typeof value === 'object' && !Array.isArray(value),
    );
    if (looksNested) return parsed;
    const migrated = { [GLOBAL_PIN_SCOPE]: parsed };
    savePinned(migrated);
    return migrated;
  } catch {
    return {};
  }
}

function savePinned(values: PinnedValues) {
  AsyncStorage.setItem(PERSIST_KEY, JSON.stringify(values)).catch(() => {});
}

function pinsForExercise(pinnedValues: PinnedValues, exerciseId: string) {
  return {
    ...(pinnedValues?.[GLOBAL_PIN_SCOPE] || {}),
    ...(pinnedValues?.[exerciseId] || {}),
  };
}

function freshSet(overrides: Record<string, any> = {}): WorkoutSet {
  return {
    id: nanoid(),
    set_type: 'working',
    weight_kg: null,
    reps: null,
    rir: null,
    failure: false,
    client_ts: Date.now(),
    done: false,
    ...overrides,
  };
}

function nextSessionSetOrder(workout: ActiveWorkoutState | null) {
  let maxOrder = 0;
  for (const ex of workout?.exercises || []) {
    for (const set of ex.sets || []) {
      const order = Number(set.session_set_order);
      if (Number.isFinite(order) && order > maxOrder) maxOrder = order;
    }
  }
  return maxOrder + 1;
}

export type FinishResult =
  | { ok: false; error: string; validationErrors?: string[] }
  | { ok?: boolean; workout?: any; prsHit?: any[]; [key: string]: any }
  | null;

type WorkoutContextValue = {
  workout: ActiveWorkoutState | null;
  loading: boolean;
  sortedExercises: (WorkoutExercise & { originalIdx: number })[];
  collapsed: Set<number>;
  pinnedFields: Set<string>;
  pinnedValues: PinnedValues;
  elapsedSec: number;
  restTimer: RestTimerState;
  syncStatus: 'idle' | 'saving' | 'saved' | 'error';
  syncError: string;
  restoreError: string;
  startWorkout: (opts?: StartWorkoutOptions) => boolean;
  addExercise: (exercise: any) => void;
  removeExercise: (exerciseIdx: number) => void;
  addSet: (exerciseIdx: number, overrides?: Record<string, any>) => void;
  removeSet: (exerciseIdx: number, setIdx: number) => void;
  updateSet: (exerciseIdx: number, setIdx: number, patch: Record<string, any>) => void;
  toggleCollapsed: (idx: number) => void;
  pinField: (exerciseIdx: number, field: string, value: any) => void;
  unpinField: (exerciseIdx: number, field: string) => void;
  finishWorkout: (meta?: Record<string, any>, options?: { keepLocal?: boolean }) => Promise<FinishResult>;
  clearLocalWorkout: () => void;
  discardWorkout: () => Promise<void>;
  startRestTimer: (durationSec?: number) => void;
  dismissRestTimer: () => void;
};

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const toast = useToast();
  const [workout, setWorkout] = useState<ActiveWorkoutState | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [pinnedValues, setPinnedValues] = useState<PinnedValues>({});
  const [elapsedSec, setElapsedSec] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [syncError, setSyncError] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [restTimer, setRestTimer] = useState<RestTimerState>({ active: false, durationSec: 90, startedAt: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workoutRef = useRef<ActiveWorkoutState | null>(workout);
  const saveInFlightRef = useRef(false);
  const workoutStartedAt = workout?.startedAt;

  useEffect(() => {
    workoutRef.current = workout;
  }, [workout]);

  // Hydrate pinned research values from storage once on mount.
  useEffect(() => {
    let cancelled = false;
    loadPinned().then((values) => {
      if (!cancelled) setPinnedValues(values);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const scheduleSync = useCallback((nextState: ActiveWorkoutState | null) => {
    if (saveInFlightRef.current || nextState?.finalizedAt) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSyncStatus('saving');
    setSyncError('');
    debounceRef.current = setTimeout(() => {
      if (!nextState) {
        api
          .del('/active-workout')
          .then(() => {
            setSyncStatus('idle');
            setSyncError('');
          })
          .catch((err) => {
            setSyncStatus('error');
            setSyncError(err.message || 'Autosave failed');
          });
      } else {
        api
          .put('/active-workout', { state: nextState })
          .then(() => {
            setSyncStatus('saved');
            setSyncError('');
          })
          .catch((err) => {
            setSyncStatus('error');
            setSyncError(err.message || 'Autosave failed');
          });
      }
    }, 1000);
  }, []);

  // Load active workout when authenticated; clear when not.
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setWorkout(null);
      setSyncStatus('idle');
      setSyncError('');
      setRestoreError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get('/active-workout')
      .then(async (d) => {
        if (cancelled) return;
        const restored: ActiveWorkoutState | null = d.state ?? d.active ?? null;
        const localCopy = await loadLocalActiveWorkout();
        if (cancelled) return;
        const localIsNewer = isNewerLocalWorkout(localCopy, restored, d.updated_at);
        const next = localIsNewer ? localCopy!.state : restored;
        if (next) {
          const localState = localIsNewer
            ? next
            : saveLocalActiveWorkout(next, d.updated_at || activeWorkoutUpdatedAt(next) || undefined);
          setWorkout(localState);
          if (localIsNewer) {
            setSyncStatus('saving');
            setSyncError('Restored a newer local workout. Syncing it now.');
            scheduleSync(localState);
          } else {
            setSyncStatus('saved');
            setSyncError('');
          }
        } else {
          if (!restored) clearLocalActiveWorkout();
          setWorkout(null);
          setSyncStatus('idle');
          setSyncError('');
          setRestoreError('');
        }
      })
      .catch(async (err) => {
        if (cancelled) return;
        const localCopy = await loadLocalActiveWorkout();
        if (cancelled) return;
        if (localCopy?.state) {
          setWorkout(localCopy.state);
          setSyncStatus('error');
          setSyncError(err.message || 'Could not restore from server. Restored local workout.');
          setRestoreError('');
        } else {
          setSyncStatus('error');
          setSyncError(err.message || 'Could not restore active workout');
          setRestoreError(err.message || 'Could not restore active workout.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scheduleSync, token]);

  // Elapsed timer
  useEffect(() => {
    if (!workoutStartedAt) {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsedSec(0);
      return;
    }
    const tick = () => setElapsedSec(Math.floor((Date.now() - new Date(workoutStartedAt).getTime()) / 1000));
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [workoutStartedAt]);

  const update = useCallback(
    (fn: (prev: ActiveWorkoutState | null) => ActiveWorkoutState | null) => {
      setWorkout((prev) => {
        if (prev?.finalizedAt) return prev;
        const next = saveLocalActiveWorkout(fn(prev));
        scheduleSync(next);
        return next;
      });
    },
    [scheduleSync],
  );

  const startWorkout = useCallback(
    (opts: StartWorkoutOptions = {}) => {
      const {
        name = null,
        dayLabel = null,
        exercises: templateExercises = [],
        templateId = null,
        programId = null,
        programSessionId = null,
        runClassification = 'exact',
        skipReplaceWarning = false,
        copyPreviousValues = false,
      } = opts;
      if (workoutRef.current && !skipReplaceWarning) {
        return false;
      }
      const w: ActiveWorkoutState = {
        startedAt: new Date().toISOString(),
        name,
        dayLabel,
        templateId,
        programId,
        programSessionId,
        runClassification,
        nextSessionSetOrder: 1,
        removedPlannedExercises: [],
        exercises: templateExercises.map((e: any) => ({
          exerciseId: e.exerciseId || e.exercise_id || e.id,
          exerciseName: e.exerciseName || e.name || '',
          primary_muscle: e.primary_muscle || null,
          secondary_muscle: e.secondary_muscle || null,
          equipment_type: e.equipment_type || null,
          plannedExerciseId: e.plannedExerciseId || e.exerciseId || e.exercise_id || e.id,
          plannedSetCount: (e.sets || []).length,
          sets: (e.sets || []).map((s: any, idx: number) =>
            freshSet({
              weight_kg: copyPreviousValues ? (s.weight_kg ?? null) : null,
              reps: copyPreviousValues ? (s.reps ?? null) : null,
              rir: copyPreviousValues ? (s.rir ?? null) : null,
              set_type: s.set_type || 'working',
              planned_weight_kg: s.weight_kg ?? s.target_weight_kg ?? null,
              planned_reps: s.reps ?? s.target_reps ?? null,
              planned_rep_range: s.target_rep_range ?? s.rep_range ?? null,
              planned_rir: s.rir ?? s.target_rir ?? null,
              planned_rom_category: s.rom_category ?? null,
              planned_tempo_tag: s.tempo_tag ?? null,
              planned_rest_seconds: s.rest_seconds ?? null,
              planned_failure: s.failure ?? false,
              template_set_id: s.id || s.template_set_id || null,
              planned_exercise_id: e.plannedExerciseId || e.exerciseId || e.exercise_id || e.id,
              client_ts: Date.now() + idx,
            }),
          ),
        })),
      };
      setCollapsed(new Set());
      update(() => w);
      return true;
    },
    [update],
  );

  const addExercise = useCallback(
    (exercise: any) => {
      update((prev) => {
        if (!prev) return prev;
        const exerciseId = exercise.id || exercise.exerciseId;
        const already = prev.exercises.findIndex((e) => e.exerciseId === exerciseId);
        if (already !== -1) return prev;
        const pinnedForExercise: Record<string, any> = pinsForExercise(pinnedValues, exerciseId);
        delete pinnedForExercise.set_type;
        const pinnedFields = Object.keys(pinnedForExercise);
        return {
          ...prev,
          runClassification: prev.programId ? 'adapted' : prev.runClassification,
          exercises: [
            ...prev.exercises,
            {
              exerciseId,
              exerciseName: exercise.name || exercise.exerciseName || '',
              primary_muscle: exercise.primary_muscle || null,
              secondary_muscle: exercise.secondary_muscle || null,
              equipment_type: exercise.equipment_type || null,
              sets: [
                freshSet({
                  weight_kg: null,
                  reps: null,
                  set_type: 'working',
                  ...pinnedForExercise,
                  _restExplicit: hasValue(pinnedForExercise.rest_seconds),
                  _pinnedFields: pinnedFields,
                  _unpinnedFields: [],
                  client_ts: Date.now(),
                }),
              ],
            },
          ],
        };
      });
    },
    [update, pinnedValues],
  );

  const removeExercise = useCallback(
    (exerciseIdx: number) => {
      update((prev) => {
        if (!prev) return prev;
        const removed = prev.exercises[exerciseIdx];
        const exercises = prev.exercises.filter((_, i) => i !== exerciseIdx);
        const plannedId = removed?.plannedExerciseId || removed?.planned_exercise_id || null;
        const removedPlannedExercises = plannedId
          ? [
              ...(prev.removedPlannedExercises || []),
              {
                exerciseId: removed.exerciseId,
                exerciseName: removed.exerciseName || removed.exerciseId,
                plannedExerciseId: plannedId,
                removedAt: new Date().toISOString(),
              },
            ]
          : prev.removedPlannedExercises || [];
        return {
          ...prev,
          runClassification: prev.programId && plannedId ? 'adapted' : prev.runClassification,
          exercises,
          removedPlannedExercises,
        };
      });
    },
    [update],
  );

  const addSet = useCallback(
    (exerciseIdx: number, overrides: Record<string, any> = {}) => {
      update((prev) => {
        if (!prev) return prev;
        const exercises = prev.exercises.map((ex, i) => {
          if (i !== exerciseIdx) return ex;
          const pinnedForExercise = pinsForExercise(pinnedValues, ex.exerciseId);
          const pinnedFields = Object.keys(pinnedForExercise);
          return {
            ...ex,
            sets: [
              ...ex.sets,
              freshSet({
                weight_kg: null,
                reps: null,
                ...pinnedForExercise,
                _restExplicit: hasValue(pinnedForExercise.rest_seconds),
                _pinnedFields: pinnedFields,
                _unpinnedFields: [],
                client_ts: Date.now(),
                ...overrides,
              }),
            ],
          };
        });
        return {
          ...prev,
          exercises,
        };
      });
    },
    [update, pinnedValues],
  );

  const removeSet = useCallback(
    (exerciseIdx: number, setIdx: number) => {
      update((prev) => {
        if (!prev) return prev;
        const exercises = prev.exercises.map((ex, i) => {
          if (i !== exerciseIdx) return ex;
          return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) };
        });
        return {
          ...prev,
          exercises,
        };
      });
    },
    [update],
  );

  const updateSet = useCallback(
    (exerciseIdx: number, setIdx: number, patch: Record<string, any>) => {
      update((prev) => {
        if (!prev) return prev;
        let nextOrder = prev.nextSessionSetOrder || nextSessionSetOrder(prev);
        const exercises = prev.exercises.map((ex, i) => {
          if (i !== exerciseIdx) return ex;
          return {
            ...ex,
            sets: ex.sets.map((s, j) => {
              if (j !== setIdx) return s;
              const nextSet = { ...s, ...patch };
              if (patch.done === true && !s.session_set_order) {
                nextSet.session_set_order = nextOrder;
                nextOrder += 1;
              }
              return nextSet;
            }),
          };
        });
        return { ...prev, nextSessionSetOrder: nextOrder, exercises };
      });
    },
    [update],
  );

  const toggleCollapsed = useCallback((idx: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const pinField = useCallback((exerciseIdx: number, field: string, value: any) => {
    setPinnedValues((prev) => {
      const exerciseId = workoutRef.current?.exercises?.[exerciseIdx]?.exerciseId;
      if (!exerciseId) return prev;
      const next = {
        ...prev,
        [exerciseId]: {
          ...(prev[exerciseId] || {}),
          [field]: value,
        },
      };
      savePinned(next);
      return next;
    });
  }, []);

  const unpinField = useCallback((exerciseIdx: number, field: string) => {
    setPinnedValues((prev) => {
      const exerciseId = workoutRef.current?.exercises?.[exerciseIdx]?.exerciseId;
      if (!exerciseId) return prev;
      const next = { ...prev };
      const exercisePins = { ...(next[exerciseId] || {}) };
      delete exercisePins[field];
      if (Object.keys(exercisePins).length) next[exerciseId] = exercisePins;
      else delete next[exerciseId];
      savePinned(next);
      return next;
    });
  }, []);

  const finishWorkout = useCallback(
    async (meta: Record<string, any> = {}, options: { keepLocal?: boolean } = {}): Promise<FinishResult> => {
      const w = workoutRef.current;
      if (!w) return null;
      if (w.finalizedAt) return { ok: false, error: 'This workout has already been saved.' };
      if (saveInFlightRef.current) return null;
      const validationErrors = validateWorkoutForSave(w);
      if (validationErrors.length) {
        const message = validationErrors.slice(0, 4).join('\n');
        toast(message, 'error');
        return { ok: false, error: message, validationErrors };
      }
      saveInFlightRef.current = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSyncStatus('saving');
      setSyncError('');
      // session_position computed by backend from set_number + timestamps; here we just send the sets in order.
      const allSets: Record<string, any>[] = [];
      for (const ex of w.exercises) {
        const inherited: Record<string, any> = {};
        ex.sets.forEach((s, idx) => {
          const effective: Record<string, any> = { ...s };
          for (const key of RESEARCH_FIELD_KEYS) {
            if (s._unpinnedFields?.includes(key)) {
              delete inherited[key];
              if (key !== 'set_type') effective[key] = key === 'failure' || key === 'pain_flag' ? false : null;
              continue;
            }
            if (s[key] !== null && s[key] !== undefined && s[key] !== '') {
              inherited[key] = s[key];
            } else if (inherited[key] !== null && inherited[key] !== undefined && inherited[key] !== '') {
              effective[key] = inherited[key];
            }
          }
          if (!shouldSaveSet(effective)) return;
          if (!hasValue(effective.weight_kg) || !hasValue(effective.reps)) return;
          allSets.push({
            exercise_id: ex.exerciseId,
            planned_exercise_id: effective.planned_exercise_id || ex.plannedExerciseId || ex.exerciseId,
            template_set_id: effective.template_set_id || null,
            set_number: idx + 1,
            set_type: effective.set_type,
            weight_kg: effective.weight_kg,
            reps: effective.reps,
            rir: effective.rir,
            failure: effective.failure ? 1 : 0,
            rom_category: effective.rom_category || null,
            tempo_tag: effective.tempo_tag || null,
            rest_seconds: effective.rest_seconds ?? null,
            set_notes: effective.set_notes || null,
            session_set_order: effective.session_set_order ?? null,
            equipment_type: effective.equipment_type || ex.equipment_type || null,
            pain_flag: effective.pain_flag ? 1 : 0,
            client_ts: effective.client_ts,
          });
        });
      }
      const durationMin = Math.max(1, Math.round(elapsedSec / 60));
      try {
        const result = await api.post('/workouts', {
          date: localDateString(w.startedAt),
          start_time: w.startedAt,
          duration_min: durationMin,
          workout_day: w.dayLabel || null,
          template_id: w.templateId || null,
          program_id: w.programId || null,
          program_session_id: w.programSessionId || null,
          run_classification: classifyProgramRun(w),
          sets: allSets,
          ...meta,
        });
        await api.del('/active-workout').catch(() => {});
        clearLocalActiveWorkout();
        setWorkout(
          options.keepLocal
            ? { ...w, finalizedAt: new Date().toISOString(), savedWorkoutId: result.workout?.id || null }
            : null,
        );
        setCollapsed(new Set());
        setSyncStatus('idle');
        setSyncError('');
        setRestTimer((t) => ({ ...t, active: false }));
        return result;
      } catch (err: any) {
        const message = err.message || 'Failed to save workout';
        toast(message, 'error');
        return { ok: false, error: message };
      } finally {
        saveInFlightRef.current = false;
      }
    },
    [elapsedSec, toast],
  );

  const clearLocalWorkout = useCallback(() => {
    clearLocalActiveWorkout();
    setWorkout(null);
    setCollapsed(new Set());
    setSyncStatus('idle');
    setSyncError('');
    setRestoreError('');
    setRestTimer((t) => ({ ...t, active: false }));
  }, []);

  const discardWorkout = useCallback(async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await api.del('/active-workout').catch(() => {});
    clearLocalActiveWorkout();
    setWorkout(null);
    setCollapsed(new Set());
    setSyncStatus('idle');
    setSyncError('');
    setRestoreError('');
    setRestTimer((t) => ({ ...t, active: false }));
  }, []);

  const startRestTimer = useCallback((durationSec = 90) => {
    const nextDuration = Math.min(600, Math.max(15, Number(durationSec) || 90));
    setRestTimer({ active: true, durationSec: nextDuration, startedAt: Date.now() });
  }, []);

  const dismissRestTimer = useCallback(() => {
    setRestTimer((t) => ({ ...t, active: false }));
  }, []);

  const sortedExercises = useMemo(() => {
    if (!workout) return [];
    return workout.exercises.map((ex, originalIdx) => ({ ...ex, originalIdx }));
  }, [workout]);

  const value: WorkoutContextValue = {
    workout,
    loading,
    sortedExercises,
    collapsed,
    pinnedFields: new Set(Object.keys(pinnedValues).filter((key) => key !== GLOBAL_PIN_SCOPE)),
    pinnedValues,
    elapsedSec,
    restTimer,
    syncStatus,
    syncError,
    restoreError,
    startWorkout,
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    updateSet,
    toggleCollapsed,
    pinField,
    unpinField,
    finishWorkout,
    clearLocalWorkout,
    discardWorkout,
    startRestTimer,
    dismissRestTimer,
  };

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used inside WorkoutProvider');
  return ctx;
}
