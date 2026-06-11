import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddExerciseSheet from './AddExerciseSheet';
import CelebrationCard from './CelebrationCard';
import ExerciseCard from './ExerciseCard';
import FinishSheet from './FinishSheet';
import { SlidersIcon } from './SetRow';
import { Sheet } from '@/components/ui/Sheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { useWorkout } from '@/hooks/useWorkout';
import { api } from '@/lib/api';
import { SEED_EXERCISES } from '@/lib/exercises';
import { formatElapsed } from '@/lib/formatTime';
import { muscleColor, topLevelGroup } from '@/lib/musclePalette';
import { colors, monoFont } from '@/lib/theme';
import {
  buildFinishAudit,
  buildWorkoutSummary,
  hasWeightAndReps,
  hydrateSavedExercises,
  isLoggedSet,
  type AuditItem,
  type WorkoutExercise,
  type WorkoutSet,
} from '@/lib/workoutSummary';

// Port of src/components/workout/ActiveWorkout.jsx. The sticky header is a
// fixed View above a FlatList of ExerciseCards; the audit "Fix" jump uses
// FlatList scrollToIndex instead of DOM scrollIntoView.
export default function ActiveWorkout() {
  const wo = useWorkout();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<any>>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [celebration, setCelebration] = useState<any>(null);
  const [removeTarget, setRemoveTarget] = useState<{ exercise: WorkoutExercise; index: number } | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [researchDetailsVisible, setResearchDetailsVisible] = useState(true);
  const [lastSession, setLastSession] = useState<Record<string, WorkoutSet[]>>({});
  const workoutStartedAt = wo.workout?.startedAt;
  const finalized = !!wo.workout?.finalizedAt;

  // Fetch the user's last 20 workouts and capture the most recent session per exercise (for ghosted hints)
  useEffect(() => {
    if (!workoutStartedAt) return;
    let cancelled = false;
    api
      .get('/workouts?limit=20')
      .then((data) => {
        if (cancelled) return;
        // workouts come back date DESC, created_at DESC. The first workout containing an exercise wins.
        const map: Record<string, WorkoutSet[]> = {};
        for (const w of data.workouts || []) {
          for (const s of w.sets || []) {
            if (map[s.exercise_id]) continue; // already captured a more-recent session
            // collect ALL sets from THIS workout for THIS exercise
            const exSets = (w.sets || [])
              .filter((x: any) => x.exercise_id === s.exercise_id && x.weight_kg != null)
              .sort((a: any, b: any) => a.session_position - b.session_position || a.set_number - b.set_number)
              .map((x: any) => ({
                weight_kg: x.weight_kg,
                reps: x.reps,
                rir: x.rir,
                rest_seconds: x.rest_seconds,
                rom_category: x.rom_category,
                tempo_tag: x.tempo_tag,
              }));
            if (exSets.length) map[s.exercise_id] = exSets;
          }
        }
        setLastSession(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [workoutStartedAt]);

  // Hydrate render rows with muscle/equipment from seed catalog
  const renderRows = useMemo(() => {
    if (!wo.workout) return [];
    const byId = new Map<string, any>(SEED_EXERCISES.map((e: any) => [e.id, e]));
    return wo.sortedExercises.map((ex) => {
      const seed = byId.get(ex.exerciseId);
      return {
        ...ex,
        exerciseName: ex.exerciseName || seed?.name || ex.exerciseId,
        primary_muscle: ex.primary_muscle || seed?.primary_muscle || null,
        secondary_muscle: ex.secondary_muscle || seed?.secondary_muscle || null,
        equipment_type: ex.equipment_type || seed?.equipment_type || null,
      };
    });
  }, [wo.sortedExercises, wo.workout]);

  // Live totals
  const totals = useMemo(() => {
    let totalSets = 0;
    let volume = 0;
    const byGroup: Record<string, number> = {};
    for (const ex of renderRows) {
      const group = topLevelGroup(ex.primary_muscle);
      for (const s of ex.sets) {
        if (s.set_type === 'warmup') continue;
        if (hasWeightAndReps(s)) {
          totalSets += 1;
          volume += Number(s.weight_kg) * Number(s.reps);
          if (group) byGroup[group] = (byGroup[group] || 0) + 1;
        }
      }
    }
    const groupChips = Object.entries(byGroup)
      .sort((a, b) => b[1] - a[1])
      .map(([group, n]) => ({ group, n }));
    return { totalSets, volume, groupChips };
  }, [renderRows]);

  const audit = useMemo(
    () =>
      buildFinishAudit({
        exercises: renderRows,
        elapsedSec: wo.elapsedSec,
        removedPlannedExercises: wo.workout?.removedPlannedExercises || [],
      }),
    [renderRows, wo.elapsedSec, wo.workout?.removedPlannedExercises],
  );

  const summaryPreview = useMemo(
    () =>
      buildWorkoutSummary({
        exercises: renderRows,
        elapsedSec: wo.elapsedSec,
        removedPlannedExercises: wo.workout?.removedPlannedExercises || [],
      }),
    [renderRows, wo.elapsedSec, wo.workout?.removedPlannedExercises],
  );

  if (!wo.workout) return null;

  function handleSetCompleted(set: WorkoutSet) {
    const selectedRest = set?._restExplicit ? set?.rest_seconds : null;
    const durationSec = Number(selectedRest ?? set?.planned_rest_seconds);
    if (Number.isFinite(durationSec) && durationSec > 0) {
      wo.startRestTimer(durationSec);
    }
  }

  function toggleResearchDetails() {
    setResearchDetailsVisible((visible) => {
      const next = !visible;
      if (!next) wo.dismissRestTimer();
      return next;
    });
  }

  async function handleFinish(meta: Record<string, any>) {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    const result: any = await wo.finishWorkout(meta, { keepLocal: true });
    setSaving(false);
    if (!result || result.ok === false) {
      setSaveError(result?.error || 'Could not save workout. Your workout is still open.');
      return;
    }
    setFinishOpen(false);
    const prsHit = (result.prsHit || []).map((pr: any) => ({
      ...pr,
      exercise_name: SEED_EXERCISES.find((e: any) => e.id === pr.exercise_id)?.name || pr.exercise_id,
    }));
    const savedSummary = buildWorkoutSummary({
      exercises: hydrateSavedExercises(result.workout?.sets || [], renderRows),
      elapsedSec: wo.elapsedSec,
      removedPlannedExercises: wo.workout?.removedPlannedExercises || [],
      workout: result.workout,
    });
    setCelebration({
      workoutId: result.workout?.id,
      prsHit,
      summary: savedSummary,
    });
  }

  function handleCelebrationDone() {
    setCelebration(null);
    wo.clearLocalWorkout();
  }

  function handleViewProgress() {
    setCelebration(null);
    wo.clearLocalWorkout();
    router.navigate('/progress');
  }

  function handleSaveTemplateFromSummary() {
    // Web: navigate(`/templates/new?workout=<id>`) — the builder opens a
    // draft pre-filled from the just-saved workout.
    const workoutId = celebration?.workoutId;
    if (!workoutId) return;
    setCelebration(null);
    wo.clearLocalWorkout();
    router.push(`/templates/builder/new?workout=${encodeURIComponent(String(workoutId))}` as any);
  }

  function handleSharePost() {
    const workoutId = celebration?.workoutId;
    if (!workoutId) return;
    setCelebration(null);
    wo.clearLocalWorkout();
    router.navigate({ pathname: '/community', params: { shareWorkout: String(workoutId) } });
  }

  function handleJumpToAuditItem(item: AuditItem) {
    setFinishOpen(false);
    const idx = renderRows.findIndex((ex) => ex.exerciseId === item?.exerciseId);
    if (idx === -1) return;
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: idx, viewPosition: 0.25, animated: true });
    }, 350);
  }

  async function handleDiscard() {
    await wo.discardWorkout();
  }

  function handleConfirmRemove() {
    if (!removeTarget) return;
    wo.removeExercise(removeTarget.index);
    setRemoveTarget(null);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header (web: sticky workout-log-header) */}
      <View
        style={{
          paddingTop: insets.top + 12,
          backgroundColor: 'rgba(8, 9, 10, 0.94)',
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          zIndex: 20,
        }}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <Pressable
              onPress={() => setDiscardOpen(true)}
              accessibilityLabel="Discard workout"
              style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMuted }}>Discard</Text>
            </Pressable>
            <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
              <Text style={{ fontFamily: monoFont, fontVariant: ['tabular-nums'], fontSize: 28, fontWeight: '900', color: colors.text }}>
                {formatElapsed(wo.elapsedSec)}
              </Text>
              <Text style={{ marginTop: 2, fontSize: 12, fontWeight: '600', color: colors.textMuted }}>
                <Text style={{ fontFamily: monoFont, fontVariant: ['tabular-nums'] }}>{totals.totalSets}</Text> sets
                <Text style={{ color: colors.inkSoft }}>{'  ·  '}</Text>
                <Text style={{ fontFamily: monoFont, fontVariant: ['tabular-nums'] }}>{Math.round(totals.volume)}</Text> kg
              </Text>
              <SaveStatus status={wo.syncStatus} error={wo.syncError} />
            </View>
            <Pressable
              onPress={() => {
                if (!finalized) {
                  setSaveError('');
                  setFinishOpen(true);
                }
              }}
              disabled={finalized}
              style={{
                minHeight: 44,
                borderRadius: 999,
                paddingHorizontal: 16,
                justifyContent: 'center',
                backgroundColor: colors.emerald,
                opacity: finalized ? 0.45 : 1,
              }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: colors.onEmerald }}>{finalized ? 'Saved' : 'Finish'}</Text>
            </Pressable>
          </View>
          <View
            style={{
              marginTop: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: 8,
            }}>
            <Text numberOfLines={1} style={{ flex: 1, minWidth: 0, fontSize: 12, color: colors.textMuted }}>
              {wo.workout.dayLabel ? `${wo.workout.dayLabel} day` : 'Active workout'}
            </Text>
            <Pressable
              onPress={toggleResearchDetails}
              accessibilityState={{ selected: researchDetailsVisible }}
              style={{
                minHeight: 44,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderRadius: 999,
                borderWidth: 1,
                paddingHorizontal: 12,
                borderColor: researchDetailsVisible ? colors.emerald : colors.border,
                backgroundColor: researchDetailsVisible ? colors.emerald : 'transparent',
              }}>
              <SlidersIcon size={16} color={researchDetailsVisible ? colors.onEmerald : colors.textMuted} />
              <Text style={{ fontSize: 12, fontWeight: '900', color: researchDetailsVisible ? colors.onEmerald : colors.textMuted }}>
                Advanced {researchDetailsVisible ? 'on' : 'off'}
              </Text>
            </Pressable>
          </View>
        </View>
        {totals.groupChips.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ borderTopWidth: 1, borderTopColor: colors.border }}
            contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingVertical: 8 }}>
            {totals.groupChips.map(({ group, n }) => (
              <View
                key={group}
                style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: muscleColor(group) }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#ffffff' }}>
                  {group} <Text style={{ fontFamily: monoFont, opacity: 0.8 }}>{n}</Text>
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={renderRows}
        keyExtractor={(ex) => ex.exerciseId}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 128 }}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => listRef.current?.scrollToIndex({ index, viewPosition: 0.25, animated: false }), 250);
        }}
        ListEmptyComponent={
          <Text style={{ paddingHorizontal: 16, paddingVertical: 40, textAlign: 'center', fontSize: 14, color: colors.textMuted }}>
            No exercises yet. Tap <Text style={{ color: colors.text }}>+ Add exercise</Text> below.
          </Text>
        }
        renderItem={({ item: ex }) => (
          <ExerciseCard
            exercise={ex}
            index={ex.originalIdx}
            prevSession={lastSession[ex.exerciseId] || null}
            pinnedValues={{ ...(wo.pinnedValues?._global || {}), ...(wo.pinnedValues?.[ex.exerciseId] || {}) }}
            onUpdateSet={wo.updateSet}
            onAddSet={wo.addSet}
            onRemoveSet={wo.removeSet}
            onPinField={wo.pinField}
            onUnpinField={wo.unpinField}
            onSetCompleted={handleSetCompleted}
            onRestTimerStart={wo.startRestTimer}
            onRequestRemove={(exercise, index) => setRemoveTarget({ exercise, index })}
            researchDetailsVisible={researchDetailsVisible}
          />
        )}
        ListFooterComponent={
          <Pressable
            onPress={() => setAddOpen(true)}
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              minHeight: 48,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text }}>+ Add exercise</Text>
          </Pressable>
        }
      />

      <AddExerciseSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onPick={(ex) => wo.addExercise(ex)}
        excludeIds={renderRows.map((e) => e.exerciseId)}
      />
      <RemoveExerciseSheet target={removeTarget} onClose={() => setRemoveTarget(null)} onRemove={handleConfirmRemove} />
      <FinishSheet
        open={finishOpen}
        onClose={() => {
          setSaveError('');
          setFinishOpen(false);
        }}
        onSave={handleFinish}
        saving={saving}
        error={saveError}
        audit={audit}
        summary={summaryPreview}
        onJumpToItem={handleJumpToAuditItem}
      />
      <ConfirmSheet
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          handleDiscard();
        }}
        title="Discard workout?"
        message="All logged sets will be lost. This cannot be undone."
        confirmLabel="Discard"
        danger
      />
      <CelebrationCard
        visible={!!celebration}
        prsHit={celebration?.prsHit || []}
        summary={celebration?.summary}
        onDone={handleCelebrationDone}
        onViewProgress={handleViewProgress}
        onSaveTemplate={handleSaveTemplateFromSummary}
        onSharePost={handleSharePost}
      />
    </View>
  );
}

function RemoveExerciseSheet({
  target,
  onClose,
  onRemove,
}: {
  target: { exercise: WorkoutExercise; index: number } | null;
  onClose: () => void;
  onRemove: () => void;
}) {
  const exercise = target?.exercise;
  const loggedSets = exercise?.sets?.filter(isLoggedSet).length || 0;
  const planned = !!exercise?.plannedExerciseId;
  return (
    <Sheet open={!!target} onClose={onClose} title="Delete exercise" scrollable={false}>
      <View style={{ padding: 16, gap: 16, paddingBottom: 24 }}>
        <View>
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>{exercise?.exerciseName || 'Exercise'}</Text>
          <Text style={{ marginTop: 4, fontSize: 14, color: colors.textMuted }}>
            {loggedSets > 0
              ? `Deleting this exercise removes ${loggedSets} logged set${loggedSets === 1 ? '' : 's'} from the active workout.`
              : 'This deletes the exercise from the active workout.'}
          </Text>
          {planned && (
            <View
              style={{
                marginTop: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(245, 158, 11, 0.3)',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}>
              <Text style={{ fontSize: 14, color: '#fde9c8' }}>
                This came from a template or program. The original plan will not be changed.
              </Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={onClose}
            style={{
              flex: 1,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.borderStrong,
              backgroundColor: colors.surfaceAlt,
              paddingVertical: 12,
              alignItems: 'center',
            }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMuted }}>Keep</Text>
          </Pressable>
          <Pressable
            onPress={onRemove}
            style={{ flex: 1, borderRadius: 12, backgroundColor: '#dc2626', paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#ffffff' }}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </Sheet>
  );
}

function SaveStatus({ status, error }: { status: string; error: string }) {
  if (status === 'idle') return null;
  const saving = status === 'saving';
  const saved = status === 'saved';
  const label = saving ? 'Saving...' : saved ? 'Saved' : 'Not saved - autosave failed';
  const color = saving ? '#fcd34d' : saved ? '#6ee7b7' : '#fca5a5';
  return (
    <View style={{ marginTop: 4, maxWidth: 176, alignItems: 'center' }}>
      <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '600', color }}>
        {label}
      </Text>
      {error && status === 'error' ? (
        <Text numberOfLines={1} style={{ fontSize: 10, color: '#fecaca' }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
