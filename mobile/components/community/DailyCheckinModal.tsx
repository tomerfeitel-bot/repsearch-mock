import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '@/lib/theme';

// Port of src/components/community/DailyCheckinModal.jsx — the centered daily
// check-in card. Number inputs use decimal pads; the 1-5 scales stay buttons.
const SCALE = [1, 2, 3, 4, 5];
const INITIAL_FORM = {
  sleep_duration: '',
  sleep_quality: 3,
  nutrition_quality: 3,
  subjective_energy: 3,
  stress_level: 3,
  bodyweight_kg: '',
  notes: '',
};

type Form = typeof INITIAL_FORM;

export default function DailyCheckinModal({
  open,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<unknown>;
}) {
  const [form, setForm] = useState<Form>(INITIAL_FORM);

  useEffect(() => {
    if (open) setForm(INITIAL_FORM);
  }, [open]);

  function setField<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    const saved = await onSubmit({
      ...form,
      sleep_duration: nullableNumber(form.sleep_duration),
      bodyweight_kg: nullableNumber(form.bodyweight_kg),
      illness_flag: 0,
    });
    if (saved) setForm(INITIAL_FORM);
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => !loading && onClose()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable
          onPress={() => !loading && onClose()}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 16, justifyContent: 'center' }}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              maxHeight: '85%',
              borderRadius: 16,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
            }}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Daily check-in</Text>
                  <Text style={{ marginTop: 4, fontSize: 14, color: colors.textMuted }}>
                    A quick datapoint for better progress and better research.
                  </Text>
                </View>
                <Pressable
                  onPress={onClose}
                  disabled={loading}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: loading ? 0.5 : 1,
                  }}>
                  <Text style={{ fontSize: 18, color: colors.textMuted }}>×</Text>
                </Pressable>
              </View>

              <View style={{ marginTop: 20, gap: 16 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Field label="Sleep hours" value={form.sleep_duration} onChange={(v) => setField('sleep_duration', v)} />
                  <Field label="Bodyweight kg" value={form.bodyweight_kg} onChange={(v) => setField('bodyweight_kg', v)} />
                </View>

                <Scale label="Sleep quality" value={form.sleep_quality} onChange={(v) => setField('sleep_quality', v)} />
                <Scale label="Nutrition" value={form.nutrition_quality} onChange={(v) => setField('nutrition_quality', v)} />
                <Scale label="Energy" value={form.subjective_energy} onChange={(v) => setField('subjective_energy', v)} />
                <Scale label="Stress" value={form.stress_level} onChange={(v) => setField('stress_level', v)} />

                <View>
                  <Text style={LABEL_STYLE}>Notes</Text>
                  <TextInput
                    value={form.notes}
                    onChangeText={(v) => setField('notes', v)}
                    multiline
                    numberOfLines={3}
                    placeholder="Anything that might affect training today?"
                    placeholderTextColor={colors.inkSoft}
                    style={{
                      marginTop: 4,
                      minHeight: 80,
                      borderRadius: 14,
                      backgroundColor: colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: colors.border,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      fontSize: 14,
                      color: colors.text,
                      textAlignVertical: 'top',
                    }}
                  />
                </View>
              </View>

              <View style={{ marginTop: 20, flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={onClose}
                  disabled={loading}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    borderRadius: 14,
                    backgroundColor: colors.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: loading ? 0.5 : 1,
                  }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMuted }}>Not now</Text>
                </Pressable>
                <Pressable
                  onPress={submit}
                  disabled={loading}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    borderRadius: 14,
                    backgroundColor: colors.emerald,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: loading ? 0.6 : 1,
                  }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.onEmerald }}>
                    {loading ? 'Saving...' : 'Save'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const LABEL_STYLE = {
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8,
  color: colors.inkSoft,
};

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={LABEL_STYLE}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholderTextColor={colors.inkSoft}
        style={{
          marginTop: 4,
          minHeight: 44,
          borderRadius: 14,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 12,
          fontSize: 14,
          color: colors.text,
        }}
      />
    </View>
  );
}

function Scale({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View>
      <Text style={[LABEL_STYLE, { marginBottom: 8 }]}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {SCALE.map((n) => {
          const on = Number(value) === n;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              style={{
                flex: 1,
                minHeight: 40,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? colors.emerald : colors.surfaceAlt,
                borderWidth: on ? 0 : 1,
                borderColor: colors.border,
              }}>
              <Text style={{ fontSize: 14, color: on ? colors.onEmerald : colors.textMuted }}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function nullableNumber(value: string) {
  return value === '' || value === null || value === undefined ? null : Number(value);
}
