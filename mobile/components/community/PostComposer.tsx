import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Sheet } from '@/components/ui/Sheet';
import { PickerSheet } from '@/components/ui/PickerSheet';
import { useToast } from '@/components/ui/Toast';
import { usePosts } from '@/hooks/usePosts';
import { POST_KINDS, POST_LABELS } from '@/lib/postLabels';
import { GROUP_BY_OPTIONS, MEASURE_OPTIONS, prettyGroupBy, prettyMeasure } from '@/lib/researchTheme';
import { colors } from '@/lib/theme';

// Port of src/components/community/PostComposer.jsx. Differences from web:
// the <select>s for the Study feature become PickerSheet triggers (D4);
// "+ Create new" for a workout opens the live logger (Session 3), while the
// program/template/study builders stay a toast until Sessions 4-5.
const VISIBILITIES = [
  { v: 'public', label: 'Public' },
  { v: 'followers', label: 'Followers' },
];

type ComposeOptions = { workouts: any[]; programs: any[]; templates: any[]; studies: any[] };

export default function PostComposer({
  open,
  onClose,
  onPosted,
  initialKind = null,
  initialWorkoutId = null,
}: {
  open: boolean;
  onClose: () => void;
  onPosted?: () => void;
  initialKind?: string | null;
  initialWorkoutId?: string | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const { createPost, loadComposeOptions } = usePosts(toast);
  const [kind, setKind] = useState<string | null>(initialKind);
  const [options, setOptions] = useState<ComposeOptions>({ workouts: [], programs: [], templates: [], studies: [] });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [visibility, setVisibility] = useState('public');
  const [study, setStudy] = useState<{ groupBy: string; measure: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState<null | 'groupBy' | 'measure'>(null);

  useEffect(() => {
    if (!open) return;
    setKind(initialKind);
    setSelected(null);
    setTitle('');
    setBody('');
    setLabels([]);
    setVisibility('public');
    setStudy(null);
    setLoading(true);
    loadComposeOptions()
      .then((opts: any) => {
        setOptions({
          workouts: opts.workouts || [],
          programs: opts.programs || [],
          templates: opts.templates || [],
          studies: opts.studies || [],
        });
        if (initialWorkoutId) {
          const w = (opts.workouts || []).find((x: any) => x.id === initialWorkoutId);
          if (w) {
            setKind('workout');
            setSelected(w);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [open, initialKind, initialWorkoutId, loadComposeOptions]);

  const itemList =
    kind === 'workout'
      ? options.workouts
      : kind === 'program'
        ? options.programs
        : kind === 'template'
          ? options.templates
          : kind === 'study'
            ? options.studies
            : [];

  function pickStudy(s: any) {
    setSelected(s);
    const q = s.query || {};
    setStudy({
      groupBy: q.groupBy || q.groupBys?.[0] || GROUP_BY_OPTIONS[0].value,
      measure: q.measure || MEASURE_OPTIONS[0].value,
    });
  }

  function toggleLabel(l: string) {
    setLabels((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : prev.length >= 5 ? prev : [...prev, l]));
  }

  function studyFeature() {
    const q = selected.query || {};
    const base = {
      groupBy: study!.groupBy,
      measure: study!.measure,
      exerciseId: q.exerciseId,
      muscle: q.muscle,
      minCohort: q.minCohort,
      label: selected.label,
    };
    if (selected.mode === 'compare' && q.cohortA && q.cohortB) {
      return {
        ...base,
        mode: 'compare',
        cohortA: { label: q.cohortA.label || 'A', filters: q.cohortA.filters || [] },
        cohortB: { label: q.cohortB.label || 'B', filters: q.cohortB.filters || [] },
      };
    }
    return { ...base, mode: 'single', filters: q.filters || [] };
  }

  async function submit() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { kind, title: title.trim(), body: body.trim(), labels, visibility };
      if (kind === 'study') payload.study_feature = studyFeature();
      else if (kind !== 'discussion') payload.attachment_id = selected.id;
      await createPost(payload);
      toast?.('Posted', 'success');
      onPosted?.();
    } catch {
      /* toast handled in hook */
    } finally {
      setSaving(false);
    }
  }

  function createNew() {
    if (kind === 'workout') {
      // Web sends the user to /workout to log one; the finish screen's
      // "Share to feed" returns here via ?shareWorkout=<id>.
      onClose();
      router.navigate('/workout');
      return;
    }
    if (kind === 'template' || kind === 'program') {
      // The builder finishes back to /community?compose=<kind> so this
      // composer reopens with the new item pickable (web buildNewTarget).
      onClose();
      const ret = encodeURIComponent(`/community?compose=${kind}`);
      router.push(
        (kind === 'template'
          ? `/templates/builder/new?returnTo=${ret}`
          : `/programs/builder/new?returnTo=${ret}`) as any,
      );
      return;
    }
    // Study: the web links to /study (saved questions become pickable here on
    // return); mobile lands straight on the Explore builder tab.
    onClose();
    router.navigate('/study?tab=explore' as any);
  }

  const canSubmit =
    kind === 'discussion' ? !!title.trim() : kind === 'study' ? !!(selected && study?.groupBy && study?.measure) : !!selected;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={kind ? `Share: ${POST_KINDS.find((k) => k.kind === kind)?.label}` : 'Create a post'}>
      <View style={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        {!kind && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>What do you want to share?</Text>
            {POST_KINDS.map((k) => (
              <Pressable key={k.kind} onPress={() => setKind(k.kind)} style={CARD_STYLE}>
                <Text style={{ fontWeight: '600', color: colors.text }}>{k.label}</Text>
                <Text style={{ marginTop: 4, fontSize: 12, color: colors.inkSoft }}>{k.blurb}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {kind && kind !== 'discussion' && (
          <View style={{ gap: 12 }}>
            <Pressable
              onPress={() => {
                setKind(null);
                setSelected(null);
              }}>
              <Text style={{ fontSize: 12, color: colors.inkSoft }}>← Change type</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={SECTION_LABEL}>Pick one of yours</Text>
              <Pressable onPress={createNew}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.emeraldInk }}>+ Create new</Text>
              </Pressable>
            </View>
            <View style={{ gap: 8 }}>
              {loading && (
                <Text style={{ fontSize: 14, color: colors.inkSoft, textAlign: 'center', paddingVertical: 24 }}>
                  Loading...
                </Text>
              )}
              {!loading && itemList.length === 0 && (
                <Text style={{ fontSize: 14, color: colors.inkSoft, textAlign: 'center', paddingVertical: 24 }}>
                  Nothing yet. Use “Create new”.
                </Text>
              )}
              {!loading &&
                itemList.map((item: any) => {
                  const on = selected?.id === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => (kind === 'study' ? pickStudy(item) : setSelected(item))}
                      style={[
                        CARD_STYLE,
                        { padding: 12 },
                        on && { backgroundColor: colors.emeraldSoft, borderColor: colors.emerald },
                      ]}>
                      <ItemSummary kind={kind} item={item} />
                    </Pressable>
                  );
                })}
            </View>
            {kind === 'study' && selected && study && (
              <View style={[CARD_STYLE, { padding: 12, gap: 8 }]}>
                <Text style={SECTION_LABEL}>Feature which variable</Text>
                <SelectRow label="Variable" value={prettyGroupBy(study.groupBy)} onPress={() => setPickerOpen('groupBy')} />
                <SelectRow label="Outcome" value={prettyMeasure(study.measure)} onPress={() => setPickerOpen('measure')} />
                <Text style={{ fontSize: 12, color: colors.inkSoft }}>
                  {prettyMeasure(study.measure)} by {prettyGroupBy(study.groupBy)}, shown as result bars.
                </Text>
              </View>
            )}
          </View>
        )}

        {kind === 'discussion' && (
          <Pressable onPress={() => setKind(null)}>
            <Text style={{ fontSize: 12, color: colors.inkSoft }}>← Change type</Text>
          </Pressable>
        )}

        {kind && (
          <View style={{ gap: 12 }}>
            {kind === 'discussion' && (
              <TextInput
                value={title}
                onChangeText={(v) => setTitle(v.slice(0, 160))}
                placeholder="Title"
                placeholderTextColor={colors.inkSoft}
                style={INPUT_STYLE}
              />
            )}
            <TextInput
              value={body}
              onChangeText={(v) => setBody(v.slice(0, 5000))}
              multiline
              numberOfLines={3}
              placeholder={kind === 'discussion' ? 'Say more (optional)' : 'Why / open question (optional)'}
              placeholderTextColor={colors.inkSoft}
              style={[INPUT_STYLE, { minHeight: 88, textAlignVertical: 'top', paddingTop: 12 }]}
            />
            <View>
              <Text style={[SECTION_LABEL, { marginBottom: 8 }]}>Labels</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {POST_LABELS.map((l) => {
                  const on = labels.includes(l);
                  return (
                    <Pressable
                      key={l}
                      onPress={() => toggleLabel(l)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: on ? colors.emerald : colors.border,
                        backgroundColor: on ? colors.emerald : colors.surface,
                      }}>
                      <Text style={{ fontSize: 12, color: on ? colors.onEmerald : colors.textMuted }}>{l}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {VISIBILITIES.map((o) => {
                const on = visibility === o.v;
                return (
                  <Pressable
                    key={o.v}
                    onPress={() => setVisibility(o.v)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 14,
                      borderWidth: 1,
                      alignItems: 'center',
                      borderColor: on ? colors.emerald : colors.border,
                      backgroundColor: on ? colors.emerald : colors.surface,
                    }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: on ? colors.onEmerald : colors.textMuted }}>
                      {o.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={submit}
              disabled={!canSubmit || saving}
              style={{
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: 'center',
                backgroundColor: colors.emerald,
                opacity: !canSubmit || saving ? 0.5 : 1,
              }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.onEmerald }}>
                {saving ? 'Posting...' : 'Post'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <PickerSheet
        open={pickerOpen === 'groupBy'}
        onClose={() => setPickerOpen(null)}
        title="Variable"
        value={study?.groupBy || ''}
        options={GROUP_BY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        onSelect={(v) => setStudy((s) => (s ? { ...s, groupBy: String(v) } : s))}
      />
      <PickerSheet
        open={pickerOpen === 'measure'}
        onClose={() => setPickerOpen(null)}
        title="Outcome"
        value={study?.measure || ''}
        options={MEASURE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        onSelect={(v) => setStudy((s) => (s ? { ...s, measure: String(v) } : s))}
      />
    </Sheet>
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

const INPUT_STYLE = {
  borderRadius: 16,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  paddingHorizontal: 16,
  paddingVertical: 12,
  fontSize: 15,
  color: colors.text,
};

function ItemSummary({ kind, item }: { kind: string; item: any }) {
  if (kind === 'workout')
    return (
      <View>
        <Text style={{ fontWeight: '600', color: colors.text }}>{item.workout_day || 'Workout'}</Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: colors.inkSoft }}>
          {item.date} · {item.exercise_count || 0} ex · {item.set_count || 0} sets
        </Text>
      </View>
    );
  if (kind === 'program')
    return (
      <View>
        <Text numberOfLines={1} style={{ fontWeight: '600', color: colors.text }}>{item.name}</Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: colors.inkSoft }}>{item.enrollment_count || 0} started</Text>
      </View>
    );
  if (kind === 'template')
    return (
      <View>
        <Text numberOfLines={1} style={{ fontWeight: '600', color: colors.text }}>{item.name}</Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: colors.inkSoft }}>
          {item.exercise_count || 0} exercises · used {item.usage_count || 0}x
        </Text>
      </View>
    );
  return (
    <View>
      <Text numberOfLines={1} style={{ fontWeight: '600', color: colors.text }}>{item.label}</Text>
      <Text style={{ marginTop: 4, fontSize: 12, color: colors.inkSoft }}>
        {item.mode} · {item.evidence_status || 'Not enough'}
      </Text>
    </View>
  );
}

function SelectRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Text style={{ fontSize: 12, color: colors.inkSoft }}>{label}</Text>
      <View
        style={{
          marginTop: 4,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
          paddingHorizontal: 10,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Text style={{ fontSize: 14, color: colors.text }}>{value}</Text>
        <Text style={{ fontSize: 12, color: colors.inkSoft }}>▾</Text>
      </View>
    </Pressable>
  );
}
