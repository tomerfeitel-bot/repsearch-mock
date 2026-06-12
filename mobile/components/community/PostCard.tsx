import { useRouter } from 'expo-router';
import { Pressable, Share, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';
import { CompareResultChart, SingleResultChart } from '@/components/study/ResultsChart';
import { Avatar } from '@/components/ui/Avatar';
import { labelStyle } from '@/lib/bubbleColors';
import { colors, monoFont } from '@/lib/theme';
import { timeAgo } from '@/lib/timeAgo';
import type { PostItem } from '@/hooks/usePosts';

// Port of src/components/community/PostCard.jsx — the full-bleed feed item:
// meta marker → headline → attachment hero → explanation → byline + actions.
// One addition over the web: double-tapping the content area fires an upvote
// with a heart burst (the migration plan's FeedCard gesture, moved here since
// PostCard is the live feed card; the web FeedCard is dead code).
export const KIND_META: Record<string, { label: string; fill: string; on: string; ink: string }> = {
  discussion: { label: 'Discussion', fill: '#0B7A43', on: '#ffffff', ink: '#34BE73' },
  workout: { label: 'Workout', fill: '#007661', on: '#ffffff', ink: '#44BFA5' },
  program: { label: 'Program', fill: '#2D6DA5', on: '#ffffff', ink: '#5CABF2' },
  template: { label: 'Template', fill: '#7B5AAE', on: '#ffffff', ink: '#B38EF1' },
  study: { label: 'Study', fill: '#AB4477', on: '#ffffff', ink: '#EA7AAE' },
  pr: { label: 'PR', fill: '#B48226', on: '#0c0c0c', ink: '#F2B036' },
};

// A post is "hot" when it has clear traction.
function isHot(item: PostItem) {
  return (item.score || 0) >= 100 || (item.comment_count || 0) >= 5;
}

const HERO_KINDS = new Set(['workout', 'program', 'template', 'study']);

export default function PostCard({
  item,
  onVote,
  onToggleSave,
  onMenu,
}: {
  item: PostItem;
  onVote: (id: string, value: number) => void;
  onToggleSave: (id: string, next: boolean) => void;
  onMenu?: (item: PostItem) => void;
}) {
  const router = useRouter();
  const meta = KIND_META[item.kind] || KIND_META.discussion;
  const hasHero = HERO_KINDS.has(item.kind) && item.attachment;
  const hot = isHot(item);
  const replies = item.comment_count || 0;
  const open = () => router.push(`/post/${item.id}`);

  // Double-tap heart burst (GestureDetector + Reanimated, Expo Go safe).
  const heartX = useSharedValue(0);
  const heartY = useSharedValue(0);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const heartStyle = useAnimatedStyle(() => ({
    left: heartX.value - 20,
    top: heartY.value - 20,
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
  }));

  const upvoteFromDoubleTap = () => {
    if (item.viewer_vote !== 1) onVote(item.id, 1);
  };

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(300)
    .onEnd((e, success) => {
      if (!success) return;
      heartX.value = e.x;
      heartY.value = e.y;
      heartScale.value = 0.5;
      heartOpacity.value = 1;
      heartScale.value = withTiming(1.6, { duration: 700, easing: Easing.out(Easing.quad) });
      heartOpacity.value = withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) });
      runOnJS(upvoteFromDoubleTap)();
    });
  const singleTap = Gesture.Tap()
    .requireExternalGestureToFail(doubleTap)
    .onEnd((_e, success) => {
      if (success) runOnJS(open)();
    });
  const contentGesture = Gesture.Exclusive(doubleTap, singleTap);

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      {/* meta line — kind chip + time (+ heat cue) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: meta.fill }}>
          <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: meta.on }}>
            {meta.label}
          </Text>
        </View>
        <Text style={{ fontSize: 12, fontFamily: monoFont, color: colors.textMuted }}>{timeAgo(item.created_at)}</Text>
        {hot ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 4 }}>
            <IconFlame size={11} color={colors.brass} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.brass }}>Hot</Text>
          </View>
        ) : null}
      </View>

      {/* headline + hero — double-tap target */}
      <GestureDetector gesture={contentGesture}>
        <View>
          <Headline item={item} />
          {hasHero ? (
            <View style={{ marginTop: 12 }}>
              <Attachment item={item} />
            </View>
          ) : null}
          <Explanation item={item} />
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', zIndex: 10 }, heartStyle]}>
            <Text style={{ fontSize: 36 }}>❤️</Text>
          </Animated.View>
        </View>
      </GestureDetector>

      {/* labels */}
      {item.labels && item.labels.length > 0 ? (
        <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          {item.labels.slice(0, 3).map((l) => {
            const s = labelStyle(l);
            return (
              <View key={l} style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: s.backgroundColor }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: s.color }}>{l}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* byline + flat actions */}
      <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable
          onPress={() => router.push(`/user/${item.username}`)}
          accessibilityLabel={`View ${item.username}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 }}>
          <Avatar username={item.username} size="sm" />
          <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
            {item.username}
          </Text>
        </Pressable>
        <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <VotePill score={item.score} vote={item.viewer_vote} onVote={(v) => onVote(item.id, v)} size="sm" />
          <Pressable onPress={open} accessibilityLabel="View comments" style={{ height: 36, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8 }}>
            <IconComment size={18} color={colors.textMuted} />
            {replies > 0 ? (
              <Text style={{ fontSize: 14, fontWeight: '600', fontFamily: monoFont, color: colors.textMuted }}>{replies}</Text>
            ) : null}
          </Pressable>
          <Pressable onPress={() => sharePost(item)} accessibilityLabel="Share post" style={{ height: 36, width: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
            <IconShare size={18} color={colors.textMuted} />
          </Pressable>
          <SaveButton saved={!!item.saved} onPress={() => onToggleSave(item.id, !item.saved)} flat />
          {onMenu ? (
            <Pressable onPress={() => onMenu(item)} accessibilityLabel="Post options" style={{ height: 36, width: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
              <IconDots size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* standout-reply pull */}
      {item.top_comment ? (
        <Pressable onPress={open} style={{ marginTop: 10, borderLeftWidth: 2, borderLeftColor: colors.borderStrong, paddingLeft: 10 }}>
          <Text numberOfLines={2} style={{ fontSize: 14, color: colors.textMuted }}>
            <Text style={{ fontWeight: '600', color: colors.inkSoft }}>{item.top_comment.username}</Text>{' '}
            {item.top_comment.body}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Headline text: workout/PR carry their text in `body`.
function headlineText(item: PostItem) {
  if (item.kind === 'workout' || item.kind === 'pr') return item.body || item.title || '';
  return item.title || item.body || '';
}

function Headline({ item }: { item: PostItem }) {
  const text = headlineText(item);
  if (!text) return null;
  return (
    <Text numberOfLines={3} style={{ marginTop: 6, fontSize: 18, lineHeight: 24, fontWeight: '800', color: colors.text }}>
      {text}
    </Text>
  );
}

// Explanation: suppressed when the body was already promoted to the headline.
function Explanation({ item }: { item: PostItem }) {
  if (item.kind === 'workout' || item.kind === 'pr') return null;
  if (!item.title || !item.body) return null;
  return (
    <Text numberOfLines={3} style={{ marginTop: 8, fontSize: 15, lineHeight: 21, color: colors.textMuted }}>
      {item.body}
    </Text>
  );
}

export function AvatarWithDot({ username, dot, size = 'md' }: { username?: string; dot: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  return (
    <View>
      <Avatar username={username} size={size} />
      <View
        style={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          height: 14,
          width: 14,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: '#ffffff',
          backgroundColor: dot,
        }}
      />
    </View>
  );
}

// Horizontal vote pill. Upvote active = moss green ink, downvote = azure.
// `size="sm"` is the compact variant used in the feed byline and on comments;
// `flat` is the chrome-less arrows-only variant.
const MOSS_INK = '#6fb088';
const MOSS_SOFT = 'rgba(47, 110, 74, 0.18)';

export function VotePill({
  score,
  vote,
  onVote,
  size = 'md',
  flat = false,
}: {
  score: number;
  vote: number;
  onVote: (value: number) => void;
  size?: 'sm' | 'md';
  flat?: boolean;
}) {
  const up = vote === 1;
  const down = vote === -1;
  if (flat) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => onVote(up ? 0 : 1)} accessibilityLabel="Upvote" style={{ height: 36, width: 28, alignItems: 'center', justifyContent: 'center' }}>
          <IconArrow dir="up" size={18} color={up ? MOSS_INK : colors.textMuted} />
        </Pressable>
        <Text style={{ minWidth: 26, textAlign: 'center', fontSize: 14, fontWeight: '700', fontFamily: monoFont, color: up ? MOSS_INK : down ? colors.azureInk : colors.text }}>
          {score}
        </Text>
        <Pressable onPress={() => onVote(down ? 0 : -1)} accessibilityLabel="Downvote" style={{ height: 36, width: 28, alignItems: 'center', justifyContent: 'center' }}>
          <IconArrow dir="down" size={18} color={down ? colors.azureInk : colors.textMuted} />
        </Pressable>
      </View>
    );
  }
  const sm = size === 'sm';
  const boxH = sm ? 32 : 36;
  const boxW = sm ? 28 : 36;
  const icon = sm ? 16 : 18;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: boxH,
        borderRadius: 999,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceAlt,
      }}>
      <Pressable
        onPress={() => onVote(up ? 0 : 1)}
        accessibilityLabel="Upvote"
        style={{ height: boxH, width: boxW, alignItems: 'center', justifyContent: 'center', backgroundColor: up ? MOSS_SOFT : 'transparent' }}>
        <IconArrow dir="up" size={icon} color={up ? MOSS_INK : colors.textMuted} />
      </Pressable>
      <Text
        style={{
          minWidth: sm ? 27 : 35,
          paddingHorizontal: 2,
          textAlign: 'center',
          fontSize: sm ? 12 : 14,
          fontWeight: '700',
          fontFamily: monoFont,
          color: up ? MOSS_INK : down ? colors.azureInk : colors.text,
        }}>
        {score}
      </Text>
      <Pressable
        onPress={() => onVote(down ? 0 : -1)}
        accessibilityLabel="Downvote"
        style={{ height: boxH, width: boxW, alignItems: 'center', justifyContent: 'center', backgroundColor: down ? colors.azureSoft : 'transparent' }}>
        <IconArrow dir="down" size={icon} color={down ? colors.azureInk : colors.textMuted} />
      </Pressable>
    </View>
  );
}

export function SaveButton({ saved, onPress, flat = false }: { saved: boolean; onPress: () => void; flat?: boolean }) {
  if (flat) {
    return (
      <Pressable onPress={onPress} accessibilityLabel={saved ? 'Unsave' : 'Save'} style={{ height: 36, width: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
        <IconBookmark size={18} filled={saved} color={saved ? colors.brass : colors.textMuted} />
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={saved ? 'Unsave' : 'Save'}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 36,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: saved ? colors.brassSoft : 'transparent',
      }}>
      <IconBookmark size={17} filled={saved} color={saved ? colors.brass : colors.textMuted} />
      <Text style={{ fontSize: 14, fontWeight: '600', color: saved ? colors.brass : colors.textMuted }}>
        {saved ? 'Saved' : 'Save'}
      </Text>
    </Pressable>
  );
}

// The web shares a deep link to the deployed site; nothing is deployed yet, so
// share the post as text via the native share sheet. Swap to a real URL when
// the app gets universal links (Session 6).
export function sharePost(item: PostItem | { id: string; title?: string; body?: string }) {
  const text = (item as PostItem).title || (item as PostItem).body || 'a post';
  Share.share({ message: `RepSearch — "${text}" (post ${item.id})` }).catch(() => {});
}

// Attachments rendered inside the Pulse "hero frame".
function Attachment({ item }: { item: PostItem }) {
  const a = item.attachment;
  if (!a) return null;
  if (item.kind === 'workout') {
    return (
      <HeroFrame>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={{ fontSize: 30, fontWeight: '800', fontFamily: monoFont, color: colors.text }}>
            {a.duration_min ?? '-'}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMuted }}>min</Text>
          <Text style={{ marginLeft: 'auto', fontSize: 12, fontWeight: '600', color: KIND_META.workout.ink }}>
            {a.exercise_count || 0} exercises · {a.set_count || 0} sets
          </Text>
        </View>
      </HeroFrame>
    );
  }
  if (item.kind === 'program') {
    return (
      <HeroFrame>
        <Text numberOfLines={1} style={{ fontWeight: '700', color: colors.text }}>{a.name}</Text>
        <Text style={{ marginTop: 4, fontSize: 12, fontWeight: '600', color: KIND_META.program.ink }}>
          {a.enrollment_count || 0} started · open-ended
        </Text>
      </HeroFrame>
    );
  }
  if (item.kind === 'template') {
    return (
      <HeroFrame>
        <Text numberOfLines={1} style={{ fontWeight: '700', color: colors.text }}>{a.name}</Text>
        <Text style={{ marginTop: 4, fontSize: 12, fontWeight: '600', color: KIND_META.template.ink }}>
          {a.exercise_count || 0} exercises · used {a.usage_count || 0}x
        </Text>
      </HeroFrame>
    );
  }
  if (item.kind === 'study') return <StudyAttachment a={a} compact />;
  return null;
}

export function HeroFrame({ children }: { children: React.ReactNode }) {
  // The web uses color-mix for an 80% surface fill; flat surfaceAlt reads the same here.
  return (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, backgroundColor: colors.surfaceAlt }}>
      {children}
    </View>
  );
}

// Study attachment, matching the web's two variants: the feed shows the
// compact bar-row preview; the post thread (compact=false) draws the full
// Victory/Skia result chart (Session 5 — falls back to a dev-build notice in
// Expo Go via components/charts).
export function StudyAttachment({ a, compact = false }: { a: any; compact?: boolean }) {
  if (!a) return null;
  if (a.error) {
    return (
      <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 12 }}>
        <Text style={{ fontSize: 12, color: colors.inkSoft }}>{a.error}</Text>
      </View>
    );
  }
  if (!compact) {
    return (
      <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, padding: 12, overflow: 'hidden' }}>
        <View style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 11, fontFamily: monoFont, color: colors.textMuted }}>
            {a.mode === 'compare' ? 'cohort comparison' : `n=${a.totalCohortSize || 0}`}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 11, fontFamily: monoFont, color: colors.textMuted, maxWidth: '60%' }}>
            {a.measure}
          </Text>
        </View>
        {a.mode === 'compare' ? (
          <CompareResultChart cohortA={a.cohortA} cohortB={a.cohortB} measure={a.measure} groupBy={a.groupBy} />
        ) : (
          <SingleResultChart
            buckets={a.buckets || []}
            measure={a.measure}
            groupBy={a.groupBy}
            totalCohortSize={a.totalCohortSize || 0}
          />
        )}
      </View>
    );
  }
  const rows =
    a.mode === 'compare'
      ? [
          { label: a.cohortA?.label || 'A', n: a.cohortA?.totalCohortSize || 0, value: avgOf(a.cohortA?.buckets) },
          { label: a.cohortB?.label || 'B', n: a.cohortB?.totalCohortSize || 0, value: avgOf(a.cohortB?.buckets) },
        ]
      : (a.buckets || []).slice(0, 4).map((b: any) => ({ label: b.label, n: b.n, value: b.avg_measure }));
  const max = Math.max(...rows.map((r: any) => Math.abs(r.value || 0)), 0.001);
  return (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, fontFamily: monoFont, color: colors.textMuted }}>
          {a.mode === 'compare' ? 'comparison' : `n=${a.totalCohortSize || 0}`}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 11, fontFamily: monoFont, color: colors.textMuted, maxWidth: '60%' }}>
          {a.measure}
        </Text>
      </View>
      <View style={{ marginTop: 12, gap: 8 }}>
        {rows.map((r: any) => (
          <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text numberOfLines={1} style={{ width: 72, fontSize: 11, fontFamily: monoFont, color: colors.text }}>
              {prettyStudyLabel(r.label)}
            </Text>
            <View style={{ flex: 1, height: 8, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.surface }}>
              <View
                style={{
                  height: '100%',
                  borderRadius: 999,
                  width: `${Math.max(8, Math.round((Math.abs(r.value || 0) / max) * 100))}%`,
                  backgroundColor: '#6fcab8',
                }}
              />
            </View>
            <Text style={{ width: 42, textAlign: 'right', fontSize: 11, fontFamily: monoFont, color: colors.textMuted }}>
              n={r.n}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function avgOf(buckets: any[] = []) {
  if (!buckets.length) return 0;
  return buckets.reduce((sum, b) => sum + (b.avg_measure || 0), 0) / buckets.length;
}

function prettyStudyLabel(label = '') {
  return String(label).replaceAll('_', ' ');
}

/* ---- icons (paths copied from the web component) ---- */

export function IconArrow({ dir = 'up', size = 18, color = '#fff' }: { dir?: 'up' | 'down'; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ transform: [{ rotate: dir === 'down' ? '180deg' : '0deg' }] }}>
      <Polyline points="6 14 12 8 18 14" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconFlame({ size = 12, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2c1 3-1 4.5-2.5 6.2C8 10 7 11.6 7 13.5a5 5 0 0 0 10 0c0-2-1-3.7-2.3-5.2.5 1.4.1 2.6-.7 3.2.2-2.2-1-4.3-2-5.5C11.6 4.7 12.3 3.3 12 2z" />
    </Svg>
  );
}

export function IconComment({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 1 1 17 0z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconShare({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={18} cy={5} r={3} stroke={color} strokeWidth={1.8} />
      <Circle cx={6} cy={12} r={3} stroke={color} strokeWidth={1.8} />
      <Circle cx={18} cy={19} r={3} stroke={color} strokeWidth={1.8} />
      <Line x1={8.6} y1={13.5} x2={15.4} y2={17.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={15.4} y1={6.5} x2={8.6} y2={10.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function IconBookmark({ size = 18, filled = false, color = '#fff' }: { size?: number; filled?: boolean; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
      <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconDots({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx={5} cy={12} r={1.8} />
      <Circle cx={12} cy={12} r={1.8} />
      <Circle cx={19} cy={12} r={1.8} />
    </Svg>
  );
}
