import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import AddExerciseSheet from '@/components/workout/AddExerciseSheet';
import ExerciseCard from '@/components/workout/ExerciseCard';
import { api } from '@/lib/api';
import { SEED_EXERCISES } from '@/lib/exercises';
import { muscleColor, topLevelGroup } from '@/lib/musclePalette';
import { nanoid } from '@/lib/nanoid';
import { internalPath } from '@/lib/navParams';
import { TEMPLATE_RESEARCH_FIELDS, hasResearchValue } from '@/lib/researchFields';
import { colors, monoFont } from '@/lib/theme';
import type { WorkoutExercise } from '@/lib/workoutSummary';

// Port of src/pages/TemplateBuilder.jsx as a full-screen push (decision D3).
// `/templates/builder/new` plays the web's `/templates/new` role: it creates a
// draft (optionally seeded ?workout=<id>) and replaces itself with the real id.
// The web's gray/indigo builder styling is mapped onto the app token theme.
const STRICTNESS = [
  { v: 'written', label: 'Run as written' },
  { v: 'adapt', label: 'Adapt as needed' },
  { v: 'inspiration', label: 'Use as inspiration' },
];

const exerciseById = new Map<string, any>(SEED_EXERCISES.map((e: any) => [e.id, e]));

type TemplateMeta = {
  id: string;
  name: string;
  description: string;
  visibility: string;
  strictness: string;
  workout_day: string;
  workout_split_type: string;
  status: string;
};

function withParam(path: string, key: string, value: string) {
  return `${path}${path.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(value)}`;
}

export default function TemplateBuilderScreen() {
  const { id: idParam, workout: workoutId, returnTo: returnToParam } = useLocalSearchParams<{
    id: string;
    workout?: string;
    returnTo?: string;
  }>();
  const id = idParam === 'new' ? '' : idParam;
  const returnTo = internalPath(returnToParam);
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [template, setTemplate] = useState<TemplateMeta | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pinnedValues, setPinnedValues] = useState<Record<string, any>>({});
  const [removeTarget, setRemoveTarget] = useState<{ exercise: WorkoutExercise; index: number } | null>(null);
  const createPromiseRef = useRef<Promise<any> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const templateRef = useRef<TemplateMeta | null>(null);
  const exercisesRef = useRef<WorkoutExercise[]>([]);

  useEffect(() => {
    templateRef.current = template;
  }, [template]);

  useEffect(() => {
    exercisesRef.current = exercises;
  }, [exercises]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (id) {
          const data = await api.get(`/templates/${encodeURIComponent(id)}`);
          if (cancelled) return;
          hydrate(data.template);
          return;
        }
        if (!createPromiseRef.current) {
          createPromiseRef.current = workoutId
            ? api.post(`/templates/drafts/from-workout/${encodeURIComponent(workoutId)}`, {})
            : api.post('/templates/drafts', {});
        }
        const data = await createPromiseRef.current;
        if (cancelled) return;
        hydrate(data.template);
        const builderUrl = returnTo
          ? `/templates/builder/${data.template.id}?returnTo=${encodeURIComponent(returnTo)}`
          : `/templates/builder/${data.template.id}`;
        router.replace(builderUrl as any);
      } catch (err: any) {
        toast?.(err.message || 'Failed to open template builder', 'error');
        router.back();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, workoutId]);

  const totals = useMemo(() => {
    let setCount = 0;
    const byGroup: Record<string, number> = {};
    for (const ex of exercises) {
      setCount += ex.sets.length;
      const group = topLevelGroup(ex.primary_muscle);
      if (group) byGroup[group] = (byGroup[group] || 0) + ex.sets.length;
    }
    return {
      setCount,
      groups: Object.entries(byGroup)
        .map(([group, n]) => ({ group, n }))
        .sort((a, b) => b.n - a.n),
    };
  }, [exercises]);

  function hydrate(t: any) {
    setTemplate({
      id: t.id,
      name: t.name || 'Untitled template',
      description: t.description || '',
      visibility: t.visibility || 'private',
      strictness: t.strictness || 'adapt',
      workout_day: t.workout_day || '',
      workout_split_type: t.workout_split_type || '',
      status: t.status || 'draft',
    });
    setExercises(
      (t.exercises || []).map((ex: any, originalIdx: number) => {
        const seed = exerciseById.get(ex.exercise_id);
        return {
          exerciseId: ex.exercise_id,
          exerciseName: seed?.name || ex.exercise_id,
          primary_muscle: seed?.primary_muscle || null,
          equipment_type: seed?.equipment_type || null,
          originalIdx,
          sets: (ex.sets || []).map((s: any) => ({
            id: s.id || nanoid(),
            set_type: s.set_type || 'working',
            weight_kg: s.target_weight_kg ?? null,
            reps: s.target_reps ?? '',
            rir: s.target_rir ?? null,
            target_rep_range: s.target_rep_range ?? '',
            rom_category: s.rom_category ?? null,
            tempo_tag: s.tempo_tag ?? null,
            rest_seconds: s.rest_seconds ?? null,
            failure: !!s.failure,
            client_ts: Date.now(),
            done: false,
          })),
        };
      }),
    );
  }

  function scheduleDraftSave(
    nextTemplate: TemplateMeta | null = templateRef.current,
    nextExercises: WorkoutExercise[] = exercisesRef.current,
  ) {
    if (!nextTemplate?.id) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      api.patch(`/templates/${nextTemplate.id}`, payload(nextTemplate, nextExercises, 'draft')).catch(() => {});
    }, 900);
  }

  function updateTemplate(patch: Partial<TemplateMeta>) {
    setTemplate((prev) => {
      const next = { ...(prev as TemplateMeta), ...patch };
      scheduleDraftSave(next, exercisesRef.current);
      return next;
    });
  }

  function updateExercises(fn: (prev: WorkoutExercise[]) => WorkoutExercise[]) {
    setExercises((prev) => {
      const next = fn(prev).map((ex, i) => ({ ...ex, originalIdx: i }));
      scheduleDraftSave(templateRef.current, next);
      return next;
    });
  }

  function addExercise(ex: any) {
    updateExercises((prev) => {
      if (prev.some((row) => row.exerciseId === ex.id)) return prev;
      return [
        ...prev,
        {
          exerciseId: ex.id,
          exerciseName: ex.name,
          primary_muscle: ex.primary_muscle,
          equipment_type: ex.equipment_type,
          sets: [freshPlanningSet()],
        },
      ];
    });
  }

  function removeExercise(index: number) {
    updateExercises((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSet(exerciseIdx: number, setIdx: number, patch: Record<string, any>) {
    updateExercises((prev) =>
      prev.map((ex, i) =>
        i !== exerciseIdx
          ? ex
          : { ...ex, sets: ex.sets.map((s, j) => (j !== setIdx ? s : { ...s, ...patch })) },
      ),
    );
  }

  function addSet(exerciseIdx: number, overrides: Record<string, any> = {}) {
    updateExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exerciseIdx) return ex;
        const last = ex.sets[ex.sets.length - 1] || {};
        return {
          ...ex,
          sets: [
            ...ex.sets,
            freshPlanningSet({
              set_type: last.set_type || 'working',
              weight_kg: last.weight_kg ?? null,
              reps: last.reps ?? '',
              ...pinnedValues,
              _pinnedFields: Object.keys(pinnedValues),
              _unpinnedFields: [],
              ...overrides,
            }),
          ],
        };
      }),
    );
  }

  function removeSet(exerciseIdx: number, setIdx: number) {
    updateExercises((prev) =>
      prev.map((ex, i) => (i !== exerciseIdx ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) })),
    );
  }

  function pinField(_exerciseIdx: number, field: string, value: any) {
    setPinnedValues((prev) => ({ ...prev, [field]: value }));
  }

  function unpinField(_exerciseIdx: number, field: string) {
    setPinnedValues((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function close() {
    // Web Close navigates to returnTo (default /profile). navigate() pops back
    // to the originating screen when it is already in the stack (program
    // builder, community composer) instead of stacking a duplicate.
    if (returnTo) router.navigate(returnTo as any);
    else if (router.canGoBack()) router.back();
    else router.replace('/profile');
  }

  async function finalize() {
    if (!template?.name?.trim()) {
      toast?.('Template name required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      await api.patch(`/templates/${template.id}`, payload(template, exercises, 'final'));
      toast?.('Template saved', 'success');
      // navigate (not replace): pops back to the waiting program builder /
      // community screen and delivers createdTemplate as updated params.
      const dest = withParam(returnTo || '/profile', 'createdTemplate', template.id);
      router.navigate(dest as any);
    } catch (err: any) {
      toast?.(err.message || 'Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !template) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 14, color: colors.textMuted }}>Opening template builder...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Sticky header: Close | name + counts | Save (web: sticky top bar) */}
      <View style={{ paddingTop: insets.top + 8, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 8 }}>
          <Pressable onPress={close} hitSlop={8} style={{ minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>Close</Text>
          </Pressable>
          <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
            <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>
              {template.name || 'Untitled template'}
            </Text>
            <Text style={{ marginTop: 2, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: colors.textMuted }}>
              <Text style={{ fontFamily: monoFont }}>{exercises.length}</Text> exercises -{' '}
              <Text style={{ fontFamily: monoFont }}>{totals.setCount}</Text> sets
            </Text>
          </View>
          <Pressable
            onPress={() => setSaveOpen(true)}
            style={{
              minHeight: 40,
              paddingHorizontal: 14,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.accent,
            }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accentInk }}>Save</Text>
          </Pressable>
        </View>
        {totals.groups.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingBottom: 8 }}>
            {totals.groups.map(({ group, n }) => (
              <View
                key={group}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: muscleColor(group),
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: muscleColor(group) }}>
                  {group} <Text style={{ fontFamily: monoFont, opacity: 0.8 }}>{n}</Text>
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <FlatList
        data={exercises}
        keyExtractor={(ex) => ex.exerciseId}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 112 }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
            <BuilderMeta template={template} onChange={updateTemplate} />
            {exercises.length === 0 && (
              <Text style={{ paddingVertical: 40, textAlign: 'center', fontSize: 14, color: colors.textMuted }}>
                No exercises yet. Tap <Text style={{ color: colors.accentInk }}>+ Add exercise</Text> below.
              </Text>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <ExerciseCard
            exercise={{ ...item, originalIdx: index }}
            index={index}
            prevSession={null}
            pinnedValues={pinnedValues}
            onUpdateSet={updateSet}
            onAddSet={addSet}
            onRemoveSet={removeSet}
            onPinField={pinField}
            onUnpinField={unpinField}
            onRequestRemove={(exercise, index2) => setRemoveTarget({ exercise, index: index2 })}
            planning
            researchFields={TEMPLATE_RESEARCH_FIELDS}
          />
        )}
        ListFooterComponent={
          <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
            <Pressable
              onPress={() => setAddOpen(true)}
              style={{
                minHeight: 52,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.accent,
                backgroundColor: colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accentInk }}>+ Add exercise</Text>
            </Pressable>
          </View>
        }
      />

      <AddExerciseSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onPick={addExercise}
        excludeIds={exercises.map((e) => e.exerciseId)}
      />
      <SaveTemplateSheet
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        template={template}
        onChange={updateTemplate}
        onSave={finalize}
        saving={saving}
      />
      <ConfirmSheet
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) removeExercise(removeTarget.index);
          setRemoveTarget(null);
        }}
        title="Remove exercise?"
        message={`"${removeTarget?.exercise?.exerciseName}" and its planned sets will be removed from this template.`}
        confirmLabel="Remove"
        danger
      />
    </View>
  );
}

function BuilderMeta({ template, onChange }: { template: TemplateMeta; onChange: (patch: Partial<TemplateMeta>) => void }) {
  return (
    <View style={{ marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 12, gap: 10 }}>
      <TextInput
        value={template.name}
        onChangeText={(v) => onChange({ name: v })}
        placeholder="Template name"
        placeholderTextColor={colors.inkSoft}
        style={[INPUT_STYLE, { fontWeight: '700' }]}
      />
      <TextInput
        value={template.description}
        onChangeText={(v) => onChange({ description: v })}
        placeholder="Short note: who this is for, how to run it"
        placeholderTextColor={colors.inkSoft}
        style={INPUT_STYLE}
      />
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {STRICTNESS.map((s) => {
          const active = template.strictness === s.v;
          return (
            <Pressable
              key={s.v}
              onPress={() => onChange({ strictness: s.v })}
              style={{
                flex: 1,
                minHeight: 40,
                borderRadius: 10,
                borderWidth: 1,
                paddingHorizontal: 4,
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: active ? colors.accent : colors.border,
                backgroundColor: active ? colors.accent : colors.surfaceAlt,
              }}>
              <Text style={{ fontSize: 11, fontWeight: '600', textAlign: 'center', color: active ? colors.accentInk : colors.textMuted }}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SaveTemplateSheet({
  open,
  onClose,
  template,
  onChange,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  template: TemplateMeta;
  onChange: (patch: Partial<TemplateMeta>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Save template">
      <View style={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <View style={{ gap: 8 }}>
          <Text style={SECTION_LABEL}>Name</Text>
          <TextInput
            value={template.name}
            onChangeText={(v) => onChange({ name: v })}
            placeholderTextColor={colors.inkSoft}
            style={INPUT_STYLE}
          />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={SECTION_LABEL}>Visibility</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['private', 'public'].map((v) => {
              const active = template.visibility === v;
              return (
                <Pressable
                  key={v}
                  onPress={() => onChange({ visibility: v })}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    borderRadius: 12,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderColor: active ? colors.accent : colors.border,
                    backgroundColor: active ? colors.accent : colors.surfaceAlt,
                  }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      textTransform: 'capitalize',
                      color: active ? colors.accentInk : colors.textMuted,
                    }}>
                    {v}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Pressable
          onPress={onSave}
          disabled={saving || !template.name.trim()}
          style={{
            minHeight: 52,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.accent,
            opacity: saving || !template.name.trim() ? 0.5 : 1,
          }}>
          <Text style={{ fontWeight: '600', color: colors.accentInk }}>{saving ? 'Saving...' : 'Save template'}</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

function freshPlanningSet(overrides: Record<string, any> = {}) {
  return {
    id: nanoid(),
    set_type: 'working',
    weight_kg: null,
    reps: '',
    rir: null,
    target_rep_range: '',
    failure: false,
    client_ts: Date.now(),
    done: false,
    ...overrides,
  };
}

function payload(template: TemplateMeta, exercises: WorkoutExercise[], status: 'draft' | 'final') {
  return {
    name: template.name || 'Untitled template',
    description: template.description || '',
    visibility: status === 'draft' ? 'private' : template.visibility,
    status,
    strictness: template.strictness || 'adapt',
    workout_day: template.workout_day || null,
    workout_split_type: template.workout_split_type || null,
    exercises: exercises.map((ex) => ({
      exercise_id: ex.exerciseId,
      sets: ex.sets.map((s: any) => ({
        target_reps: s.reps == null ? '' : String(s.reps),
        target_weight_kg: s.weight_kg ?? null,
        target_rir: s.rir ?? null,
        target_rep_range: s.target_rep_range || null,
        set_type: s.set_type || 'working',
        rom_category: s.rom_category || null,
        tempo_tag: s.tempo_tag || null,
        rest_seconds: hasResearchValue(s.rest_seconds) ? Number(s.rest_seconds) : null,
        failure: !!s.failure,
      })),
    })),
  };
}

const INPUT_STYLE = {
  minHeight: 44,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surfaceAlt,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  color: colors.text,
};

const SECTION_LABEL = {
  fontSize: 10,
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8,
  color: colors.inkSoft,
};
