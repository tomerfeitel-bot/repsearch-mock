import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconDots } from '@/components/community/PostCard';
import { MenuRow, ReportSheet } from '@/components/community/ModerationSheets';
import ProfileSummary from '@/components/profile/ProfileSummary';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useModeration } from '@/hooks/useModeration';
import { api } from '@/lib/api';
import { colors } from '@/lib/theme';

// Port of src/pages/UserProfile.jsx — public profile + follow toggle. The web
// relied on browser back; here the sticky header carries a back button. The
// header ⋯ menu adds report/block (App Store UGC requirement).
export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { user: viewer } = useAuth();
  const { block, unblock } = useModeration(toast);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.get(`/public/users/${encodeURIComponent(username)}`));
    } catch (err: any) {
      toast(err.message || 'Failed to load profile', 'error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [username, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleFollow() {
    const targetId = data?.user?.id;
    if (!targetId) return;
    setFollowBusy(true);
    try {
      if (data?.viewer?.follows_them) {
        await api.del(`/social/follow/${targetId}`);
      } else {
        await api.post(`/social/follow/${targetId}`);
      }
      await load();
    } catch (err: any) {
      toast(err.message || 'Failed to update follow', 'error');
    } finally {
      setFollowBusy(false);
    }
  }

  async function confirmBlock() {
    setBlockConfirm(false);
    if (!data?.user?.id) return;
    if (await block(data.user.id, data.user.username)) await load();
  }

  async function doUnblock() {
    if (!data?.user?.id) return;
    if (await unblock(data.user.id, data.user.username)) await load();
  }

  const isSelf = !!viewer && viewer.id === data?.user?.id;
  const blockedByMe = !!data?.blocked;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingTop: insets.top,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 6,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.bg,
          zIndex: 10,
        }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Back"
          style={{ height: 40, width: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Line x1={19} y1={12} x2={5} y2={12} stroke={colors.text} strokeWidth={1.8} strokeLinecap="round" />
            <Polyline points="12 19 5 12 12 5" stroke={colors.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 22, fontWeight: '700', color: colors.text }}>
          {username}
        </Text>
        {!isSelf && data?.user?.id ? (
          <Pressable
            onPress={() => setMenuOpen(true)}
            accessibilityLabel="Profile options"
            style={{ height: 40, width: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
            <IconDots size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 }}>
        {blockedByMe ? (
          <View style={{ paddingHorizontal: 16, paddingVertical: 32 }}>
            <View
              style={{
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: colors.border,
                paddingVertical: 32,
                alignItems: 'center',
              }}>
              <Avatar username={data?.user?.username} size="xl" />
              <Text style={{ marginTop: 16, fontSize: 20, fontWeight: '800', color: colors.text }}>
                {data?.user?.username}
              </Text>
              <Text style={{ marginTop: 8, fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
                You've blocked this user. You won't see each other's content.
              </Text>
              <Pressable
                onPress={doUnblock}
                style={{
                  marginTop: 20,
                  minHeight: 44,
                  paddingHorizontal: 20,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Unblock</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <ProfileSummary
            data={data}
            loading={loading}
            privateView={!!data?.private}
            onFollow={toggleFollow}
            followBusy={followBusy}
          />
        )}
      </ScrollView>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Profile options" scrollable={false}>
        <View style={{ paddingBottom: 16 }}>
          <MenuRow
            label="Report user"
            onPress={() => {
              setMenuOpen(false);
              setReportOpen(true);
            }}
            first
          />
          {blockedByMe ? (
            <MenuRow
              label={`Unblock @${data?.user?.username}`}
              onPress={() => {
                setMenuOpen(false);
                doUnblock();
              }}
            />
          ) : (
            <MenuRow
              label={`Block @${data?.user?.username}`}
              onPress={() => {
                setMenuOpen(false);
                setBlockConfirm(true);
              }}
              danger
            />
          )}
        </View>
      </Sheet>
      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={data?.user?.id ?? null} />
      <ConfirmSheet
        open={blockConfirm}
        onClose={() => setBlockConfirm(false)}
        onConfirm={confirmBlock}
        title={`Block @${data?.user?.username}?`}
        message="You won't see each other's posts, comments, workouts, or profiles. They won't be notified."
        confirmLabel="Block"
        danger
      />
    </View>
  );
}
