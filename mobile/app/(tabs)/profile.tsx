import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/lib/theme';

// Session-1 placeholder — the full profile (athlete card, stats, daily log
// hub, builders entry points) lands in Session 4. Logout lives here already so
// the Session-1 auth loop can be verified end to end.
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const toast = useToast();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 24, paddingHorizontal: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>Profile</Text>

      <View
        style={{
          marginTop: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          padding: 16,
          borderRadius: 18,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
        <Avatar username={user?.username} size="lg" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
            {user?.username ?? '—'}
          </Text>
          <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 13, color: colors.textMuted }}>
            {user?.email ?? ''}
          </Text>
        </View>
      </View>

      <Text style={{ marginTop: 12, fontSize: 14, lineHeight: 21, color: colors.textMuted }}>
        Stats, edit profile, daily log and settings arrive in Session 4.
      </Text>

      <Pressable
        onPress={async () => {
          try {
            await logout();
          } catch {
            toast('Logout failed', 'error');
          }
        }}
        style={{
          marginTop: 24,
          minHeight: 48,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(155, 70, 61, 0.6)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ fontWeight: '600', color: '#c98f88' }}>Log out</Text>
      </Pressable>
    </View>
  );
}
