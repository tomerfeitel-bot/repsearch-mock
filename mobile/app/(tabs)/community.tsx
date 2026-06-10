import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import BubbleHeader, { useBubbleCollapse } from '@/components/ui/BubbleHeader';
import PillTabs from '@/components/ui/PillTabs';
import { colors } from '@/lib/theme';

// Session-1 placeholder. The real feed (FlatList pagination, FeedCard,
// composer) lands in Session 2 — this screen exists to prove the BubbleHeader
// scroll collapse and PillTabs primitives on-device.
export default function CommunityScreen() {
  const { progress, onScroll } = useBubbleCollapse();
  const [tab, setTab] = useState('feed');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <BubbleHeader
        progress={progress}
        label="RepSearch"
        title="Community"
        subtitle="Scroll to watch this header collapse — Session 2 fills in the feed."
        pills={['Session 2', 'Feed + posts']}
      />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        <PillTabs tabs={[{ value: 'feed', label: 'Feed' }, { value: 'plans', label: 'Plans' }]} value={tab} onChange={setTab} />
        {Array.from({ length: 12 }).map((_, i) => (
          <View
            key={i}
            style={{
              marginTop: 12,
              height: 96,
              borderRadius: 18,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ color: colors.inkSoft, fontSize: 13 }}>
              {tab === 'feed' ? 'Feed card placeholder' : 'Plan card placeholder'} {i + 1}
            </Text>
          </View>
        ))}
      </Animated.ScrollView>
    </View>
  );
}
