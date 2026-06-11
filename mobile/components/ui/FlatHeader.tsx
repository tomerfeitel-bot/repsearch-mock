import { type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';

// Recreation of src/components/ui/FlatHeader.jsx (the de-bubbled page shelf).
// The web version collapses its `tabs` sub-nav on scroll-down and brings it
// back on scroll-up via a window scroll listener + CSS grid rows; here a
// Reanimated shared value (0 expanded, 1 collapsed) is driven from the
// screen's list on the UI thread. Screens do:
//
//   const { collapse, onScroll } = useDirectionalCollapse();
//   <FlatHeader title="..." tabs={...} collapse={collapse} />
//   <Animated.FlatList onScroll={onScroll} scrollEventThrottle={16} ... />
const EXPAND_AT = 8; // always expanded at/above this scroll position
const MIN_COLLAPSE_Y = 64; // don't collapse until scrolled past the header zone
const DELTA = 6; // ignore sub-pixel/jitter scrolls

export function useDirectionalCollapse() {
  const collapse = useSharedValue(0);
  const lastY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    const y = event.contentOffset.y;
    if (y <= EXPAND_AT) {
      collapse.value = withTiming(0, { duration: 180 });
      lastY.value = y;
      return;
    }
    const dy = y - lastY.value;
    if (Math.abs(dy) < DELTA) return;
    if (dy > 0 && y > MIN_COLLAPSE_Y) collapse.value = withTiming(1, { duration: 180 });
    else if (dy < 0) collapse.value = withTiming(0, { duration: 180 });
    lastY.value = y;
  });
  return { collapse, onScroll };
}

const TABS_MAX_HEIGHT = 48;

export default function FlatHeader({
  title,
  titleColor = colors.text,
  action,
  tabs,
  collapse,
  tabsMaxHeight = TABS_MAX_HEIGHT,
}: {
  title: string;
  titleColor?: string;
  action?: ReactNode;
  tabs?: ReactNode;
  collapse?: ReturnType<typeof useDirectionalCollapse>['collapse'];
  // Taller sub-navs (e.g. Study's two-line mode switch) pass their real height
  // so the collapse animation doesn't clip them while expanded.
  tabsMaxHeight?: number;
}) {
  const insets = useSafeAreaInsets();
  const still = useSharedValue(0);
  const c = collapse ?? still;

  const tabsStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(c.value, [0, 1], [tabsMaxHeight, 0]),
    opacity: 1 - c.value,
  }));

  return (
    <View style={{ backgroundColor: colors.bg, paddingTop: insets.top + 12, zIndex: 20 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: titleColor }}>
          {title}
        </Text>
        {action ? <View style={{ flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 6 }}>{action}</View> : null}
      </View>
      {tabs ? <Animated.View style={[{ overflow: 'hidden' }, tabsStyle]}>{tabs}</Animated.View> : null}
    </View>
  );
}
