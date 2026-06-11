import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { PickerSheet } from '@/components/ui/PickerSheet';
import { Sheet } from '@/components/ui/Sheet';
import { api } from '@/lib/api';
import { SEED_EXERCISES } from '@/lib/exercises';
import { muscleColor } from '@/lib/musclePalette';
import { colors, monoFont } from '@/lib/theme';

// Port of src/components/workout/AddExerciseSheet.jsx: search is debounced
// (200ms) per the migration plan, the list is a FlatList, and the web's
// <select> filters become PickerSheets (D4).
const MUSCLE_OPTIONS = [...new Set(SEED_EXERCISES.map((e: any) => e.primary_muscle).filter(Boolean))].sort() as string[];
const EQUIPMENT_OPTIONS = [...new Set(SEED_EXERCISES.map((e: any) => e.equipment_type).filter(Boolean))].sort() as string[];
const MOVEMENT_OPTIONS = [...new Set(SEED_EXERCISES.map((e: any) => e.movement_pattern).filter(Boolean))].sort() as string[];
const RECENT_LIMIT = 24;

function searchableText(exercise: any) {
  return [
    exercise.name,
    exercise.id,
    exercise.id?.replace(/[_-]/g, ' '),
    exercise.primary_muscle,
    exercise.secondary_muscle,
    exercise.equipment_type,
    exercise.movement_pattern,
    exercise.force_vector,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function normalizeExercise(exercise: any, source = 'seed') {
  return {
    ...exercise,
    id: exercise.id || exercise.exerciseId,
    name: exercise.name || exercise.exerciseName,
    source,
  };
}

function historyStats(workouts: any[] = []) {
  const stats = new Map<string, { count: number; lastDate: string; lastTs: number }>();
  for (const workout of workouts) {
    const seenInWorkout = new Set<string>();
    for (const set of workout.sets || []) {
      if (!set.exercise_id) continue;
      const current = stats.get(set.exercise_id) || {
        count: 0,
        lastDate: workout.date || workout.created_at || '',
        lastTs: 0,
      };
      current.count += 1;
      const ts = Date.parse(workout.date || workout.created_at || '') || 0;
      if (ts >= current.lastTs && !seenInWorkout.has(set.exercise_id)) {
        current.lastDate = workout.date || workout.created_at || current.lastDate;
        current.lastTs = ts;
      }
      seenInWorkout.add(set.exercise_id);
      stats.set(set.exercise_id, current);
    }
  }
  return stats;
}

export default function AddExerciseSheet({
  open,
  onClose,
  onPick,
  excludeIds = [],
}: {
  open: boolean;
  onClose: () => void;
  onPick: (exercise: any) => void;
  excludeIds?: string[];
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [musclePickerOpen, setMusclePickerOpen] = useState(false);
  const [equipmentPickerOpen, setEquipmentPickerOpen] = useState(false);
  const [customExercises, setCustomExercises] = useState<any[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [customError, setCustomError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState({
    name: '',
    primary_muscle: '',
    secondary_muscle: '',
    movement_pattern: MOVEMENT_OPTIONS.includes('Isolation') ? 'Isolation' : MOVEMENT_OPTIONS[0] || '',
    equipment_type: 'Machine',
  });
  const [formMusclePicker, setFormMusclePicker] = useState(false);
  const [formEquipmentPicker, setFormEquipmentPicker] = useState(false);
  const [formMovementPicker, setFormMovementPicker] = useState(false);
  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setDataLoading(true);
    setCustomError('');
    setHistoryError('');
    Promise.all([
      api
        .get('/custom-exercises')
        .then((data) => {
          if (!cancelled) setCustomExercises(data.exercises || []);
        })
        .catch((err) => {
          if (!cancelled) setCustomError(err.message || 'Could not load custom exercises.');
        }),
      api
        .get('/workouts?limit=100')
        .then((data) => {
          if (!cancelled) setWorkoutHistory(data.workouts || []);
        })
        .catch((err) => {
          if (!cancelled) setHistoryError(err.message || 'Could not load exercise history.');
        }),
    ]).finally(() => {
      if (!cancelled) setDataLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const stats = useMemo(() => historyStats(workoutHistory), [workoutHistory]);
  const recentIds = useMemo(
    () =>
      [...stats.entries()]
        .sort((a, b) => (b[1].lastTs || 0) - (a[1].lastTs || 0))
        .slice(0, RECENT_LIMIT)
        .map(([id]) => id),
    [stats],
  );

  const exercises = useMemo(
    () => [
      ...SEED_EXERCISES.map((e: any) => normalizeExercise(e, 'seed')),
      ...customExercises.map((e) => normalizeExercise(e, 'custom')),
    ],
    [customExercises],
  );

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    const recentSet = new Set(recentIds);
    return exercises
      .filter((e) => !excludeSet.has(e.id))
      .filter((e) => !muscle || e.primary_muscle === muscle)
      .filter((e) => !equipment || e.equipment_type === equipment)
      .filter((e) => {
        if (filter === 'recent') return recentSet.has(e.id);
        if (filter === 'frequent') return (stats.get(e.id)?.count || 0) > 0;
        return true;
      })
      .filter((e) => !tokens.length || tokens.every((token) => searchableText(e).includes(token)))
      .sort((a, b) => {
        if (filter === 'frequent') return (stats.get(b.id)?.count || 0) - (stats.get(a.id)?.count || 0);
        if (filter === 'recent') return (stats.get(b.id)?.lastTs || 0) - (stats.get(a.id)?.lastTs || 0);
        const customDelta = Number(b.source === 'custom') - Number(a.source === 'custom');
        if (customDelta) return customDelta;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 100);
  }, [equipment, exercises, excludeSet, filter, muscle, debouncedQuery, recentIds, stats]);

  function pick(exercise: any) {
    onPick(exercise);
    onClose();
    setQuery('');
    setCreateOpen(false);
  }

  async function createCustomExercise() {
    if (creating) return;
    if (!form.name.trim() || !form.primary_muscle) {
      setCreateError('Name and primary muscle are required.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const data = await api.post('/custom-exercises', form);
      const exercise = normalizeExercise(data.exercise, 'custom');
      setCustomExercises((prev) => [...prev, exercise]);
      pick(exercise);
    } catch (err: any) {
      setCreateError(err.message || 'Could not create exercise');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add exercise" scrollable={false}>
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, alias, muscle, equipment"
            placeholderTextColor={colors.inkSoft}
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.bg,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 15,
              color: colors.text,
            }}
          />
          <Pressable
            onPress={() => setCreateOpen((v) => !v)}
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: createOpen ? colors.accent : colors.border,
              backgroundColor: createOpen ? colors.accent : colors.surfaceAlt,
              paddingHorizontal: 14,
              justifyContent: 'center',
            }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: createOpen ? colors.accentInk : colors.text }}>New</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <FilterChip active={filter === 'all'} onPress={() => setFilter('all')}>
            All
          </FilterChip>
          <FilterChip active={filter === 'recent'} onPress={() => setFilter('recent')}>
            Recent
          </FilterChip>
          <FilterChip active={filter === 'frequent'} onPress={() => setFilter('frequent')}>
            Frequent
          </FilterChip>
          <FilterChip active={!!muscle} onPress={() => setMusclePickerOpen(true)}>
            {muscle || 'Any muscle'}
          </FilterChip>
          <FilterChip active={!!equipment} onPress={() => setEquipmentPickerOpen(true)}>
            {equipment || 'Any equipment'}
          </FilterChip>
        </ScrollView>

        {(customError || historyError) && (
          <View
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: 'rgba(245, 158, 11, 0.3)',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}>
            <Text style={{ fontSize: 12, color: '#fde9c8' }}>{[customError, historyError].filter(Boolean).join(' ')}</Text>
          </View>
        )}

        {createOpen && (
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, padding: 12, gap: 8 }}>
            <TextInput
              value={form.name}
              onChangeText={(text) => setForm((f) => ({ ...f, name: text }))}
              placeholder="Custom exercise name"
              placeholderTextColor={colors.inkSoft}
              style={FORM_INPUT}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <FormPickerButton
                placeholder="Primary muscle *"
                value={form.primary_muscle}
                onPress={() => setFormMusclePicker(true)}
              />
              <FormPickerButton value={form.equipment_type} onPress={() => setFormEquipmentPicker(true)} />
              <FormPickerButton value={form.movement_pattern} onPress={() => setFormMovementPicker(true)} />
              <TextInput
                value={form.secondary_muscle}
                onChangeText={(text) => setForm((f) => ({ ...f, secondary_muscle: text }))}
                placeholder="Secondary"
                placeholderTextColor={colors.inkSoft}
                style={[FORM_INPUT, { width: '48%', flexGrow: 1 }]}
              />
            </View>
            {createError ? <Text style={{ fontSize: 12, fontWeight: '600', color: '#fca5a5' }}>{createError}</Text> : null}
            <Pressable
              disabled={creating}
              onPress={createCustomExercise}
              style={{
                borderRadius: 14,
                backgroundColor: colors.accent,
                paddingVertical: 10,
                alignItems: 'center',
                opacity: creating ? 0.6 : 1,
              }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accentInk }}>
                {creating ? 'Creating...' : 'Create and add'}
              </Text>
            </Pressable>
            <PickerSheet
              open={formMusclePicker}
              onClose={() => setFormMusclePicker(false)}
              title="Primary muscle"
              value={form.primary_muscle}
              options={MUSCLE_OPTIONS.map((option) => ({ value: option, label: option }))}
              onSelect={(v) => setForm((f) => ({ ...f, primary_muscle: String(v) }))}
            />
            <PickerSheet
              open={formEquipmentPicker}
              onClose={() => setFormEquipmentPicker(false)}
              title="Equipment"
              value={form.equipment_type}
              options={EQUIPMENT_OPTIONS.map((option) => ({ value: option, label: option }))}
              onSelect={(v) => setForm((f) => ({ ...f, equipment_type: String(v) }))}
            />
            <PickerSheet
              open={formMovementPicker}
              onClose={() => setFormMovementPicker(false)}
              title="Movement pattern"
              value={form.movement_pattern}
              options={MOVEMENT_OPTIONS.map((option) => ({ value: option, label: option }))}
              onSelect={(v) => setForm((f) => ({ ...f, movement_pattern: String(v) }))}
            />
          </View>
        )}

        <FlatList
          data={filtered}
          keyExtractor={(ex) => ex.id}
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: 420, minHeight: 180 }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', fontSize: 14, color: colors.inkSoft, paddingVertical: 32 }}>
              {dataLoading
                ? 'Loading exercise data...'
                : (filter === 'recent' || filter === 'frequent') && historyError
                  ? 'Exercise history could not be loaded.'
                  : 'No exercises match.'}
            </Text>
          }
          renderItem={({ item: ex }) => (
            <Pressable
              onPress={() => pick(ex)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 10 }}>
              <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: muscleColor(ex.primary_muscle) }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 15, fontWeight: '500', color: colors.text }}>
                    {ex.name}
                  </Text>
                  {ex.source === 'custom' && (
                    <View style={{ borderRadius: 999, backgroundColor: colors.azureSoft, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: colors.azureInk }}>Custom</Text>
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 12, color: colors.inkSoft }}>
                  {[ex.primary_muscle, ex.equipment_type, ex.movement_pattern].filter(Boolean).join(' - ')}
                </Text>
              </View>
              {(stats.get(ex.id)?.count || 0) > 0 && (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontFamily: monoFont, fontSize: 12, color: colors.textMuted }}>{stats.get(ex.id)!.count}</Text>
                  <Text style={{ fontSize: 10, color: colors.inkSoft }}>sets</Text>
                </View>
              )}
            </Pressable>
          )}
        />
      </View>

      <PickerSheet
        open={musclePickerOpen}
        onClose={() => setMusclePickerOpen(false)}
        title="Filter by muscle"
        value={muscle}
        options={MUSCLE_OPTIONS.map((option) => ({ value: option, label: option }))}
        onSelect={(v) => setMuscle(String(v))}
        onClear={() => setMuscle('')}
        clearLabel="Any muscle"
      />
      <PickerSheet
        open={equipmentPickerOpen}
        onClose={() => setEquipmentPickerOpen(false)}
        title="Filter by equipment"
        value={equipment}
        options={EQUIPMENT_OPTIONS.map((option) => ({ value: option, label: option }))}
        onSelect={(v) => setEquipment(String(v))}
        onClear={() => setEquipment('')}
        clearLabel="Any equipment"
      />
    </Sheet>
  );
}

const FORM_INPUT = {
  borderRadius: 10,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surface,
  paddingHorizontal: 12,
  paddingVertical: 8,
  fontSize: 14,
  color: colors.text,
};

function FormPickerButton({ value, placeholder, onPress }: { value: string; placeholder?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[FORM_INPUT, { width: '48%', flexGrow: 1, justifyContent: 'center' }]}>
      <Text style={{ fontSize: 14, color: value ? colors.text : colors.inkSoft }}>{value || placeholder || ''}</Text>
    </Pressable>
  );
}

function FilterChip({ active, onPress, children }: { active: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderColor: active ? colors.emerald : colors.border,
        backgroundColor: active ? colors.emeraldSoft : colors.bg,
      }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? colors.emeraldInk : colors.textMuted }}>{children}</Text>
    </Pressable>
  );
}
