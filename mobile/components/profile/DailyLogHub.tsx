import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PickerSheet } from '@/components/ui/PickerSheet';
import type { ToastFn } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { colors, monoFont } from '@/lib/theme';

// Port of src/components/profile/DailyLogHub.jsx (the Check-in tab on the
// Profile screen). <select>s become PickerSheets (decision D4); the web's
// number inputs keep their -/+ stepper chrome.
const STRESS_OPTIONS = [
  { label: 'Low', value: 1 },
  { label: 'Moderate', value: 2 },
  { label: 'High', value: 3 },
];
const ENERGY_OPTIONS = [1, 2, 3, 4, 5];
const GOAL_OPTIONS = ['strength', 'hypertrophy', 'fat_loss', 'general_fitness', 'sport_performance'];
const NUTRITION_OPTIONS = ['bulk', 'cut', 'maintenance'];
const SUPPLEMENT_OPTIONS = [
  'creatine', 'protein_powder', 'pre_workout', 'caffeine', 'beta_alanine', 'citrulline',
  'electrolytes', 'multivitamin', 'vitamin_d', 'omega_3', 'magnesium', 'ashwagandha', 'bcaa_eaa',
];
const SUPPLEMENT_UNITS = ['g', 'mg', 'IU', 'mL', 'caps'];
const SUPPLEMENT_FREQUENCY = ['daily', 'training_days', 'weekly', 'occasionally'];

type Supplement = { key: string; amount: number | null; unit: string | null; frequency: string | null };

function today() {
  return new Date().toISOString().slice(0, 10);
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

function normalizeSupplements(raw: unknown): Supplement[] {
  return parseArray(raw)
    .map((s) => (typeof s === 'string' ? { key: s } : s))
    .filter((s) => s && s.key)
    .map((s) => ({ key: s.key, amount: s.amount ?? null, unit: s.unit ?? null, frequency: s.frequency ?? null }));
}

export default function DailyLogHub({
  user,
  updateUser,
  refresh,
  toast,
}: {
  user: any;
  updateUser: (patch: any) => void;
  refresh: () => Promise<void>;
  toast: ToastFn;
}) {
  const date = today();
  const [daily, setDaily] = useState<Record<string, any>>({
    sleep_duration: '',
    calories: '',
    protein_g: '',
    stress_level: null,
    subjective_energy: null,
  });
  const [body, setBody] = useState<Record<string, any>>({
    bodyweight_kg: '',
    arm_cm: '',
    chest_cm: '',
    waist_cm: '',
    thigh_cm: '',
    calf_cm: '',
  });
  const [savingDaily, setSavingDaily] = useState(false);

  // Privacy: which widget keys are public. Persisted immediately on toggle.
  const [publicFields, setPublicFields] = useState<string[]>(() => parseArray(user.public_fields_json));

  // Occasionally changes (auto-saved on change)
  const [goal, setGoal] = useState(user.goal || '');
  const [nutritionPhase, setNutritionPhase] = useState(user.nutrition_phase || '');
  const [supplements, setSupplements] = useState<Supplement[]>(() => normalizeSupplements(user.supplements_json));
  const [occasionalStatus, setOccasionalStatus] = useState('');

  const [research, setResearch] = useState(!!Number(user.research_opt_in));

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/daily-log/${date}`)
      .then((res) => {
        if (cancelled || !res.log) return;
        const l = res.log;
        setDaily({
          sleep_duration: l.sleep_duration ?? '',
          calories: l.calories ?? '',
          protein_g: l.protein_g ?? '',
          stress_level: l.stress_level ?? null,
          subjective_energy: l.subjective_energy ?? null,
        });
      })
      .catch(() => {
        /* no log yet is fine */
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  // Prefill body snapshot from the user record.
  useEffect(() => {
    setBody({
      bodyweight_kg: user.bodyweight_kg ?? '',
      arm_cm: user.arm_cm ?? '',
      chest_cm: user.chest_cm ?? '',
      waist_cm: user.waist_cm ?? '',
      thigh_cm: user.thigh_cm ?? '',
      calf_cm: user.calf_cm ?? '',
    });
  }, [user.bodyweight_kg, user.arm_cm, user.chest_cm, user.waist_cm, user.thigh_cm, user.calf_cm]);

  const variableCount = useMemo(() => {
    const tracked = [
      daily.sleep_duration, daily.calories, daily.protein_g, daily.stress_level, daily.subjective_energy,
      body.bodyweight_kg, body.arm_cm, body.chest_cm, body.waist_cm, body.thigh_cm, body.calf_cm,
    ];
    return tracked.filter((v) => v !== '' && v !== null && v !== undefined).length;
  }, [daily, body]);

  async function togglePrivacy(key: string) {
    const next = publicFields.includes(key) ? publicFields.filter((k) => k !== key) : [...publicFields, key];
    setPublicFields(next);
    try {
      const data = await api.patch('/profile', { public_fields_json: JSON.stringify(next) });
      updateUser(data.user);
    } catch (err: any) {
      setPublicFields(publicFields); // revert
      toast(err.message || 'Failed to update privacy', 'error');
    }
  }

  async function saveDaily() {
    setSavingDaily(true);
    try {
      const logPayload: Record<string, any> = { date };
      for (const k of ['sleep_duration', 'calories', 'protein_g', 'stress_level', 'subjective_energy']) {
        if (daily[k] !== '' && daily[k] !== null && daily[k] !== undefined) logPayload[k] = Number(daily[k]);
      }
      await api.post('/daily-log', logPayload);

      const bodyPayload: Record<string, any> = {};
      for (const k of Object.keys(body)) {
        if (body[k] !== '' && body[k] !== null && body[k] !== undefined) bodyPayload[k] = Number(body[k]);
      }
      if (Object.keys(bodyPayload).length) {
        bodyPayload.date = date;
        await api.post('/body-metrics', bodyPayload);
      }
      await refresh();
      toast('Check-in saved', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to save check-in', 'error');
    } finally {
      setSavingDaily(false);
    }
  }

  async function persistOccasional(next: { goal?: string; nutritionPhase?: string; supplements?: Supplement[] }) {
    const g = next.goal ?? goal;
    const phase = next.nutritionPhase ?? nutritionPhase;
    const sups = next.supplements ?? supplements;
    setOccasionalStatus('saving');
    try {
      const data = await api.patch('/profile', {
        goal: g || null,
        nutrition_phase: phase || null,
        supplements_json: JSON.stringify(sups),
      });
      updateUser(data.user);
      setOccasionalStatus('saved');
    } catch (err: any) {
      setOccasionalStatus('');
      toast(err.message || 'Failed to save', 'error');
    }
  }

  function changeGoal(v: string) {
    setGoal(v);
    persistOccasional({ goal: v });
  }
  function changeNutrition(v: string) {
    setNutritionPhase(v);
    persistOccasional({ nutritionPhase: v });
  }
  function toggleSupplement(s: string) {
    const next = supplements.some((x) => x.key === s)
      ? supplements.filter((x) => x.key !== s)
      : [...supplements, { key: s, amount: null, unit: null, frequency: null }];
    setSupplements(next);
    persistOccasional({ supplements: next });
  }
  function updateSupplementField(key: string, field: keyof Supplement, value: any) {
    const next = supplements.map((x) => (x.key === key ? { ...x, [field]: value } : x));
    setSupplements(next);
    persistOccasional({ supplements: next });
  }

  async function toggleResearch() {
    const next = !research;
    setResearch(next);
    try {
      const data = await api.patch('/profile', { research_opt_in: next ? 1 : 0 });
      updateUser(data.user);
    } catch (err: any) {
      setResearch(!next);
      toast(err.message || 'Failed to update research opt-in', 'error');
    }
  }

  return (
    <View style={{ padding: 16, gap: 16 }}>
      {/* Check-in */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionTitle>Today&apos;s check-in</SectionTitle>
          <Text style={{ fontSize: 11, fontFamily: monoFont, color: colors.inkSoft }}>{date}</Text>
        </View>

        <Row label="Sleep" privacyKey="sleep" publicFields={publicFields} onTogglePrivacy={togglePrivacy}>
          <Stepper value={daily.sleep_duration} step={0.25} min={0} max={16} suffix="h" onChange={(v) => setDaily((d) => ({ ...d, sleep_duration: v }))} />
        </Row>

        <Row label="Calories" privacyKey="nutrition" publicFields={publicFields} onTogglePrivacy={togglePrivacy}>
          <Stepper value={daily.calories} step={50} min={0} max={12000} onChange={(v) => setDaily((d) => ({ ...d, calories: v }))} />
        </Row>

        <Row label="Protein (g)" privacyKey="nutrition" publicFields={publicFields} onTogglePrivacy={togglePrivacy} hidePrivacy>
          <Stepper value={daily.protein_g} step={5} min={0} max={800} suffix="g" onChange={(v) => setDaily((d) => ({ ...d, protein_g: v }))} />
        </Row>

        <View style={{ marginTop: 16 }}>
          <Label>Stress level</Label>
          <Segmented options={STRESS_OPTIONS} value={daily.stress_level} onChange={(v) => setDaily((d) => ({ ...d, stress_level: v }))} />
        </View>

        <View style={{ marginTop: 16 }}>
          <Label>Energy</Label>
          <Segmented
            options={ENERGY_OPTIONS.map((v) => ({ label: String(v), value: v }))}
            value={daily.subjective_energy}
            onChange={(v) => setDaily((d) => ({ ...d, subjective_energy: v }))}
          />
        </View>

        <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Label>Body measurements</Label>
            <PrivacyToggle active={publicFields.includes('measurements')} onPress={() => togglePrivacy('measurements')} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <MiniInput label="Bodyweight (kg)" value={body.bodyweight_kg} onChange={(v) => setBody((b) => ({ ...b, bodyweight_kg: v }))} />
            <MiniInput label="Arms (cm)" value={body.arm_cm} onChange={(v) => setBody((b) => ({ ...b, arm_cm: v }))} />
            <MiniInput label="Chest (cm)" value={body.chest_cm} onChange={(v) => setBody((b) => ({ ...b, chest_cm: v }))} />
            <MiniInput label="Waist (cm)" value={body.waist_cm} onChange={(v) => setBody((b) => ({ ...b, waist_cm: v }))} />
            <MiniInput label="Thighs (cm)" value={body.thigh_cm} onChange={(v) => setBody((b) => ({ ...b, thigh_cm: v }))} />
            <MiniInput label="Calves (cm)" value={body.calf_cm} onChange={(v) => setBody((b) => ({ ...b, calf_cm: v }))} />
          </View>
        </View>

        <Pressable
          disabled={savingDaily}
          onPress={saveDaily}
          style={{
            marginTop: 20,
            minHeight: 48,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.accent,
            opacity: savingDaily ? 0.6 : 1,
          }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accentInk }}>
            {savingDaily ? 'Saving...' : 'Save check-in'}
          </Text>
        </Pressable>
      </Card>

      {/* Occasionally changes */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <SectionTitle>Occasionally changes</SectionTitle>
          {occasionalStatus ? (
            <Text style={{ fontSize: 11, fontWeight: '500', color: occasionalStatus === 'saving' ? colors.inkSoft : colors.accentInk }}>
              {occasionalStatus === 'saving' ? 'Saving…' : 'Saved'}
            </Text>
          ) : null}
        </View>
        <View style={{ marginTop: 12, gap: 16 }}>
          <View>
            <Label>Goal</Label>
            <Select value={goal} onChange={changeGoal} options={GOAL_OPTIONS} title="Goal" />
          </View>
          <View>
            <Label>Nutrition phase</Label>
            <Select value={nutritionPhase} onChange={changeNutrition} options={NUTRITION_OPTIONS} title="Nutrition phase" />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Label>Supplements</Label>
              <PrivacyToggle active={publicFields.includes('supplements')} onPress={() => togglePrivacy('supplements')} />
            </View>
            <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SUPPLEMENT_OPTIONS.map((s) => {
                const on = supplements.some((x) => x.key === s);
                return (
                  <Pressable
                    key={s}
                    onPress={() => toggleSupplement(s)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: on ? colors.accent : colors.border,
                      backgroundColor: on ? colors.accent : colors.surfaceAlt,
                    }}>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: on ? colors.accentInk : colors.textMuted }}>
                      {human(s)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {supplements.length > 0 && (
              <View style={{ marginTop: 12, gap: 8 }}>
                {supplements.map((s) => (
                  <SupplementRow key={s.key} supplement={s} onUpdate={(field, value) => updateSupplementField(s.key, field, value)} />
                ))}
              </View>
            )}
          </View>
        </View>
      </Card>

      {/* Research banner */}
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.accent,
          backgroundColor: colors.surfaceAlt,
          padding: 16,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Citizen-science research</Text>
            <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 17, color: colors.textMuted }}>
              {research
                ? `You are contributing ${variableCount} variable${variableCount === 1 ? '' : 's'} to anonymous fitness research.`
                : 'Opt in to contribute your anonymized metrics to the strength-training study.'}
            </Text>
          </View>
          <Toggle value={research} onPress={toggleResearch} />
        </View>
      </View>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16 }}>
      {children}
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, color: colors.textMuted }}>
      {children}
    </Text>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: colors.inkSoft }}>{children}</Text>
  );
}

function Row({
  label,
  privacyKey,
  publicFields,
  onTogglePrivacy,
  hidePrivacy = false,
  children,
}: {
  label: string;
  privacyKey: string;
  publicFields: string[];
  onTogglePrivacy: (key: string) => void;
  hidePrivacy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0, flexShrink: 1 }}>
        <Text style={{ fontSize: 14, color: colors.text }}>{label}</Text>
        {!hidePrivacy && <PrivacyToggle active={publicFields.includes(privacyKey)} onPress={() => onTogglePrivacy(privacyKey)} />}
      </View>
      {children}
    </View>
  );
}

// Eye (public) / lock (private) round toggle — same SVG paths as the web.
export function PrivacyToggle({ active, onPress }: { active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={active ? 'Public — shown on your Athlete Card' : 'Private'}
      hitSlop={6}
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? colors.accent : colors.surfaceAlt,
        borderWidth: active ? 0 : 1,
        borderColor: colors.border,
      }}>
      {active ? (
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Path
            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
            stroke={colors.accentInk}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            stroke={colors.accentInk}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : (
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Path
            d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            stroke={colors.inkSoft}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </Pressable>
  );
}

export function Toggle({ value, onPress }: { value: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        padding: 2,
        backgroundColor: value ? colors.accent : colors.surfaceAlt,
        borderWidth: value ? 0 : 1,
        borderColor: colors.border,
      }}>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: '#fff',
          transform: [{ translateX: value ? 20 : 0 }],
        }}
      />
    </Pressable>
  );
}

function Stepper({
  value,
  onChange,
  step = 1,
  min = -Infinity,
  max = Infinity,
  suffix = '',
}: {
  value: any;
  onChange: (v: any) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const num = value === '' || value === null || value === undefined ? null : Number(value);
  const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0;
  function clamp(n: number) {
    const bounded = Math.min(max, Math.max(min, n));
    return decimals ? Number(bounded.toFixed(decimals)) : bounded;
  }
  function bump(dir: number) {
    onChange(clamp((num ?? 0) + dir * step));
  }
  function handleBlur() {
    if (value === '' || value === null || value === undefined) return;
    const n = Number(value);
    onChange(Number.isFinite(n) ? clamp(n) : '');
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <StepButton label="−" onPress={() => bump(-1)} />
      <View style={{ width: 80, alignItems: 'center' }}>
        <TextInput
          keyboardType="decimal-pad"
          value={value === null || value === undefined ? '' : String(value)}
          onChangeText={(text) => onChange(text === '' ? '' : text)}
          onBlur={handleBlur}
          style={{
            width: '100%',
            textAlign: 'center',
            fontFamily: monoFont,
            fontVariant: ['tabular-nums'],
            fontSize: 16,
            color: colors.text,
            paddingVertical: 4,
          }}
        />
        {suffix && num != null ? <Text style={{ fontSize: 10, color: colors.inkSoft }}>{suffix}</Text> : null}
      </View>
      <StepButton label="+" onPress={() => bump(1)} />
    </View>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontSize: 16, color: colors.text }}>{label}</Text>
    </Pressable>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: any }[];
  value: any;
  onChange: (v: any) => void;
}) {
  return (
    <View
      style={{
        marginTop: 8,
        flexDirection: 'row',
        gap: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceAlt,
        padding: 4,
      }}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              minHeight: 36,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? colors.accent : 'transparent',
            }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: active ? colors.accentInk : colors.textMuted }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Select({
  value,
  onChange,
  options,
  title,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  title: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          marginTop: 4,
          minHeight: 44,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
          paddingHorizontal: 12,
          justifyContent: 'center',
        }}>
        <Text style={{ fontSize: 14, color: value ? colors.text : colors.inkSoft, textTransform: 'capitalize' }}>
          {value ? human(value) : 'Not set'}
        </Text>
      </Pressable>
      <PickerSheet
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        value={value}
        options={options.map((o) => ({ value: o, label: human(o) }))}
        onSelect={(v) => onChange(String(v))}
        onClear={() => onChange('')}
        clearLabel="Not set"
      />
    </>
  );
}

function SupplementRow({
  supplement,
  onUpdate,
}: {
  supplement: Supplement;
  onUpdate: (field: keyof Supplement, value: any) => void;
}) {
  const [unitOpen, setUnitOpen] = useState(false);
  const [freqOpen, setFreqOpen] = useState(false);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text numberOfLines={1} style={{ flex: 1, minWidth: 0, fontSize: 14, color: colors.textMuted }}>
        {human(supplement.key)}
      </Text>
      <TextInput
        keyboardType="decimal-pad"
        value={supplement.amount === null ? '' : String(supplement.amount)}
        placeholder="Amt"
        placeholderTextColor={colors.inkSoft}
        onChangeText={(text) => onUpdate('amount', text === '' ? null : Number(text))}
        style={{
          width: 64,
          minHeight: 40,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
          paddingHorizontal: 8,
          fontSize: 14,
          textAlign: 'center',
          fontFamily: monoFont,
          color: colors.text,
        }}
      />
      <Pressable onPress={() => setUnitOpen(true)} style={MINI_SELECT}>
        <Text style={{ fontSize: 13, color: supplement.unit ? colors.text : colors.inkSoft }}>{supplement.unit || '—'}</Text>
      </Pressable>
      <Pressable onPress={() => setFreqOpen(true)} style={[MINI_SELECT, { width: 104 }]}>
        <Text numberOfLines={1} style={{ fontSize: 13, color: supplement.frequency ? colors.text : colors.inkSoft }}>
          {supplement.frequency ? human(supplement.frequency) : 'Freq'}
        </Text>
      </Pressable>
      <PickerSheet
        open={unitOpen}
        onClose={() => setUnitOpen(false)}
        title="Unit"
        value={supplement.unit ?? ''}
        options={SUPPLEMENT_UNITS.map((u) => ({ value: u, label: u }))}
        onSelect={(v) => onUpdate('unit', v || null)}
        onClear={() => onUpdate('unit', null)}
        clearLabel="—"
      />
      <PickerSheet
        open={freqOpen}
        onClose={() => setFreqOpen(false)}
        title="Frequency"
        value={supplement.frequency ?? ''}
        options={SUPPLEMENT_FREQUENCY.map((f) => ({ value: f, label: human(f) }))}
        onSelect={(v) => onUpdate('frequency', v || null)}
        onClear={() => onUpdate('frequency', null)}
        clearLabel="Not set"
      />
    </View>
  );
}

function MiniInput({ label, value, onChange }: { label: string; value: any; onChange: (v: string) => void }) {
  return (
    <View style={{ flexBasis: '45%', flexGrow: 1 }}>
      <Text style={{ fontSize: 11, color: colors.inkSoft }}>{label}</Text>
      <TextInput
        keyboardType="decimal-pad"
        value={value === null || value === undefined ? '' : String(value)}
        onChangeText={onChange}
        style={{
          marginTop: 4,
          minHeight: 40,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
          paddingHorizontal: 12,
          fontSize: 14,
          fontFamily: monoFont,
          fontVariant: ['tabular-nums'],
          color: colors.text,
        }}
      />
    </View>
  );
}

function human(value: string) {
  return String(value).replaceAll('_', ' ');
}

const MINI_SELECT = {
  width: 64,
  minHeight: 40,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surfaceAlt,
  paddingHorizontal: 8,
  justifyContent: 'center' as const,
};
