import { type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '@/lib/theme';

// Recreation of src/components/ui/BubbleHeader.jsx. The web version drives a
// --collapse CSS variable from window.scrollY; here a Reanimated shared value
// is driven from the screen's scroll view on the UI thread. Screens do:
//
//   const { progress, onScroll } = useBubbleCollapse();
//   <BubbleHeader progress={progress} ... />
//   <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16}>...
//
// Same collapse mapping as the web: scrollY 8 -> 104 maps to progress 0 -> 1.
const EXPAND_AT = 8;
const COLLAPSE_AT = 104;

export function useBubbleCollapse() {
  const progress = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    const y = event.contentOffset.y;
    progress.value = Math.min(1, Math.max(0, (y - EXPAND_AT) / (COLLAPSE_AT - EXPAND_AT)));
  });
  return { progress, onScroll };
}

function Collapsible({
  progress,
  maxHeight,
  fadeBy = 1,
  spacing = 0,
  spacingSide = 'marginTop',
  children,
}: {
  progress: SharedValue<number>;
  maxHeight: number;
  fadeBy?: number;
  spacing?: number;
  spacingSide?: 'marginTop' | 'marginBottom';
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    maxHeight: (1 - progress.value) * maxHeight,
    opacity: Math.max(0, 1 - progress.value / fadeBy),
    [spacingSide]: (1 - progress.value) * spacing,
  }));
  return <Animated.View style={[{ overflow: 'hidden' }, style]}>{children}</Animated.View>;
}

export default function BubbleHeader({
  label,
  title,
  subtitle,
  action,
  pills,
  children,
  progress,
  tint = colors.surfaceAlt,
}: {
  label?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  pills?: string[];
  children?: ReactNode;
  progress?: SharedValue<number>;
  tint?: string;
}) {
  const insets = useSafeAreaInsets();
  const still = useSharedValue(0);
  const p = progress ?? still;
  const hasExtra = Boolean(children || subtitle || (pills && pills.length > 0));

  const heroStyle = useAnimatedStyle(() => ({
    paddingTop: 16 - p.value * 6,
    paddingBottom: 16 - p.value * 6,
    minHeight: (1 - p.value) * 108,
  }));

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 12, backgroundColor: colors.bg, zIndex: 20 }}>
      <View
        style={{
          padding: 12,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius,
        }}>
        <Animated.View
          style={[
            {
              borderRadius: 16,
              justifyContent: 'center',
              paddingHorizontal: 16,
              // RN has no diagonal CSS gradients without extra deps; the tint
              // as a flat fill keeps the same page-atmosphere read.
              backgroundColor: tint,
            },
            heroStyle,
          ]}>
          {label ? (
            <Collapsible progress={p} maxHeight={32} fadeBy={0.55} spacing={8} spacingSide="marginBottom">
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: colors.brass,
                }}>
                {label}
              </Text>
            </Collapsible>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minWidth: 0 }}>
            {title ? (
              <Text
                numberOfLines={1}
                style={{ flex: 1, fontSize: 24, lineHeight: 27, fontWeight: '800', letterSpacing: -0.5, color: colors.text }}>
                {title}
              </Text>
            ) : null}
            {action ? <View style={{ flexShrink: 0 }}>{action}</View> : null}
          </View>

          {hasExtra ? (
            <Collapsible progress={p} maxHeight={128} spacing={8}>
              {children || (
                <>
                  {subtitle ? <Text style={{ fontSize: 12, color: colors.textMuted }}>{subtitle}</Text> : null}
                  {pills && pills.length > 0 ? (
                    <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {pills.map((pill, i) => (
                        <View
                          key={i}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 999,
                            backgroundColor: colors.accentSoft,
                          }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{pill}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </>
              )}
            </Collapsible>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}
