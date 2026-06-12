import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { REPORT_REASONS, useModeration, type ReportTargetType } from '@/hooks/useModeration';
import { colors } from '@/lib/theme';

// Moderation UI shared by the feed, post detail, and user profile screens:
// the post/user overflow menu, the report form, and the blocked-users manager.

export function MenuRow({
  label,
  onPress,
  danger = false,
  first = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  first?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 52,
        justifyContent: 'center',
        paddingHorizontal: 16,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
      }}>
      <Text style={{ fontSize: 15, fontWeight: '600', color: danger ? '#fca5a5' : colors.text }}>{label}</Text>
    </Pressable>
  );
}

// Overflow menu for a post: report/block for others' posts, delete for own.
export function PostMenuSheet({
  open,
  onClose,
  isOwn,
  username,
  onReport,
  onBlock,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  isOwn: boolean;
  username?: string;
  onReport: () => void;
  onBlock: () => void;
  onDelete: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Post options" scrollable={false}>
      <View style={{ paddingBottom: 16 }}>
        {isOwn ? (
          <MenuRow label="Delete post" onPress={onDelete} danger first />
        ) : (
          <>
            <MenuRow label="Report post" onPress={onReport} first />
            <MenuRow label={`Block ${username ? `@${username}` : 'user'}`} onPress={onBlock} danger />
          </>
        )}
      </View>
    </Sheet>
  );
}

const TARGET_TITLES: Record<ReportTargetType, string> = {
  post: 'Report post',
  comment: 'Report comment',
  user: 'Report user',
};

// Reason picker + optional details. Submission goes through useModeration so
// the confirmation toast is consistent everywhere.
export function ReportSheet({
  open,
  onClose,
  targetType,
  targetId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string | null;
  onDone?: () => void;
}) {
  const toast = useToast();
  const { report } = useModeration(toast);
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  // Fresh form per target.
  useEffect(() => {
    if (open) {
      setReason(null);
      setDetails('');
    }
  }, [open, targetId]);

  async function submit() {
    if (!reason || !targetId || sending) return;
    setSending(true);
    try {
      const ok = await report(targetType, targetId, reason, details.trim());
      if (ok) {
        onClose();
        onDone?.();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={TARGET_TITLES[targetType]}>
      <View style={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <Text style={{ fontSize: 13, color: colors.textMuted }}>
          Tell us what's wrong. Reports are reviewed within 24 hours and the author isn't notified.
        </Text>
        <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          {REPORT_REASONS.map((r, i) => {
            const active = reason === r.v;
            return (
              <Pressable
                key={r.v}
                onPress={() => setReason(r.v)}
                style={{
                  minHeight: 48,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 14,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                  backgroundColor: active ? colors.surfaceAlt : 'transparent',
                }}>
                <Text style={{ fontSize: 14, fontWeight: active ? '700' : '500', color: colors.text }}>{r.label}</Text>
                <View
                  style={{
                    height: 18,
                    width: 18,
                    borderRadius: 9,
                    borderWidth: 2,
                    borderColor: active ? colors.emerald : colors.borderStrong,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {active ? <View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: colors.emerald }} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          value={details}
          onChangeText={setDetails}
          multiline
          placeholder="Anything else we should know? (optional)"
          placeholderTextColor={colors.textMuted}
          style={{
            minHeight: 72,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceAlt,
            padding: 12,
            fontSize: 14,
            color: colors.text,
            textAlignVertical: 'top',
          }}
        />
        <Pressable
          onPress={submit}
          disabled={!reason || sending}
          style={{
            minHeight: 48,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.negative,
            opacity: !reason || sending ? 0.5 : 1,
          }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>
            {sending ? 'Sending...' : 'Submit report'}
          </Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

// Settings → Blocked users: list + unblock.
export function BlockedUsersSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const { loadBlocked, unblock } = useModeration(toast);
  const [blocked, setBlocked] = useState<{ id: string; username: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadBlocked()
      .then(setBlocked)
      .finally(() => setLoading(false));
  }, [open, loadBlocked]);

  async function doUnblock(u: { id: string; username: string }) {
    if (await unblock(u.id, u.username)) {
      setBlocked((prev) => prev.filter((b) => b.id !== u.id));
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Blocked users">
      <View style={{ padding: 16, paddingBottom: 32 }}>
        {loading ? (
          <Text style={{ fontSize: 14, color: colors.textMuted }}>Loading...</Text>
        ) : blocked.length === 0 ? (
          <Text style={{ fontSize: 14, color: colors.textMuted }}>
            You haven't blocked anyone. Blocked users can't see your posts, and you won't see theirs.
          </Text>
        ) : (
          blocked.map((u, i) => (
            <View
              key={u.id}
              style={{
                minHeight: 52,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{u.username}</Text>
              <Pressable
                onPress={() => doUnblock(u)}
                style={{
                  minHeight: 36,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>Unblock</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
    </Sheet>
  );
}
