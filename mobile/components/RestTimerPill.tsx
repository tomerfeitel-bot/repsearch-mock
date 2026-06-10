import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';

const PRESETS = [60, 90, 120, 180];

// Port of src/components/workout/RestTimerPill.jsx with navigator.vibrate
// swapped for expo-haptics. Same prop contract as the web component.
export default function RestTimerPill({
  active,
  durationSec = 90,
  startedAt = 0,
  stacked = false,
  onRestart,
  onDismiss,
}: {
  active: boolean;
  durationSec?: number;
  startedAt?: number;
  stacked?: boolean;
  onRestart?: (durationSec: number) => void;
  onDismiss?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [remaining, setRemaining] = useState(durationSec);
  const [flashed, setFlashed] = useState(false);

  useEffect(() => {
    if (!active) {
      setRemaining(durationSec);
      setFlashed(false);
      return;
    }

    const started = startedAt || Date.now();
    setFlashed(false);
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const left = durationSec - elapsed;
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setFlashed(true);
        setTimeout(() => onDismiss?.(), 2000);
      }
    }, 250);
    return () => clearInterval(id);
  }, [active, durationSec, startedAt, onDismiss]);

  if (!active) return null;

  const done = remaining <= 0;
  const label = formatRest(Math.max(0, remaining));

  const smallButton = {
    borderRadius: 8,
    backgroundColor: 'rgba(8, 9, 10, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  } as const;
  const smallButtonText = { fontSize: 11, fontWeight: '600' as const, color: colors.textMuted };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: insets.bottom + (stacked ? 128 : 72),
        zIndex: 50,
        alignItems: 'center',
        paddingHorizontal: 12,
      }}>
      <View
        style={{
          width: '100%',
          maxWidth: 448,
          borderRadius: 16,
          borderWidth: 1,
          padding: 8,
          ...(done
            ? { backgroundColor: '#2f6e4a', borderColor: '#6fb088', opacity: flashed ? 0.85 : 1 }
            : { backgroundColor: 'rgba(20, 22, 21, 0.97)', borderColor: 'rgba(167, 123, 63, 0.6)' }),
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={() => onRestart?.(Math.max(15, durationSec - 15))}
            style={{ height: 36, borderRadius: 12, backgroundColor: 'rgba(8, 9, 10, 0.6)', paddingHorizontal: 12, justifyContent: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>-15s</Text>
          </Pressable>
          <Pressable
            onPress={() => onRestart?.(durationSec)}
            style={{ flex: 1, minWidth: 0, borderRadius: 12, backgroundColor: 'rgba(8, 9, 10, 0.4)', paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                fontVariant: ['tabular-nums'],
                color: done ? '#ffffff' : '#cda063',
              }}>
              {done ? 'Rest complete' : `Rest ${label}`}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onRestart?.(Math.min(600, durationSec + 15))}
            style={{ height: 36, borderRadius: 12, backgroundColor: 'rgba(8, 9, 10, 0.6)', paddingHorizontal: 12, justifyContent: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>+15s</Text>
          </Pressable>
        </View>
        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {PRESETS.map((seconds) => (
            <Pressable key={seconds} onPress={() => onRestart?.(seconds)} style={[smallButton, { flex: 1, alignItems: 'center' }]}>
              <Text style={smallButtonText}>{formatRest(seconds)}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => onRestart?.(durationSec)} style={smallButton}>
            <Text style={smallButtonText}>Restart</Text>
          </Pressable>
          <Pressable onPress={onDismiss} style={smallButton}>
            <Text style={smallButtonText}>Dismiss</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function formatRest(seconds: number) {
  const n = Number(seconds) || 0;
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
