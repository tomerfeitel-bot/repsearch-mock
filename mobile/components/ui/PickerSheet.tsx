import { Picker } from '@react-native-picker/picker';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Sheet } from './Sheet';
import { colors } from '@/lib/theme';

export type PickerOption = { value: string | number; label: string };

// Native replacement (decision D4) for the web app's custom snap-scroll drum
// and for <select> elements: iOS gets the system wheel, Android gets a plain
// option list (its Picker renders as a dropdown, which reads worse in a sheet).
export function PickerSheet({
  open,
  onClose,
  title,
  value,
  options,
  onSelect,
  onClear,
  clearLabel = 'Prefer not to say',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  value: string | number | '';
  options: PickerOption[];
  onSelect: (value: string | number) => void;
  onClear?: () => void;
  clearLabel?: string;
}) {
  // iOS commits on Done so spinning the wheel doesn't fire onSelect per detent.
  const [draft, setDraft] = useState<string | number>(value === '' ? options[0]?.value : value);
  useEffect(() => {
    if (open) setDraft(value === '' ? options[0]?.value : value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const footer = onClear ? (
    <Pressable
      onPress={() => {
        onClear();
        onClose();
      }}
      style={{ paddingVertical: 12, alignItems: 'center' }}>
      <Text style={{ fontSize: 12, color: colors.inkSoft }}>{clearLabel}</Text>
    </Pressable>
  ) : null;

  if (Platform.OS === 'ios') {
    return (
      <Sheet open={open} onClose={onClose} title={title} scrollable={false}>
        <Picker selectedValue={draft} onValueChange={(v) => setDraft(v)} itemStyle={{ color: colors.text }}>
          {options.map((o) => (
            <Picker.Item key={String(o.value)} label={o.label} value={o.value} color={colors.text} />
          ))}
        </Picker>
        <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
          <Pressable
            onPress={() => {
              onSelect(draft);
              onClose();
            }}
            style={{
              minHeight: 48,
              borderRadius: 16,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ fontWeight: '600', color: colors.accentInk }}>Done</Text>
          </Pressable>
          {footer}
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title={title} scrollable={false}>
      <ScrollView style={{ maxHeight: 360 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => {
                onSelect(o.value);
                onClose();
              }}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 20,
                backgroundColor: on ? colors.surfaceAlt : 'transparent',
              }}>
              <Text style={{ fontSize: 15, color: on ? colors.text : colors.textMuted, fontWeight: on ? '600' : '400' }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ paddingHorizontal: 16 }}>{footer}</View>
    </Sheet>
  );
}
