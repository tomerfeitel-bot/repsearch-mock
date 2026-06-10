import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { SEED_EXERCISES } from '@/lib/exercises';
import { colors, monoFont } from '@/lib/theme';
import { timeAgo } from '@/lib/timeAgo';

// Port of src/components/profile/ProfileSummary.jsx — the shared profile body
// used by the public user-profile screen now and the own-profile tab in
// Session 4 (which adds onEditProfile).
const LIFT_TARGETS = [
  { label: 'Bench', ids: ['bench_barbell', 'bench_dumbbell', 'smith_bench'] },
  { label: 'Squat', ids: ['squat_barbell', 'squat_front', 'smith_squat', 'hack_squat'] },
  { label: 'Deadlift', ids: ['deadlift', 'deadlift_sumo'] },
  { label: 'OHP', ids: ['press_ohp', 'press_dumbbell_shoulder', 'shoulder_press_machine', 'smith_ohp'] },
];

const exerciseById = new Map(SEED_EXERCISES.map((e: any) => [e.id, e]));

export default function ProfileSummary({
  data,
  loading,
  privateView = false,
  onFollow,
  followBusy = false,
  onEditProfile,
}: {
  data: any;
  loading: boolean;
  privateView?: boolean;
  onFollow?: () => void;
  followBusy?: boolean;
  onEditProfile?: () => void;
}) {
  if (loading) return <ProfileSkeleton />;
  if (!data) return <EmptyState copy="Profile not found." />;

  const {
    user,
    stats = {},
    top_prs = [],
    recent_workouts = [],
    published_programs = [],
    shared_templates = [],
    viewer = {},
  } = data;

  if (privateView) {
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 32 }}>
        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 32, alignItems: 'center' }}>
          <Avatar username={user?.username} size="xl" />
          <Text style={{ marginTop: 16, fontSize: 20, fontWeight: '800', color: colors.text }}>{user?.username}</Text>
          <Text style={{ marginTop: 8, fontSize: 14, color: colors.textMuted }}>Profile is private.</Text>
          {!viewer.is_self && onFollow ? (
            <Pressable
              onPress={onFollow}
              disabled={followBusy}
              style={{
                marginTop: 20,
                minHeight: 44,
                paddingHorizontal: 20,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.emerald,
                opacity: followBusy ? 0.6 : 1,
              }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.onEmerald }}>
                {viewer.follows_them ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  const topLifts = LIFT_TARGETS.map((target) => {
    const liftPrs = top_prs.filter((p: any) => target.ids.includes(p.exercise_id));
    const best = liftPrs.reduce(
      (acc: any, p: any) => (Number(p.weight_kg) > Number(acc?.weight_kg || 0) ? p : acc),
      null,
    );
    return { ...target, pr: best };
  });

  return (
    <View style={{ gap: 24, paddingTop: 8 }}>
      <IdentityCard user={user} stats={stats} viewer={viewer} onFollow={onFollow} followBusy={followBusy} onEditProfile={onEditProfile} />
      <View style={{ paddingHorizontal: 16, gap: 24 }}>
        <StatsHero stats={stats} trainingAge={user?.training_age_years} />
        <WidgetGrid user={user} />
      </View>
      <TopLifts lifts={topLifts} />
      <CurrentProgram />
      <PublishedPlans programs={published_programs} templates={shared_templates} />
      <RecentWorkouts workouts={recent_workouts} username={user?.username} />
    </View>
  );
}

function IdentityCard({ user, stats, viewer, onFollow, followBusy, onEditProfile }: any) {
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
        <Avatar username={user?.username} size="xl" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '800', color: colors.text, flexShrink: 1 }}>
              {user?.username}
            </Text>
            {user?.is_private ? (
              <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: colors.surfaceAlt }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>Private</Text>
              </View>
            ) : null}
          </View>
          <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 20, color: colors.textMuted }}>
            {user?.bio || 'No bio yet.'}
          </Text>
          <View style={{ marginTop: 16, flexDirection: 'row', gap: 20 }}>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              <Text style={{ fontFamily: monoFont, fontWeight: '700', color: colors.text }}>{stats.followers || 0}</Text>{' '}
              followers
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              <Text style={{ fontFamily: monoFont, fontWeight: '700', color: colors.text }}>{stats.following || 0}</Text>{' '}
              following
            </Text>
          </View>
          {viewer?.is_self && onEditProfile ? (
            <Pressable
              onPress={onEditProfile}
              style={{
                marginTop: 16,
                alignSelf: 'flex-start',
                minHeight: 40,
                paddingHorizontal: 16,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Edit profile</Text>
            </Pressable>
          ) : null}
        </View>
        {!viewer?.is_self && onFollow ? (
          <Pressable
            onPress={onFollow}
            disabled={followBusy}
            style={{
              minHeight: 40,
              paddingHorizontal: 16,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: followBusy ? 0.6 : 1,
              ...(viewer?.follows_them
                ? { borderWidth: 1, borderColor: colors.border }
                : { backgroundColor: colors.emerald }),
            }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: viewer?.follows_them ? colors.text : colors.onEmerald }}>
              {viewer?.follows_them ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function parseArray(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const a = JSON.parse(raw);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function WidgetGrid({ user }: { user: any }) {
  if (!user) return null;
  const sleep = user.latest_sleep_duration ?? user.sleep_hours;
  const hasSleep = sleep != null;
  const hasNutrition =
    user.latest_calories != null ||
    user.protein_g_per_kg != null ||
    parseArray(user.supplements_json).length > 0 ||
    user.nutrition_phase;
  const measurements = [
    { key: 'arm_cm', label: 'Arms' },
    { key: 'chest_cm', label: 'Chest' },
    { key: 'waist_cm', label: 'Waist' },
    { key: 'thigh_cm', label: 'Thighs' },
    { key: 'calf_cm', label: 'Calves' },
  ].filter((m) => user[m.key] != null);
  const hasMeasurements = measurements.length > 0;
  const hasSplit = !!user.split_type;

  if (!hasSleep && !hasNutrition && !hasMeasurements && !hasSplit) return null;

  const supplements = parseArray(user.supplements_json)
    .map((s) => (typeof s === 'string' ? s : s?.key))
    .filter(Boolean);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
      {hasSleep ? (
        <Widget label="Sleep">
          <Text style={{ fontSize: 22, fontWeight: '800', fontFamily: monoFont, color: colors.text }}>
            {Number(sleep)
              .toFixed(2)
              .replace(/\.?0+$/, '')}
            <Text style={{ fontSize: 14, color: colors.textMuted }}>h</Text>
          </Text>
        </Widget>
      ) : null}
      {hasNutrition ? (
        <Widget label="Nutrition">
          {user.latest_calories != null ? (
            <Text style={{ fontSize: 17, fontWeight: '800', fontFamily: monoFont, color: colors.text }}>
              {user.latest_calories}
              <Text style={{ fontSize: 11, color: colors.textMuted }}> kcal</Text>
            </Text>
          ) : null}
          {user.protein_g_per_kg != null ? (
            <Text style={{ fontSize: 11, fontFamily: monoFont, color: colors.textMuted }}>
              {user.protein_g_per_kg} g/kg protein
            </Text>
          ) : null}
          {user.nutrition_phase ? (
            <Text style={{ fontSize: 11, color: colors.textMuted, textTransform: 'capitalize' }}>{user.nutrition_phase}</Text>
          ) : null}
          {supplements.length > 0 ? (
            <Text numberOfLines={1} style={{ marginTop: 4, fontSize: 11, color: colors.inkSoft }}>
              {supplements.map((s) => String(s).replaceAll('_', ' ')).join(', ')}
            </Text>
          ) : null}
        </Widget>
      ) : null}
      {hasMeasurements ? (
        <Widget label="Measurements">
          <View style={{ gap: 4 }}>
            {measurements.map((m) => (
              <View key={m.key} style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>{m.label}</Text>
                <Text style={{ fontSize: 12, fontFamily: monoFont, color: colors.text }}>{user[m.key]}</Text>
              </View>
            ))}
          </View>
        </Widget>
      ) : null}
      {hasSplit ? (
        <Widget label="Split">
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{user.split_type}</Text>
          {user.derived_weekly_frequency != null ? (
            <Text style={{ marginTop: 2, fontSize: 12, fontFamily: monoFont, color: colors.textMuted }}>
              ~{user.derived_weekly_frequency}x/week
            </Text>
          ) : null}
        </Widget>
      ) : null}
    </View>
  );
}

function Widget({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ flexBasis: '45%', flexGrow: 1, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>{label}</Text>
      <View style={{ marginTop: 8 }}>{children}</View>
    </View>
  );
}

function StatsHero({ stats, trainingAge }: { stats: any; trainingAge: any }) {
  return (
    <View style={{ flexDirection: 'row', gap: 16 }}>
      <Stat label="Workouts" value={stats.workouts || 0} />
      <Stat label="Streak" value={stats.current_streak || 0} suffix="d" />
      <Stat label="Training age" value={trainingAge ?? '-'} suffix={trainingAge || trainingAge === 0 ? 'y' : ''} />
    </View>
  );
}

function Stat({ label, value, suffix = '' }: { label: string; value: any; suffix?: string }) {
  return (
    <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', fontFamily: monoFont, color: colors.text }}>
        {value}
        <Text style={{ fontSize: 14, color: colors.textMuted }}>{suffix}</Text>
      </Text>
      <Text style={{ marginTop: 4, fontSize: 12, fontWeight: '600', color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

function TopLifts({ lifts }: { lifts: any[] }) {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <SectionTitle>Top lifts</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {lifts.map((lift) => (
          <View key={lift.label} style={{ flexBasis: '45%', flexGrow: 1, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>{lift.label}</Text>
            {lift.pr ? (
              <>
                <Text style={{ marginTop: 8, fontSize: 22, fontWeight: '800', fontFamily: monoFont, color: colors.text }}>
                  {lift.pr.weight_kg}
                  <Text style={{ fontSize: 14, color: colors.textMuted }}>kg x {lift.pr.reps}</Text>
                </Text>
                <Text numberOfLines={1} style={{ marginTop: 4, fontSize: 11, color: colors.inkSoft }}>
                  {lift.pr.exercise_name || (exerciseById.get(lift.pr.exercise_id) as any)?.name || lift.pr.exercise_id}
                </Text>
              </>
            ) : (
              <Text style={{ marginTop: 16, fontSize: 14, color: colors.textMuted }}>No PR yet.</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function CurrentProgram() {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <SectionTitle>Currently running</SectionTitle>
      <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>No active program</Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: colors.textMuted }}>
          Start a plan from Community when you are ready to track a full block.
        </Text>
      </View>
    </View>
  );
}

function PublishedPlans({ programs, templates }: { programs: any[]; templates: any[] }) {
  if (!programs.length && !templates.length) return null;
  return (
    <View>
      <View style={{ paddingHorizontal: 16 }}>
        <SectionTitle>Plans shared</SectionTitle>
      </View>
      {programs.map((p) => (
        <PlanRow key={`p_${p.id}`} title={p.name} meta={`${p.weeks || 1} weeks - ${p.enrollment_count || 0} started`} kind="Program" />
      ))}
      {templates.map((t) => (
        <PlanRow key={`t_${t.id}`} title={t.name} meta={`${t.workout_day || 'Workout'} - used ${t.usage_count || 0}x`} kind="Template" muted />
      ))}
    </View>
  );
}

function PlanRow({ title, meta, kind, muted = false }: { title: string; meta: string; kind: string; muted?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        minHeight: 56,
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontWeight: '700', color: colors.text }}>{title}</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted }}>{meta}</Text>
      </View>
      <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: muted ? colors.surfaceAlt : colors.emerald }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: muted ? colors.textMuted : colors.onEmerald }}>{kind}</Text>
      </View>
    </View>
  );
}

function RecentWorkouts({ workouts, username }: { workouts: any[]; username?: string }) {
  const router = useRouter();
  return (
    <View>
      <View style={{ paddingHorizontal: 16 }}>
        <SectionTitle>Recent public workouts</SectionTitle>
      </View>
      {workouts.length === 0 ? (
        <EmptyState copy="No public workouts yet." compact />
      ) : (
        workouts.map((w) => (
          <Pressable
            key={w.id}
            onPress={() => router.push(`/user/${username}/workout/${w.id}`)}
            style={{
              flexDirection: 'row',
              minHeight: 64,
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', fontFamily: monoFont, color: colors.text }}>
                {w.duration_min || 0}
                <Text style={{ fontSize: 14, color: colors.textMuted }}> min</Text>
              </Text>
              <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 14, color: colors.textMuted }}>
                {w.workout_day || w.workout_split_type || 'Workout'}
              </Text>
            </View>
            <Text style={{ fontSize: 11, fontFamily: monoFont, color: colors.inkSoft }}>
              {w.date ? timeAgo(`${w.date}T12:00:00.000Z`) : ''}
            </Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={{ marginBottom: 8, fontSize: 16, fontWeight: '800', color: colors.text }}>{children}</Text>;
}

function EmptyState({ copy, compact = false }: { copy: string; compact?: boolean }) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingVertical: compact ? 16 : 32,
      }}>
      <Text style={{ textAlign: 'center', fontSize: 14, color: colors.textMuted }}>{copy}</Text>
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <View style={{ gap: 20, paddingTop: 8, paddingHorizontal: 16 }}>
      <View style={{ height: 128, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, opacity: 0.5 }} />
      <View style={{ flexDirection: 'row', gap: 16 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, height: 80, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, opacity: 0.5 }} />
        ))}
      </View>
      <View style={{ height: 176, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, opacity: 0.5 }} />
    </View>
  );
}
