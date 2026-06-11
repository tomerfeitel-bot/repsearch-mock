// Port of src/components/study/FilterRow.jsx — one whitelisted filter row.
// The web's three <select>s become PickerSheet triggers (D4); free numeric /
// text values stay a TextInput.
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { PickerSheet } from '@/components/ui/PickerSheet';
import {
  FIELD_BY_VALUE,
  FIELD_OPTIONS,
  OPERATORS,
  STUDY_BORDER,
  STUDY_BORDER_STRONG,
  STUDY_CARD,
  STUDY_MUTED,
  STUDY_TEXT,
  type ResearchFilter,
} from '@/lib/researchTheme';
import { monoFont } from '@/lib/theme';

const ALL_FIELDS = FIELD_OPTIONS.flatMap((g) => g.fields.map((f) => ({ ...f, group: g.group })));

export default function FilterRow({
  filter,
  onChange,
  onRemove,
}: {
  filter: ResearchFilter;
  onChange: (next: ResearchFilter) => void;
  onRemove: () => void;
}) {
  const [picker, setPicker] = useState<'field' | 'op' | 'value' | null>(null);
  const fieldMeta = FIELD_BY_VALUE[filter.field];
  const opMeta = OPERATORS.find((o) => o.value === filter.op);
  const needsValue = opMeta?.needsValue !== false;

  function update(patch: Partial<ResearchFilter>) {
    onChange({ ...filter, ...patch });
  }

  function setField(field: string) {
    const meta = FIELD_BY_VALUE[field];
    // If switching field types, clear value so we don't carry stale data.
    const next: ResearchFilter = { ...filter, field, value: meta?.enum ? meta.enum[0] : '' };
    // If current op was numeric-only but the new field has an enum, fall back to '='.
    if (opMeta?.numeric && meta?.enum) next.op = '=';
    onChange(next);
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 4,
        borderRadius: 8,
        padding: 4,
        backgroundColor: STUDY_CARD,
        borderWidth: 1,
        borderColor: STUDY_BORDER,
      }}>
      <CellButton flex={1.4} label={fieldMeta?.label || filter.field} onPress={() => setPicker('field')} />
      <CellButton width={52} label={opMeta?.label || filter.op} onPress={() => setPicker('op')} center />
      {needsValue ? (
        fieldMeta?.enum ? (
          <CellButton
            flex={1}
            label={String(filter.value ?? '').replace(/_/g, ' ') || 'value'}
            onPress={() => setPicker('value')}
          />
        ) : (
          <TextInput
            keyboardType={fieldMeta?.type === 'number' ? 'decimal-pad' : 'default'}
            inputMode={fieldMeta?.type === 'number' ? 'decimal' : 'text'}
            value={filter.value == null ? '' : String(filter.value)}
            onChangeText={(v) => update({ value: fieldMeta?.type === 'number' ? (v === '' ? '' : Number(v)) : v })}
            placeholder="value"
            placeholderTextColor={STUDY_MUTED}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 12,
              fontFamily: monoFont,
              paddingHorizontal: 8,
              paddingVertical: 6,
              color: STUDY_TEXT,
              borderLeftWidth: 1,
              borderLeftColor: STUDY_BORDER_STRONG,
            }}
          />
        )
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 8 }}>
          <Text style={{ fontSize: 12, color: STUDY_MUTED }}>—</Text>
        </View>
      )}

      <Pressable onPress={onRemove} accessibilityLabel="Remove filter" hitSlop={6} style={{ justifyContent: 'center', paddingHorizontal: 8 }}>
        <Text style={{ fontSize: 14, color: STUDY_MUTED }}>×</Text>
      </Pressable>

      <PickerSheet
        open={picker === 'field'}
        onClose={() => setPicker(null)}
        title="Filter field"
        value={filter.field}
        options={ALL_FIELDS.map((f) => ({ value: f.value, label: `${f.label} (${f.group})` }))}
        onSelect={(v) => setField(String(v))}
      />
      <PickerSheet
        open={picker === 'op'}
        onClose={() => setPicker(null)}
        title="Operator"
        value={filter.op}
        options={OPERATORS.filter((o) => !o.numeric || !fieldMeta?.enum).map((o) => ({ value: o.value, label: o.label }))}
        onSelect={(v) => update({ op: String(v) })}
      />
      <PickerSheet
        open={picker === 'value'}
        onClose={() => setPicker(null)}
        title={fieldMeta?.label}
        value={String(filter.value ?? '')}
        options={(fieldMeta?.enum || []).map((v) => ({ value: v, label: v.replace(/_/g, ' ') }))}
        onSelect={(v) => update({ value: String(v) })}
      />
    </View>
  );
}

function CellButton({
  label,
  onPress,
  flex,
  width,
  center,
}: {
  label: string;
  onPress: () => void;
  flex?: number;
  width?: number;
  center?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex,
        width,
        minWidth: 0,
        justifyContent: 'center',
        alignItems: center ? 'center' : 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 6,
      }}>
      <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: monoFont, color: STUDY_TEXT }}>
        {label}
      </Text>
    </Pressable>
  );
}
