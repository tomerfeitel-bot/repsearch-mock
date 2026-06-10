import { Pressable, Text, View } from 'react-native';
import { Sheet } from './Sheet';
import { colors } from '@/lib/theme';

// Port of src/components/ui/ConfirmSheet.jsx on the shared Sheet primitive.
// Same props so call sites port unchanged.
export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} scrollable={false}>
      <View style={{ padding: 16, gap: 16 }}>
        {message ? <Text style={{ fontSize: 14, color: colors.textMuted }}>{message}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={onClose}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMuted }}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: 14,
              backgroundColor: danger ? colors.negative : colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: danger ? '#ffffff' : colors.accentInk }}>
              {confirmLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Sheet>
  );
}
