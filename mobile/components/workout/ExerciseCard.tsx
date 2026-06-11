import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import SetRow, { RIR_OPTIONS } from './SetRow';
import { PickerSheet } from '@/components/ui/PickerSheet';
import { Sheet } from '@/components/ui/Sheet';
import { muscleColor } from '@/lib/musclePalette';
import {
  RESEARCH_FIELDS,
  formatRest,
  formatResearchValue,
  hasResearchValue,
  type ResearchField,
} from '@/lib/researchFields';
import { colors, monoFont } from '@/lib/theme';
import type { WorkoutExercise, WorkoutSet } from '@/lib/workoutSummary';

// Port of src/components/workout/ExerciseCard.jsx. The fixed-overlay
// PrecisionDrawer and SetActionSheet become RN Modal sheets; the RestWheel
// snap-drum becomes a stepper + PickerSheet (decision D4).
function hasValue(value: unknown) {
  return value !== null && value !== undefined && value !== '';
}

const PINNABLE_FIELD_KEYS = new Set(['rir', 'set_type', 'rom_category', 'tempo_tag', 'rest_seconds', 'failure', 'pain_flag']);

const ROW_PIN_FIELDS = new Set(['rir', 'rom_category', 'tempo_tag', 'rest_seconds', 'failure', 'pain_flag']);

export default function ExerciseCard({
  exercise,
  index,
  prevSession,
  pinnedValues = {},
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onPinField,
  onUnpinField,
  onRequestRemove,
  onSetCompleted,
  onRestTimerStart,
  planning = false,
  researchFields = RESEARCH_FIELDS,
  researchDetailsVisible = true,
}: {
  exercise: WorkoutExercise;
  index: number;
  prevSession?: WorkoutSet[] | null;
  pinnedValues?: Record<string, any>;
  onUpdateSet: (exerciseIdx: number, setIdx: number, patch: Record<string, any>) => void;
  onAddSet: (exerciseIdx: number, overrides?: Record<string, any>) => void;
  onRemoveSet: (exerciseIdx: number, setIdx: number) => void;
  onPinField?: (exerciseIdx: number, field: string, value: any) => void;
  onUnpinField?: (exerciseIdx: number, field: string) => void;
  onRequestRemove?: (exercise: WorkoutExercise, index: number) => void;
  onSetCompleted?: (set: WorkoutSet) => void;
  onRestTimerStart?: (durationSec: number) => void;
  planning?: boolean;
  researchFields?: ResearchField[];
  researchDetailsVisible?: boolean;
}) {
  const [expandedSet, setExpandedSet] = useState<number | null>(null);
  const [setActionIdx, setSetActionIdx] = useState<number | null>(null);
  const muscle = exercise.primary_muscle;
  const lastTop = prevSession?.length
    ? prevSession.reduce((best, s) => ((s.weight_kg ?? 0) > (best.weight_kg ?? 0) ? s : best), prevSession[0])
    : null;

  useEffect(() => {
    if (!researchDetailsVisible) setExpandedSet(null);
  }, [researchDetailsVisible]);

  const pinnedByIndex = useMemo(() => {
    const lastValueOf: Record<string, any> = {};
    return exercise.sets.map((s) => {
      const pills: { field: string; value: any }[] = [];
      for (const field of researchFields) {
        const key = field.key;
        if (!ROW_PIN_FIELDS.has(key)) continue;
        if (s._unpinnedFields?.includes(key)) {
          delete lastValueOf[key];
          continue;
        }
        if (hasResearchValue(s[key])) {
          lastValueOf[key] = s[key];
        }
        const isPinnedHere = s._pinnedFields?.includes(key) || key in pinnedValues;
        const value = hasResearchValue(s[key]) ? s[key] : lastValueOf[key];
        if (isPinnedHere && hasResearchValue(value)) pills.push({ field: key, value });
      }
      return pills;
    });
  }, [exercise.sets, pinnedValues, researchFields]);

  const setBadges = useMemo(() => {
    const counts = { working: 0, warmup: 0, backoff: 0 };
    return exercise.sets.map((s) => {
      const type = s.set_type === 'warmup' ? 'warmup' : s.set_type === 'backoff' ? 'backoff' : 'working';
      counts[type] += 1;
      if (type === 'warmup') return `W${counts.warmup}`;
      if (type === 'backoff') return `B${counts.backoff}`;
      return String(counts.working);
    });
  }, [exercise.sets]);

  function handleToggleDone(setIdx: number) {
    const s = exercise.sets[setIdx];
    const newDone = !s.done;
    const patch = { done: newDone };
    onUpdateSet(index, setIdx, patch);
    if (newDone) onSetCompleted?.({ ...s, ...patch });
  }

  function handleUsePrevious(setIdx: number) {
    const prev = prevSession?.[setIdx];
    if (!prev) return;
    onUpdateSet(index, setIdx, {
      weight_kg: prev.weight_kg ?? null,
      reps: prev.reps ?? null,
      rir: prev.rir ?? null,
    });
  }

  function setTemplateForNew(set: WorkoutSet, extra: Record<string, any> = {}, keepActuals = false) {
    return {
      weight_kg: keepActuals ? (set.weight_kg ?? null) : null,
      reps: keepActuals ? (set.reps ?? null) : null,
      rir: keepActuals ? (set.rir ?? null) : null,
      set_type: set.set_type || 'working',
      rom_category: set.rom_category ?? null,
      tempo_tag: set.tempo_tag ?? null,
      rest_seconds: set.rest_seconds ?? set.planned_rest_seconds ?? null,
      _restExplicit: keepActuals ? !!set._restExplicit : !!set._restExplicit || hasValue(set.planned_rest_seconds),
      failure: keepActuals ? !!set.failure : false,
      pain_flag: keepActuals ? !!set.pain_flag : false,
      set_notes: keepActuals ? (set.set_notes ?? null) : null,
      planned_weight_kg: set.weight_kg ?? set.planned_weight_kg ?? null,
      planned_reps: set.reps ?? set.planned_reps ?? null,
      planned_rir: set.rir ?? set.planned_rir ?? null,
      ...extra,
    };
  }

  function handleDuplicateSet(setIdx: number) {
    const set = exercise.sets[setIdx];
    onAddSet(index, setTemplateForNew(set, {}, true));
  }

  function handleCopyPreviousSet(setIdx: number) {
    const previous = exercise.sets[setIdx - 1];
    if (!previous) return;
    onUpdateSet(index, setIdx, setTemplateForNew(previous, {}, true));
  }

  function handleAddTypedSet(setIdx: number, setType: string) {
    const source = exercise.sets[setIdx] || exercise.sets[exercise.sets.length - 1] || {};
    onAddSet(index, setTemplateForNew(source, { set_type: setType }, false));
  }

  function handleAddSet() {
    const source = exercise.sets[exercise.sets.length - 1];
    onAddSet(index, source ? setTemplateForNew(source, {}, false) : undefined);
  }

  function handleResearchChange(setIdx: number, key: string, value: any) {
    const set = exercise.sets[setIdx];
    const nextPinnedFields = new Set<string>(set._pinnedFields || []);
    const nextUnpinnedFields = new Set<string>(set._unpinnedFields || []);
    const patch: Record<string, any> = { [key]: value };
    if (PINNABLE_FIELD_KEYS.has(key) && hasResearchValue(value)) {
      nextPinnedFields.add(key);
      nextUnpinnedFields.delete(key);
      patch._pinnedFields = [...nextPinnedFields];
      patch._unpinnedFields = [...nextUnpinnedFields];
      onPinField?.(index, key, value);
    }
    if (key === 'rest_seconds') {
      patch._restExplicit = hasResearchValue(value);
      const durationSec = Number(value);
      if (Number.isFinite(durationSec) && durationSec > 0) {
        onRestTimerStart?.(durationSec);
      }
    }
    onUpdateSet(index, setIdx, patch);
  }

  function handleUnpinSetField(setIdx: number, key: string) {
    const set = exercise.sets[setIdx];
    const nextPinnedFields = new Set<string>(set._pinnedFields || []);
    const nextUnpinnedFields = new Set<string>(set._unpinnedFields || []);
    nextPinnedFields.delete(key);
    nextUnpinnedFields.add(key);
    const resetValue = key === 'failure' || key === 'pain_flag' ? false : key === 'set_type' ? 'working' : null;
    onUpdateSet(index, setIdx, {
      [key]: resetValue,
      ...(key === 'rest_seconds' ? { _restExplicit: false } : {}),
      _pinnedFields: [...nextPinnedFields],
      _unpinnedFields: [...nextUnpinnedFields],
    });
    onUnpinField?.(index, key);
  }

  const exerciseColor = muscleColor(muscle);

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row' }}>
      {/* Web tints the card with a left-edge gradient of the muscle color. */}
      <View style={{ width: 3, backgroundColor: exerciseColor, opacity: 0.7 }} />
      <View style={{ flex: 1, minWidth: 0, paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ height: 12, width: 12, borderRadius: 6, backgroundColor: exerciseColor }} />
              <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 14, fontWeight: '800', color: colors.text }}>
                {exercise.exerciseName}
              </Text>
            </View>
            <Text style={{ marginTop: 2, fontSize: 12, color: colors.textMuted }}>
              {muscle}
              {exercise.equipment_type ? ` - ${exercise.equipment_type}` : ''}
            </Text>
          </View>
          {lastTop && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: monoFont, fontVariant: ['tabular-nums'], fontSize: 12, color: colors.textMuted }}>
                {lastTop.weight_kg}kg x {lastTop.reps}
              </Text>
              <Text style={{ fontSize: 10, color: colors.inkSoft }}>Last top</Text>
            </View>
          )}
          <Pressable
            onPress={() => onRequestRemove?.(exercise, index)}
            accessibilityLabel={`Delete ${exercise.exerciseName || 'exercise'} from active workout`}
            style={{
              minHeight: 36,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: 'rgba(211, 98, 58, 0.58)',
              paddingHorizontal: 12,
              justifyContent: 'center',
            }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#ea9670' }}>Delete</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 12 }}>
          {exercise.sets.length === 0 ? (
            <Text style={{ paddingVertical: 12, fontSize: 12, fontStyle: 'italic', color: colors.textMuted }}>No sets yet.</Text>
          ) : (
            exercise.sets.map((s, sIdx) => (
              <View
                key={s.id}
                style={sIdx > 0 ? { borderTopWidth: 1, borderTopColor: 'rgba(54, 60, 55, 0.62)' } : undefined}>
                <SetRow
                  set={s}
                  setNumber={sIdx + 1}
                  setBadge={setBadges[sIdx]}
                  prev={prevSession?.[sIdx]}
                  pinnedPills={pinnedByIndex[sIdx]}
                  onChange={(patch) => onUpdateSet(index, sIdx, patch)}
                  onPinnedChange={(key, value) => handleResearchChange(sIdx, key, value)}
                  onToggleDone={() => handleToggleDone(sIdx)}
                  onLongPress={() => setSetActionIdx(sIdx)}
                  onExpand={() => setExpandedSet(expandedSet === sIdx ? null : sIdx)}
                  onUsePrevious={() => handleUsePrevious(sIdx)}
                  expanded={expandedSet === sIdx}
                  planning={planning}
                  researchDetailsVisible={researchDetailsVisible}
                />
              </View>
            ))
          )}
        </View>

        <Pressable
          onPress={handleAddSet}
          style={{
            marginTop: 8,
            minHeight: 44,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMuted }}>+ Add set</Text>
        </Pressable>
      </View>

      {researchDetailsVisible && expandedSet !== null && exercise.sets[expandedSet] && (
        <PrecisionDrawer
          exerciseName={exercise.exerciseName || ''}
          setNumber={expandedSet + 1}
          set={exercise.sets[expandedSet]}
          pinnedValues={pinnedValues}
          onChange={(key, value) => handleResearchChange(expandedSet, key, value)}
          onUnpin={(key) => handleUnpinSetField(expandedSet, key)}
          onClose={() => setExpandedSet(null)}
          onCopyPrevious={() => handleCopyPreviousSet(expandedSet)}
          onDuplicate={() => handleDuplicateSet(expandedSet)}
          onAddWarmup={() => handleAddTypedSet(expandedSet, 'warmup')}
          onAddBackoff={() => handleAddTypedSet(expandedSet, 'backoff')}
          canCopyPrevious={expandedSet > 0}
          researchFields={researchFields}
        />
      )}

      {setActionIdx !== null && exercise.sets[setActionIdx] && (
        <SetActionSheet
          set={exercise.sets[setActionIdx]}
          setNumber={setActionIdx + 1}
          onToggleWarmup={() => {
            const s = exercise.sets[setActionIdx];
            onUpdateSet(index, setActionIdx, { set_type: s.set_type === 'warmup' ? 'working' : 'warmup' });
            setSetActionIdx(null);
          }}
          onDelete={() => {
            onRemoveSet(index, setActionIdx);
            setSetActionIdx(null);
          }}
          onClose={() => setSetActionIdx(null)}
        />
      )}
    </View>
  );
}

function SetActionSheet({
  set,
  setNumber,
  onToggleWarmup,
  onDelete,
  onClose,
}: {
  set: WorkoutSet;
  setNumber: number;
  onToggleWarmup: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const isWarmup = set?.set_type === 'warmup';
  return (
    <Sheet open onClose={onClose} title={`Set ${setNumber}`} scrollable={false}>
      <View style={{ padding: 16, gap: 8, paddingBottom: 24 }}>
        <Pressable onPress={onToggleWarmup} style={ACTION_ROW}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
            {isWarmup ? 'Mark as working set' : 'Mark as warmup'}
          </Text>
        </Pressable>
        <Pressable onPress={onDelete} style={[ACTION_ROW, { borderColor: 'rgba(220, 38, 38, 0.3)', backgroundColor: 'rgba(220, 38, 38, 0.1)' }]}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#fca5a5' }}>Delete set</Text>
        </Pressable>
        <Pressable onPress={onClose} style={[ACTION_ROW, { backgroundColor: 'transparent' }]}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMuted }}>Cancel</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

const ACTION_ROW = {
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surfaceAlt,
  paddingHorizontal: 16,
  paddingVertical: 14,
};

function PrecisionDrawer({
  exerciseName,
  setNumber,
  set,
  pinnedValues,
  onChange,
  onUnpin,
  onClose,
  onCopyPrevious,
  onDuplicate,
  onAddWarmup,
  onAddBackoff,
  canCopyPrevious,
  researchFields = RESEARCH_FIELDS,
}: {
  exerciseName: string;
  setNumber: number;
  set: WorkoutSet;
  pinnedValues: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onUnpin: (key: string) => void;
  onClose: () => void;
  onCopyPrevious: () => void;
  onDuplicate: () => void;
  onAddWarmup: () => void;
  onAddBackoff: () => void;
  canCopyPrevious: boolean;
  researchFields?: ResearchField[];
}) {
  return (
    <Sheet open onClose={onClose} title={`${exerciseName} · set ${setNumber}`}>
      <View style={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <QuickAction label="Copy prev" disabled={!canCopyPrevious} onPress={onCopyPrevious} />
          <QuickAction label="Duplicate" onPress={onDuplicate} />
          <QuickAction label="Warmup" onPress={onAddWarmup} />
          <QuickAction label="Backoff" onPress={onAddBackoff} />
        </View>

        <ExpandedFields
          set={set}
          pinnedValues={pinnedValues}
          onChange={onChange}
          onUnpin={onUnpin}
          researchFields={researchFields}
        />

        <Pressable
          onPress={onClose}
          style={{ minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }}>
          <Text style={{ fontWeight: '600', color: colors.accentInk }}>Done</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

function QuickAction({ label, disabled = false, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceAlt,
        paddingVertical: 10,
        alignItems: 'center',
        opacity: disabled ? 0.4 : 1,
      }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>{label}</Text>
    </Pressable>
  );
}

function ExpandedFields({
  set,
  pinnedValues,
  onChange,
  onUnpin,
  researchFields = RESEARCH_FIELDS,
}: {
  set: WorkoutSet;
  pinnedValues: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onUnpin: (key: string) => void;
  researchFields?: ResearchField[];
}) {
  const [helpFor, setHelpFor] = useState<string | null>(null);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {researchFields.map((field) => {
        const canPin = PINNABLE_FIELD_KEYS.has(field.key);
        const isPinned =
          canPin &&
          (set._pinnedFields?.includes(field.key) ||
            (field.key in pinnedValues && !set._unpinnedFields?.includes(field.key)));
        const wide = field.type === 'rir' || field.type === 'rest' || field.type === 'text';
        return (
          <View key={field.key} style={{ width: wide ? '100%' : '48%', flexGrow: wide ? 1 : 0, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0, flexShrink: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, color: colors.inkSoft }}>
                  {field.label}
                </Text>
                <Pressable
                  onPress={() => setHelpFor(helpFor === field.key ? null : field.key)}
                  accessibilityLabel={field.help}
                  hitSlop={6}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ fontSize: 10, lineHeight: 12, color: colors.inkSoft }}>?</Text>
                </Pressable>
              </View>
              {canPin && (
                <Pressable
                  onPress={() => (isPinned ? onUnpin(field.key) : hasResearchValue(set[field.key]) && onChange(field.key, set[field.key]))}
                  hitSlop={6}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: isPinned ? colors.text : colors.inkSoft }}>
                    {isPinned ? 'Pinned' : 'Pin'}
                  </Text>
                </Pressable>
              )}
            </View>
            {helpFor === field.key && (
              <Text style={{ fontSize: 11, lineHeight: 15, color: colors.textMuted }}>{field.help}</Text>
            )}
            <ResearchInput field={field} value={set[field.key]} onChange={(value) => onChange(field.key, value)} />
          </View>
        );
      })}
    </View>
  );
}

function ResearchInput({ field, value, onChange }: { field: ResearchField; value: any; onChange: (value: any) => void }) {
  if (field.type === 'rir') return <RirTicker value={value} onChange={onChange} />;
  if (field.type === 'rest') return <RestStepper value={Number(value) || 0} onChange={onChange} />;
  if (field.type === 'boolean') {
    return (
      <Pressable
        onPress={() => onChange(!value)}
        style={{
          borderRadius: 10,
          borderWidth: 1,
          paddingVertical: 10,
          alignItems: 'center',
          borderColor: value ? colors.accent : colors.border,
          backgroundColor: value ? colors.accent : colors.surfaceAlt,
        }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: value ? colors.accentInk : colors.textMuted }}>
          {value ? 'Yes' : 'No'}
        </Text>
      </Pressable>
    );
  }
  if (field.type === 'text') {
    return (
      <TextInput
        value={value || ''}
        placeholder={field.placeholder}
        placeholderTextColor={colors.inkSoft}
        onChangeText={(text) => onChange(text)}
        style={{
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
          paddingHorizontal: 10,
          paddingVertical: 8,
          fontSize: 14,
          color: colors.text,
        }}
      />
    );
  }
  return <SelectField field={field} value={value} onChange={onChange} />;
}

function SelectField({ field, value, onChange }: { field: ResearchField; value: any; onChange: (value: any) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
          paddingHorizontal: 10,
          paddingVertical: 10,
        }}>
        <Text style={{ fontSize: 14, color: hasResearchValue(value) ? colors.text : colors.inkSoft }}>
          {hasResearchValue(value) ? formatResearchValue(field.key, value) : 'None'}
        </Text>
      </Pressable>
      <PickerSheet
        open={open}
        onClose={() => setOpen(false)}
        title={field.label}
        value={value ?? ''}
        options={(field.options || []).map((option) => ({ value: option, label: formatResearchValue(field.key, option) }))}
        onSelect={(v) => onChange(v || null)}
        onClear={() => onChange(null)}
        clearLabel="None"
      />
    </>
  );
}

// Replaces the web's bespoke RestWheel snap-drum (per D4: native-feeling
// controls): -15s/+15s steppers around a value button that opens a PickerSheet.
function RestStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [open, setOpen] = useState(false);
  const options = Array.from({ length: 41 }, (_, i) => i * 15);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable
        onPress={() => onChange(Math.max(0, value - 15))}
        style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.surfaceAlt }}>
        <Text style={{ fontSize: 12, color: colors.textMuted }}>-15s</Text>
      </Pressable>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          flex: 1,
          alignItems: 'center',
          paddingVertical: 8,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
        }}>
        <Text style={{ fontFamily: monoFont, fontSize: 14, color: colors.text }}>{formatRest(value)}</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange(Math.min(600, value + 15))}
        style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.surfaceAlt }}>
        <Text style={{ fontSize: 12, color: colors.textMuted }}>+15s</Text>
      </Pressable>
      <PickerSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Rest"
        value={value}
        options={options.map((seconds) => ({ value: seconds, label: formatRest(seconds) }))}
        onSelect={(v) => onChange(Number(v))}
      />
    </View>
  );
}

function RirTicker({ value, onChange }: { value: any; onChange: (value: any) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {RIR_OPTIONS.map((opt) => {
        const active = String(value) === String(opt.value);
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(active ? null : opt.value)}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 10,
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
              borderColor: active ? opt.bg : colors.border,
              backgroundColor: active ? opt.bg : colors.surfaceAlt,
            }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: active ? opt.text : colors.textMuted }}>{opt.value}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
