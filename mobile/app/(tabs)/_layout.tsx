import { Tabs } from 'expo-router';
import BottomNav from '@/components/BottomNav';
import { colors } from '@/lib/theme';

// The 5-slot tab shell. Order matters: BottomNav renders routes in state order
// and raises the middle (workout) trigger out of the bar.
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen name="community" />
      <Tabs.Screen name="study" />
      <Tabs.Screen name="workout" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
