import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PickerSheet, type PickerOption } from '@/components/ui/PickerSheet';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { colors } from '@/lib/theme';

// Port of src/pages/Onboarding.jsx. All option lists, validation, payload
// shapes and unit conversions are unchanged. Web-only inputs are swapped per
// the migration plan: <input type=date> -> native date picker, range slider ->
// @react-native-community/slider, the custom snap-scroll wheel -> PickerSheet
// (decision D4), <select>/<textarea> -> PickerSheet / multiline TextInput.

const GOALS = [
  { v: 'strength', label: 'Strength', hint: 'Get stronger on the big lifts' },
  { v: 'hypertrophy', label: 'Hypertrophy', hint: 'Build muscle size' },
  { v: 'fat_loss', label: 'Fat loss', hint: 'Lean out while keeping muscle' },
  { v: 'general_fitness', label: 'General fitness', hint: 'Feel healthy and capable' },
  { v: 'sport_performance', label: 'Sport performance', hint: 'Train for a sport' },
];
const GENDERS = [
  { v: 'woman', label: 'Woman' },
  { v: 'man', label: 'Man' },
  { v: 'prefer_not_to_say', label: 'Prefer not to say' },
];
const ENHANCEMENT = [
  { v: 'natural', label: 'Natural' },
  { v: 'enhanced', label: 'Enhanced' },
  { v: 'previously_enhanced', label: 'Previously enhanced' },
  { v: 'prefer_not_to_say', label: 'Prefer not to say' },
];
const UNITS = [
  { v: 'kg', label: 'kg' },
  { v: 'lbs', label: 'lbs' },
];
const SPLITS = [
  { v: 'Upper/Lower', label: 'Upper / Lower' },
  { v: 'Push/Pull/Legs', label: 'Push / Pull / Legs' },
  { v: 'Full Body', label: 'Full Body' },
  { v: 'Bro Split', label: 'Bro Split' },
  { v: 'Custom', label: 'Custom' },
];
const STRESS = [
  { v: 'low', label: 'Low' },
  { v: 'moderate', label: 'Moderate' },
  { v: 'high', label: 'High' },
];
const NUTRITION = [
  { v: 'bulk', label: 'Bulking' },
  { v: 'cut', label: 'Cutting' },
  { v: 'maintenance', label: 'Maintenance' },
];
const GYMS = [
  { v: 'commercial', label: 'Commercial gym' },
  { v: 'home', label: 'Home gym' },
  { v: 'outdoor', label: 'Outdoor / mixed' },
];
const PHYSICAL_LABOR = [
  { v: 'sedentary', label: 'Mostly sitting' },
  { v: 'light', label: 'Light movement' },
  { v: 'moderate', label: 'On feet / active' },
  { v: 'heavy', label: 'Heavy labor' },
];
const SPORTS = [
  { v: 'none', label: 'None' },
  { v: 'running', label: 'Running' },
  { v: 'cycling', label: 'Cycling' },
  { v: 'swimming', label: 'Swimming' },
  { v: 'team_sport', label: 'Team sport' },
];
const ETHNIC_BACKGROUNDS = [
  { v: 'american_indian_alaska_native', label: 'American Indian / Alaska Native' },
  { v: 'asian', label: 'Asian' },
  { v: 'black_african_descent', label: 'Black / African descent' },
  { v: 'hispanic_latino', label: 'Hispanic / Latino' },
  { v: 'middle_eastern_north_african', label: 'Middle Eastern / North African' },
  { v: 'native_hawaiian_pacific_islander', label: 'Native Hawaiian / Pacific Islander' },
  { v: 'white_european_descent', label: 'White / European descent' },
  { v: 'prefer_not_to_say', label: 'Prefer not to say' },
];
const SUPPLEMENTS = [
  { v: 'creatine', label: 'Creatine', unit: 'g' },
  { v: 'protein_powder', label: 'Whey / protein powder', unit: 'g protein' },
  { v: 'pre_workout', label: 'Pre-workout', unit: 'servings' },
  { v: 'caffeine', label: 'Caffeine', unit: 'mg' },
  { v: 'beta_alanine', label: 'Beta-alanine', unit: 'g' },
  { v: 'citrulline', label: 'Citrulline / pump', unit: 'g' },
  { v: 'electrolytes', label: 'Electrolytes', unit: 'servings' },
  { v: 'multivitamin', label: 'Multivitamin', unit: 'servings' },
  { v: 'vitamin_d', label: 'Vitamin D', unit: 'IU' },
  { v: 'omega_3', label: 'Omega-3 / fish oil', unit: 'mg' },
  { v: 'magnesium', label: 'Magnesium', unit: 'mg' },
  { v: 'ashwagandha', label: 'Ashwagandha', unit: 'mg' },
  { v: 'bcaa_eaa', label: 'BCAAs / EAAs', unit: 'g' },
  { v: 'other', label: 'Other', unit: '' },
];
const FREQUENCIES = ['daily', 'training_days', 'weekly', 'occasionally'];
const TRAINING_AGE_VALUES = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 9, 10, 11, 12];
const SLEEP_VALUES = range(0, 16, 0.25);
const KG_VALUES = range(35, 220, 1);
const LB_VALUES = range(75, 485, 1);
const CM_VALUES = range(120, 220, 1);
const IN_VALUES = range(48, 86, 1);

type Basics = {
  goal: string;
  gender: string;
  date_of_birth: string;
  training_age_years: number | string;
  enhancement_status: string;
  bodyweight_kg: number | '';
  height_cm: number | '';
  preferred_units: string;
  split_type: string;
  custom_days: string;
};

type SupplementDetail = { amount: string; unit: string; frequency: string; name: string };

type Advanced = {
  sleep_hours: number | '';
  stress_level: string;
  nutrition_phase: string;
  protein_g_per_kg: number | '';
  supplements: Record<string, SupplementDetail>;
  ethnic_background: string[];
  injury_limitations: string;
  country_region: string;
  job_title: string;
  physical_labor_level: string;
  gym_type: string;
  sport_primary: string;
  sport_sessions_per_week: string;
  race_distance: string;
  arm_cm: string;
  chest_cm: string;
  waist_cm: string;
  thigh_cm: string;
  calf_cm: string;
  vo2_max: string;
  avg_daily_steps: string;
};

export default function OnboardingScreen() {
  const { refresh } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [phase, setPhase] = useState<'basics' | 'advanced-intro' | 'advanced-form'>('basics');
  const [submitting, setSubmitting] = useState(false);

  const [basics, setBasics] = useState<Basics>({
    goal: '',
    gender: '',
    date_of_birth: '',
    training_age_years: 1,
    enhancement_status: '',
    bodyweight_kg: '',
    height_cm: '',
    preferred_units: 'kg',
    split_type: '',
    custom_days: '',
  });

  const [advanced, setAdvanced] = useState<Advanced>({
    sleep_hours: '',
    stress_level: '',
    nutrition_phase: '',
    protein_g_per_kg: '',
    supplements: {},
    ethnic_background: [],
    injury_limitations: '',
    country_region: '',
    job_title: '',
    physical_labor_level: '',
    gym_type: '',
    sport_primary: '',
    sport_sessions_per_week: '',
    race_distance: '',
    arm_cm: '',
    chest_cm: '',
    waist_cm: '',
    thigh_cm: '',
    calf_cm: '',
    vo2_max: '',
    avg_daily_steps: '',
  });

  const basicsValid =
    !!basics.goal &&
    !!basics.gender &&
    !!basics.date_of_birth &&
    /^\d{4}-\d{2}-\d{2}$/.test(basics.date_of_birth) &&
    basics.training_age_years !== '' &&
    !!basics.enhancement_status &&
    !!basics.preferred_units;

  async function patchProfile(patch: Record<string, unknown>) {
    setSubmitting(true);
    try {
      await api.patch('/profile', patch);
    } catch (err: any) {
      toast(err.message || 'Save failed', 'error');
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  async function postAdvanced(patch: Record<string, unknown>) {
    setSubmitting(true);
    try {
      await api.post('/profile/advanced', patch);
    } catch (err: any) {
      toast(err.message || 'Save failed', 'error');
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  async function joinStudy() {
    if (!basicsValid) return;
    const patch: Record<string, unknown> = {
      goal: basics.goal,
      gender: basics.gender,
      date_of_birth: basics.date_of_birth,
      training_started_at: trainingStartedAt(Number(basics.training_age_years)),
      training_age_years: Number(basics.training_age_years),
      enhancement_status: basics.enhancement_status,
      preferred_units: basics.preferred_units,
      research_opt_in: true,
    };
    if (basics.bodyweight_kg !== '') patch.bodyweight_kg = Number(basics.bodyweight_kg);
    if (basics.height_cm !== '') patch.height_cm = Number(basics.height_cm);
    if (basics.split_type) patch.split_type = basics.split_type;
    if (basics.split_type === 'Custom' && basics.custom_days.trim()) {
      patch.split_days_json = basics.custom_days.split(',').map((d) => d.trim()).filter(Boolean);
    }
    try {
      await patchProfile(patch);
      setPhase('advanced-intro');
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } catch {
      return;
    }
  }

  async function finish() {
    await refresh();
    router.replace('/community');
  }

  async function saveAdvanced() {
    const patch: Record<string, unknown> = {};
    const numericFields = [
      'sleep_hours', 'protein_g_per_kg', 'sport_sessions_per_week',
      'arm_cm', 'chest_cm', 'waist_cm', 'thigh_cm', 'calf_cm', 'vo2_max', 'avg_daily_steps',
    ] as const;
    for (const key of numericFields) {
      if (advanced[key] !== '') patch[key] = Number(advanced[key]);
    }
    for (const key of ['stress_level', 'nutrition_phase', 'gym_type', 'sport_primary', 'physical_labor_level'] as const) {
      if (advanced[key]) patch[key] = advanced[key];
    }
    for (const key of ['injury_limitations', 'country_region', 'job_title', 'race_distance'] as const) {
      if (advanced[key].trim()) patch[key] = advanced[key].trim();
    }
    const supplementRows = serializeSupplements(advanced.supplements);
    if (supplementRows.length) patch.supplements_json = supplementRows;
    if (advanced.ethnic_background.length) patch.ethnic_background_json = advanced.ethnic_background;
    if (Object.keys(patch).length) {
      try {
        await postAdvanced(patch);
      } catch {
        return;
      }
    }
    await finish();
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 160 }}>
        {phase === 'basics' && (
          <BasicsForm data={basics} setData={setBasics} />
        )}
        {phase === 'advanced-intro' && <AdvancedIntroBody />}
        {phase === 'advanced-form' && (
          <AdvancedForm basics={basics} data={advanced} setData={setAdvanced} />
        )}
      </ScrollView>

      {phase === 'basics' && (
        <FooterBar onNext={joinStudy} nextLabel="Join the study" canNext={basicsValid} submitting={submitting} />
      )}
      {phase === 'advanced-intro' && (
        <FooterBar
          onNext={() => {
            setPhase('advanced-form');
            scrollRef.current?.scrollTo({ y: 0, animated: false });
          }}
          nextLabel="Add advanced details"
          secondary={<SkipButton onPress={finish} />}
        />
      )}
      {phase === 'advanced-form' && (
        <FooterBar
          onNext={saveAdvanced}
          nextLabel="Save and finish"
          submitting={submitting}
          secondary={<SkipButton onPress={finish} />}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function BasicsForm({ data, setData }: { data: Basics; setData: Dispatch<SetStateAction<Basics>> }) {
  const set = <K extends keyof Basics>(k: K, v: Basics[K]) => setData((prev) => ({ ...prev, [k]: v }));
  return (
    <>
      <Header
        title="Join RepSearch"
        subtitle="Basics take about 2 minutes. Advanced details are optional and can be updated later."
      />

      <Section title="About you">
        <Field label="Main goal" required>
          <ChoiceGrid value={data.goal} onChange={(v) => set('goal', v)} options={GOALS} />
        </Field>
        <Field label="Gender" required note="Used for population research and kept private to your profile.">
          <ChoiceGrid value={data.gender} onChange={(v) => set('gender', v)} options={GENDERS} />
        </Field>
        <Field label="Date of birth" required note="Used to bucket results into age cohorts.">
          <DateField value={data.date_of_birth} onChange={(v) => set('date_of_birth', v)} />
        </Field>
      </Section>

      <Section title="Training">
        <Field label="Training age" required note="Choose the closest amount of consistent strength training.">
          <TrainingAgeSlider value={data.training_age_years} onChange={(v) => set('training_age_years', v)} />
        </Field>
        <Field label="Training category" required note="Private profile field used to avoid mixing incomparable research cohorts.">
          <ChoiceGrid value={data.enhancement_status} onChange={(v) => set('enhancement_status', v)} options={ENHANCEMENT} />
        </Field>
        <Field label="Preferred units" required>
          <Segmented value={data.preferred_units} options={UNITS} onChange={(v) => set('preferred_units', v)} />
        </Field>
        <Field label="Split type" note="Optional. Intended program structure helps early research before logs accumulate.">
          <ChoiceGrid
            value={data.split_type}
            onChange={(v) => set('split_type', data.split_type === v ? '' : v)}
            options={SPLITS}
          />
          {data.split_type === 'Custom' && (
            <TextInput
              value={data.custom_days}
              onChangeText={(v) => set('custom_days', v)}
              placeholder="e.g. Push, Pull, Legs, Upper, Lower"
              placeholderTextColor={colors.inkSoft}
              style={[inputStyle(), { marginTop: 12 }]}
            />
          )}
        </Field>
      </Section>

      <Section title="Body stats">
        <Text style={{ fontSize: 14, color: colors.inkSoft }}>
          Optional. These improve bodyweight-relative benchmarks and can be changed later.
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <WheelMetric
            label="Bodyweight"
            value={data.bodyweight_kg}
            unitMode={data.preferred_units}
            values={data.preferred_units === 'lbs' ? LB_VALUES : KG_VALUES}
            displayValue={data.preferred_units === 'lbs' ? kgToLb(data.bodyweight_kg) : data.bodyweight_kg}
            toMetric={(v) => (data.preferred_units === 'lbs' ? lbToKg(v) : v)}
            onChange={(v) => set('bodyweight_kg', v)}
            onClear={() => set('bodyweight_kg', '')}
          />
          <WheelMetric
            label="Height"
            value={data.height_cm}
            unitMode={data.preferred_units === 'lbs' ? 'ft/in' : 'cm'}
            values={data.preferred_units === 'lbs' ? IN_VALUES : CM_VALUES}
            displayValue={data.preferred_units === 'lbs' ? cmToIn(data.height_cm) : data.height_cm}
            displayLabel={(v) => (data.preferred_units === 'lbs' ? formatFeet(v) : String(v))}
            toMetric={(v) => (data.preferred_units === 'lbs' ? inToCm(v) : v)}
            onChange={(v) => set('height_cm', v)}
            onClear={() => set('height_cm', '')}
          />
        </View>
      </Section>

      <Section title="Join the study">
        <View
          style={{
            gap: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'rgba(232, 192, 116, 0.3)',
            backgroundColor: 'rgba(213, 154, 58, 0.08)',
            padding: 16,
          }}>
          <Text style={{ fontSize: 14, lineHeight: 21, color: colors.textMuted }}>
            RepSearch is a citizen-science strength-training database. Your anonymized workout data helps answer real
            questions.
          </Text>
          <View style={{ gap: 8, paddingLeft: 8 }}>
            {[
              'Which split actually builds the most muscle?',
              'Does running hurt squat progress?',
              'How do sleep and nutrition affect strength?',
            ].map((q) => (
              <Text key={q} style={{ fontSize: 14, color: colors.inkSoft }}>
                {'•'}  {q}
              </Text>
            ))}
          </View>
          <Text style={{ fontSize: 12, lineHeight: 18, color: colors.inkSoft }}>
            You can opt out any time from Settings. RepSearch only shows population-level results across cohorts.
          </Text>
        </View>
      </Section>
    </>
  );
}

function AdvancedIntroBody() {
  return (
    <View style={{ paddingTop: 48, gap: 24 }}>
      <View
        style={{
          alignSelf: 'flex-start',
          borderRadius: 999,
          backgroundColor: 'rgba(213, 154, 58, 0.15)',
          paddingHorizontal: 12,
          paddingVertical: 4,
        }}>
        <Text style={{ fontSize: 12, fontWeight: '500', color: '#e8c074' }}>Optional baseline</Text>
      </View>
      <Text style={{ fontSize: 30, lineHeight: 36, fontWeight: '700', color: colors.text }}>
        Add the context that makes the research sharper.
      </Text>
      <Text style={{ fontSize: 15, lineHeight: 24, color: colors.textMuted }}>
        These are current baseline values: sleep, nutrition, supplements, cardio, and measurements change over time and
        can be updated later.
      </Text>
    </View>
  );
}

function AdvancedForm({
  basics,
  data,
  setData,
}: {
  basics: Basics;
  data: Advanced;
  setData: Dispatch<SetStateAction<Advanced>>;
}) {
  const set = <K extends keyof Advanced>(k: K, v: Advanced[K]) => setData((prev) => ({ ...prev, [k]: v }));
  const proteinUnit = basics.preferred_units === 'lbs' ? 'g/lb' : 'g/kg';
  const showRace = ['running', 'cycling', 'swimming'].includes(data.sport_primary);

  function setSupplement(key: string, patch: Partial<SupplementDetail>) {
    setData((prev) => ({
      ...prev,
      supplements: { ...prev.supplements, [key]: { ...(prev.supplements[key] || {}), ...patch } as SupplementDetail },
    }));
  }

  function toggleSupplement(key: string) {
    setData((prev) => {
      const next = { ...prev.supplements };
      if (next[key]) delete next[key];
      else
        next[key] = {
          amount: '',
          unit: SUPPLEMENTS.find((s) => s.v === key)?.unit || '',
          frequency: 'daily',
          name: '',
        };
      return { ...prev, supplements: next };
    });
  }

  return (
    <>
      <Header title="Advanced details" subtitle="Skip any field. These baseline values can be updated later." />

      <Section title="Lifestyle">
        <Field label="Average sleep">
          <WheelField
            title="Average sleep"
            value={data.sleep_hours}
            values={SLEEP_VALUES}
            labelFor={formatSleep}
            onChange={(v) => set('sleep_hours', v)}
            onClear={() => set('sleep_hours', '')}
          />
        </Field>
        <Field label="Stress level">
          <Pills value={data.stress_level} onChange={(v) => set('stress_level', v)} options={STRESS} />
        </Field>
        <Field label="Nutrition phase">
          <Pills value={data.nutrition_phase} onChange={(v) => set('nutrition_phase', v)} options={NUTRITION} />
        </Field>
        <Field label={`Protein intake (${proteinUnit})`}>
          <NumberField
            value={proteinDisplay(data.protein_g_per_kg, basics.preferred_units)}
            onChange={(v) => set('protein_g_per_kg', proteinToKg(v, basics.preferred_units))}
            placeholder={basics.preferred_units === 'lbs' ? 'e.g. 0.8' : 'e.g. 1.6'}
            suffix={proteinUnit}
          />
        </Field>
      </Section>

      <Section title="Supplements">
        <MultiPills values={Object.keys(data.supplements)} onToggle={toggleSupplement} options={SUPPLEMENTS} />
        <View style={{ gap: 12 }}>
          {Object.entries(data.supplements).map(([key, detail]) => {
            const supplement = SUPPLEMENTS.find((s) => s.v === key);
            return (
              <View key={key} style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 12 }}>
                <Text style={{ marginBottom: 12, fontSize: 14, fontWeight: '500', color: colors.text }}>
                  {supplement?.label || key}
                </Text>
                {key === 'other' && (
                  <TextInput
                    value={detail.name || ''}
                    onChangeText={(v) => setSupplement(key, { name: v })}
                    placeholder="Supplement name"
                    placeholderTextColor={colors.inkSoft}
                    style={[inputStyle(), { marginBottom: 8 }]}
                  />
                )}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    keyboardType="decimal-pad"
                    value={detail.amount ?? ''}
                    onChangeText={(v) => setSupplement(key, { amount: v })}
                    placeholder="Amt"
                    placeholderTextColor={colors.inkSoft}
                    style={[inputStyle(), { flex: 1 }]}
                  />
                  <TextInput
                    value={detail.unit ?? ''}
                    onChangeText={(v) => setSupplement(key, { unit: v })}
                    placeholder="Unit"
                    placeholderTextColor={colors.inkSoft}
                    style={[inputStyle(), { flex: 1 }]}
                  />
                  <SelectField
                    style={{ flex: 1 }}
                    title="Frequency"
                    value={detail.frequency || 'daily'}
                    options={FREQUENCIES.map((f) => ({ value: f, label: human(f) }))}
                    onSelect={(v) => setSupplement(key, { frequency: String(v) })}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </Section>

      <Section title="Background">
        <Field label="Ethnic background">
          <MultiPills
            values={data.ethnic_background}
            onToggle={(v) => set('ethnic_background', toggleMulti(data.ethnic_background, v, 'prefer_not_to_say'))}
            options={ETHNIC_BACKGROUNDS}
          />
        </Field>
        <Field label="Injury limitations">
          <TextInput
            multiline
            numberOfLines={3}
            value={data.injury_limitations}
            onChangeText={(v) => set('injury_limitations', v)}
            placeholder="e.g. left shoulder impingement, avoid overhead pressing"
            placeholderTextColor={colors.inkSoft}
            style={[inputStyle(), { minHeight: 84, paddingTop: 12, textAlignVertical: 'top' }]}
          />
        </Field>
        <Field label="Country / region">
          <TextInput
            value={data.country_region}
            onChangeText={(v) => set('country_region', v)}
            placeholder="e.g. United States"
            placeholderTextColor={colors.inkSoft}
            style={inputStyle()}
          />
        </Field>
        <Field label="Job / role">
          <TextInput
            value={data.job_title}
            onChangeText={(v) => set('job_title', v)}
            placeholder="e.g. nurse, software engineer, construction"
            placeholderTextColor={colors.inkSoft}
            style={inputStyle()}
          />
        </Field>
        <Field label="Physical labor at work">
          <Pills value={data.physical_labor_level} onChange={(v) => set('physical_labor_level', v)} options={PHYSICAL_LABOR} />
        </Field>
        <Field label="Gym type">
          <Pills value={data.gym_type} onChange={(v) => set('gym_type', v)} options={GYMS} />
        </Field>
      </Section>

      <Section title="Sport & cardio">
        <Field label="Primary sport">
          <Pills value={data.sport_primary} onChange={(v) => set('sport_primary', v)} options={SPORTS} />
        </Field>
        {data.sport_primary && data.sport_primary !== 'none' ? (
          <Field label="Sport sessions per week">
            <NumberField
              value={data.sport_sessions_per_week}
              onChange={(v) => set('sport_sessions_per_week', v)}
              placeholder="e.g. 3"
              suffix="x/wk"
            />
          </Field>
        ) : null}
        {showRace ? (
          <Field label="Race / distance">
            <TextInput
              value={data.race_distance}
              onChangeText={(v) => set('race_distance', v)}
              placeholder="e.g. half-marathon, 100km, 1500m"
              placeholderTextColor={colors.inkSoft}
              style={inputStyle()}
            />
          </Field>
        ) : null}
        <Field label="VO2 max">
          <NumberField value={data.vo2_max} onChange={(v) => set('vo2_max', v)} placeholder="e.g. 48" />
        </Field>
        <Field label="Average daily steps">
          <NumberField value={data.avg_daily_steps} onChange={(v) => set('avg_daily_steps', v)} placeholder="e.g. 8500" />
        </Field>
      </Section>

      <Section title="Body measurements">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {(
            [
              ['arm_cm', 'Arm'],
              ['chest_cm', 'Chest'],
              ['waist_cm', 'Waist'],
              ['thigh_cm', 'Thigh'],
              ['calf_cm', 'Calf'],
            ] as const
          ).map(([key, label]) => (
            <View key={key} style={{ width: '47%' }}>
              <Field label={label}>
                <NumberField value={data[key]} onChange={(v) => set(key, v)} placeholder="cm" suffix="cm" />
              </Field>
            </View>
          ))}
        </View>
      </Section>
    </>
  );
}

// ---------- shared pieces ----------

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: 28, gap: 12 }}>
      <Text style={{ paddingTop: 8, fontSize: 30, fontWeight: '700', color: colors.text }}>{title}</Text>
      {subtitle ? <Text style={{ fontSize: 14, lineHeight: 21, color: colors.textMuted }}>{subtitle}</Text> : null}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 32 }}>
      <Text
        style={{
          marginBottom: 12,
          fontSize: 12,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: colors.inkSoft,
        }}>
        {title}
      </Text>
      <View style={{ gap: 16 }}>{children}</View>
    </View>
  );
}

function Field({
  label,
  children,
  note,
  required,
}: {
  label: string;
  children: ReactNode;
  note?: string;
  required?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textMuted }}>{label}</Text>
        {required ? (
          <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#e8c074' }}>Required</Text>
        ) : null}
      </View>
      {note ? <Text style={{ fontSize: 12, lineHeight: 18, color: colors.inkSoft }}>{note}</Text> : null}
      {children}
    </View>
  );
}

function ChoiceGrid({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string; hint?: string }[];
}) {
  return (
    <View style={{ gap: 8 }}>
      {options.map((o) => {
        const on = value === o.v;
        return (
          <Pressable
            key={o.v}
            onPress={() => onChange(o.v)}
            style={{
              minHeight: 56,
              borderRadius: 16,
              borderWidth: 1,
              paddingHorizontal: 16,
              paddingVertical: 12,
              justifyContent: 'center',
              backgroundColor: on ? 'rgba(213, 154, 58, 0.1)' : colors.surface,
              borderColor: on ? '#a77b3f' : colors.border,
            }}>
            <Text style={{ fontWeight: '500', color: on ? colors.text : colors.textMuted }}>{o.label}</Text>
            {o.hint ? <Text style={{ marginTop: 4, fontSize: 12, color: colors.inkSoft }}>{o.hint}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { v: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 4,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: 4,
      }}>
      {options.map((o) => {
        const on = value === o.v;
        return (
          <Pressable
            key={o.v}
            onPress={() => onChange(o.v)}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? colors.accent : 'transparent',
            }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: on ? colors.accentInk : colors.inkSoft }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TrainingAgeSlider({ value, onChange }: { value: number | string; onChange: (v: number) => void }) {
  const index = Math.max(0, TRAINING_AGE_VALUES.indexOf(Number(value)));
  return (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16 }}>
      <Text
        style={{
          marginBottom: 12,
          textAlign: 'center',
          fontSize: 24,
          fontWeight: '700',
          fontVariant: ['tabular-nums'],
          color: colors.text,
        }}>
        {formatTrainingAge(value)}
      </Text>
      <Slider
        minimumValue={0}
        maximumValue={TRAINING_AGE_VALUES.length - 1}
        step={1}
        value={index}
        onValueChange={(i) => onChange(TRAINING_AGE_VALUES[Math.round(i)])}
        minimumTrackTintColor={colors.brass}
        maximumTrackTintColor={colors.borderStrong}
        thumbTintColor={colors.text}
      />
      <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 12, color: colors.inkSoft }}>New</Text>
        <Text style={{ fontSize: 12, color: colors.inkSoft }}>12+ years</Text>
      </View>
    </View>
  );
}

// Tap-to-open native picker replacing the web's inline snap-scroll drum (D4).
function WheelField({
  title,
  value,
  values,
  labelFor = String,
  onChange,
  onClear,
}: {
  title: string;
  value: number | '';
  values: number[];
  labelFor?: (v: number | string) => string;
  onChange: (v: number) => void;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={inputStyle()}>
        <Text style={{ fontSize: 14, color: value === '' ? colors.inkSoft : colors.text, lineHeight: 44 }}>
          {value === '' ? 'Tap to choose' : labelFor(value)}
        </Text>
      </Pressable>
      <PickerSheet
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        value={value}
        options={values.map((v) => ({ value: v, label: labelFor(v) }))}
        onSelect={(v) => onChange(Number(v))}
        onClear={onClear}
      />
    </>
  );
}

function WheelMetric({
  label,
  value,
  values,
  displayValue,
  displayLabel,
  toMetric,
  onChange,
  onClear,
  unitMode,
}: {
  label: string;
  value: number | '';
  values: number[];
  displayValue: number | '';
  displayLabel?: (v: number | string) => string;
  toMetric: (v: number) => number;
  onChange: (v: number) => void;
  onClear: () => void;
  unitMode: string;
}) {
  const [open, setOpen] = useState(false);
  const current = displayValue === '' || displayValue === null || displayValue === undefined ? '' : Number(displayValue);
  const fmt = displayLabel || String;
  return (
    <View style={{ flex: 1, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 12 }}>
      <Text style={{ marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: colors.inkSoft }}>
        {label}
      </Text>
      <Text style={{ marginBottom: 8, fontSize: 18, fontWeight: '700', color: colors.text }}>
        {current === '' ? '-' : fmt(current)} <Text style={{ fontSize: 12, color: colors.inkSoft }}>{unitMode}</Text>
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          minHeight: 40,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted }}>{current === '' ? 'Set' : 'Change'}</Text>
      </Pressable>
      {value !== '' ? (
        <Text style={{ marginTop: 8, fontSize: 11, color: colors.inkSoft }}>
          Saved as {value} {label === 'Height' ? 'cm' : 'kg'}
        </Text>
      ) : null}
      <PickerSheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        value={current}
        options={values.map((v) => ({ value: v, label: fmt(v) }))}
        onSelect={(v) => onChange(Math.round(toMetric(Number(v)) * 10) / 10)}
        onClear={onClear}
      />
    </View>
  );
}

function NumberField({
  value,
  onChange,
  placeholder,
  suffix,
}: {
  value: string | number | '';
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <View style={{ position: 'relative' }}>
      <TextInput
        keyboardType="decimal-pad"
        value={value === '' || value === null || value === undefined ? '' : String(value)}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.inkSoft}
        style={[inputStyle(), suffix ? { paddingRight: 64 } : null]}
      />
      {suffix ? (
        <Text style={{ position: 'absolute', right: 16, top: 15, fontSize: 12, color: colors.inkSoft }}>{suffix}</Text>
      ) : null}
    </View>
  );
}

function Pills({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string }[];
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = value === o.v;
        return (
          <Pressable
            key={o.v}
            onPress={() => onChange(value === o.v ? '' : o.v)}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: on ? 'rgba(213, 154, 58, 0.15)' : colors.surface,
              borderColor: on ? '#a77b3f' : colors.border,
            }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: on ? '#e8c074' : colors.textMuted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MultiPills({
  values,
  onToggle,
  options,
}: {
  values: string[];
  onToggle: (v: string) => void;
  options: { v: string; label: string }[];
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const active = values.includes(o.v);
        return (
          <Pressable
            key={o.v}
            onPress={() => onToggle(o.v)}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: active ? 'rgba(213, 154, 58, 0.15)' : colors.surface,
              borderColor: active ? '#a77b3f' : colors.border,
            }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: active ? '#e8c074' : colors.textMuted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// <select> replacement: pressable field opening a PickerSheet.
function SelectField({
  title,
  value,
  options,
  onSelect,
  style,
}: {
  title: string;
  value: string;
  options: PickerOption[];
  onSelect: (v: string | number) => void;
  style?: object;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[inputStyle(), { justifyContent: 'center' }, style]}>
        <Text numberOfLines={1} style={{ fontSize: 14, color: colors.text }}>
          {current?.label ?? value}
        </Text>
      </Pressable>
      <PickerSheet open={open} onClose={() => setOpen(false)} title={title} value={value} options={options} onSelect={onSelect} />
    </>
  );
}

function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ? new Date(`${value}T00:00:00`) : new Date(2000, 0, 1));
  const maximumDate = new Date();

  function openPicker() {
    const current = value ? new Date(`${value}T00:00:00`) : new Date(2000, 0, 1);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        maximumDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(toISODate(date));
        },
      });
    } else {
      setDraft(current);
      setOpen(true);
    }
  }

  return (
    <>
      <Pressable onPress={openPicker} style={inputStyle()}>
        <Text style={{ fontSize: 14, color: value ? colors.text : colors.inkSoft, lineHeight: 44 }}>
          {value || 'Tap to choose'}
        </Text>
      </Pressable>
      {Platform.OS === 'ios' && (
        <Sheet open={open} onClose={() => setOpen(false)} title="Date of birth" scrollable={false}>
          <DateTimePicker
            value={draft}
            mode="date"
            display="spinner"
            themeVariant="dark"
            maximumDate={maximumDate}
            onChange={(_event, date) => {
              if (date) setDraft(date);
            }}
          />
          <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
            <Pressable
              onPress={() => {
                onChange(toISODate(draft));
                setOpen(false);
              }}
              style={{
                minHeight: 48,
                borderRadius: 16,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text style={{ fontWeight: '600', color: colors.accentInk }}>Done</Text>
            </Pressable>
          </View>
        </Sheet>
      )}
    </>
  );
}

function SkipButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      <Text style={{ fontSize: 14, color: colors.textMuted }}>Skip</Text>
    </Pressable>
  );
}

function FooterBar({
  onNext,
  nextLabel = 'Continue',
  canNext = true,
  submitting,
  secondary,
}: {
  onNext: () => void;
  nextLabel?: string;
  canNext?: boolean;
  submitting?: boolean;
  secondary?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: 'rgba(8, 9, 10, 0.97)',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: Math.max(insets.bottom, 16),
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {secondary}
        <Pressable
          onPress={onNext}
          disabled={!canNext || submitting}
          style={{
            minHeight: 48,
            flex: 1,
            borderRadius: 16,
            backgroundColor: colors.accent,
            opacity: !canNext || submitting ? 0.4 : 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 16,
          }}>
          <Text style={{ fontWeight: '600', color: colors.accentInk }}>{submitting ? 'Saving...' : nextLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function inputStyle() {
  return {
    width: '100%' as const,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.text,
  };
}

// ---------- helpers (unchanged from the web implementation) ----------

function range(min: number, max: number, step: number) {
  const out: number[] = [];
  for (let n = min; n <= max + step / 2; n += step) out.push(Math.round(n * 100) / 100);
  return out;
}

function toISODate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function trainingStartedAt(years: number) {
  const d = new Date();
  d.setDate(d.getDate() - Math.round(years * 365.25));
  return d.toISOString().slice(0, 10);
}

function formatTrainingAge(value: number | string) {
  const n = Number(value);
  if (n === 0) return 'Less than 6 months';
  if (n === 0.5) return '6 months';
  if (n >= 12) return '12+ years';
  return `${n} ${n === 1 ? 'year' : 'years'}`;
}

function formatSleep(value: number | string) {
  const n = Number(value);
  if (n === 0) return '0 hours';
  return `${n}h`;
}

function kgToLb(kg: number | ''): number | '' {
  return kg === '' ? '' : Math.round(Number(kg) * 2.20462);
}

function lbToKg(lb: number) {
  return Math.round((Number(lb) / 2.20462) * 10) / 10;
}

function cmToIn(cm: number | ''): number | '' {
  return cm === '' ? '' : Math.round(Number(cm) / 2.54);
}

function inToCm(inches: number) {
  return Math.round(Number(inches) * 2.54);
}

function formatFeet(inches: number | string) {
  const n = Number(inches);
  return `${Math.floor(n / 12)}'${n % 12}"`;
}

function proteinDisplay(value: number | '', units: string): number | '' {
  if (value === '') return '';
  const n = Number(value);
  return units === 'lbs' ? Math.round((n / 2.20462) * 100) / 100 : n;
}

function proteinToKg(value: string, units: string): number | '' {
  if (value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return units === 'lbs' ? Math.round(n * 2.20462 * 100) / 100 : n;
}

function serializeSupplements(supplements: Record<string, SupplementDetail>) {
  return Object.entries(supplements)
    .map(([key, detail]) => ({
      key,
      name: key === 'other' ? String(detail.name || '').trim() : undefined,
      amount: detail.amount === '' ? null : Number(detail.amount),
      unit: String(detail.unit || '').trim(),
      frequency: detail.frequency || 'daily',
    }))
    .filter((s) => s.key !== 'other' || s.name);
}

function toggleMulti(values: string[], value: string, exclusiveValue: string) {
  if (value === exclusiveValue) return values.includes(value) ? [] : [value];
  const withoutExclusive = values.filter((v) => v !== exclusiveValue);
  return withoutExclusive.includes(value)
    ? withoutExclusive.filter((v) => v !== value)
    : [...withoutExclusive, value];
}

function human(value: string) {
  return String(value).replaceAll('_', ' ');
}
