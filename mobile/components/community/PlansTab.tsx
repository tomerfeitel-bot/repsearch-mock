import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useWorkout } from '@/hooks/useWorkout';
import { api } from '@/lib/api';
import { SEED_EXERCISES } from '@/lib/exercises';
import { colors, monoFont } from '@/lib/theme';

// Port of src/components/community/PlansTab.jsx. "Start" hands the template
// to useWorkout.startWorkout and jumps to the workout tab (Session 3);
// "+ New" routes into the builders, which land in Session 4.
const exerciseById = new Map<string, any>(SEED_EXERCISES.map((e: any) => [e.id, e]));
const TYPES = [
  { v: 'programs', label: 'Programs' },
  { v: 'templates', label: 'Templates' },
];
const SOURCES = [
  { v: 'for_you', label: 'For you' },
  { v: 'following', label: 'Following' },
];

const STRICTNESS = [
  { v: 'written', label: 'Run as written' },
  { v: 'adapt', label: 'Adapt as needed' },
  { v: 'inspiration', label: 'Use as inspiration' },
];

export default function PlansTab({
  type: typeProp,
  source: sourceProp,
  hideControls = false,
}: {
  type?: string;
  source?: string;
  hideControls?: boolean;
}) {
  const [typeState, setType] = useState('programs');
  const [sourceState, setSource] = useState('for_you');
  const type = typeProp ?? typeState;
  const source = sourceProp ?? sourceState;
  const [templates, setTemplates] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [programDrafts, setProgramDrafts] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailProgram, setDetailProgram] = useState<any>(null);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const toast = useToast();

  const loadPlans = useCallback(
    (nextSource = source, showLoading = true) => {
      if (showLoading) setLoading(true);
      return Promise.all([
        api.get('/templates'),
        api.get('/templates?status=draft'),
        api.get('/programs?status=draft'),
        api.get(`/programs?sort=${nextSource === 'following' ? 'following' : 'for_you'}`),
      ])
        .then(([t, d, pd, p]) => {
          setTemplates(t.templates || []);
          setDrafts(d.templates || []);
          setProgramDrafts(pd.programs || []);
          setPrograms(p.programs || []);
        })
        .catch((err) => toast?.(err.message || 'Failed to load plans', 'error'))
        .finally(() => setLoading(false));
    },
    [source, toast],
  );

  useEffect(() => {
    loadPlans(source);
  }, [source, loadPlans]);

  const shownPrograms = type === 'templates' ? [] : programs;
  const shownTemplates = type === 'templates' ? templates : [];

  function refresh() {
    return loadPlans(source);
  }

  function handleProgramStarted(programId: string) {
    loadPlans(source, false);
    if (detailProgram?.id === programId) setDetailRefreshKey((k) => k + 1);
  }

  return (
    <View style={{ paddingBottom: 96 }}>
      {hideControls ? (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2 }}>
          <NewButton onPress={() => setCreateOpen(true)} />
        </View>
      ) : (
        <>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
            {TYPES.map((t) => {
              const active = type === t.v;
              return (
                <Pressable key={t.v} onPress={() => setType(t.v)} style={{ paddingBottom: 10, paddingTop: 4 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: active ? colors.text : colors.textMuted }}>
                    {t.label}
                  </Text>
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: 2.5,
                      borderRadius: 2,
                      backgroundColor: colors.emeraldInk,
                      opacity: active ? 1 : 0,
                    }}
                  />
                </Pressable>
              );
            })}
            <View style={{ marginLeft: 'auto', paddingBottom: 6 }}>
              <NewButton onPress={() => setCreateOpen(true)} />
            </View>
          </View>

          {type === 'programs' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.textMuted }}>
                Source
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {SOURCES.map((s) => {
                  const active = source === s.v;
                  return (
                    <Pressable
                      key={s.v}
                      onPress={() => setSource(s.v)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? colors.emerald : colors.border,
                        backgroundColor: active ? colors.emerald : 'transparent',
                      }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? colors.onEmerald : colors.textMuted }}>
                        {s.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </>
      )}

      {loading && <Skeleton />}

      {!loading && type === 'programs' && (
        <View style={{ paddingTop: 4 }}>
          {shownPrograms.length === 0 ? (
            <Empty>{source === 'following' ? 'No programs from people you follow yet.' : 'No programs here yet.'}</Empty>
          ) : (
            shownPrograms.map((p) => (
              <ProgramCard key={p.id} program={p} onOpen={() => setDetailProgram(p)} onStarted={handleProgramStarted} />
            ))
          )}
        </View>
      )}

      {!loading && type === 'templates' && <Templates templates={shownTemplates} onChanged={refresh} />}

      <CreateMenu
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        drafts={drafts}
        programDrafts={programDrafts}
        onDeleted={refresh}
      />
      <ProgramDetailSheet program={detailProgram} refreshKey={detailRefreshKey} onClose={() => setDetailProgram(null)} />
    </View>
  );
}

function NewButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Create program or template"
      style={{
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent,
      }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accentInk }}>+ New</Text>
    </Pressable>
  );
}

function CreateMenu({
  open,
  onClose,
  drafts = [],
  programDrafts = [],
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  drafts: any[];
  programDrafts: any[];
  onDeleted?: () => void;
}) {
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'draft' | 'program'; item: any } | null>(null);

  function notYet() {
    onClose();
    toast?.('The template & program builders arrive in Session 4', 'info');
  }

  async function doDelete() {
    if (!confirmDelete) return;
    const { type, item } = confirmDelete;
    setConfirmDelete(null);
    try {
      if (type === 'draft') {
        await api.del(`/templates/${item.id}`);
        toast?.('Draft deleted', 'success');
      } else {
        await api.del(`/programs/${item.id}`);
        toast?.('Program draft deleted', 'success');
      }
      onDeleted?.();
    } catch (err: any) {
      toast?.(err.message || 'Failed to delete', 'error');
    }
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Create">
        <View style={{ padding: 16, gap: 16, paddingBottom: 32 }}>
          {drafts.length > 0 && (
            <DraftList
              title="Drafts"
              items={drafts}
              blurb="Private draft"
              onOpen={notYet}
              onDelete={(item) => setConfirmDelete({ type: 'draft', item })}
            />
          )}
          {programDrafts.length > 0 && (
            <DraftList
              title="Program drafts"
              items={programDrafts}
              blurb="Private program draft"
              onOpen={notYet}
              onDelete={(item) => setConfirmDelete({ type: 'program', item })}
            />
          )}
          <View style={{ gap: 8 }}>
            <Pressable onPress={notYet} style={CARD_STYLE}>
              <Text style={{ fontWeight: '600', color: colors.text }}>Template</Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: colors.inkSoft }}>
                Build a reusable workout in the full template builder.
              </Text>
            </Pressable>
            <Pressable onPress={notYet} style={CARD_STYLE}>
              <Text style={{ fontWeight: '600', color: colors.text }}>Program</Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: colors.inkSoft }}>
                Create a multi-week plan from saved templates.
              </Text>
            </Pressable>
          </View>
        </View>
      </Sheet>
      <ConfirmSheet
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        title={confirmDelete?.type === 'draft' ? 'Delete draft?' : 'Delete program draft?'}
        message={`"${confirmDelete?.item?.name}" will be permanently removed.`}
        confirmLabel="Delete"
        danger
      />
    </>
  );
}

function DraftList({
  title,
  items,
  blurb,
  onOpen,
  onDelete,
}: {
  title: string;
  items: any[];
  blurb: string;
  onOpen: (item: any) => void;
  onDelete: (item: any) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={SECTION_LABEL}>{title}</Text>
      {items.slice(0, 4).map((draft) => (
        <View key={draft.id} style={[CARD_STYLE, { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
          <Pressable onPress={() => onOpen(draft)} style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontWeight: '500', color: colors.text }}>{draft.name}</Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: colors.inkSoft }}>{blurb}</Text>
          </Pressable>
          <Pressable onPress={() => onDelete(draft)} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.negative }}>Delete</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function Templates({ templates, onChanged }: { templates: any[]; onChanged?: () => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const { workout, startWorkout } = useWorkout();
  const router = useRouter();
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState<any>(null);
  const [pendingTemplate, setPendingTemplate] = useState<any>(null);

  if (!templates.length) return <Empty>Save a finished workout or create a lightweight template.</Empty>;

  async function startFromTemplate(t: any, skipConfirm = false) {
    if (workout && !skipConfirm) {
      setPendingTemplate(t);
      return;
    }
    try {
      const data = await api.get(`/templates/${t.id}`);
      let template = data.template;
      // Foreign templates get copied into the user's library first, exactly
      // like the web flow, so the run is attributed to their own copy.
      if (template.user_id !== user?.id) {
        const copied = await api.post('/templates', {
          name: template.name,
          description: template.description || '',
          visibility: 'private',
          strictness: template.strictness || 'adapt',
          source_template_id: template.id,
          workout_day: template.workout_day || null,
          workout_split_type: template.workout_split_type || null,
          exercises: (template.exercises || []).map((e: any) => ({
            exercise_id: e.exercise_id,
            sets: (e.sets || []).map((s: any) => ({
              target_reps: s.target_reps,
              target_weight_kg: s.target_weight_kg,
              target_rir: s.target_rir,
              target_rep_range: s.target_rep_range,
              set_type: s.set_type,
              rom_category: s.rom_category,
              tempo_tag: s.tempo_tag,
              rest_seconds: s.rest_seconds,
              failure: s.failure,
            })),
          })),
        });
        template = copied.template;
      }
      const exercises = (template.exercises || []).map((e: any) => {
        const seed = exerciseById.get(e.exercise_id);
        return {
          exerciseId: e.exercise_id,
          exerciseName: seed?.name || e.exercise_id,
          primary_muscle: seed?.primary_muscle,
          equipment_type: seed?.equipment_type,
          sets: e.sets || [],
        };
      });
      startWorkout({
        name: template.name,
        dayLabel: template.workout_day || null,
        templateId: template.id,
        exercises,
        runClassification: template.source_template_id ? 'derived' : 'exact',
        skipReplaceWarning: true,
      });
      router.navigate('/workout');
    } catch (err: any) {
      toast?.(err.message || 'Failed to start template', 'error');
    }
  }

  async function doDeleteTemplate() {
    if (!confirmDeleteTemplate) return;
    const t = confirmDeleteTemplate;
    setConfirmDeleteTemplate(null);
    try {
      await api.del(`/templates/${t.id}`);
      toast?.('Template deleted', 'success');
      onChanged?.();
    } catch (err: any) {
      toast?.(err.message || 'Failed to delete template', 'error');
    }
  }

  return (
    <>
      <View style={{ paddingTop: 4 }}>
        {templates.map((t) => (
          <View
            key={t.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontWeight: '700', color: colors.text }}>{t.name}</Text>
              <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textMuted }}>
                {t.creator_username ? `by ${t.creator_username} · ` : ''}
                {strictnessLabel(t.strictness)} · used {t.usage_count || 0}x
              </Text>
            </View>
            <Pressable
              onPress={() => startFromTemplate(t)}
              style={{
                height: 36,
                paddingHorizontal: 14,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.emerald,
              }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.onEmerald }}>Start</Text>
            </Pressable>
            {t.user_id === user?.id && (
              <Pressable onPress={() => setConfirmDeleteTemplate(t)} style={{ height: 36, paddingHorizontal: 8, justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.negative }}>Delete</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
      <ConfirmSheet
        open={!!confirmDeleteTemplate}
        onClose={() => setConfirmDeleteTemplate(null)}
        onConfirm={doDeleteTemplate}
        title="Delete template?"
        message={`"${confirmDeleteTemplate?.name}" will be permanently removed.`}
        confirmLabel="Delete"
        danger
      />
      <ConfirmSheet
        open={!!pendingTemplate}
        onClose={() => setPendingTemplate(null)}
        onConfirm={() => {
          const t = pendingTemplate;
          setPendingTemplate(null);
          startFromTemplate(t, true);
        }}
        title="Replace workout?"
        message="Starting this template will replace your current active workout."
        confirmLabel="Replace"
        danger
      />
    </>
  );
}

function ProgramCard({
  program,
  onOpen,
  onStarted,
}: {
  program: any;
  onOpen: () => void;
  onStarted?: (programId: string) => void;
}) {
  const toast = useToast();
  const [startOpen, setStartOpen] = useState(false);

  return (
    <>
      <View style={{ paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Avatar username={program.creator_username || 'anon'} size="sm" />
          <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: colors.text, flexShrink: 1 }}>
            {program.creator_username || 'unknown'}
          </Text>
          <Text style={{ marginLeft: 'auto', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, color: colors.textMuted }}>
            Open-ended
          </Text>
        </View>

        <Pressable onPress={onOpen} style={{ marginTop: 8 }}>
          <Text numberOfLines={2} style={{ fontSize: 18, lineHeight: 23, fontWeight: '800', color: colors.text }}>
            {program.name}
          </Text>
          {program.description ? (
            <Text numberOfLines={2} style={{ marginTop: 6, fontSize: 15, color: colors.textMuted }}>
              {program.description}
            </Text>
          ) : null}
        </Pressable>

        <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 8 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', fontFamily: monoFont, color: colors.text }}>
            {program.proof?.hero || `${program.enrollment_count || 0} started`}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{proofStatus(program.proof?.status)}</Text>
        </View>

        <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{strictnessLabel(program.strictness)}</Text>
          <Pressable
            onPress={() => setStartOpen(true)}
            style={{
              marginLeft: 'auto',
              height: 36,
              paddingHorizontal: 16,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.accent,
            }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accentInk }}>Start program</Text>
          </Pressable>
        </View>
      </View>
      <StartProgramSheet
        open={startOpen}
        onClose={() => setStartOpen(false)}
        program={program}
        onStarted={() => {
          toast?.(`Started ${program.name}`, 'success');
          onStarted?.(program.id);
        }}
      />
    </>
  );
}

export function ProgramDetailSheet({
  program,
  refreshKey,
  onClose,
}: {
  program: any;
  refreshKey?: number;
  onClose: () => void;
}) {
  const [evidence, setEvidence] = useState<any>(null);
  const [full, setFull] = useState<any>(null);
  const [evidenceError, setEvidenceError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const { workout, startWorkout } = useWorkout();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!program) return;
    let cancelled = false;
    setEvidence(null);
    setFull(null);
    setEvidenceError('');
    setDetailError('');
    api
      .get(`/programs/${program.id}/evidence`)
      .then((result) => {
        if (!cancelled) setEvidence(result);
      })
      .catch((err) => {
        if (!cancelled) setEvidenceError(err.message || 'Could not load evidence');
      });
    api
      .get(`/programs/${program.id}`)
      .then((data) => {
        if (!cancelled) setFull(data.program);
      })
      .catch((err) => {
        if (!cancelled) setDetailError(err.message || 'Could not load program details');
      });
    return () => {
      cancelled = true;
    };
  }, [program, refreshKey, retryKey]);

  if (!program) return null;

  const nextSession = full?.phase?.next_session_id
    ? full.workouts?.find((w: any) => w.id === full.phase.next_session_id)
    : full?.workouts?.[0];

  async function startNextSession(skipConfirm = false) {
    if (!nextSession?.template_id) return;
    if (workout && !skipConfirm) {
      setReplaceConfirmOpen(true);
      return;
    }
    try {
      const data = await api.get(`/templates/${nextSession.template_id}`);
      const template = data.template;
      const exercises = (template.exercises || []).map((e: any) => {
        const seed = exerciseById.get(e.exercise_id);
        return {
          exerciseId: e.exercise_id,
          exerciseName: seed?.name || e.exercise_id,
          primary_muscle: seed?.primary_muscle,
          equipment_type: seed?.equipment_type,
          sets: e.sets || [],
        };
      });
      startWorkout({
        name: nextSession.session_label || template.name,
        dayLabel: nextSession.session_label || null,
        templateId: template.id,
        programId: program.id,
        exercises,
        runClassification: nextSession.optional ? 'adapted' : 'exact',
        skipReplaceWarning: true,
      });
      onClose();
      router.navigate('/workout');
    } catch (err: any) {
      toast?.(err.message || 'Failed to start next session', 'error');
    }
  }

  async function decide(decision: string) {
    try {
      const data = await api.post(`/programs/${program.id}/phase-decision`, { decision });
      setFull((prev: any) => (prev ? { ...prev, phase: data.phase } : prev));
      setDecisionOpen(false);
      toast?.('Program timing updated', 'success');
    } catch (err: any) {
      toast?.(err.message || 'Failed to update timing', 'error');
    }
  }

  return (
    <Sheet open={!!program} onClose={onClose} title={program.name}>
      <View style={{ padding: 16, gap: 20, paddingBottom: 32 }}>
        <View>
          <Text style={SECTION_LABEL}>Creator note</Text>
          <Text style={{ marginTop: 4, fontSize: 14, color: colors.textMuted }}>
            {program.description || 'No creator note yet.'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <ProofStat label="Started" value={program.proof?.starts || 0} />
          <ProofStat label="Active" value={program.proof?.active_users || 0} />
          <ProofStat label="Exact runs" value={program.proof?.exact_runs || 0} />
          <ProofStat label="Adapted" value={program.proof?.adapted_runs || 0} />
        </View>
        <View style={[CARD_STYLE, { gap: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={SECTION_LABEL}>Next session</Text>
              <Text style={{ marginTop: 4, fontSize: 14, fontWeight: '600', color: colors.text }}>
                {detailError ||
                  nextSession?.session_label ||
                  nextSession?.template_name ||
                  (full ? 'Start the program to queue a session' : 'Loading program...')}
              </Text>
              {full?.phase?.next_suggested_at ? (
                <Text style={{ marginTop: 4, fontSize: 12, color: colors.inkSoft }}>
                  Suggested {new Date(full.phase.next_suggested_at).toLocaleDateString()}
                </Text>
              ) : null}
            </View>
            {nextSession && full?.enrollment ? (
              <Pressable
                onPress={() => startNextSession()}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.accent }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accentInk }}>Start</Text>
              </Pressable>
            ) : null}
          </View>
          {detailError ? (
            <SecondaryButton onPress={() => setRetryKey((k) => k + 1)}>Retry program details</SecondaryButton>
          ) : null}
          {full?.enrollment ? (
            <SecondaryButton onPress={() => setDecisionOpen(true)}>Missed timing? Continue, shift, or adapt</SecondaryButton>
          ) : null}
        </View>
        {full?.blocks?.length > 0 && (
          <View style={[CARD_STYLE, { gap: 12 }]}>
            <Text style={SECTION_LABEL}>Structure</Text>
            {full.blocks.map((block: any) => (
              <View key={block.id} style={{ gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{block.name}</Text>
                {(full.workouts || [])
                  .filter((w: any) => w.block_id === block.id)
                  .map((session: any, idx: number) => (
                    <View key={session.id} style={{ flexDirection: 'row', gap: 8 }}>
                      <Text style={{ fontSize: 12, fontFamily: monoFont, color: colors.inkSoft }}>{idx + 1}</Text>
                      <Text numberOfLines={1} style={{ flex: 1, minWidth: 0, fontSize: 12, color: colors.textMuted }}>
                        {session.session_label || session.template_name}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>{timingLabel(session.timing_preset)}</Text>
                    </View>
                  ))}
              </View>
            ))}
          </View>
        )}
        <View style={CARD_STYLE}>
          <Text style={SECTION_LABEL}>Evidence</Text>
          <Text style={{ marginTop: 8, fontSize: 14, color: colors.textMuted }}>
            {evidenceError || evidence?.language || 'Loading evidence...'}
          </Text>
          {evidenceError ? (
            <View style={{ marginTop: 12 }}>
              <SecondaryButton onPress={() => setRetryKey((k) => k + 1)}>Retry evidence</SecondaryButton>
            </View>
          ) : null}
          {evidence?.cohorts ? (
            <View style={{ marginTop: 12, gap: 4 }}>
              <Text style={{ fontSize: 12, color: colors.inkSoft }}>
                People running this: <Text style={{ fontFamily: monoFont, color: colors.textMuted }}>{evidence.cohorts.running_this}</Text>
              </Text>
              <Text style={{ fontSize: 12, color: colors.inkSoft }}>
                Adapting this: <Text style={{ fontFamily: monoFont, color: colors.textMuted }}>{evidence.cohorts.adapting_this}</Text>
              </Text>
              <Text style={{ fontSize: 12, color: colors.inkSoft }}>Matched lifters: Study view</Text>
            </View>
          ) : null}
        </View>
        <DecisionSheet open={decisionOpen} onClose={() => setDecisionOpen(false)} onPick={decide} />
        <ConfirmSheet
          open={replaceConfirmOpen}
          onClose={() => setReplaceConfirmOpen(false)}
          onConfirm={() => {
            setReplaceConfirmOpen(false);
            startNextSession(true);
          }}
          title="Replace workout?"
          message="Starting this session will replace your current active workout."
          confirmLabel="Replace"
          danger
        />
      </View>
    </Sheet>
  );
}

export function StartProgramSheet({
  open,
  onClose,
  program,
  onStarted,
}: {
  open: boolean;
  onClose: () => void;
  program: any;
  onStarted?: () => void;
}) {
  const [startDate, setStartDate] = useState(() => new Date());
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [ack, setAck] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    setStartDate(new Date());
    setAck(false);
    setSaving(false);
    setShowAndroidPicker(false);
  }, [open, program?.id]);

  async function start() {
    if (saving) return;
    setSaving(true);
    try {
      await api.post(`/programs/${program.id}/start`, {
        start_date: startDate.toISOString().slice(0, 10),
        accepted_minimum_weeks: ack,
      });
      onStarted?.();
      onClose();
    } catch (err: any) {
      toast?.(err.message || 'Failed to start program', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Start program">
      <View style={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <Text style={{ fontSize: 14, color: colors.textMuted }}>
          Pick a start date. RepSearch will suggest the next sessions from the program timing rules. Programs are
          open-ended, but useful evidence needs a real run.
        </Text>
        <View style={{ gap: 8 }}>
          <Text style={SECTION_LABEL}>Start date</Text>
          {Platform.OS === 'android' ? (
            <>
              <Pressable
                onPress={() => setShowAndroidPicker(true)}
                style={[CARD_STYLE, { paddingVertical: 12 }]}>
                <Text style={{ fontSize: 15, color: colors.text }}>{startDate.toISOString().slice(0, 10)}</Text>
              </Pressable>
              {showAndroidPicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  onChange={(_e, d) => {
                    setShowAndroidPicker(false);
                    if (d) setStartDate(d);
                  }}
                />
              )}
            </>
          ) : (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="compact"
              themeVariant="dark"
              onChange={(_e, d) => {
                if (d) setStartDate(d);
              }}
            />
          )}
        </View>
        <Pressable onPress={() => setAck((a) => !a)} style={[CARD_STYLE, { padding: 12, flexDirection: 'row', gap: 12 }]}>
          <View
            style={{
              marginTop: 2,
              height: 20,
              width: 20,
              borderRadius: 6,
              borderWidth: 1.5,
              borderColor: ack ? colors.emerald : colors.borderStrong,
              backgroundColor: ack ? colors.emerald : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {ack ? <Text style={{ fontSize: 12, fontWeight: '700', color: colors.onEmerald }}>✓</Text> : null}
          </View>
          <Text style={{ flex: 1, fontSize: 14, color: colors.textMuted }}>
            I understand this program is open-ended, and I am expected to run it for at least 6 weeks before judging the
            results.
          </Text>
        </Pressable>
        <Pressable
          onPress={start}
          disabled={saving || !ack}
          style={{
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: 'center',
            backgroundColor: colors.accent,
            opacity: saving || !ack ? 0.5 : 1,
          }}>
          <Text style={{ fontWeight: '600', color: colors.accentInk }}>{saving ? 'Starting...' : 'Start program'}</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

function DecisionSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (d: string) => void }) {
  const choices = [
    { v: 'continue', title: 'Continue with next session', blurb: 'Keep the program order and mark timing as handled.' },
    { v: 'shift', title: 'Shift future suggestions', blurb: 'Keep the session but reset the timing track.' },
    { v: 'skip_adapt', title: 'Skip / mark adapted', blurb: 'Record that this run moved away from the written plan.' },
  ];
  return (
    <Sheet open={open} onClose={onClose} title="Timing decision">
      <View style={{ padding: 16, gap: 8, paddingBottom: 32 }}>
        {choices.map((c) => (
          <Pressable key={c.v} onPress={() => onPick(c.v)} style={CARD_STYLE}>
            <Text style={{ fontWeight: '600', color: colors.text }}>{c.title}</Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: colors.inkSoft }}>{c.blurb}</Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

function ProofStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={[CARD_STYLE, { padding: 12, flexBasis: '47%', flexGrow: 1 }]}>
      <Text style={{ fontSize: 22, fontFamily: monoFont, color: colors.text }}>{value}</Text>
      <Text style={SECTION_LABEL}>{label}</Text>
    </View>
  );
}

function SecondaryButton({ children, onPress }: { children: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: colors.surfaceAlt }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>{children}</Text>
    </Pressable>
  );
}

function strictnessLabel(v?: string) {
  return STRICTNESS.find((s) => s.v === v)?.label || 'Adapt as needed';
}

function proofStatus(status?: string) {
  if (status === 'based_on_lifters') return 'based on lifters';
  if (status === 'early_signal') return 'early signal';
  return 'not enough data';
}

function timingLabel(value?: string) {
  if (value === 'next_day') return 'next day';
  if (value === 'after_2_rest_days') return '2 rest days';
  if (value === 'two_to_three_days') return '2-3 days';
  if (value === 'any_time_this_week') return 'this week';
  if (value === 'optional_bonus') return 'optional';
  if (value === 'advanced') return 'custom';
  return '1 rest day';
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ paddingHorizontal: 16, paddingVertical: 64, textAlign: 'center', fontSize: 14, color: colors.textMuted }}>
      {children}
    </Text>
  );
}

function Skeleton() {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{ height: 128, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, opacity: 0.6 }}
        />
      ))}
    </View>
  );
}

const CARD_STYLE = {
  borderRadius: 14,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  padding: 16,
};

const SECTION_LABEL = {
  fontSize: 10,
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8,
  color: colors.inkSoft,
};
