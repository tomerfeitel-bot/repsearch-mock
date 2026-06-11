import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import type { StartWorkoutOptions } from '@/hooks/useWorkout';
import { api } from '@/lib/api';
import { SEED_EXERCISES } from '@/lib/exercises';
import { topLevelGroup } from '@/lib/musclePalette';
import { hasConfiguredSplit, splitDaysForProfile, splitTypeForProfile } from '@/lib/splits';
import { colors, monoFont } from '@/lib/theme';

// Port of src/components/workout/StartScreen.jsx: the pre-workout console with
// the projected-next hero, split/program workspace, and history panel. The
// CSS grid-row expand/collapse animations become plain conditional rendering.
const DAY_HINTS: Record<string, string> = {
  Push: 'Chest, Shoulders, Triceps',
  Pull: 'Back, Biceps, Rear Delts',
  Legs: 'Quads, Hamstrings, Glutes, Calves',
  Upper: 'Chest, Back, Shoulders, Arms',
  Lower: 'Quads, Hamstrings, Glutes, Calves',
  'Full Body': 'Everything in one session',
  Chest: 'Chest day',
  Back: 'Back day',
  Shoulders: 'Shoulder day',
  Arms: 'Biceps + Triceps',
  Other: 'Off-split, cardio, mobility, or whatever needs work',
};

const HISTORY_PAGE_SIZE = 50;
const HISTORY_PREVIEW_LIMIT = 3;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const seedById = new Map<string, any>(SEED_EXERCISES.map((e: any) => [e.id, e]));

export default function StartScreen({
  onStart,
  restoreError = '',
}: {
  onStart: (opts: StartWorkoutOptions) => boolean | void;
  restoreError?: string;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeProgram, setActiveProgram] = useState<any>(null);
  const [programDetail, setProgramDetail] = useState<any>(null);
  const [templateDetails, setTemplateDetails] = useState<Record<string, any>>({});
  const [templates, setTemplates] = useState<any[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [loadingStarts, setLoadingStarts] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [startLoadError, setStartLoadError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [openWorkspace, setOpenWorkspace] = useState('');
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingStarts(true);
    setStartLoadError('');
    Promise.all([
      api.get('/programs/active/next').catch((err) => ({ __error: err, program: null })),
      api.get('/templates').catch((err) => ({ __error: err, templates: [] })),
      api.get('/workouts?limit=50').catch((err) => ({ __error: err, workouts: [] })),
    ])
      .then(([programData, templateData, workoutData]) => {
        if (cancelled) return;
        if ([programData, templateData, workoutData].some((data: any) => data?.__error)) {
          setStartLoadError('Some saved starts could not be loaded. You can still start blank.');
        }
        setActiveProgram(
          programData?.program && (programData?.next_session || programData?.completed) ? programData : null,
        );
        setTemplates(templateData?.templates || []);
        setRecentWorkouts(workoutData?.workouts || []);
      })
      .finally(() => {
        if (!cancelled) setLoadingStarts(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const programId = activeProgram?.program?.id;
    if (!programId) {
      setProgramDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    api
      .get(`/programs/${programId}`)
      .then((data) => {
        if (!cancelled) setProgramDetail(data.program || null);
      })
      .catch(() => {
        if (!cancelled) setProgramDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeProgram?.program?.id]);

  async function ensureTemplate(templateId: string | null | undefined) {
    if (!templateId) return null;
    if (templateDetails[templateId]) return templateDetails[templateId];
    const data = await api.get(`/templates/${templateId}`);
    const template = data.template || null;
    if (template) setTemplateDetails((prev) => ({ ...prev, [templateId]: template }));
    return template;
  }

  async function loadHistory({ reset = false } = {}) {
    if (!reset && history.length && history.length >= historyTotal) return;
    const offset = reset ? 0 : historyOffset;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const data = await api.get(`/workouts?limit=${HISTORY_PAGE_SIZE}&offset=${offset}`);
      const workouts = data.workouts || [];
      setHistory((prev) => (reset ? workouts : [...prev, ...workouts]));
      setHistoryOffset(offset + workouts.length);
      setHistoryTotal(data.total || workouts.length);
    } catch (err: any) {
      setHistoryError(err.message || 'Could not load past workouts.');
    } finally {
      setHistoryLoading(false);
    }
  }

  function repeatPast(w: any) {
    const exMap = new Map<string, any>();
    const order: string[] = [];
    const sortedSets = [...(w.sets || [])].sort(
      (a, b) => (a.session_position ?? 0) - (b.session_position ?? 0) || (a.set_number ?? 0) - (b.set_number ?? 0),
    );
    for (const s of sortedSets) {
      if (!exMap.has(s.exercise_id)) {
        const seed = seedById.get(s.exercise_id);
        exMap.set(s.exercise_id, {
          exerciseId: s.exercise_id,
          exerciseName: seed?.name || s.exercise_name || s.exercise_id,
          primary_muscle: seed?.primary_muscle || s.primary_muscle || null,
          equipment_type: s.equipment_type || seed?.equipment_type || null,
          sets: [],
        });
        order.push(s.exercise_id);
      }
      exMap.get(s.exercise_id).sets.push({
        set_type: s.set_type || 'working',
        weight_kg: s.weight_kg,
        reps: s.reps,
        rir: s.rir,
        rest_seconds: s.rest_seconds,
        rom_category: s.rom_category,
        tempo_tag: s.tempo_tag,
        failure: !!s.failure,
        template_set_id: s.template_set_id || null,
      });
    }
    onStart({
      dayLabel: getItemDayLabel(w) || null,
      exercises: order.map((id) => exMap.get(id)),
      copyPreviousValues: false,
    });
  }

  function templateExercises(template: any) {
    return (template?.exercises || []).map((e: any) => {
      const seed = seedById.get(e.exercise_id);
      return {
        exerciseId: e.exercise_id,
        exerciseName: seed?.name || e.exercise_name || e.exercise_id,
        primary_muscle: seed?.primary_muscle || e.primary_muscle || null,
        secondary_muscle: seed?.secondary_muscle || e.secondary_muscle || null,
        equipment_type: seed?.equipment_type || e.equipment_type || null,
        plannedExerciseId: e.id || e.exercise_id,
        sets: e.sets || [],
      };
    });
  }

  async function startTemplate(template: any, extras: Record<string, any> = {}) {
    try {
      const fullTemplate = await ensureTemplate(template.id || template.template_id);
      if (!fullTemplate) throw new Error('Template not found');
      const { dayLabel: requestedDayLabel, ...restExtras } = extras;
      onStart({
        name: extras.name || fullTemplate.name,
        dayLabel: requestedDayLabel || getItemDayLabel(fullTemplate) || null,
        templateId: fullTemplate.id,
        exercises: templateExercises(fullTemplate),
        ...restExtras,
      });
    } catch (err: any) {
      toast?.(err.message || 'Failed to start template', 'error');
    }
  }

  async function startProgramSession(session: any) {
    if (!session?.template_id) return;
    await startTemplate(
      { id: session.template_id },
      {
        name: session.session_label || session.template_name || activeProgram?.program?.name || 'Program workout',
        dayLabel: session.session_label || session.template_name || null,
        programId: activeProgram?.program?.id || session.program_id,
        programSessionId: session.id,
        runClassification: 'exact',
      },
    );
  }

  function getItemDayLabel(item: any) {
    return String(item?.workout_day || item?.workout_split_type || '').trim();
  }

  const allSplitDays = useMemo(() => splitDaysForProfile(user), [user]);
  const normalDays = useMemo(() => new Set(allSplitDays.filter((day) => day !== 'Other')), [allSplitDays]);
  const hasProgram = !!activeProgram?.program?.id;
  const hasSplit = !hasProgram && hasConfiguredSplit(user);
  const splitType = splitTypeForProfile(user);
  const splitDays = useMemo(() => (hasSplit ? allSplitDays : []), [hasSplit, allSplitDays]);
  const ownedTemplates = useMemo(
    () => templates.filter((t) => t.user_id === user?.id && t.status !== 'draft'),
    [templates, user],
  );

  function matchesSplitDay(item: any, day: string) {
    const label = getItemDayLabel(item);
    if (day === 'Other') return !label || label === 'Other' || !normalDays.has(label);
    return label === day;
  }

  function templatesForDay(day: string) {
    return ownedTemplates.filter((t) => matchesSplitDay(t, day));
  }

  function workoutsForDay(day: string, limit = 5) {
    return recentWorkouts.filter((w) => matchesSplitDay(w, day)).slice(0, limit);
  }

  const nextSplitDay = useMemo(() => {
    if (!hasSplit) return splitDays[0] || 'Other';
    return nextDayAfterLastWorkout(recentWorkouts[0], splitDays);
  }, [hasSplit, recentWorkouts, splitDays]);
  const activeDay = expandedDay || nextSplitDay || splitDays[0] || 'Other';
  const activeDayTemplates = templatesForDay(activeDay);
  const projectedTemplateId = activeProgram?.next_session?.template_id || activeDayTemplates[0]?.id || null;
  const projectedTemplate = templateDetails[projectedTemplateId] || activeDayTemplates[0] || null;

  useEffect(() => {
    if (!projectedTemplateId || templateDetails[projectedTemplateId]) return;
    let cancelled = false;
    setDetailLoading(true);
    api
      .get(`/templates/${projectedTemplateId}`)
      .then((data) => {
        if (cancelled || !data.template) return;
        setTemplateDetails((prev) => ({ ...prev, [projectedTemplateId]: data.template }));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectedTemplateId, templateDetails]);

  const lastWorkout = recentWorkouts[0];
  const historyRows = history.length ? history : recentWorkouts;
  const historyPreview = recentWorkouts.slice(0, HISTORY_PREVIEW_LIMIT);
  const programSessions = programDetail?.workouts || activeProgram?.sessions || [];
  const lowerOpen = !!openWorkspace;
  const projected = buildProjection({
    activeProgram,
    projectedTemplate,
    nextSplitDay,
    hasSplit,
    splitType,
    user,
    lastWorkout,
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 120 }}>
      <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.emeraldInk }}>Workout console</Text>
          <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text }}>Start</Text>
        </View>
        <Text style={{ fontFamily: monoFont, fontSize: 12, color: colors.textMuted }}>
          {new Date().toLocaleDateString([], { weekday: 'short' })}
        </Text>
      </View>

      {(restoreError || startLoadError) ? (
        <View
          style={{
            marginBottom: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(213, 154, 58, 0.42)',
            backgroundColor: colors.brassSoft,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}>
          <Text style={{ fontSize: 14, color: '#e8c074' }}>{restoreError || startLoadError}</Text>
        </View>
      ) : null}

      <HeroPanel
        projected={projected}
        compressed={lowerOpen}
        loading={loadingStarts || detailLoading}
        onToggle={() => {
          if (lowerOpen) setOpenWorkspace('');
        }}
        onStart={() => {
          if (projected.kind === 'program') startProgramSession(activeProgram?.next_session);
          else if (projected.kind === 'split' && projected.template) startTemplate(projected.template, { dayLabel: projected.day });
          else onStart({ exercises: [] });
        }}
        onSplitNudge={() => router.navigate('/profile')}
      />

      <View style={{ marginTop: 20, gap: 12 }}>
        <PlanWorkspace
          open={openWorkspace === 'plan'}
          mode={hasProgram ? 'program' : 'split'}
          onToggle={() => setOpenWorkspace(openWorkspace === 'plan' ? '' : 'plan')}
          hasSplit={hasSplit}
          splitType={splitType}
          days={splitDays}
          activeDay={activeDay}
          setActiveDay={(day) => {
            setExpandedDay(day);
            setOpenWorkspace('plan');
          }}
          templatesForDay={templatesForDay}
          workoutsForDay={workoutsForDay}
          program={activeProgram?.program}
          sessions={programSessions}
          loading={detailLoading}
          projectedSessionId={activeProgram?.next_session?.id}
          onStartTemplate={startTemplate}
          onStartProgramSession={startProgramSession}
          onRepeatWorkout={repeatPast}
          onLogSplit={() => router.navigate('/profile')}
        />

        <HistoryPanel
          open={openWorkspace === 'history'}
          onToggle={() => {
            const nextOpen = openWorkspace !== 'history';
            setOpenWorkspace(nextOpen ? 'history' : '');
            if (nextOpen && history.length === 0) loadHistory({ reset: true });
          }}
          preview={historyPreview}
          rows={historyRows}
          loading={historyLoading}
          error={historyError}
          total={historyTotal || recentWorkouts.length}
          onLoadMore={() => loadHistory()}
          onRepeatWorkout={repeatPast}
        />
      </View>

      <View
        style={{
          marginTop: 32,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 18,
          flexDirection: 'row',
          gap: 12,
        }}>
        <Pressable
          onPress={() => onStart({ exercises: [] })}
          style={{
            flex: 0.82,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceAlt,
            padding: 14,
          }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>Open start</Text>
          <Text style={{ marginTop: 4, fontSize: 14, fontWeight: '900', color: colors.text }}>Start blank</Text>
        </Pressable>
        <Pressable
          onPress={() => router.navigate({ pathname: '/community', params: { tab: 'plans' } })}
          style={{
            flex: 1.18,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            borderTopColor: colors.emerald,
            borderTopWidth: 2,
            padding: 16,
          }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.emeraldInk }}>Discovery</Text>
          <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text }}>Find Plans</Text>
            <View
              style={{
                height: 40,
                width: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.emerald,
              }}>
              <Text style={{ fontFamily: monoFont, fontSize: 18, color: colors.onEmerald }}>+</Text>
            </View>
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}

type Projection = {
  kind: 'program' | 'split' | 'blank';
  label: string;
  title: string;
  day?: string;
  template?: any;
  reasonLabel: string;
  trust: string;
  exercises: { name: string; muscle: string; setCount: number }[];
};

function HeroPanel({
  projected,
  compressed,
  loading,
  onToggle,
  onStart,
  onSplitNudge,
}: {
  projected: Projection;
  compressed: boolean;
  loading: boolean;
  onToggle: () => void;
  onStart: () => void;
  onSplitNudge: () => void;
}) {
  const open = !compressed;
  const isBlank = projected.kind === 'blank';
  return (
    <View
      style={{
        borderRadius: compressed ? 16 : 20,
        padding: compressed ? 12 : 16,
        backgroundColor: colors.emerald,
        overflow: 'hidden',
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={onToggle} style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.78)' }}>{projected.label}</Text>
          <Text numberOfLines={1} style={{ marginTop: 4, fontSize: 26, lineHeight: 28, fontWeight: '900', color: colors.onEmerald }}>
            {projected.title}
          </Text>
        </Pressable>
        <Pressable
          onPress={onStart}
          style={{
            minHeight: compressed ? 44 : 52,
            borderRadius: 999,
            paddingHorizontal: compressed ? 16 : 20,
            justifyContent: 'center',
            backgroundColor: colors.onEmerald,
          }}>
          <Text style={{ fontSize: 14, fontWeight: '900', color: '#08341f' }}>
            {isBlank ? 'Start blank' : 'Start workout'}
          </Text>
        </Pressable>
      </View>

      {open && (
        <View style={{ paddingTop: 16 }}>
          <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)', paddingTop: 12, gap: 4 }}>
            <Text style={{ fontFamily: monoFont, fontSize: 11, color: 'rgba(255,255,255,0.76)' }}>{projected.reasonLabel}</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.76)' }}>{projected.trust}</Text>
          </View>

          {isBlank ? (
            <View
              style={{
                marginTop: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.22)',
                backgroundColor: 'rgba(8,9,10,0.16)',
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.onEmerald }}>No split logged yet</Text>
              <Text style={{ marginTop: 4, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.74)' }}>
                Start blank now, then log your split so this screen can project the right session next time.
              </Text>
              <Pressable
                onPress={onSplitNudge}
                style={{
                  marginTop: 12,
                  minHeight: 40,
                  alignSelf: 'flex-start',
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.16)',
                }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: colors.onEmerald }}>Log split</Text>
              </Pressable>
            </View>
          ) : (
            <ExercisePreview exercises={projected.exercises} loading={loading} />
          )}
        </View>
      )}
    </View>
  );
}

function ExercisePreview({ exercises, loading }: { exercises: Projection['exercises']; loading: boolean }) {
  if (loading) return <HistorySkeleton compact />;
  if (!exercises.length) {
    return (
      <View
        style={{
          marginTop: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.78)' }}>
          Start to load the planned exercises into the logger.
        </Text>
      </View>
    );
  }
  return (
    <View
      style={{
        marginTop: 16,
        maxHeight: 252,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        backgroundColor: 'rgba(8,9,10,0.16)',
        overflow: 'hidden',
      }}>
      <ScrollView nestedScrollEnabled>
        {exercises.map((exercise, index) => (
          <View
            key={`${exercise.name}-${index}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              minHeight: 54,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: 'rgba(255,255,255,0.12)',
            }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: colors.onEmerald }}>
                {exercise.name}
              </Text>
              <Text style={{ marginTop: 2, fontSize: 12, color: 'rgba(255,255,255,0.68)' }}>
                {exercise.muscle || 'Planned exercise'}
              </Text>
            </View>
            <Text style={{ fontFamily: monoFont, fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.72)' }}>
              {exercise.setCount || 0} sets
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function PlanWorkspace({
  open,
  mode,
  onToggle,
  hasSplit,
  splitType,
  days,
  activeDay,
  setActiveDay,
  templatesForDay,
  workoutsForDay,
  program,
  sessions,
  loading,
  projectedSessionId,
  onStartTemplate,
  onStartProgramSession,
  onRepeatWorkout,
  onLogSplit,
}: {
  open: boolean;
  mode: 'program' | 'split';
  onToggle: () => void;
  hasSplit: boolean;
  splitType: string;
  days: string[];
  activeDay: string;
  setActiveDay: (day: string) => void;
  templatesForDay: (day: string) => any[];
  workoutsForDay: (day: string, limit?: number) => any[];
  program?: any;
  sessions: any[];
  loading: boolean;
  projectedSessionId?: string;
  onStartTemplate: (template: any, extras?: Record<string, any>) => void;
  onStartProgramSession: (session: any) => void;
  onRepeatWorkout: (workout: any) => void;
  onLogSplit: () => void;
}) {
  const isProgram = mode === 'program';
  const selectedTemplates = !isProgram && hasSplit ? templatesForDay(activeDay) : [];
  const selectedWorkouts = !isProgram && hasSplit ? workoutsForDay(activeDay, 20) : [];
  const summary = isProgram ? `${sessions.length || 0} sessions` : hasSplit ? splitType : 'not logged';

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: open ? colors.emerald : colors.border,
        paddingVertical: open ? 16 : 12,
      }}>
      <PanelHeading
        title={isProgram ? 'Your Program' : 'Your Split'}
        meta={isProgram ? program?.name || 'active program' : summary}
        open={open}
        onPress={onToggle}
      />

      {!isProgram && hasSplit && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          {days.map((day) => {
            const active = day === activeDay;
            return (
              <Pressable
                key={day}
                onPress={() => setActiveDay(day)}
                style={{
                  minHeight: 48,
                  minWidth: 78,
                  borderRadius: 16,
                  borderWidth: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  gap: 2,
                  borderColor: active ? colors.emerald : colors.border,
                  backgroundColor: active ? colors.emerald : 'transparent',
                }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? colors.onEmerald : colors.textMuted }}>{day}</Text>
                <Text style={{ fontFamily: monoFont, fontSize: 10, color: active ? 'rgba(255,255,255,0.78)' : colors.inkSoft }}>
                  {templatesForDay(day).length}/{workoutsForDay(day).length}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {!isProgram && !hasSplit && (
        <Text style={{ marginTop: 8, fontSize: 13, color: colors.textMuted }}>
          Log your split so RepSearch can project the right session instead of defaulting to blank.
        </Text>
      )}

      {isProgram && !open && (
        <Text style={{ marginTop: 8, fontSize: 13, color: colors.textMuted }}>
          Open to choose from every session in the active program.
        </Text>
      )}

      {open && (
        <View
          style={{
            marginTop: 14,
            borderRadius: 16,
            backgroundColor: colors.emerald,
            paddingHorizontal: 16,
            paddingBottom: 16,
            maxHeight: 580,
          }}>
          {isProgram ? (
            <>
              <WorkspaceHeader title={program?.name || 'Active program'} meta="Program replaces your split while it is active." />
              <ScrollView nestedScrollEnabled style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
                {loading && sessions.length === 0 && <HistorySkeleton onEmerald />}
                {!loading && sessions.length === 0 && <EmptyInline>No program sessions found.</EmptyInline>}
                {sessions.map((session: any, index: number) => (
                  <StartRow
                    key={session.id || `${session.template_id}-${index}`}
                    first={index === 0}
                    title={session.session_label || session.template_name || `Session ${index + 1}`}
                    meta={[
                      session.block_name,
                      session.week_number ? `Week ${session.week_number}` : null,
                      session.id === projectedSessionId ? 'projected next' : null,
                    ]
                      .filter(Boolean)
                      .join(' / ')}
                    action="Start"
                    highlight={session.id === projectedSessionId}
                    onPress={() => onStartProgramSession(session)}
                  />
                ))}
              </ScrollView>
            </>
          ) : hasSplit ? (
            <>
              <WorkspaceHeader title={activeDay} meta={DAY_HINTS[activeDay] || 'Start from this split day.'} />
              <ScrollView nestedScrollEnabled style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
                {selectedTemplates.map((template: any, index: number) => (
                  <StartRow
                    key={template.id}
                    first={index === 0}
                    title={template.name || 'Template'}
                    meta={template.usage_count ? `Template / used ${template.usage_count}x` : 'Template'}
                    action="Start"
                    onPress={() => onStartTemplate(template, { dayLabel: activeDay })}
                  />
                ))}
                {selectedWorkouts.map((workout: any, index: number) => {
                  const summaryRow = summaryForWorkout(workout);
                  return (
                    <StartRow
                      key={workout.id}
                      first={selectedTemplates.length === 0 && index === 0}
                      title={getWorkoutTitle(workout)}
                      meta={summaryRow.exerciseNames.slice(0, 4).join(', ') || `${summaryRow.setCount} sets`}
                      action={shortDate(workout.date)}
                      onPress={() => onRepeatWorkout(workout)}
                    />
                  );
                })}
                {selectedTemplates.length === 0 && selectedWorkouts.length === 0 && (
                  <EmptyInline>No saved starts for this split day yet. Use Start blank below if you want an open session.</EmptyInline>
                )}
              </ScrollView>
            </>
          ) : (
            <View style={{ paddingTop: 16 }}>
              <Pressable
                onPress={onLogSplit}
                style={{
                  minHeight: 44,
                  alignSelf: 'flex-start',
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  justifyContent: 'center',
                  backgroundColor: colors.onEmerald,
                }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#08341f' }}>Log split</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function HistoryPanel({
  open,
  onToggle,
  preview,
  rows,
  loading,
  error,
  total,
  onLoadMore,
  onRepeatWorkout,
}: {
  open: boolean;
  onToggle: () => void;
  preview: any[];
  rows: any[];
  loading: boolean;
  error: string;
  total: number;
  onLoadMore: () => void;
  onRepeatWorkout: (workout: any) => void;
}) {
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: open ? colors.emerald : colors.border,
        paddingVertical: open ? 16 : 12,
      }}>
      <PanelHeading title="History" meta={`${total || 0} workouts`} open={open} onPress={onToggle} />

      {!open && preview.length > 0 && (
        <View style={{ marginTop: 8 }}>
          {preview.map((workout, index) => {
            const summary = summaryForWorkout(workout);
            return (
              <Pressable
                key={workout.id}
                onPress={() => onRepeatWorkout(workout)}
                style={{
                  minHeight: 44,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: 'rgba(255,255,255,0.04)',
                }}>
                <Text numberOfLines={1} style={{ flex: 1, minWidth: 0, fontSize: 14, color: colors.textMuted }}>
                  {getWorkoutTitle(workout)}
                </Text>
                <Text style={{ fontFamily: monoFont, fontSize: 10, color: colors.textMuted }}>{summary.setCount} sets</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {open && (
        <View
          style={{
            marginTop: 14,
            borderRadius: 16,
            backgroundColor: colors.emerald,
            paddingHorizontal: 16,
            paddingBottom: 16,
            maxHeight: 580,
          }}>
          <WorkspaceHeader title="All past workouts" meta="Tap any row to repeat it into the logger." />
          <ScrollView nestedScrollEnabled style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
            {!!error && (
              <Text
                style={{
                  marginTop: 8,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  fontSize: 14,
                  color: '#fecaca',
                }}>
                {error}
              </Text>
            )}
            {loading && rows.length === 0 && <HistorySkeleton onEmerald />}
            {!loading && !error && rows.length === 0 && <EmptyInline>No past workouts yet.</EmptyInline>}
            {rows.map((workout, index) => {
              const summary = summaryForWorkout(workout);
              return (
                <StartRow
                  key={workout.id}
                  first={index === 0}
                  title={getWorkoutTitle(workout)}
                  meta={`${summary.exerciseNames.slice(0, 4).join(', ')}${summary.exerciseNames.length > 4 ? ` +${summary.exerciseNames.length - 4}` : ''}`}
                  action={shortDate(workout.date)}
                  onPress={() => onRepeatWorkout(workout)}
                />
              );
            })}
            {rows.length < total && (
              <Pressable
                onPress={onLoadMore}
                disabled={loading}
                style={{
                  marginTop: 12,
                  minHeight: 44,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(8,9,10,0.25)',
                  opacity: loading ? 0.5 : 1,
                }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: colors.onEmerald }}>
                  {loading ? 'Loading...' : 'Load more'}
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function PanelHeading({ title, meta, open, onPress }: { title: string; meta: string; open: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View>
        <Text style={{ fontSize: 17, fontWeight: '900', color: colors.text }}>{title}</Text>
        <Text style={{ marginTop: 2, fontFamily: monoFont, fontSize: 12, color: open ? colors.emeraldInk : colors.textMuted }}>
          {meta}
        </Text>
      </View>
      <View
        style={{
          height: 36,
          width: 36,
          borderRadius: 18,
          borderWidth: 1,
          alignItems: 'center',
          justifyContent: 'center',
          borderColor: open ? colors.emerald : colors.border,
          backgroundColor: open ? colors.emerald : 'transparent',
          transform: [{ rotate: open ? '45deg' : '0deg' }],
        }}>
        <Text style={{ fontFamily: monoFont, fontSize: 17, lineHeight: 20, color: open ? colors.onEmerald : colors.text }}>+</Text>
      </View>
    </Pressable>
  );
}

function WorkspaceHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <View style={{ minHeight: 78, justifyContent: 'flex-end', paddingTop: 18, paddingBottom: 12 }}>
      <Text numberOfLines={1} style={{ fontSize: 19, fontWeight: '900', color: colors.onEmerald }}>
        {title}
      </Text>
      <Text style={{ marginTop: 4, fontSize: 13, color: 'rgba(255,255,255,0.76)' }}>{meta}</Text>
    </View>
  );
}

function StartRow({
  title,
  meta,
  action,
  onPress,
  highlight = false,
  first = false,
}: {
  title: string;
  meta?: string;
  action: string;
  onPress: () => void;
  highlight?: boolean;
  first?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 58,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 11,
        paddingHorizontal: highlight ? 10 : 0,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: 'rgba(255,255,255,0.16)',
        backgroundColor: highlight ? 'rgba(255,255,255,0.1)' : 'transparent',
        borderRadius: highlight ? 10 : 0,
      }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: colors.onEmerald }}>
          {title}
        </Text>
        {meta ? (
          <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 12, color: 'rgba(255,255,255,0.76)' }}>
            {meta}
          </Text>
        ) : null}
      </View>
      <Text style={{ fontFamily: monoFont, fontSize: 12, fontWeight: '700', color: colors.onEmerald }}>{action}</Text>
    </Pressable>
  );
}

function EmptyInline({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        paddingVertical: 16,
        fontSize: 14,
        color: 'rgba(255,255,255,0.76)',
      }}>
      {children}
    </Text>
  );
}

function HistorySkeleton({ compact = false, onEmerald = false }: { compact?: boolean; onEmerald?: boolean }) {
  const lineColor = onEmerald || compact ? 'rgba(255,255,255,0.25)' : colors.surfaceAlt;
  return (
    <View style={{ marginTop: compact ? 16 : 0, paddingVertical: 8, gap: 12 }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ paddingBottom: 12, gap: 8 }}>
          <View style={{ height: 16, width: 144, borderRadius: 4, backgroundColor: lineColor }} />
          <View style={{ height: 12, width: 224, borderRadius: 4, backgroundColor: lineColor }} />
        </View>
      ))}
    </View>
  );
}

function buildProjection({
  activeProgram,
  projectedTemplate,
  nextSplitDay,
  hasSplit,
  splitType,
  user,
  lastWorkout,
}: {
  activeProgram: any;
  projectedTemplate: any;
  nextSplitDay: string;
  hasSplit: boolean;
  splitType: string;
  user: any;
  lastWorkout: any;
}): Projection {
  const next = activeProgram?.next_session;
  if (next?.template_id) {
    const exercises = templateExercisePreview(projectedTemplate);
    const plannedSets = exercises.reduce((sum: number, exercise: any) => sum + (exercise.setCount || 0), 0);
    const suggested = activeProgram?.phase?.next_suggested_at
      ? formatSuggestedTime(activeProgram.phase.next_suggested_at)
      : 'queued';
    const title = next.session_label || next.template_name || projectedTemplate?.name || 'Next session';
    return {
      kind: 'program',
      label: 'Projected next',
      title,
      reasonLabel: 'Program',
      trust: [
        activeProgram?.program?.name || 'Active program',
        `${suggested} target`,
        plannedSets ? `${plannedSets} planned sets` : null,
        lastWorkout ? `last: ${getWorkoutTitle(lastWorkout)} ${shortDate(lastWorkout.date)}` : null,
      ]
        .filter(Boolean)
        .join(' / '),
      exercises,
    };
  }

  if (hasSplit) {
    const title = projectedTemplate?.name || `${nextSplitDay} day`;
    const schedule = scheduleTrustForDay(user, nextSplitDay);
    return {
      kind: 'split',
      label: 'Projected next',
      title,
      day: nextSplitDay,
      template: projectedTemplate,
      reasonLabel: splitType || 'Split',
      trust: [
        lastWorkout ? `after last ${getWorkoutTitle(lastWorkout)}` : 'first split session',
        `${nextSplitDay} is next`,
        schedule,
      ]
        .filter(Boolean)
        .join(' / '),
      exercises: templateExercisePreview(projectedTemplate),
    };
  }

  return {
    kind: 'blank',
    label: 'No split yet',
    title: 'Start blank',
    reasonLabel: 'Setup',
    trust: 'No program or split is logged yet.',
    exercises: [],
  };
}

function nextDayAfterLastWorkout(lastWorkout: any, splitDays: string[]) {
  const days = splitDays.filter((day) => day !== 'Other');
  if (!days.length) return splitDays[0] || 'Other';
  const last = getItemDayLabelStatic(lastWorkout);
  const idx = days.indexOf(last);
  if (idx === -1) return days[0];
  return days[(idx + 1) % days.length];
}

function scheduleTrustForDay(user: any, splitDay: string) {
  const schedule = parseSchedule(user?.split_days_json);
  const hits = schedule.filter((row) => row.type === splitDay).map((row) => row.day);
  if (!hits.length) return '';
  const today = new Date().getDay();
  const next = hits
    .map((day) => ({ day, distance: (WEEKDAYS.indexOf(day) - today + 7) % 7 }))
    .sort((a, b) => a.distance - b.distance)[0];
  if (!next) return '';
  if (next.distance === 0) return `scheduled today (${next.day})`;
  return `next scheduled ${next.day}`;
}

function parseSchedule(value: unknown) {
  try {
    const parsed = JSON.parse(String(value ?? '[]'));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row: any) => ({ day: String(row?.day || '').slice(0, 3), type: String(row?.type || '').trim() }))
      .filter((row) => WEEKDAYS.includes(row.day) && row.type);
  } catch {
    return [];
  }
}

function templateExercisePreview(template: any) {
  return (template?.exercises || []).map((exercise: any) => ({
    name: exercise.exercise_name || exercise.name || exercise.exercise_id || 'Exercise',
    muscle: exercise.primary_muscle || exercise.secondary_muscle || '',
    setCount: Array.isArray(exercise.sets) ? exercise.sets.length : exercise.set_count || 0,
  }));
}

function summaryForWorkout(workout: any) {
  const sets = workout?.sets || [];
  const byExercise = new Map<string, { name: string; muscle: string }>();
  for (const set of sets) {
    if (!set.exercise_id || byExercise.has(set.exercise_id)) continue;
    byExercise.set(set.exercise_id, {
      name: set.exercise_name || set.exercise_id,
      muscle: set.primary_muscle || '',
    });
  }
  const exercises = [...byExercise.values()];
  return {
    exerciseNames: exercises.map((exercise) => exercise.name),
    muscleGroups: [...new Set(exercises.map((exercise) => topLevelGroup(exercise.muscle)).filter(Boolean))],
    setCount: sets.length || workout?.set_count || 0,
  };
}

function getItemDayLabelStatic(item: any) {
  return String(item?.workout_day || item?.workout_split_type || '').trim();
}

function getWorkoutTitle(workout: any) {
  return workout?.workout_day || workout?.workout_split_type || workout?.name || 'Workout';
}

function formatSuggestedTime(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return 'soon';
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function shortDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value || 'none';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
