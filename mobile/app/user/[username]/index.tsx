import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfileSummary from '@/components/profile/ProfileSummary';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { colors } from '@/lib/theme';

// Port of src/pages/UserProfile.jsx — public profile + follow toggle. The web
// relied on browser back; here the sticky header carries a back button.
export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);

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
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 }}>
        <ProfileSummary
          data={data}
          loading={loading}
          privateView={!!data?.private}
          onFollow={toggleFollow}
          followBusy={followBusy}
        />
      </ScrollView>
    </View>
  );
}
