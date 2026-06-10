import { Pressable, Text, View } from 'react-native';
import { colors } from '@/lib/theme';

// Port of src/components/ui/UnderlineTabs.jsx — flat editorial tabs: a row of
// text labels, the active one bold + colored with a thick accent underline,
// the row closed by a single hairline.
export default function UnderlineTabs({
  tabs,
  value,
  onChange,
  accent = colors.brass,
  activeColor = colors.text,
  inactiveColor = colors.textMuted,
  borderColor = colors.border,
}: {
  tabs: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  accent?: string;
  activeColor?: string;
  inactiveColor?: string;
  borderColor?: string;
}) {
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 24,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: borderColor,
      }}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <Pressable
            key={t.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(t.value)}
            style={{ marginBottom: -1, paddingBottom: 10, paddingTop: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: active ? activeColor : inactiveColor }}>
              {t.label}
            </Text>
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 2.5,
                borderRadius: 2,
                backgroundColor: accent,
                opacity: active ? 1 : 0,
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
