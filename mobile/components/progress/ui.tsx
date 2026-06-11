// Port of src/components/progress/ui.jsx — the de-bubbled Progress dashboard
// primitives every tab composes from: Section (titled block), StatTile (one
// earned number, gridded), DataRow (one quantitative record), ChartBlock (the
// color hero), plus shared empty / error / loading states.
import { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  PROGRESS_ACCENT,
  PROGRESS_BORDER,
  PROGRESS_CARD,
  PROGRESS_MUTED,
  PROGRESS_TEXT,
} from '@/lib/progressTheme';
import { colors, monoFont } from '@/lib/theme';

const HAIR = PROGRESS_BORDER;

export function Section({
  title,
  caption,
  action,
  children,
  divider = true,
}: {
  title?: string | null;
  caption?: string;
  action?: ReactNode;
  children: ReactNode;
  divider?: boolean;
}) {
  return (
    <View style={divider ? { borderTopWidth: 1, borderTopColor: HAIR, paddingTop: 18 } : undefined}>
      {(title || action) && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {title ? (
              <Text style={{ fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, color: PROGRESS_MUTED }}>
                {title}
              </Text>
            ) : null}
            {caption ? (
              <Text style={{ fontSize: 13, marginTop: 4, lineHeight: 18, color: PROGRESS_TEXT }}>{caption}</Text>
            ) : null}
          </View>
          {action ? <View style={{ flexShrink: 0 }}>{action}</View> : null}
        </View>
      )}
      {children}
    </View>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row' }}>{children}</View>;
}

export function StatTile({
  label,
  value,
  unit,
  sub,
  color,
  first,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: string;
  color?: string;
  first?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: 4,
        paddingHorizontal: first ? 0 : 12,
        paddingRight: 12,
        borderLeftWidth: first ? 0 : 1,
        borderLeftColor: HAIR,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text numberOfLines={1} style={{ fontSize: 24, fontWeight: '700', fontFamily: monoFont, color: color || PROGRESS_TEXT }}>
          {value}
        </Text>
        {unit ? <Text style={{ fontSize: 14, fontWeight: '500', color: color || PROGRESS_MUTED }}>{unit}</Text> : null}
      </View>
      <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6, color: PROGRESS_MUTED }}>{label}</Text>
      {sub ? <Text style={{ fontSize: 11, fontFamily: monoFont, marginTop: 2, color: PROGRESS_MUTED }}>{sub}</Text> : null}
    </View>
  );
}

// A signed delta, colored by meaning (pass an explicit `color` for metrics
// where direction isn't good-or-bad).
export function Delta({ value, unit = '', digits = 1, color }: { value: number | null; unit?: string; digits?: number; color?: string }) {
  if (value == null) return null;
  const sign = value >= 0 ? '+' : '';
  return (
    <Text style={{ fontFamily: monoFont, fontSize: 14, fontWeight: '600', color: color || PROGRESS_TEXT }}>
      {sign}
      {value.toFixed(digits)}
      {unit}
    </Text>
  );
}

export function DataRow({
  dot,
  label,
  sub,
  value,
  valueColor,
  trailing,
  onPress,
}: {
  dot?: string;
  label: string;
  sub?: string;
  value?: string | null;
  valueColor?: string;
  trailing?: ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <>
      {dot ? <View style={{ height: 10, width: 10, borderRadius: 5, flexShrink: 0, backgroundColor: dot }} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '500', color: PROGRESS_TEXT }}>
          {label}
        </Text>
        {sub ? (
          <Text numberOfLines={1} style={{ fontSize: 11, marginTop: 2, color: PROGRESS_MUTED }}>
            {sub}
          </Text>
        ) : null}
      </View>
      {value != null ? (
        <Text style={{ fontFamily: monoFont, fontSize: 14, fontWeight: '600', flexShrink: 0, color: valueColor || PROGRESS_TEXT }}>
          {value}
        </Text>
      ) : null}
      {trailing}
    </>
  );
  const style = {
    width: '100%' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: HAIR,
    minHeight: 44,
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [style, pressed && { opacity: 0.7 }]}>
        {content}
      </Pressable>
    );
  }
  return <View style={style}>{content}</View>;
}

// The Chart Block — the analytical payoff and primary color carrier.
export function ChartBlock({
  title,
  caption,
  height = 150,
  action,
  children,
}: {
  title: string;
  caption?: string;
  height?: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Section title={title} caption={caption} action={action}>
      <View
        style={{
          borderRadius: 16,
          paddingHorizontal: 12,
          paddingTop: 12,
          paddingBottom: 8,
          backgroundColor: PROGRESS_CARD,
          borderWidth: 1,
          borderColor: HAIR,
        }}>
        <View style={{ width: '100%', height }}>{children}</View>
      </View>
    </Section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <Text style={{ textAlign: 'center', paddingVertical: 32, fontSize: 14, color: PROGRESS_MUTED }}>{children}</Text>
  );
}

export function ChartEmpty({ title, message }: { title: string; message: string }) {
  return (
    <Section title={title}>
      <View
        style={{
          borderRadius: 16,
          paddingVertical: 40,
          paddingHorizontal: 16,
          backgroundColor: 'rgba(255,255,255,0.02)',
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: HAIR,
        }}>
        <Text style={{ textAlign: 'center', fontSize: 14, color: PROGRESS_MUTED }}>{message}</Text>
      </View>
    </Section>
  );
}

export function InlineWarning({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View
      style={{
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        backgroundColor: PROGRESS_CARD,
        borderWidth: 1,
        borderColor: HAIR,
      }}>
      <Text style={{ flex: 1, fontSize: 14, color: PROGRESS_MUTED }}>{message}</Text>
      <Pressable onPress={onRetry} hitSlop={8}>
        <Text style={{ fontWeight: '600', color: PROGRESS_ACCENT }}>Retry</Text>
      </Pressable>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48 }}>
      <Text style={{ fontSize: 14, color: PROGRESS_MUTED }}>{message}</Text>
      <Pressable
        onPress={onRetry}
        style={{
          marginTop: 12,
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 999,
          backgroundColor: colors.emerald,
        }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.onEmerald }}>Try again</Text>
      </Pressable>
    </View>
  );
}

export function Skeleton({ blocks = [80, 220, 140] }: { blocks?: number[] }) {
  return (
    <View style={{ gap: 16 }}>
      {blocks.map((h, i) => (
        <View key={i} style={{ borderRadius: 16, height: h, backgroundColor: 'rgba(255,255,255,0.03)' }} />
      ))}
    </View>
  );
}

// Mode switch — a framed segmented control for switching between tools
// (Single vs Compare). Active uses the brand-green selection language.
export function ModeSwitch({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        alignSelf: 'flex-start',
        borderRadius: 12,
        padding: 4,
        gap: 4,
        backgroundColor: PROGRESS_CARD,
        borderWidth: 1,
        borderColor: HAIR,
      }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: active ? colors.emerald : 'transparent',
            }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: active ? colors.onEmerald : PROGRESS_MUTED }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Filter chip — solid fill when active. `accent` is the active fill.
export function Chip({
  active,
  onPress,
  accent = colors.emerald,
  onAccent = colors.onEmerald,
  size = 'md',
  children,
}: {
  active?: boolean;
  onPress?: () => void;
  accent?: string;
  onAccent?: string;
  size?: 'sm' | 'md';
  children: ReactNode;
}) {
  const pad = size === 'sm' ? { paddingHorizontal: 12, paddingVertical: 6 } : { paddingHorizontal: 16, paddingVertical: 8 };
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 999,
        ...pad,
        backgroundColor: active ? accent : 'transparent',
        borderWidth: 1,
        borderColor: active ? accent : HAIR,
      }}>
      <Text style={{ fontSize: size === 'sm' ? 12 : 14, fontWeight: '600', color: active ? onAccent : PROGRESS_TEXT }}>
        {children}
      </Text>
    </Pressable>
  );
}

// Primary action — the app-wide emerald brand button.
export function PrimaryButton({
  onPress,
  disabled,
  children,
  paddingVertical = 12,
}: {
  onPress?: () => void;
  disabled?: boolean;
  children: ReactNode;
  paddingVertical?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        borderRadius: 999,
        paddingVertical,
        alignItems: 'center',
        backgroundColor: colors.emerald,
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
      })}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.onEmerald }}>{children}</Text>
    </Pressable>
  );
}
