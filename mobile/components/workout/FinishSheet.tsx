import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Sheet } from '@/components/ui/Sheet';
import { colors, monoFont } from '@/lib/theme';
import type { FinishAudit, AuditItem, WorkoutSummary } from '@/lib/workoutSummary';

// Port of src/components/workout/FinishSheet.jsx: notes textarea becomes a
// multiline TextInput, the feel-rating range input a native Slider.
const EFFORT = [
  { v: 'easy', label: 'Easy' },
  { v: 'moderate', label: 'Moderate' },
  { v: 'hard', label: 'Hard' },
  { v: 'all_out', label: 'All-out' },
];

export default function FinishSheet({
  open,
  onClose,
  onSave,
  saving,
  error = '',
  audit,
  summary,
  onJumpToItem,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (meta: Record<string, any>) => void;
  saving: boolean;
  error?: string;
  audit?: FinishAudit;
  summary?: WorkoutSummary | null;
  onJumpToItem?: (item: AuditItem) => void;
}) {
  const [notes, setNotes] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [effort, setEffort] = useState<string | null>(null);
  const [feel, setFeel] = useState<number | null>(null);
  const criticalCount = audit?.criticalCount || 0;
  const warningCount = audit?.warningCount || 0;

  function handleSave() {
    if (saving || criticalCount > 0) return;
    onSave({
      notes: notes.trim(),
      visibility,
      session_effort: effort,
      feel_rating: feel,
      adherence: summary?.adherence != null ? `${summary.adherence}%` : null,
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title="Finish workout">
      <View style={{ padding: 16, gap: 20, paddingBottom: 32 }}>
        <Field label="Notes">
          <TextInput
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
            placeholder="How did it go?"
            placeholderTextColor={colors.inkSoft}
            style={{
              minHeight: 88,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surfaceAlt,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 15,
              color: colors.text,
              textAlignVertical: 'top',
            }}
          />
        </Field>
        <Field label="Visibility">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { v: 'private', label: 'Private' },
              { v: 'public', label: 'Public' },
            ].map((o) => (
              <OptionButton key={o.v} active={visibility === o.v} onPress={() => setVisibility(o.v)}>
                {o.label}
              </OptionButton>
            ))}
          </View>
        </Field>
        <Field label="Session effort">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {EFFORT.map((o) => (
              <OptionButton key={o.v} small active={effort === o.v} onPress={() => setEffort(o.v)}>
                {o.label}
              </OptionButton>
            ))}
          </View>
        </Field>
        <Field label={`Feel rating - ${feel ?? 'not rated'}`}>
          <Slider
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={feel ?? 7}
            onValueChange={(v) => setFeel(v)}
            minimumTrackTintColor={colors.emeraldInk}
            maximumTrackTintColor={colors.border}
            thumbTintColor={feel == null ? colors.textMuted : colors.emeraldInk}
            style={{ opacity: feel == null ? 0.6 : 1 }}
          />
        </Field>
        <FinishAuditPanel audit={audit} onJumpToItem={onJumpToItem} />
        {summary && (
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, padding: 12 }}>
            <Text style={SECTION_LABEL}>Preview</Text>
            <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
              <MiniStat label="Min" value={summary.durationMin} />
              <MiniStat label="Sets" value={summary.workingSetCount} />
              <MiniStat label="Volume" value={summary.volume} />
              <MiniStat label="Adh" value={summary.adherence == null ? '-' : `${summary.adherence}%`} />
            </View>
          </View>
        )}
        {error ? (
          <View
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: 'rgba(239, 68, 68, 0.4)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}>
            <Text style={{ fontSize: 14, color: '#fecaca' }}>{error}</Text>
          </View>
        ) : null}
        <Pressable
          onPress={handleSave}
          disabled={saving || criticalCount > 0}
          style={{
            borderRadius: 16,
            backgroundColor: colors.emerald,
            paddingVertical: 16,
            alignItems: 'center',
            opacity: saving || criticalCount > 0 ? 0.5 : 1,
          }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.onEmerald }}>
            {saving ? 'Saving...' : criticalCount > 0 ? 'Fix critical issues' : warningCount > 0 ? 'Save anyway' : 'Save workout'}
          </Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={SECTION_LABEL}>{label}</Text>
      {children}
    </View>
  );
}

function OptionButton({
  active,
  small = false,
  onPress,
  children,
}: {
  active: boolean;
  small?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        paddingVertical: small ? 8 : 10,
        paddingHorizontal: 4,
        alignItems: 'center',
        borderColor: active ? colors.emerald : colors.border,
        backgroundColor: active ? colors.emeraldSoft : colors.surfaceAlt,
      }}>
      <Text style={{ fontSize: small ? 12 : 14, fontWeight: '500', color: active ? colors.emeraldInk : colors.textMuted }}>
        {children}
      </Text>
    </Pressable>
  );
}

function FinishAuditPanel({ audit, onJumpToItem }: { audit?: FinishAudit; onJumpToItem?: (item: AuditItem) => void }) {
  const items = audit?.items || [];
  if (!items.length) {
    return (
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(16, 185, 129, 0.3)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}>
        <Text style={{ fontSize: 14, color: '#a7f3d0' }}>Audit clean. Ready to save.</Text>
      </View>
    );
  }
  return (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <Text style={SECTION_LABEL}>Finish audit</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted }}>
          {audit!.criticalCount ? `${audit!.criticalCount} critical` : 'No critical'} - {audit!.warningCount} warning
          {audit!.warningCount === 1 ? '' : 's'}
        </Text>
      </View>
      <ScrollView style={{ maxHeight: 224 }} nestedScrollEnabled>
        <View style={{ gap: 8 }}>
          {items.map((item, idx) => {
            const critical = item.severity === 'critical';
            return (
              <View
                key={`${item.title}-${idx}`}
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderColor: critical ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.3)',
                  backgroundColor: critical ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: critical ? '#fecaca' : '#fde9c8' }}>{item.title}</Text>
                    <Text style={{ marginTop: 2, fontSize: 12, color: colors.textMuted }}>
                      {item.label ? `${item.label}: ` : ''}
                      {item.detail}
                    </Text>
                  </View>
                  {item.exerciseId && (
                    <Pressable
                      onPress={() => onJumpToItem?.(item)}
                      style={{
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.borderStrong,
                        backgroundColor: colors.bg,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                      }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>Fix</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={{ flex: 1, borderRadius: 12, backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 8, alignItems: 'center' }}>
      <Text numberOfLines={1} style={{ fontFamily: monoFont, fontVariant: ['tabular-nums'], fontSize: 14, fontWeight: '600', color: colors.text }}>
        {value}
      </Text>
      <Text style={{ marginTop: 2, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: colors.inkSoft }}>{label}</Text>
    </View>
  );
}

const SECTION_LABEL = {
  fontSize: 10,
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8,
  color: colors.inkSoft,
};
