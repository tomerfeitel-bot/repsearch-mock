import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import DailyCheckinModal from '@/components/community/DailyCheckinModal';
import PlansTab from '@/components/community/PlansTab';
import PostCard from '@/components/community/PostCard';
import PostComposer from '@/components/community/PostComposer';
import FlatHeader, { useDirectionalCollapse } from '@/components/ui/FlatHeader';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import UnderlineTabs from '@/components/ui/UnderlineTabs';
import { useDailyCheckin } from '@/hooks/useDailyCheckin';
import { usePosts, type PostItem } from '@/hooks/usePosts';
import { useSocial } from '@/hooks/useSocial';
import { POST_LABELS } from '@/lib/postLabels';
import { colors } from '@/lib/theme';

// Port of src/pages/Community.jsx: Feed/Saved tabs, search overlay, the Plans
// mode toggle, filter sheet, composer, and the daily check-in modal. The web's
// "Load more" button becomes FlatList onEndReached auto-pagination.
const TOP_TABS = [
  { value: 'feed', label: 'Feed' },
  { value: 'saved', label: 'Saved' },
];
const SCOPES = [
  { v: 'following', label: 'Following' },
  { v: 'global', label: 'Global' },
];
const SORTS = [
  { v: 'hot', label: 'Hot' },
  { v: 'new', label: 'New' },
  { v: 'top', label: 'Top' },
];
const KINDS = [
  { v: '', label: 'All' },
  { v: 'discussion', label: 'Discussion' },
  { v: 'workout', label: 'Workout' },
  { v: 'study', label: 'Study' },
];
const PLAN_TYPES = [
  { v: 'programs', label: 'Programs' },
  { v: 'templates', label: 'Templates' },
];
const PLAN_SOURCES = [
  { v: 'for_you', label: 'For you' },
  { v: 'following', label: 'Following' },
];

export default function CommunityScreen() {
  const toast = useToast();
  const router = useRouter();
  // Deep links: ?compose=<kind> (builder "save" returns here and reopens the
  // composer; a ?createdTemplate=<id> rides along and is just cleared),
  // ?shareWorkout=<id> (the post-workout "Share to feed" action), and
  // ?tab=plans (the StartScreen "Find Plans" banner).
  const params = useLocalSearchParams<{
    compose?: string;
    shareWorkout?: string;
    tab?: string;
    createdTemplate?: string;
  }>();
  const [tab, setTab] = useState('feed');
  const { feed, feedLoading, feedMeta, loadFeed, loadMore, patchFeedItem, votePost, setSaved, loadSaved } =
    usePosts(toast);
  const { loadFollowing } = useSocial(toast);
  const {
    showModal: showDailyModal,
    loading: dailyLoading,
    loadToday,
    scheduleModalIfNeeded,
    dismissModal,
    submitCheckin,
  } = useDailyCheckin(toast);

  const [scope, setScope] = useState<string | null>(null);
  const [sort, setSort] = useState('hot');
  const [kind, setKind] = useState('');
  const [label, setLabel] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeKind, setComposeKind] = useState<string | null>(null);
  const [composeWorkoutId, setComposeWorkoutId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [planMode, setPlanMode] = useState(false);
  const [planType, setPlanType] = useState('programs');
  const [planSource, setPlanSource] = useState('for_you');
  const [loadingMore, setLoadingMore] = useState(false);
  const [saved, setSavedList] = useState<PostItem[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  const { collapse, onScroll } = useDirectionalCollapse();

  useEffect(() => {
    const c = params.compose;
    const sw = params.shareWorkout;
    if (c || sw) {
      setComposeKind(sw ? 'workout' : (c as string));
      setComposeWorkoutId((sw as string) || null);
      setComposeOpen(true);
      router.setParams({ compose: undefined, shareWorkout: undefined, createdTemplate: undefined });
    }
  }, [params.compose, params.shareWorkout, router]);

  useEffect(() => {
    if (params.tab === 'plans') {
      setTab('feed');
      setPlanMode(true);
      router.setParams({ tab: undefined });
    }
  }, [params.tab, router]);

  useEffect(() => {
    loadFollowing().then((users: any[]) => setScope((prev) => prev ?? (users.length > 0 ? 'following' : 'global')));
    loadToday().then((log: any) => {
      if (!log) scheduleModalIfNeeded();
    });
  }, [loadFollowing, loadToday, scheduleModalIfNeeded]);

  useEffect(() => {
    if (scope && tab === 'feed') loadFeed({ scope, sort, kind, label, q, limit: 20 });
  }, [scope, sort, kind, label, q, tab, loadFeed]);

  const refreshSaved = useCallback(() => {
    setSavedLoading(true);
    loadSaved()
      .then((items) => setSavedList(items))
      .finally(() => setSavedLoading(false));
  }, [loadSaved]);

  useEffect(() => {
    if (tab === 'saved') refreshSaved();
  }, [tab, refreshSaved]);

  function changeTab(next: string) {
    setTab(next);
    if (next !== 'feed') setPlanMode(false); // plan mode is a feed-only filter
  }

  async function onVote(id: string, value: number) {
    const res = await votePost(id, value);
    if (res) {
      patchFeedItem(id, { score: res.score, viewer_vote: res.viewer_vote });
      setSavedList((prev) => prev.map((p) => (p.id === id ? { ...p, score: res.score, viewer_vote: res.viewer_vote } : p)));
    }
  }

  async function onToggleSave(id: string, next: boolean) {
    await setSaved(id, next);
    patchFeedItem(id, { saved: next });
    if (tab === 'saved' && !next) setSavedList((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleLoadMore() {
    if (tab !== 'feed' || !feedMeta.hasMore || !scope || loadingMore || feedLoading) return;
    setLoadingMore(true);
    try {
      await loadMore({ scope, sort, kind, label, q, limit: 20 });
    } finally {
      setLoadingMore(false);
    }
  }

  function runSearch() {
    setQ(search.trim());
  }

  function clearFilters() {
    setSort('hot');
    setKind('');
    setLabel('');
  }

  const activeFilters = [
    scope && scope !== 'following' ? SCOPES.find((s) => s.v === scope)?.label : null,
    sort !== 'hot' ? SORTS.find((s) => s.v === sort)?.label : null,
    kind ? KINDS.find((k) => k.v === kind)?.label : null,
    label || null,
    q ? `Search: ${q}` : null,
  ].filter(Boolean) as string[];
  const filterCount = [sort !== 'hot', !!kind, !!label, scope === 'global'].filter(Boolean).length;
  const planFilterCount = [planType !== 'programs', planSource !== 'for_you'].filter(Boolean).length;

  const list = tab === 'saved' ? saved : feed;
  const listLoading = tab === 'saved' ? savedLoading : feedLoading;

  const header = (
    <FlatHeader
      title="Community"
      titleColor={colors.emeraldInk}
      collapse={collapse}
      action={
        <Pressable
          onPress={() => {
            setComposeKind(null);
            setComposeWorkoutId(null);
            setComposeOpen(true);
          }}
          accessibilityLabel="Create a post"
          style={{
            height: 36,
            paddingHorizontal: 20,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.emerald,
          }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.onEmerald }}>+ Post</Text>
        </Pressable>
      }
      tabs={
        searchOpen ? (
          // Search bar replaces the tabs row while open (the web wipes it in
          // over the tabs with a clip-path; a swap reads the same here).
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingLeft: 16,
              paddingRight: 8,
              paddingBottom: 6,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
            <IconSearch size={17} color={colors.emeraldInk} />
            <TextInput
              autoFocus
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={runSearch}
              returnKeyType="search"
              placeholder="Search posts"
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, minWidth: 0, fontSize: 14, color: colors.text, paddingVertical: 6 }}
            />
            <Pressable
              onPress={() => {
                setSearchOpen(false);
                if (q) {
                  setSearch('');
                  setQ('');
                }
              }}
              accessibilityLabel="Close search"
              style={{ height: 32, width: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <IconClose size={18} color={colors.emeraldInk} />
            </Pressable>
          </View>
        ) : (
          <View>
            <UnderlineTabs
              tabs={TOP_TABS}
              value={tab}
              onChange={changeTab}
              accent={colors.emeraldInk}
              activeColor={colors.emeraldInk}
              inactiveColor={colors.textMuted}
              borderColor={colors.border}
            />
            <Pressable
              onPress={() => setSearchOpen(true)}
              accessibilityLabel="Search posts"
              style={{
                position: 'absolute',
                right: 8,
                top: 0,
                bottom: 6,
                width: 36,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <IconSearch size={18} color={colors.emeraldInk} />
            </Pressable>
          </View>
        )
      }
    />
  );

  // Toolbar: Plans toggle on the left, Filter on the right + active chips.
  const toolbar =
    tab === 'feed' ? (
      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={() => setPlanMode((p) => !p)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              minHeight: 40,
              paddingHorizontal: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: planMode ? colors.emerald : colors.border,
              backgroundColor: planMode ? colors.emerald : 'rgba(255,255,255,0.10)',
            }}>
            <IconPlans size={16} color={planMode ? colors.onEmerald : colors.text} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: planMode ? colors.onEmerald : colors.text }}>Plans</Text>
          </Pressable>
          <Pressable
            onPress={() => setFiltersOpen(true)}
            style={{
              marginLeft: 'auto',
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 40,
              paddingHorizontal: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: 'rgba(255,255,255,0.10)',
            }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Filter</Text>
            {(planMode ? planFilterCount : filterCount) > 0 && (
              <View
                style={{
                  marginLeft: 6,
                  minWidth: 18,
                  height: 18,
                  paddingHorizontal: 4,
                  borderRadius: 9,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.emerald,
                }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.onEmerald }}>
                  {planMode ? planFilterCount : filterCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
        {planMode ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Chip solid>{PLAN_TYPES.find((t) => t.v === planType)?.label || ''}</Chip>
            {planType === 'programs' && <Chip>{PLAN_SOURCES.find((s) => s.v === planSource)?.label || ''}</Chip>}
          </View>
        ) : activeFilters.length > 0 || q ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            {activeFilters.map((f) => (
              <Chip key={f} solid>
                {f}
              </Chip>
            ))}
            <Pressable
              onPress={() => {
                clearFilters();
                setSearch('');
                setQ('');
              }}
              style={{ paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>Clear</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {header}
      {tab === 'feed' && planMode ? (
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 96 }}>
          {toolbar}
          <PlansTab type={planType} source={planSource} hideControls />
        </Animated.ScrollView>
      ) : (
        <Animated.FlatList
          data={list}
          keyExtractor={(item: PostItem) => item.id}
          renderItem={({ item }: { item: PostItem }) => (
            <PostCard item={item} onVote={onVote} onToggleSave={onToggleSave} />
          )}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 96 }}
          ListHeaderComponent={toolbar}
          refreshControl={
            <RefreshControl
              refreshing={false}
              tintColor={colors.textMuted}
              onRefresh={() => {
                if (tab === 'saved') refreshSaved();
                else if (scope) loadFeed({ scope, sort, kind, label, q, limit: 20 });
              }}
            />
          }
          ListEmptyComponent={
            listLoading ? (
              <FeedSkeleton />
            ) : (
              <View style={{ paddingHorizontal: 16, paddingVertical: 64, alignItems: 'center', gap: 16 }}>
                <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
                  {tab === 'saved' ? 'No saved posts yet.' : 'Nothing here yet. Start a discussion or share your training.'}
                </Text>
                {tab === 'feed' && (
                  <Pressable
                    onPress={() => setComposeOpen(true)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: colors.emerald,
                    }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.onEmerald }}>Create a post</Text>
                  </Pressable>
                )}
              </View>
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <Text style={{ paddingVertical: 16, textAlign: 'center', fontSize: 12, color: colors.textMuted }}>
                Loading...
              </Text>
            ) : null
          }
        />
      )}

      <DailyCheckinModal open={showDailyModal} loading={dailyLoading} onClose={dismissModal} onSubmit={submitCheckin} />
      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        planMode={planMode}
        planType={planType}
        setPlanType={setPlanType}
        planSource={planSource}
        setPlanSource={setPlanSource}
        scope={scope}
        setScope={setScope}
        sort={sort}
        setSort={setSort}
        kind={kind}
        setKind={setKind}
        label={label}
        setLabel={setLabel}
        clearFilters={clearFilters}
      />
      <PostComposer
        open={composeOpen}
        initialKind={composeKind}
        initialWorkoutId={composeWorkoutId}
        onClose={() => setComposeOpen(false)}
        onPosted={() => {
          setComposeOpen(false);
          if (scope) loadFeed({ scope, sort, kind, label, q, limit: 20 });
          if (tab === 'saved') refreshSaved();
        }}
      />
    </View>
  );
}

function Chip({ children, solid = false }: { children: string; solid?: boolean }) {
  return (
    <View
      style={{
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderColor: solid ? colors.emerald : colors.border,
        backgroundColor: solid ? colors.emerald : 'rgba(255,255,255,0.10)',
      }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: solid ? colors.onEmerald : colors.textMuted }}>{children}</Text>
    </View>
  );
}

function FeedSkeleton() {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            height: 144,
            borderRadius: 16,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: 0.6,
          }}
        />
      ))}
    </View>
  );
}

function FilterSheet({
  open,
  onClose,
  planMode,
  planType,
  setPlanType,
  planSource,
  setPlanSource,
  scope,
  setScope,
  sort,
  setSort,
  kind,
  setKind,
  label,
  setLabel,
  clearFilters,
}: {
  open: boolean;
  onClose: () => void;
  planMode: boolean;
  planType: string;
  setPlanType: (v: string) => void;
  planSource: string;
  setPlanSource: (v: string) => void;
  scope: string | null;
  setScope: (v: string) => void;
  sort: string;
  setSort: (v: string) => void;
  kind: string;
  setKind: (v: string) => void;
  label: string;
  setLabel: (v: string) => void;
  clearFilters: () => void;
}) {
  if (planMode) {
    return (
      <Sheet open={open} onClose={onClose} title="Filter plans">
        <View style={{ padding: 16, gap: 20, paddingBottom: 32 }}>
          <FilterGroup title="Type">
            <SegmentedOptions options={PLAN_TYPES} value={planType} onChange={setPlanType} />
          </FilterGroup>
          {planType === 'programs' && (
            <FilterGroup title="Source">
              <SegmentedOptions options={PLAN_SOURCES} value={planSource} onChange={setPlanSource} />
            </FilterGroup>
          )}
          <View style={{ flexDirection: 'row', gap: 8, paddingTop: 8 }}>
            <ResetButton
              onPress={() => {
                setPlanType('programs');
                setPlanSource('for_you');
              }}
            />
            <ShowButton onPress={onClose} label="Show plans" />
          </View>
        </View>
      </Sheet>
    );
  }
  return (
    <Sheet open={open} onClose={onClose} title="Filter Community">
      <View style={{ padding: 16, gap: 20, paddingBottom: 32 }}>
        <FilterGroup title="Audience">
          <SegmentedOptions options={SCOPES} value={scope || 'global'} onChange={setScope} />
        </FilterGroup>
        <FilterGroup title="Sort">
          <SegmentedOptions options={SORTS} value={sort} onChange={setSort} />
        </FilterGroup>
        <FilterGroup title="Post type">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {KINDS.map((k) => (
              <FilterChoice key={k.v} active={kind === k.v} onPress={() => setKind(k.v)} grow>
                {k.label}
              </FilterChoice>
            ))}
          </View>
        </FilterGroup>
        <FilterGroup title="Labels">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <FilterChoice active={label === ''} onPress={() => setLabel('')}>
              All labels
            </FilterChoice>
            {POST_LABELS.map((l) => (
              <FilterChoice key={l} active={label === l} onPress={() => setLabel(l)}>
                {l}
              </FilterChoice>
            ))}
          </View>
        </FilterGroup>
        <View style={{ flexDirection: 'row', gap: 8, paddingTop: 8 }}>
          <ResetButton onPress={clearFilters} />
          <ShowButton onPress={onClose} label="Show posts" />
        </View>
      </View>
    </Sheet>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={{ marginBottom: 8, fontSize: 12, fontWeight: '600', color: colors.textMuted }}>{title}</Text>
      {children}
    </View>
  );
}

function SegmentedOptions({
  options,
  value,
  onChange,
}: {
  options: { v: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => (
        <FilterChoice key={o.v} active={value === o.v} onPress={() => onChange(o.v)} grow>
          {o.label}
        </FilterChoice>
      ))}
    </View>
  );
}

function FilterChoice({
  active,
  onPress,
  children,
  grow = false,
}: {
  active: boolean;
  onPress: () => void;
  children: string;
  grow?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 40,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: active ? colors.emerald : colors.border,
        backgroundColor: active ? colors.emerald : colors.surfaceAlt,
        ...(grow ? { flexBasis: '45%', flexGrow: 1 } : {}),
      }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: active ? colors.onEmerald : colors.text }}>{children}</Text>
    </Pressable>
  );
}

function ResetButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 44,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Reset</Text>
    </Pressable>
  );
}

function ShowButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 44,
        borderRadius: 16,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accentInk }}>{label}</Text>
    </Pressable>
  );
}

/* ---- icons (paths copied from the web page) ---- */

function IconSearch({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} />
      <Line x1={21} y1={21} x2={16.65} y2={16.65} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function IconClose({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={18} y1={6} x2={6} y2={18} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={6} y1={6} x2={18} y2={18} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function IconPlans({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={4} width={16} height={16} rx={2} stroke={color} strokeWidth={2} />
      <Line x1={9} y1={9} x2={15} y2={9} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={9} y1={13} x2={15} y2={13} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={9} y1={17} x2={13} y2={17} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
