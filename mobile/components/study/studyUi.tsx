// Shared Study primitives ported from the bottom of src/pages/Study.jsx:
// SectionTitle, Notice, EmptyText, SkeletonRows, EvidenceBadge, Chip,
// StepCard, Field, MiniMetric, plus the brand button.
import { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  STUDY_ACCENT,
  STUDY_ACCENT_FAINT,
  STUDY_BORDER,
  STUDY_BORDER_STRONG,
  STUDY_BRAND,
  STUDY_BRAND_FAINT,
  STUDY_CARD,
  STUDY_MUTED,
  STUDY_ON_BRAND,
  STUDY_TEXT,
} from '@/lib/researchTheme';
import { monoFont } from '@/lib/theme';

export function SectionTitle({ title, body }: { title: string; body?: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.2, color: STUDY_TEXT }}>
        {title}
      </Text>
      {body ? <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 17, color: STUDY_MUTED }}>{body}</Text> : null}
    </View>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <View style={{ borderRadius: 16, padding: 16, backgroundColor: STUDY_BRAND_FAINT, borderWidth: 1, borderColor: STUDY_BRAND }}>
      <Text style={{ fontSize: 12, lineHeight: 17, color: STUDY_TEXT }}>{children}</Text>
    </View>
  );
}

export function EmptyText({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 16,
        padding: 24,
        backgroundColor: STUDY_CARD,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: STUDY_BORDER,
      }}>
      <Text style={{ textAlign: 'center', fontSize: 12, color: STUDY_MUTED }}>{children}</Text>
    </View>
  );
}

export function SkeletonRows() {
  return (
    <View style={{ gap: 12 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ height: 96, borderRadius: 16, backgroundColor: STUDY_CARD, borderWidth: 1, borderColor: STUDY_BORDER }} />
      ))}
    </View>
  );
}

export function EvidenceBadge({ status }: { status?: string }) {
  const color = status === 'Strong' ? STUDY_ACCENT : status === 'Good' ? '#9cae7a' : status === 'Sparse' ? '#c08a5a' : STUDY_MUTED;
  return (
    <View
      style={{
        flexShrink: 0,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: `${color}22`,
        borderWidth: 1,
        borderColor: `${color}66`,
      }}>
      <Text style={{ fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, color }}>
        {status || 'Not enough'}
      </Text>
    </View>
  );
}

export function Chip({ active, children, onPress }: { active?: boolean; children: ReactNode; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: active ? STUDY_ACCENT_FAINT : STUDY_CARD,
        borderWidth: 1,
        borderColor: active ? STUDY_ACCENT : STUDY_BORDER,
      }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? STUDY_TEXT : STUDY_MUTED }}>{children}</Text>
    </Pressable>
  );
}

export function StepCard({ number, title, body, children }: { number: string; title: string; body?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 12, borderRadius: 16, padding: 16, backgroundColor: STUDY_CARD, borderWidth: 1, borderColor: STUDY_BORDER }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View
          style={{
            height: 28,
            width: 28,
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 14,
            backgroundColor: STUDY_BRAND,
          }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: STUDY_ON_BRAND }}>{number}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: STUDY_TEXT }}>{title}</Text>
          {body ? <Text style={{ fontSize: 12, lineHeight: 17, color: STUDY_MUTED }}>{body}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: STUDY_MUTED }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

export function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, borderRadius: 12, padding: 12, backgroundColor: STUDY_CARD, borderWidth: 1, borderColor: STUDY_BORDER }}>
      <Text style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, color: STUDY_MUTED }}>{label}</Text>
      <Text numberOfLines={1} style={{ marginTop: 4, fontFamily: monoFont, fontSize: 13, fontWeight: '600', color: STUDY_TEXT }}>
        {value}
      </Text>
    </View>
  );
}

export function BrandButton({
  onPress,
  disabled,
  children,
  secondary,
  paddingVertical = 12,
}: {
  onPress?: () => void;
  disabled?: boolean;
  children: ReactNode;
  secondary?: boolean;
  paddingVertical?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flex: 1,
        borderRadius: 12,
        paddingVertical,
        alignItems: 'center',
        backgroundColor: secondary ? STUDY_CARD : STUDY_BRAND,
        borderWidth: secondary ? 1 : 0,
        borderColor: STUDY_BORDER_STRONG,
        opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
      })}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: secondary ? STUDY_TEXT : STUDY_ON_BRAND }}>{children}</Text>
    </Pressable>
  );
}
