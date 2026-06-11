import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { PickerSheet } from '@/components/ui/PickerSheet';
import {
  RESEARCH_FIELD_LABELS,
  TEMPLATE_RESEARCH_FIELD_LABELS,
  formatResearchValue,
} from '@/lib/researchFields';
import { colors, monoFont } from '@/lib/theme';
import type { WorkoutSet } from '@/lib/workoutSummary';

// Port of src/components/workout/SetRow.jsx. Web's pointer-event long-press
// timer becomes Pressable onLongPress; the checkmark CSS scale bounce becomes
// a Reanimated spring-ish sequence; inline <select> mini-pills open a
// PickerSheet (decision D4).
export default function SetRow({
  set,
  setNumber,
  setBadge,
  prev,
  pinnedPills = [],
  onChange,
  onPinnedChange,
  onToggleDone,
  onLongPress,
  onExpand,
  onUsePrevious,
  expanded,
  planning = false,
  researchDetailsVisible = true,
}: {
  set: WorkoutSet;
  setNumber: number;
  setBadge?: string | number;
  prev?: WorkoutSet | null;
  pinnedPills?: { field: string; value: any }[];
  onChange: (patch: Record<string, any>) => void;
  onPinnedChange?: (field: string, value: any) => void;
  onToggleDone?: () => void;
  onLongPress?: () => void;
  onExpand?: () => void;
  onUsePrevious?: () => void;
  expanded?: boolean;
  planning?: boolean;
  researchDetailsVisible?: boolean;
}) {
  const scale = useSharedValue(1);
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    if (set.done) {
      scale.value = withSequence(withTiming(1.14, { duration: 110 }), withTiming(1, { duration: 140 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.done]);

  const ghost = ghostValue(set, prev);
  const plannedPills = planning || !researchDetailsVisible ? [] : plannedCuePills(set);
  const contextPills = planning ? [] : contextCuePills(prev, ghost);
  const labels = planning ? TEMPLATE_RESEARCH_FIELD_LABELS : RESEARCH_FIELD_LABELS;

  function applyGhost() {
    if (!ghost) return;
    if (ghost.source === 'last') {
      onUsePrevious?.();
      return;
    }
    onChange({ weight_kg: ghost.weight, reps: ghost.reps });
  }

  const inputStyle = {
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(54, 60, 55, 0.9)',
    backgroundColor: 'rgba(20, 22, 21, 0.82)',
    paddingVertical: 8,
    textAlign: 'center' as const,
    fontFamily: monoFont,
    fontVariant: ['tabular-nums'] as any,
    fontSize: 15,
    color: colors.text,
  };

  return (
    <View style={{ opacity: !planning && set.done ? 0.7 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
        <SetMarker badge={setBadge ?? setNumber} setType={set.set_type} />

        <TextInput
          keyboardType="decimal-pad"
          value={set.weight_kg == null ? '' : String(set.weight_kg)}
          onChangeText={(text) => onChange({ weight_kg: text === '' ? null : text })}
          placeholder="-"
          placeholderTextColor={colors.inkSoft}
          style={[inputStyle, { flex: 1 }]}
        />

        <Text style={{ fontSize: 14, fontFamily: monoFont, color: colors.inkSoft }}>x</Text>

        <TextInput
          keyboardType="number-pad"
          value={set.reps == null ? '' : String(set.reps)}
          onChangeText={(text) => onChange({ reps: text === '' ? null : text })}
          placeholder="-"
          placeholderTextColor={colors.inkSoft}
          style={[inputStyle, { flex: 1 }]}
        />

        {!planning && (
          <Pressable
            onPress={() => onToggleDone?.()}
            onLongPress={() => onLongPress?.()}
            delayLongPress={500}
            accessibilityLabel={set.done ? 'Mark set incomplete' : 'Mark set complete'}
            style={{ height: 44, width: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View
              style={[
                checkStyle,
                {
                  height: 44,
                  width: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...(set.done
                    ? { backgroundColor: '#ffffff' }
                    : { borderWidth: 1, borderColor: colors.borderStrong }),
                },
              ]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M5 13l4 4L19 7"
                  stroke={set.done ? '#0c0f0d' : colors.inkSoft}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Animated.View>
          </Pressable>
        )}

        {researchDetailsVisible && (
          <Pressable
            onPress={() => onExpand?.()}
            accessibilityLabel="Research detail settings"
            style={{
              height: 44,
              width: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: expanded ? colors.surfaceAlt : 'transparent',
            }}>
            <SlidersIcon color={expanded ? colors.text : colors.inkSoft} />
          </Pressable>
        )}
      </View>

      {ghost && !planning && (
        <View style={{ paddingLeft: 40, paddingBottom: 4, flexDirection: 'row' }}>
          <Pressable
            onPress={applyGhost}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textMuted }}>
              {ghost.label} {ghost.weight}kg x {ghost.reps}
            </Text>
          </Pressable>
        </View>
      )}

      {(contextPills.length > 0 || plannedPills.length > 0 || (researchDetailsVisible && pinnedPills.length > 0)) && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingLeft: 40, paddingBottom: 6 }}>
          {contextPills.slice(0, 1).map((p) => (
            <CuePill key={p.field} muted>
              {p.label}: {p.value}
            </CuePill>
          ))}
          {plannedPills.map((p) => (
            <CuePill key={p.field}>
              {p.label}: {p.value}
            </CuePill>
          ))}
          {researchDetailsVisible &&
            pinnedPills.slice(0, 3).map((p) => (
              <ResearchPill
                key={p.field}
                field={p.field}
                label={labels[p.field] || p.field}
                value={p.value}
                completed={!!set.done}
                onChange={(value) => onPinnedChange?.(p.field, value)}
              />
            ))}
        </View>
      )}
    </View>
  );
}

function ghostValue(set: WorkoutSet, prev?: WorkoutSet | null) {
  if (prev?.weight_kg != null && prev?.reps != null) {
    return { source: 'last', label: 'Last', weight: prev.weight_kg, reps: prev.reps };
  }
  if (set?.planned_weight_kg != null && set?.planned_reps != null) {
    return { source: 'plan', label: 'Plan', weight: set.planned_weight_kg, reps: set.planned_reps };
  }
  return null;
}

function contextCuePills(prev: WorkoutSet | null | undefined, ghost: ReturnType<typeof ghostValue>) {
  const cues: { field: string; label: string; value: string }[] = [];
  if (ghost?.source !== 'last' && prev?.weight_kg != null && prev?.reps != null) {
    cues.push({ field: 'last', label: 'Last', value: `${prev.weight_kg}kg x ${prev.reps}` });
  }
  return cues;
}

function plannedCuePills(set: WorkoutSet) {
  const cues: { field: string; label: string; value: string }[] = [];
  if (set.planned_rep_range) cues.push({ field: 'planned_rep_range', label: 'Aim', value: String(set.planned_rep_range) });
  if (set.planned_rir !== null && set.planned_rir !== undefined && set.planned_rir !== '') {
    cues.push({ field: 'planned_rir', label: 'RIR', value: String(set.planned_rir) });
  }
  if (set.planned_rest_seconds) cues.push({ field: 'planned_rest_seconds', label: 'Rest', value: formatResearchValue('rest_seconds', set.planned_rest_seconds) });
  if (set.planned_rom_category) cues.push({ field: 'planned_rom_category', label: 'ROM', value: formatResearchValue('rom_category', set.planned_rom_category) });
  if (set.planned_tempo_tag) cues.push({ field: 'planned_tempo_tag', label: 'Tempo', value: formatResearchValue('tempo_tag', set.planned_tempo_tag) });
  return cues;
}

function CuePill({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <View
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}>
      <Text style={{ fontSize: 10, fontWeight: '500', color: muted ? colors.textMuted : colors.text }}>{children}</Text>
    </View>
  );
}

function SetMarker({ badge, setType }: { badge: string | number; setType?: string }) {
  const palette =
    setType === 'warmup'
      ? { bg: 'rgba(245, 158, 11, 0.15)', text: '#fcd34d', border: 'rgba(245, 158, 11, 0.3)' }
      : setType === 'backoff'
        ? { bg: 'rgba(14, 165, 233, 0.15)', text: '#7dd3fc', border: 'rgba(14, 165, 233, 0.3)' }
        : { bg: colors.surfaceAlt, text: colors.textMuted, border: colors.border };
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.bg,
        borderColor: palette.border,
      }}>
      <Text style={{ fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'], color: palette.text }}>{badge}</Text>
    </View>
  );
}

export function SlidersIcon({ size = 20, color = colors.inkSoft }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h5m4 0h7M4 17h9m4 0h3" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={11} cy={7} r={2} stroke={color} strokeWidth={2} />
      <Circle cx={15} cy={17} r={2} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function ResearchPill({
  field,
  label,
  value,
  completed,
  onChange,
}: {
  field: string;
  label: string;
  value: any;
  completed: boolean;
  onChange: (value: any) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (completed && !editing) {
    return (
      <Pressable
        onPress={() => setEditing(true)}
        style={{ borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 2 }}>
        <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textMuted }}>
          {label}: {formatResearchValue(field, value)}
        </Text>
      </Pressable>
    );
  }

  if (field === 'rir') return <MiniRirTicker value={value} onChange={onChange} />;
  if (field === 'rest_seconds') return <MiniRestPill value={value} onChange={onChange} />;
  if (field === 'rom_category') {
    return (
      <MiniSelectPill label={label} value={value} options={['full', 'partial', 'lengthened', 'shortened']} field={field} onChange={onChange} />
    );
  }
  if (field === 'tempo_tag') {
    return (
      <MiniSelectPill label={label} value={value} options={['controlled', 'explosive', '3010', '2020', 'paused']} field={field} onChange={onChange} />
    );
  }
  if (field === 'failure' || field === 'pain_flag') return <MiniBooleanPill label={label} value={!!value} onChange={onChange} />;

  return (
    <Pressable
      onPress={() => onChange(null)}
      style={{ borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ fontSize: 10, fontWeight: '600', color: colors.text }}>
        {label}: {formatResearchValue(field, value)}
      </Text>
    </Pressable>
  );
}

export const RIR_OPTIONS: { value: number | string; bg: string; text: string }[] = [
  { value: 0, bg: '#dc2626', text: '#ffffff' },
  { value: 1, bg: '#ea580c', text: '#f3f4f6' },
  { value: 2, bg: '#f59e0b', text: '#0c0f0d' },
  { value: 3, bg: '#65a30d', text: '#f3f4f6' },
  { value: 4, bg: '#059669', text: '#ffffff' },
  { value: '5+', bg: '#0284c7', text: '#f3f4f6' },
];

function MiniRirTicker({ value, onChange }: { value: any; onChange: (value: any) => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 4,
        paddingVertical: 2,
      }}>
      <Text style={{ paddingHorizontal: 4, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8, color: colors.textMuted }}>
        RIR
      </Text>
      {RIR_OPTIONS.map((opt) => {
        const active = String(value) === String(opt.value);
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(active ? null : opt.value)}
            style={{
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              paddingHorizontal: 4,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? opt.bg : colors.surfaceAlt,
            }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: active ? opt.text : colors.inkSoft }}>{opt.value}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MiniRestPill({ value, onChange }: { value: any; onChange: (value: any) => void }) {
  const seconds = Number(value) || 0;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 4,
        paddingVertical: 2,
      }}>
      <Text style={{ paddingHorizontal: 4, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8, color: colors.textMuted }}>
        Rest
      </Text>
      <Pressable
        onPress={() => onChange(Math.max(15, seconds - 15))}
        style={{ minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>-</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange(seconds || 90)}
        style={{ minWidth: 40, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accentInk }}>
          {formatResearchValue('rest_seconds', seconds || 90)}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange(Math.min(600, (seconds || 90) + 15))}
        style={{ minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>+</Text>
      </Pressable>
    </View>
  );
}

function MiniSelectPill({
  label,
  field,
  value,
  options,
  onChange,
}: {
  label: string;
  field: string;
  value: any;
  options: string[];
  onChange: (value: any) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 8,
          paddingVertical: 2,
        }}>
        <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textMuted }}>{label}</Text>
        <Text style={{ fontSize: 10, fontWeight: '600', color: colors.text }}>
          {value ? formatResearchValue(field, value) : 'None'}
        </Text>
      </Pressable>
      <PickerSheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        value={value ?? ''}
        options={options.map((option) => ({ value: option, label: formatResearchValue(field, option) }))}
        onSelect={(v) => onChange(v || null)}
        onClear={() => onChange(null)}
        clearLabel="None"
      />
    </>
  );
}

function MiniBooleanPill({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={{
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderColor: value ? colors.accent : colors.border,
        backgroundColor: value ? colors.accent : colors.surfaceAlt,
      }}>
      <Text style={{ fontSize: 10, fontWeight: '600', color: value ? colors.accentInk : colors.textMuted }}>
        {label}: {value ? 'Yes' : 'No'}
      </Text>
    </Pressable>
  );
}
