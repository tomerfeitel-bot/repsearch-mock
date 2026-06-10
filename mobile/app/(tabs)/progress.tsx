import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';

// Session-1 placeholder — Progress tabs and charts land in Session 5.
export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 24, paddingHorizontal: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>Progress</Text>
      <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 21, color: colors.textMuted }}>
        History, lifts, body and records charts arrive in Session 5.
      </Text>
    </View>
  );
}
