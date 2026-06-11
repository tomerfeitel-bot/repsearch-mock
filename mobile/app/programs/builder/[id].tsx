import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { nanoid } from '@/lib/nanoid';
import { internalPath } from '@/lib/navParams';
import { colors, monoFont } from '@/lib/theme';

// Port of src/pages/ProgramBuilder.jsx as a full-screen push (decision D3).
// `/programs/builder/new` plays the web's `/programs/new` role (creates a
// draft, replaces itself with the real id). "Create a new template" inside the
// picker pushes the template builder with returnTo back here; the saved
// template comes back as ?createdTemplate=<id>&addToBlock=<idx> and is
// appended to that block, exactly like the web flow.
const STRICTNESS = [
  { v: 'written', label: 'Run as written' },
  { v: 'adapt', label: 'Adapt as needed' },
  { v: 'inspiration', label: 'Use as inspiration' },
];

const TIMING = [
  { v: 'next_day', label: 'Next day', short: 'next day', min: 18, ideal: 24, max: 36 },
  { v: 'after_1_rest_day', label: 'After 1 rest day', short: '1 rest day', min: 36, ideal: 48, max: 72 },
  { v: 'after_2_rest_days', label: 'After 2 rest days', short: '2 rest days', min: 60, ideal: 72, max: 96 },
  { v: 'two_to_three_days', label: '2-3 days later', short: '2-3 days', min: 48, ideal: 72, max: 96 },
  { v: 'any_time_this_week', label: 'Any time this week', short: 'this week', min: 0, ideal: 72, max: 168 },
  { v: 'optional_bonus', label: 'Optional / bonus', short: 'optional', min: 0, ideal: 0, max: 168 },
  { v: 'advanced', label: 'Advanced window', short: 'advanced', min: 36, ideal: 48, max: 72 },
];

const timingById = new Map(TIMING.map((t) => [t.v, t]));

type ProgramMetaType = {
  id: string;
  name: string;
  description: string;
  visibility: string;
  status: string;
  strictness: string;
  is_open_ended: boolean;
};

type ProgramSession = Record<string, any>;
type ProgramBlock = {
  localId: string;
  name: string;
  description: string;
  repeat_behavior: string;
  sort_order?: number;
  sessions: ProgramSession[];
};

export default function ProgramBuilderScreen() {
  const {
    id: idParam,
    createdTemplate: createdTemplateId,
    addToBlock,
    returnTo: returnToParam,
  } = useLocalSearchParams<{ id: string; createdTemplate?: string; addToBlock?: string; returnTo?: string }>();
  const id = idParam === 'new' ? '' : idParam;
  const returnTo = internalPath(returnToParam);
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [program, setProgram] = useState<ProgramMetaType | null>(null);
  const [blocks, setBlocks] = useState<ProgramBlock[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveOpen, setSaveOpen] = useState(false);
  const [templatePicker, setTemplatePicker] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const createPromiseRef = useRef<Promise<any> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programRef = useRef<ProgramMetaType | null>(null);
  const blocksRef = useRef<ProgramBlock[]>([]);
  const consumedTemplateRef = useRef('');

  useEffect(() => {
    programRef.current = program;
  }, [program]);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const templateData = await api.get('/templates');
        if (cancelled) return;
        const loadedTemplates = templateData.templates || [];
        setTemplates(loadedTemplates);
        if (id) {
          const data = await api.get(`/programs/${encodeURIComponent(id)}`);
          if (cancelled) return;
          const hydratedBlocks = hydrate(data.program);
          if (createdTemplateId && consumedTemplateRef.current !== createdTemplateId) {
            const template =
              loadedTemplates.find((t: any) => t.id === createdTemplateId) ||
              (await api.get(`/templates/${encodeURIComponent(createdTemplateId)}`)).template;
            if (cancelled) return;
            const blockIdx = Math.min(Math.max(Number(addToBlock) || 0, 0), Math.max(hydratedBlocks.length - 1, 0));
            const nextBlocks = appendTemplateToBlocks(hydratedBlocks, blockIdx, template);
            consumedTemplateRef.current = createdTemplateId;
            setBlocks(nextBlocks);
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            const nextProgram = programFromApi(data.program);
            await api.patch(`/programs/${nextProgram.id}`, payload(nextProgram, nextBlocks, nextProgram.status || 'draft'));
            if (cancelled) return;
            router.setParams({ createdTemplate: undefined, addToBlock: undefined });
          }
          return;
        }
        if (!createPromiseRef.current) createPromiseRef.current = api.post('/programs/drafts', {});
        const data = await createPromiseRef.current;
        if (cancelled) return;
        hydrate(data.program);
        const builderUrl = returnTo
          ? `/programs/builder/${data.program.id}?returnTo=${encodeURIComponent(returnTo)}`
          : `/programs/builder/${data.program.id}`;
        router.replace(builderUrl as any);
      } catch (err: any) {
        toast?.(err.message || 'Failed to open program builder', 'error');
        router.back();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, createdTemplateId, addToBlock]);

  const totals = useMemo(() => {
    const sessions = blocks.reduce((n, block) => n + block.sessions.length, 0);
    return { sessions };
  }, [blocks]);

  function hydrate(p: any): ProgramBlock[] {
    const nextProgram = programFromApi(p);
    setProgram(nextProgram);
    const byBlock = new Map<string, ProgramBlock>(
      (p.blocks || []).map((block: any) => [
        block.id,
        {
          localId: block.id,
          name: block.name || 'Main block',
          description: block.description || '',
          repeat_behavior: block.repeat_behavior || 'repeat',
          sort_order: block.sort_order || 0,
          sessions: [] as ProgramSession[],
        },
      ]),
    );
    if (!byBlock.size) {
      byBlock.set('default', {
        localId: 'default',
        name: 'Main block',
        description: '',
        repeat_behavior: 'repeat',
        sort_order: 0,
        sessions: [],
      });
    }
    (p.workouts || []).forEach((session: any, idx: number) => {
      const block = byBlock.get(session.block_id) || [...byBlock.values()][0];
      const timing = timingById.get(session.timing_preset) || timingById.get('after_1_rest_day')!;
      block.sessions.push({
        localId: session.id || nanoid(),
        template_id: session.template_id,
        template_name: session.template_name || 'Saved template',
        session_label: session.session_label || '',
        session_note: session.session_note || '',
        optional: !!session.optional,
        sort_order: session.sort_order ?? idx,
        timing_preset: session.timing_preset || 'after_1_rest_day',
        timing_min_hours: session.timing_min_hours ?? timing.min,
        timing_ideal_hours: session.timing_ideal_hours ?? timing.ideal,
        timing_max_hours: session.timing_max_hours ?? timing.max,
      });
    });
    const nextBlocks = [...byBlock.values()].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(normalizeBlock);
    setBlocks(nextBlocks);
    return nextBlocks;
  }

  function scheduleSave(
    nextProgram: ProgramMetaType | null = programRef.current,
    nextBlocks: ProgramBlock[] = blocksRef.current,
    status = 'draft',
  ) {
    if (!nextProgram?.id) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      api.patch(`/programs/${nextProgram.id}`, payload(nextProgram, nextBlocks, status)).catch(() => {});
    }, 900);
  }

  function updateProgram(patch: Partial<ProgramMetaType>) {
    setProgram((prev) => {
      const next = { ...(prev as ProgramMetaType), ...patch };
      scheduleSave(next, blocksRef.current, next.status || 'draft');
      return next;
    });
  }

  function updateBlocks(fn: (prev: ProgramBlock[]) => ProgramBlock[]) {
    setBlocks((prev) => {
      const next = fn(prev).map((block, i) => normalizeBlock({ ...block, sort_order: i }));
      scheduleSave(programRef.current, next, programRef.current?.status || 'draft');
      return next;
    });
  }

  function addBlock() {
    updateBlocks((prev) => [
      ...prev,
      { localId: nanoid(), name: `Block ${prev.length + 1}`, description: '', repeat_behavior: 'repeat', sessions: [] },
    ]);
  }

  function updateBlock(blockIdx: number, patch: Partial<ProgramBlock>) {
    updateBlocks((prev) => prev.map((block, i) => (i === blockIdx ? { ...block, ...patch } : block)));
  }

  function removeBlock(blockIdx: number) {
    updateBlocks((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== blockIdx)));
  }

  function addSession(blockIdx: number, template: any) {
    updateBlocks((prev) => appendTemplateToBlocks(prev, blockIdx, template));
  }

  function updateSession(blockIdx: number, sessionIdx: number, patch: Record<string, any>) {
    updateBlocks((prev) =>
      prev.map((block, i) =>
        i !== blockIdx
          ? block
          : { ...block, sessions: block.sessions.map((session, j) => (j === sessionIdx ? { ...session, ...patch } : session)) },
      ),
    );
  }

  function moveSession(blockIdx: number, sessionIdx: number, delta: number) {
    updateBlocks((prev) =>
      prev.map((block, i) => {
        if (i !== blockIdx) return block;
        const next = [...block.sessions];
        const target = sessionIdx + delta;
        if (target < 0 || target >= next.length) return block;
        const [row] = next.splice(sessionIdx, 1);
        next.splice(target, 0, row);
        return { ...block, sessions: next };
      }),
    );
  }

  function duplicateSession(blockIdx: number, sessionIdx: number) {
    updateBlocks((prev) =>
      prev.map((block, i) =>
        i !== blockIdx
          ? block
          : {
              ...block,
              sessions: block.sessions.flatMap((session, j) =>
                j === sessionIdx
                  ? [session, { ...session, localId: nanoid(), session_label: session.session_label ? `${session.session_label} copy` : '' }]
                  : [session],
              ),
            },
      ),
    );
  }

  function removeSession(blockIdx: number, sessionIdx: number) {
    updateBlocks((prev) =>
      prev.map((block, i) => (i !== blockIdx ? block : { ...block, sessions: block.sessions.filter((_, j) => j !== sessionIdx) })),
    );
  }

  function close() {
    if (returnTo) router.navigate(returnTo as any);
    else if (router.canGoBack()) router.back();
    else router.replace('/profile');
  }

  function createTemplateForBlock() {
    const blockIdx = templatePicker || 0;
    setTemplatePicker(null);
    const back = `/programs/builder/${program!.id}?addToBlock=${blockIdx}`;
    router.push(`/templates/builder/new?returnTo=${encodeURIComponent(back)}` as any);
  }

  async function finalize() {
    if (!program?.name?.trim()) {
      toast?.('Program name required', 'error');
      return;
    }
    if (!totals.sessions) {
      toast?.('Add at least one template session', 'error');
      return;
    }
    setSaving(true);
    try {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      await api.patch(`/programs/${program.id}`, payload(program, blocks, 'final'));
      toast?.('Program saved', 'success');
      setSaveOpen(false);
      close();
    } catch (err: any) {
      toast?.(err.message || 'Failed to save program', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !program) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 14, color: colors.textMuted }}>Opening program builder...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.bg,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 8 }}>
          <Pressable onPress={close} hitSlop={8} style={{ minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>Close</Text>
          </Pressable>
          <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
            <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>
              {program.name || 'Untitled program'}
            </Text>
            <Text style={{ marginTop: 2, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: colors.textMuted }}>
              <Text style={{ fontFamily: monoFont }}>{totals.sessions}</Text> sessions - open-ended
            </Text>
          </View>
          <Pressable
            onPress={() => setSaveOpen(true)}
            style={{
              minHeight: 40,
              paddingHorizontal: 14,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.accent,
            }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accentInk }}>Save</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, gap: 12, paddingBottom: insets.bottom + 112 }}>
        <ProgramMeta program={program} onChange={updateProgram} />
        {blocks.map((block, blockIdx) => (
          <BlockEditor
            key={block.localId}
            block={block}
            canRemove={blocks.length > 1}
            onChange={(patch) => updateBlock(blockIdx, patch)}
            onRemove={() => removeBlock(blockIdx)}
            onPickTemplate={() => setTemplatePicker(blockIdx)}
            onUpdateSession={(sessionIdx, patch) => updateSession(blockIdx, sessionIdx, patch)}
            onMoveSession={(sessionIdx, delta) => moveSession(blockIdx, sessionIdx, delta)}
            onDuplicateSession={(sessionIdx) => duplicateSession(blockIdx, sessionIdx)}
            onRemoveSession={(sessionIdx) => removeSession(blockIdx, sessionIdx)}
          />
        ))}
        <Pressable
          onPress={addBlock}
          style={{
            minHeight: 48,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>+ Add block</Text>
        </Pressable>
      </ScrollView>

      <TemplatePicker
        open={templatePicker !== null}
        onClose={() => setTemplatePicker(null)}
        templates={templates}
        onCreate={createTemplateForBlock}
        onPick={(template) => {
          if (templatePicker !== null) addSession(templatePicker, template);
          setTemplatePicker(null);
        }}
      />
      <SaveProgramSheet open={saveOpen} onClose={() => setSaveOpen(false)} program={program} onChange={updateProgram} onSave={finalize} saving={saving} />
    </View>
  );
}

function ProgramMeta({ program, onChange }: { program: ProgramMetaType; onChange: (patch: Partial<ProgramMetaType>) => void }) {
  return (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 12, gap: 10 }}>
      <TextInput
        value={program.name}
        onChangeText={(v) => onChange({ name: v })}
        placeholder="Program name"
        placeholderTextColor={colors.inkSoft}
        style={[INPUT_STYLE, { fontWeight: '700' }]}
      />
      <TextInput
        value={program.description}
        onChangeText={(v) => onChange({ description: v })}
        placeholder="Who this is for and how to run it"
        placeholderTextColor={colors.inkSoft}
        style={INPUT_STYLE}
      />
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {STRICTNESS.map((s) => {
          const active = program.strictness === s.v;
          return (
            <Pressable
              key={s.v}
              onPress={() => onChange({ strictness: s.v })}
              style={{
                flex: 1,
                minHeight: 40,
                borderRadius: 10,
                borderWidth: 1,
                paddingHorizontal: 4,
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: active ? colors.accent : colors.border,
                backgroundColor: active ? colors.accent : colors.surfaceAlt,
              }}>
              <Text style={{ fontSize: 11, fontWeight: '600', textAlign: 'center', color: active ? colors.accentInk : colors.textMuted }}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function BlockEditor({
  block,
  canRemove,
  onChange,
  onRemove,
  onPickTemplate,
  onUpdateSession,
  onMoveSession,
  onDuplicateSession,
  onRemoveSession,
}: {
  block: ProgramBlock;
  canRemove: boolean;
  onChange: (patch: Partial<ProgramBlock>) => void;
  onRemove: () => void;
  onPickTemplate: () => void;
  onUpdateSession: (sessionIdx: number, patch: Record<string, any>) => void;
  onMoveSession: (sessionIdx: number, delta: number) => void;
  onDuplicateSession: (sessionIdx: number) => void;
  onRemoveSession: (sessionIdx: number) => void;
}) {
  return (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={block.name}
          onChangeText={(v) => onChange({ name: v })}
          placeholder="Block name"
          placeholderTextColor={colors.inkSoft}
          style={[INPUT_STYLE, { flex: 1, minWidth: 0, fontWeight: '700' }]}
        />
        {canRemove && (
          <Pressable
            onPress={onRemove}
            style={{
              paddingHorizontal: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(220, 38, 38, 0.3)',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#fca5a5' }}>Delete</Text>
          </Pressable>
        )}
      </View>
      <TextInput
        value={block.description}
        onChangeText={(v) => onChange({ description: v })}
        placeholder="Optional block note: volume, strength, deload..."
        placeholderTextColor={colors.inkSoft}
        style={INPUT_STYLE}
      />
      {block.sessions.length === 0 && (
        <Text style={{ paddingVertical: 24, textAlign: 'center', fontSize: 14, color: colors.textMuted }}>
          Add saved templates to build this sequence.
        </Text>
      )}
      <View style={{ gap: 8 }}>
        {block.sessions.map((session, sessionIdx) => (
          <SessionCard
            key={session.localId}
            session={session}
            index={sessionIdx}
            first={sessionIdx === 0}
            last={sessionIdx === block.sessions.length - 1}
            onChange={(patch) => onUpdateSession(sessionIdx, patch)}
            onMove={(delta) => onMoveSession(sessionIdx, delta)}
            onDuplicate={() => onDuplicateSession(sessionIdx)}
            onRemove={() => onRemoveSession(sessionIdx)}
          />
        ))}
      </View>
      <Pressable
        onPress={onPickTemplate}
        style={{
          minHeight: 48,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.accent,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accentInk }}>+ Add template session</Text>
      </Pressable>
    </View>
  );
}

function SessionCard({
  session,
  index,
  first,
  last,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: {
  session: ProgramSession;
  index: number;
  first: boolean;
  last: boolean;
  onChange: (patch: Record<string, any>) => void;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const timing = timingById.get(session.timing_preset) || timingById.get('after_1_rest_day')!;

  function chooseTiming(value: string) {
    const next = timingById.get(value) || timing;
    onChange({
      timing_preset: value,
      optional: value === 'optional_bonus',
      timing_min_hours: next.min,
      timing_ideal_hours: next.ideal,
      timing_max_hours: next.max,
    });
  }

  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, padding: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontSize: 12, fontFamily: monoFont, color: colors.text }}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontWeight: '700', color: colors.text }}>
            {session.session_label || session.template_name}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textMuted }}>
            {session.template_name}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <MoveButton label="Up" disabled={first} onPress={() => onMove(-1)} />
          <MoveButton label="Dn" disabled={last} onPress={() => onMove(1)} />
        </View>
      </View>
      <TextInput
        value={session.session_label}
        onChangeText={(v) => onChange({ session_label: v })}
        placeholder="Optional session label"
        placeholderTextColor={colors.inkSoft}
        style={INPUT_STYLE}
      />
      <TextInput
        value={session.session_note}
        onChangeText={(v) => onChange({ session_note: v })}
        placeholder="Optional session note"
        placeholderTextColor={colors.inkSoft}
        style={INPUT_STYLE}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {TIMING.map((item) => {
          const active = session.timing_preset === item.v;
          return (
            <Pressable
              key={item.v}
              onPress={() => chooseTiming(item.v)}
              style={{
                flexBasis: '47%',
                flexGrow: 1,
                minHeight: 40,
                borderRadius: 10,
                borderWidth: 1,
                paddingHorizontal: 6,
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: active ? colors.accent : colors.border,
                backgroundColor: active ? colors.accent : colors.surface,
              }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: active ? colors.accentInk : colors.textMuted }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {session.timing_preset === 'advanced' && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SmallNumber label="Min h" value={session.timing_min_hours} onChange={(v) => onChange({ timing_min_hours: Number(v) })} />
          <SmallNumber label="Ideal h" value={session.timing_ideal_hours} onChange={(v) => onChange({ timing_ideal_hours: Number(v) })} />
          <SmallNumber label="Max h" value={session.timing_max_hours} onChange={(v) => onChange({ timing_max_hours: Number(v) })} />
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 12, color: colors.textMuted }}>Gap: {timing.short}</Text>
        <Pressable
          onPress={onDuplicate}
          style={{ marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.surface }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>Duplicate</Text>
        </Pressable>
        <Pressable
          onPress={onRemove}
          style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(220, 38, 38, 0.1)' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#fca5a5' }}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MoveButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.3 : 1,
      }}>
      <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textMuted }}>{label}</Text>
    </Pressable>
  );
}

function SmallNumber({ label, value, onChange }: { label: string; value: any; onChange: (v: string) => void }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: colors.inkSoft }}>{label}</Text>
      <TextInput
        keyboardType="number-pad"
        value={value === null || value === undefined ? '' : String(value)}
        onChangeText={onChange}
        placeholderTextColor={colors.inkSoft}
        style={[INPUT_STYLE, { fontFamily: monoFont }]}
      />
    </View>
  );
}

function TemplatePicker({
  open,
  onClose,
  templates,
  onPick,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  templates: any[];
  onPick: (template: any) => void;
  onCreate: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Add template">
      <View style={{ padding: 16, gap: 12, paddingBottom: 32 }}>
        <Pressable
          onPress={onCreate}
          style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.surfaceAlt, padding: 16 }}>
          <Text style={{ fontWeight: '700', color: colors.text }}>Create a new template</Text>
          <Text style={{ marginTop: 4, fontSize: 12, color: colors.textMuted }}>
            Open the template builder, save it, then return to this program draft.
          </Text>
        </Pressable>
        {templates.length === 0 && (
          <Text style={{ fontSize: 14, color: colors.textMuted }}>
            No saved templates yet. Create one without leaving this program flow.
          </Text>
        )}
        {templates.map((template) => (
          <Pressable
            key={template.id}
            onPress={() => onPick(template)}
            style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 12 }}>
            <Text numberOfLines={1} style={{ fontWeight: '700', color: colors.text }}>
              {template.name}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: colors.textMuted }}>
              {template.visibility} - {template.usage_count || 0} uses
            </Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

function SaveProgramSheet({
  open,
  onClose,
  program,
  onChange,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  program: ProgramMetaType;
  onChange: (patch: Partial<ProgramMetaType>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Save program">
      <View style={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <View style={{ gap: 8 }}>
          <Text style={SECTION_LABEL}>Name</Text>
          <TextInput value={program.name} onChangeText={(v) => onChange({ name: v })} placeholderTextColor={colors.inkSoft} style={INPUT_STYLE} />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={SECTION_LABEL}>Visibility</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['private', 'public'].map((v) => {
              const active = program.visibility === v;
              return (
                <Pressable
                  key={v}
                  onPress={() => onChange({ visibility: v })}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    borderRadius: 12,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderColor: active ? colors.accent : colors.border,
                    backgroundColor: active ? colors.accent : colors.surfaceAlt,
                  }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      textTransform: 'capitalize',
                      color: active ? colors.accentInk : colors.textMuted,
                    }}>
                    {v}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Pressable
          onPress={onSave}
          disabled={saving || !program.name.trim()}
          style={{
            minHeight: 52,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.accent,
            opacity: saving || !program.name.trim() ? 0.5 : 1,
          }}>
          <Text style={{ fontWeight: '600', color: colors.accentInk }}>{saving ? 'Saving...' : 'Save program'}</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

function normalizeBlock(block: ProgramBlock): ProgramBlock {
  return {
    ...block,
    sessions: (block.sessions || []).map((session, i) => ({ ...session, sort_order: i })),
  };
}

function appendTemplateToBlocks(blocks: ProgramBlock[], blockIdx: number, template: any): ProgramBlock[] {
  return blocks
    .map((block, i) => {
      if (i !== blockIdx) return block;
      const timing = timingById.get('after_1_rest_day')!;
      return {
        ...block,
        sessions: [
          ...block.sessions,
          {
            localId: nanoid(),
            template_id: template.id,
            template_name: template.name,
            session_label: '',
            session_note: '',
            optional: false,
            timing_preset: 'after_1_rest_day',
            timing_min_hours: timing.min,
            timing_ideal_hours: timing.ideal,
            timing_max_hours: timing.max,
          },
        ],
      };
    })
    .map(normalizeBlock);
}

function programFromApi(p: any): ProgramMetaType {
  return {
    id: p.id,
    name: p.name || 'Untitled program',
    description: p.description || '',
    visibility: p.visibility || 'private',
    status: p.status || 'draft',
    strictness: p.strictness || 'adapt',
    is_open_ended: p.is_open_ended !== 0,
  };
}

function payload(program: ProgramMetaType, blocks: ProgramBlock[], status: string) {
  return {
    name: program.name || 'Untitled program',
    description: program.description || '',
    visibility: status === 'draft' ? 'private' : program.visibility,
    status,
    strictness: program.strictness || 'adapt',
    is_open_ended: true,
    blocks: blocks.map((block, blockIdx) => ({
      name: block.name || (blockIdx === 0 ? 'Main block' : `Block ${blockIdx + 1}`),
      description: block.description || '',
      repeat_behavior: block.repeat_behavior || 'repeat',
      sort_order: blockIdx,
      sessions: block.sessions.map((session, sessionIdx) => ({
        template_id: session.template_id,
        session_label: session.session_label || null,
        session_note: session.session_note || null,
        optional: !!session.optional || session.timing_preset === 'optional_bonus',
        sort_order: sessionIdx,
        timing_preset: session.timing_preset || 'after_1_rest_day',
        timing_min_hours: Number(session.timing_min_hours) || 0,
        timing_ideal_hours: Number(session.timing_ideal_hours) || 0,
        timing_max_hours: Number(session.timing_max_hours) || 0,
      })),
    })),
  };
}

const INPUT_STYLE = {
  minHeight: 44,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surfaceAlt,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  color: colors.text,
};

const SECTION_LABEL = {
  fontSize: 10,
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8,
  color: colors.inkSoft,
};
