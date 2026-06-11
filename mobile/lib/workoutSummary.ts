import { topLevelGroup } from './musclePalette';

// Port of the audit/summary builders that live at the bottom of
// src/components/workout/ActiveWorkout.jsx, pulled into a lib so the screen,
// FinishSheet and CelebrationCard can share them.
export const WEIGHT_MIN = 0;
export const WEIGHT_MAX = 1500;
export const REPS_MIN = 0;
export const REPS_MAX = 500;

const DETAIL_FIELDS = ['rir', 'rest_seconds', 'rom_category', 'tempo_tag'];

export type WorkoutSet = Record<string, any>;
export type WorkoutExercise = {
  exerciseId: string;
  exerciseName?: string;
  primary_muscle?: string | null;
  secondary_muscle?: string | null;
  equipment_type?: string | null;
  plannedExerciseId?: string | null;
  sets: WorkoutSet[];
  [key: string]: any;
};

export type AuditItem = {
  exerciseId?: string;
  setIdx?: number;
  label?: string;
  severity: 'critical' | 'warning';
  title: string;
  detail: string;
};

export type FinishAudit = {
  items: AuditItem[];
  criticalCount: number;
  warningCount: number;
};

export type WorkoutSummary = {
  durationMin: number;
  workingSetCount: number;
  volume: number;
  exerciseCount: number;
  plannedSets: number;
  completedPlannedSets: number;
  removedExercises: any[];
  adherence: number | null;
  muscleBreakdown: {
    directGroups: { group: string; total: number; specific: { muscle: string; count: number }[] }[];
    secondary: { muscle: string; count: number }[];
  };
};

export function hasValue(value: unknown) {
  return value !== null && value !== undefined && value !== '';
}

export function hasWeightAndReps(set: WorkoutSet) {
  return hasValue(set.weight_kg) && hasValue(set.reps);
}

export function isLoggedSet(set: WorkoutSet) {
  return !!set.done || hasValue(set.weight_kg) || hasValue(set.reps);
}

function isWorkingSet(set: WorkoutSet) {
  return set.set_type !== 'warmup' && hasWeightAndReps(set);
}

function isPlannedSet(set: WorkoutSet) {
  return (
    hasValue(set.planned_weight_kg) ||
    hasValue(set.planned_reps) ||
    hasValue(set.template_set_id) ||
    hasValue(set.planned_exercise_id)
  );
}

function setLabel(exercise: WorkoutExercise, setIdx: number) {
  return `${exercise.exerciseName || exercise.exerciseId} set ${setIdx + 1}`;
}

export function buildFinishAudit({
  exercises = [],
  elapsedSec = 0,
  removedPlannedExercises = [],
}: {
  exercises?: WorkoutExercise[];
  elapsedSec?: number;
  removedPlannedExercises?: any[];
}): FinishAudit {
  const items: AuditItem[] = [];
  let saveableSets = 0;
  let volume = 0;

  exercises.forEach((exercise) => {
    (exercise.sets || []).forEach((set, setIdx) => {
      const hasWeight = hasValue(set.weight_kg);
      const hasReps = hasValue(set.reps);
      const weight = Number(set.weight_kg);
      const reps = Number(set.reps);
      const completed = !!set.done;
      const validWeight = hasWeight && Number.isFinite(weight) && weight >= WEIGHT_MIN && weight <= WEIGHT_MAX;
      const validReps = hasReps && Number.isInteger(reps) && reps >= REPS_MIN && reps <= REPS_MAX;
      const saveable = validWeight && validReps;
      if (saveable) {
        saveableSets += 1;
        if (set.set_type !== 'warmup') volume += weight * reps;
      }
      const base = { exerciseId: exercise.exerciseId, setIdx, label: setLabel(exercise, setIdx) };
      if (!hasWeight && !hasReps) {
        items.push({
          ...base,
          severity: completed ? 'critical' : 'warning',
          title: completed ? 'Completed blank set' : 'Blank set row',
          detail: completed ? 'Add weight and reps or uncheck it before saving.' : 'This row will be ignored unless you log it.',
        });
      } else if (hasWeight !== hasReps) {
        items.push({
          ...base,
          severity: completed ? 'critical' : 'warning',
          title: completed ? 'Completed incomplete set' : 'Incomplete row',
          detail: hasWeight ? 'Weight is filled but reps are missing.' : 'Reps are filled but weight is missing.',
        });
      }
      if (hasWeight && !validWeight) {
        items.push({
          ...base,
          severity: 'critical',
          title: 'Invalid weight',
          detail: `Weight must be between ${WEIGHT_MIN} and ${WEIGHT_MAX} kg.`,
        });
      }
      if (hasReps && !validReps) {
        items.push({
          ...base,
          severity: 'critical',
          title: 'Invalid reps',
          detail: `Reps must be a whole number between ${REPS_MIN} and ${REPS_MAX}.`,
        });
      }
      if (isPlannedSet(set) && !saveable) {
        items.push({
          ...base,
          severity: 'warning',
          title: 'Skipped planned set',
          detail: 'This planned set has no logged weight and reps.',
        });
      }
      if (saveable && set.set_type !== 'warmup' && DETAIL_FIELDS.every((field) => !hasValue(set[field]))) {
        items.push({
          ...base,
          severity: 'warning',
          title: 'Missing set details',
          detail: 'No RIR, rest, ROM, or tempo detail is logged for this working set.',
        });
      }
      if (saveable && weight * reps > 10000) {
        items.push({
          ...base,
          severity: 'warning',
          title: 'Unusual set volume',
          detail: `${weight * reps} kg x reps looks unusually high.`,
        });
      }
    });
  });

  if (!saveableSets) {
    items.unshift({
      severity: 'critical',
      title: 'Empty workout',
      detail: 'Add at least one set with weight and reps before saving.',
    });
  }
  removedPlannedExercises.forEach((exercise) => {
    items.push({
      severity: 'warning',
      title: 'Removed planned exercise',
      detail: `${exercise.exerciseName || exercise.exerciseId} was removed from this session only.`,
    });
  });
  const durationMin = Math.max(1, Math.round(elapsedSec / 60));
  if (durationMin < 3 && saveableSets >= 3) {
    items.push({ severity: 'warning', title: 'Strange duration', detail: `${durationMin} minutes is very short for ${saveableSets} logged sets.` });
  }
  if (durationMin > 240) {
    items.push({ severity: 'warning', title: 'Strange duration', detail: `${durationMin} minutes is unusually long. Check the timer before saving.` });
  }
  if (volume > 80000) {
    items.push({ severity: 'warning', title: 'Unusual volume', detail: `${Math.round(volume)} kg total volume is unusually high.` });
  }

  return {
    items,
    criticalCount: items.filter((item) => item.severity === 'critical').length,
    warningCount: items.filter((item) => item.severity !== 'critical').length,
  };
}

export function buildWorkoutSummary({
  exercises = [],
  elapsedSec = 0,
  removedPlannedExercises = [],
  workout = null,
}: {
  exercises?: WorkoutExercise[];
  elapsedSec?: number;
  removedPlannedExercises?: any[];
  workout?: any;
}): WorkoutSummary {
  const durationMin = workout?.duration_min || Math.max(1, Math.round(elapsedSec / 60));
  const workingSets: WorkoutSet[] = [];
  const exerciseIds = new Set<string>();
  let volume = 0;
  let plannedSets = 0;
  let completedPlannedSets = 0;

  const direct: Record<string, { total: number; specific: Record<string, number> }> = {};
  const secondary: Record<string, number> = {};
  for (const exercise of exercises) {
    const sets = exercise.sets || [];
    if (sets.some(hasWeightAndReps)) exerciseIds.add(exercise.exerciseId);
    for (const set of sets) {
      if (isPlannedSet(set)) plannedSets += 1;
      if (isPlannedSet(set) && hasWeightAndReps(set)) completedPlannedSets += 1;
      if (!isWorkingSet(set)) continue;
      workingSets.push(set);
      volume += Number(set.weight_kg) * Number(set.reps);
      const primary = exercise.primary_muscle || 'Other';
      const group = topLevelGroup(primary) || primary;
      direct[group] ||= { total: 0, specific: {} };
      direct[group].total += 1;
      direct[group].specific[primary] = (direct[group].specific[primary] || 0) + 1;
      if (exercise.secondary_muscle) {
        secondary[exercise.secondary_muscle] = (secondary[exercise.secondary_muscle] || 0) + 1;
      }
    }
  }

  const directGroups = Object.entries(direct)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([group, data]) => ({
      group,
      total: data.total,
      specific: Object.entries(data.specific)
        .sort((a, b) => b[1] - a[1])
        .map(([muscle, count]) => ({ muscle, count })),
    }));

  return {
    durationMin,
    workingSetCount: workingSets.length,
    volume: Math.round(volume),
    exerciseCount: exerciseIds.size,
    plannedSets,
    completedPlannedSets,
    removedExercises: removedPlannedExercises,
    adherence: plannedSets ? Math.round((completedPlannedSets / plannedSets) * 100) : null,
    muscleBreakdown: {
      directGroups,
      secondary: Object.entries(secondary)
        .sort((a, b) => b[1] - a[1])
        .map(([muscle, count]) => ({ muscle, count })),
    },
  };
}

export function hydrateSavedExercises(savedSets: any[] = [], activeExercises: WorkoutExercise[] = []): WorkoutExercise[] {
  const activeById = new Map(activeExercises.map((ex) => [ex.exerciseId, ex]));
  const byId = new Map<string, WorkoutExercise>();
  for (const set of savedSets) {
    const active = activeById.get(set.exercise_id);
    if (!byId.has(set.exercise_id)) {
      byId.set(set.exercise_id, {
        exerciseId: set.exercise_id,
        exerciseName: set.exercise_name || active?.exerciseName || set.exercise_id,
        primary_muscle: set.primary_muscle || active?.primary_muscle || null,
        secondary_muscle: active?.secondary_muscle || null,
        sets: [],
      });
    }
    byId.get(set.exercise_id)!.sets.push(set);
  }
  return [...byId.values()];
}
