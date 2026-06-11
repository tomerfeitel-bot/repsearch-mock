// Port of src/components/study/ExerciseLibrary.jsx, per decision D7 WITHOUT
// the 3D muscle model (web's MuscleModel.jsx / R3F is not ported): search +
// the 14 muscle-group accordions + per-exercise video links.
import { useMemo, useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import {
  EXERCISE_VIDEO_LINKS,
  MODEL_GROUP_MUSCLES,
  MUSCLE_DESCRIPTIONS,
  SEED_EXERCISES,
} from '@/lib/exercises';
import {
  STUDY_ACCENT,
  STUDY_ACCENT_FAINT,
  STUDY_BG,
  STUDY_BORDER,
  STUDY_BORDER_STRONG,
  STUDY_CARD,
  STUDY_MUTED,
  STUDY_TEXT,
} from '@/lib/researchTheme';
import { monoFont } from '@/lib/theme';

// The 14 model groups, in display order, paired with the catalog exercises
// each one covers (via MODEL_GROUP_MUSCLES → primary_muscle).
const GROUP_ORDER = Object.keys(MODEL_GROUP_MUSCLES);

function platformLabel(url: string) {
  const value = String(url || '').toLowerCase();
  if (value.includes('youtube.com') || value.includes('youtu.be')) return 'YouTube';
  if (value.includes('instagram.com')) return 'Instagram';
  if (value.includes('tiktok.com')) return 'TikTok';
  return 'Video';
}

function matchesExercise(exercise: any, query: string) {
  if (!query) return true;
  return [
    exercise.name,
    exercise.primary_muscle,
    exercise.secondary_muscle,
    exercise.equipment_type,
    exercise.movement_pattern,
  ].some((value) => String(value || '').toLowerCase().includes(query));
}

export default function ExerciseLibrary() {
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());

  const allGroups = useMemo(() => {
    const byMuscle = new Map<string, any[]>();
    SEED_EXERCISES.forEach((exercise: any) => {
      const m = exercise.primary_muscle;
      if (!m) return;
      if (!byMuscle.has(m)) byMuscle.set(m, []);
      byMuscle.get(m)!.push(exercise);
    });
    return GROUP_ORDER.map((group) => {
      const exercises = ((MODEL_GROUP_MUSCLES as Record<string, string[]>)[group] || [])
        .flatMap((muscle) => byMuscle.get(muscle) || [])
        .sort((a, b) => a.name.localeCompare(b.name));
      return { group, exercises };
    });
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const groups = useMemo(() => {
    return allGroups
      .map(({ group, exercises }) => ({
        group,
        exercises: exercises.filter((ex) => matchesExercise(ex, normalizedQuery)),
      }))
      // While searching, hide groups with no matching exercise.
      .filter(({ exercises }) => !normalizedQuery || exercises.length > 0);
  }, [allGroups, normalizedQuery]);

  const visibleCount = groups.reduce((sum, g) => sum + g.exercises.length, 0);
  const searching = normalizedQuery.length > 0;

  function toggleGroup(group: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', lineHeight: 22, color: STUDY_TEXT }}>Exercise Library</Text>
          <View style={{ flexShrink: 0, alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', fontFamily: monoFont, lineHeight: 19, color: STUDY_ACCENT }}>
              {visibleCount}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 11, color: STUDY_MUTED }}>of {SEED_EXERCISES.length}</Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 48,
            paddingHorizontal: 12,
            backgroundColor: STUDY_CARD,
            borderWidth: 1,
            borderColor: STUDY_BORDER_STRONG,
            borderRadius: 12,
          }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search exercises, muscles, equipment"
            placeholderTextColor={STUDY_MUTED}
            style={{ flex: 1, minWidth: 0, paddingVertical: 12, fontSize: 14, color: STUDY_TEXT }}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear exercise search">
              <Text style={{ fontSize: 16, color: STUDY_MUTED }}>×</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {groups.length === 0 ? (
        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: STUDY_BORDER, paddingVertical: 32 }}>
          <Text style={{ textAlign: 'center', fontSize: 14, color: STUDY_MUTED }}>No exercises match this filter.</Text>
        </View>
      ) : (
        <View style={{ overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: STUDY_BORDER_STRONG }}>
          {groups.map(({ group, exercises }, index) => (
            <GroupAccordion
              key={group}
              group={group}
              exercises={exercises}
              // When searching, force matching groups open so results show.
              open={searching || openGroups.has(group)}
              onToggle={() => toggleGroup(group)}
              first={index === 0}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function GroupAccordion({
  group,
  exercises,
  open,
  onToggle,
  first,
}: {
  group: string;
  exercises: any[];
  open: boolean;
  onToggle: () => void;
  first: boolean;
}) {
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: STUDY_BORDER_STRONG }}>
      <Pressable
        onPress={onToggle}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 16,
          backgroundColor: open ? STUDY_ACCENT_FAINT : pressed ? 'rgba(255,255,255,0.03)' : 'transparent',
        })}>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', lineHeight: 19, color: STUDY_TEXT }}>{group}</Text>
        <Text style={{ flexShrink: 0, fontFamily: monoFont, fontSize: 12, color: STUDY_ACCENT }}>{exercises.length}</Text>
        <Text style={{ flexShrink: 0, fontSize: 14, color: STUDY_MUTED, transform: [{ rotate: open ? '90deg' : '0deg' }] }}>›</Text>
      </Pressable>

      {open && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <Text style={{ fontSize: 14, lineHeight: 21, color: STUDY_MUTED }}>
            {(MUSCLE_DESCRIPTIONS as Record<string, string>)[group] ||
              'This muscle group is used as a primary training target across the exercise catalog.'}
          </Text>
          {exercises.length > 0 ? (
            <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: STUDY_BORDER }}>
              {exercises.map((exercise, i) => (
                <ExerciseRow key={exercise.id} exercise={exercise} first={i === 0} />
              ))}
            </View>
          ) : (
            <Text style={{ marginTop: 12, fontSize: 14, color: STUDY_MUTED }}>No exercises catalogued for this group yet.</Text>
          )}
        </View>
      )}
    </View>
  );
}

function ExerciseRow({ exercise, first }: { exercise: any; first: boolean }) {
  const link = (EXERCISE_VIDEO_LINKS as Record<string, any>)[exercise.id]?.videoUrl || '';
  const meta = [
    exercise.primary_muscle,
    exercise.equipment_type,
    exercise.movement_pattern,
    exercise.secondary_muscle ? `Secondary: ${exercise.secondary_muscle}` : null,
  ].filter(Boolean);

  return (
    <View
      style={{
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: STUDY_BORDER,
      }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: STUDY_TEXT }}>
          {exercise.name}
        </Text>
        <Text numberOfLines={1} style={{ marginTop: 4, fontSize: 12, lineHeight: 16, color: STUDY_MUTED }}>
          {meta.join(' / ')}
        </Text>
      </View>
      {link ? (
        <Pressable
          onPress={() => Linking.openURL(link).catch(() => {})}
          style={{
            flexShrink: 0,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: STUDY_ACCENT_FAINT,
            borderWidth: 1,
            borderColor: STUDY_ACCENT,
          }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: STUDY_TEXT }}>{platformLabel(link)}</Text>
        </Pressable>
      ) : (
        <View
          style={{
            flexShrink: 0,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: STUDY_BG,
            borderWidth: 1,
            borderColor: STUDY_BORDER,
          }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: STUDY_MUTED }}>Video pending</Text>
        </View>
      )}
    </View>
  );
}
