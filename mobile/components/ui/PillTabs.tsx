import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors, radius } from '@/lib/theme';

type TabItem = string | { value: string; label: string };

// Port of src/components/ui/PillTabs.jsx — the "Rubber Brass" segmented
// control. Same props; CSS variables become theme constants.
export default function PillTabs({
  tabs,
  value,
  onChange,
  scroll = false,
  accent = colors.accent,
  accentInk = colors.accentInk,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  scroll?: boolean;
  accent?: string;
  accentInk?: string;
}) {
  const items = tabs.map((t) => (typeof t === 'string' ? { value: t, label: t } : t));

  const container = {
    flexDirection: 'row' as const,
    gap: 4,
    padding: 4,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius + 2,
  };

  const segments = items.map((t) => {
    const on = value === t.value;
    return (
      <Pressable
        key={t.value}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        onPress={() => onChange(t.value)}
        style={{
          height: 32,
          borderRadius: radius - 4,
          backgroundColor: on ? accent : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          ...(scroll ? { paddingHorizontal: 16 } : { flex: 1, minWidth: 0, paddingHorizontal: 8 }),
        }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 12, fontWeight: '600', color: on ? accentInk : colors.textMuted }}>
          {t.label}
        </Text>
      </Pressable>
    );
  });

  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={container}>
        {segments}
      </ScrollView>
    );
  }
  return <View style={container}>{segments}</View>;
}
