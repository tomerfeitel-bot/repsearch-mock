import { type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/lib/theme';

// Recreation of src/components/BottomNav.jsx as an Expo Router custom tabBar:
// 5 slots with the raised circular Workout button popping out of the bar. The
// SVG paths are copied from the web component so the icons match exactly.
const ICON_PATHS: Record<string, string> = {
  community:
    'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 100-8 4 4 0 000 8zm6 0a3 3 0 100-6 3 3 0 000 6zm-12 0a3 3 0 100-6 3 3 0 000 6z',
  study:
    'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253',
  workout: 'M6 6l12 12M4 8l4-4 4 4M16 16l4 4M8 12l8-8M12 16l8-8',
  progress: 'M3 17l6-6 4 4 8-8M14 7h7v7',
  profile: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
};

const LABELS: Record<string, string> = {
  community: 'Community',
  study: 'Study',
  workout: 'Workout',
  progress: 'Progress',
  profile: 'Profile',
};

function TabIcon({ name, active, color }: { name: string; active: boolean; color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill={active ? color : 'none'}>
      <Path d={ICON_PATHS[name]} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function BottomNav({ state, navigation, insets }: BottomTabBarProps) {
  const go = (name: string, isFocused: boolean) => {
    if (!isFocused) navigation.navigate(name);
  };

  return (
    <View
      style={{
        backgroundColor: 'rgba(8, 9, 10, 0.97)',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: insets.bottom,
        flexDirection: 'row',
      }}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const name = route.name;
        if (name === 'workout') {
          return (
            <View key={route.key} style={{ flex: 1, alignItems: 'center' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Workout"
                onPress={() => go(name, isFocused)}
                style={{ position: 'absolute', top: -24, alignItems: 'center' }}>
                <View
                  style={{
                    height: 56,
                    width: 56,
                    borderRadius: 28,
                    backgroundColor: '#fafaf9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 4,
                    borderColor: colors.bg,
                    shadowColor: '#000',
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 8,
                    ...(isFocused ? { borderColor: colors.emeraldInk } : {}),
                  }}>
                  <TabIcon name="workout" active={isFocused} color={isFocused ? colors.emeraldInk : colors.accentInk} />
                </View>
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    fontWeight: '500',
                    color: isFocused ? colors.emeraldInk : colors.inkSoft,
                  }}>
                  Workout
                </Text>
              </Pressable>
            </View>
          );
        }
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={() => go(name, isFocused)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12 }}>
            <TabIcon name={name} active={isFocused} color={isFocused ? colors.emeraldInk : colors.inkSoft} />
            <Text style={{ fontSize: 11, fontWeight: '500', color: isFocused ? colors.emeraldInk : colors.inkSoft }}>
              {LABELS[name] ?? name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
