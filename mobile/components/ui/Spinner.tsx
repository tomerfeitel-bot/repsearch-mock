import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/lib/theme';

export function Spinner({ size = 'small' as 'small' | 'large' }) {
  return <ActivityIndicator size={size} color={colors.text} />;
}

// Full-screen centered spinner used while auth state resolves.
export function ScreenSpinner() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-950">
      <Spinner size="large" />
    </View>
  );
}
