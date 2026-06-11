// Port of src/components/progress/BodyTab.jsx — bodyweight hero + trend,
// sleep / calories / protein-vs-bodyweight charts, measurement rows, and the
// log-measurements sheet.
import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { LineSeriesChart, shortDateLabel } from '@/components/charts';
import { Sheet } from '@/components/ui/Sheet';
import { JEWEL, MEASUREMENT_COLORS, PROGRESS_BORDER, PROGRESS_MUTED, PROGRESS_TEXT } from '@/lib/progressTheme';
import { monoFont } from '@/lib/theme';
import type { Resource } from '@/hooks/useProgress';
import {
  ChartBlock,
  ChartEmpty,
  DataRow,
  Delta,
  ErrorState,
  InlineWarning,
  PrimaryButton,
  Section,
  Skeleton,
} from './ui';

const MEASUREMENTS = [
  { key: 'arm_cm', label: 'Arms' },
  { key: 'chest_cm', label: 'Chest' },
  { key: 'waist_cm', label: 'Waist' },
  { key: 'thigh_cm', label: 'Thighs' },
  { key: 'calf_cm', label: 'Calves' },
].map((m) => ({ ...m, color: MEASUREMENT_COLORS[m.key] }));

const SLEEP = JEWEL.amethyst;
const CALORIES = JEWEL.brass;
const PROTEIN = JEWEL.moss;

export default function BodyTab({
  resource,
  lifestyle,
  supplements,
  onLog,
  onRetry,
}: {
  resource: Resource;
  lifestyle: Resource;
  // users.supplements_json — JSON string or already-parsed array.
  supplements?: any;
  onLog: (payload: Record<string, number>) => Promise<any>;
  onRetry: () => void;
}) {
  const [logOpen, setLogOpen] = useState(false);
  const history = useMemo(() => sortHistory(resource.data?.history || [], 'desc'), [resource.data]);
  const ascending = useMemo(() => sortHistory(resource.data?.history || [], 'asc'), [resource.data]);

  const bwSeries = useMemo(
    () => ascending.filter((h: any) => h.bodyweight_kg != null).map((h: any) => ({ date: h.date, bw: h.bodyweight_kg })),
    [ascending],
  );

  const logsAsc = useMemo(
    () => [...(lifestyle?.data || [])].sort((a: any, b: any) => a.date.localeCompare(b.date)),
    [lifestyle],
  );
  const sleepSeries = useMemo(
    () => logsAsc.filter((l: any) => l.sleep_duration != null).map((l: any) => ({ date: l.date, sleep: l.sleep_duration })),
    [logsAsc],
  );
  const caloriesSeries = useMemo(
    () => logsAsc.filter((l: any) => l.calories != null).map((l: any) => ({ date: l.date, calories: l.calories })),
    [logsAsc],
  );
  const proteinBwSeries = useMemo(() => {
    const bwPoints = ascending
      .filter((h: any) => h.bodyweight_kg != null)
      .map((h: any) => ({ date: h.date, bw: h.bodyweight_kg }));
    const bwByDate = new Map(bwPoints.map((p: any) => [p.date, p.bw]));
    const nearestBw = (date: string) => {
      if (bwByDate.has(date)) return bwByDate.get(date);
      let best: number | null = null;
      let bestDiff = Infinity;
      for (const p of bwPoints) {
        const diff = Math.abs(new Date(`${p.date}T00:00:00`).getTime() - new Date(`${date}T00:00:00`).getTime());
        if (diff < bestDiff) {
          bestDiff = diff;
          best = p.bw;
        }
      }
      return best;
    };
    return logsAsc
      .filter((l: any) => l.protein_g != null || bwByDate.has(l.date))
      .map((l: any) => {
        const exactBw = bwByDate.get(l.date) ?? null;
        const refBw = l.protein_g != null ? nearestBw(l.date) : exactBw;
        return {
          date: l.date,
          protein_g: l.protein_g ?? null,
          bw: exactBw,
          protein_per_kg: l.protein_g != null && refBw ? Number((l.protein_g / refBw).toFixed(2)) : null,
        };
      });
  }, [logsAsc, ascending]);

  const parsedSupplements = useMemo(
    () =>
      parseArray(supplements)
        .map((s: any) => (typeof s === 'string' ? { key: s } : s))
        .filter((s: any) => s && s.key),
    [supplements],
  );

  const bwCurrent = latestOf(history, 'bodyweight_kg');
  const bwStart = bwSeries[0];
  const bwDelta = bwCurrent && bwStart ? bwCurrent.bodyweight_kg - bwStart.bw : null;
  const bwStartMonth = bwStart ? new Date(`${bwStart.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short' }) : '';

  const sleepAvg = avg(sleepSeries.map((s: any) => s.sleep));
  const calAvg = avg(caloriesSeries.map((c: any) => c.calories));
  const proteinPerKgAvg = avg(proteinBwSeries.map((p: any) => p.protein_per_kg).filter((v: any) => v != null));

  if (resource.loading && !resource.data) return <Skeleton blocks={[72, 160, 200]} />;
  if (resource.error && !resource.data) return <ErrorState message={resource.error} onRetry={onRetry} />;

  return (
    <View style={{ gap: 20 }}>
      {resource.error ? <InlineWarning message={resource.error} onRetry={onRetry} /> : null}

      {/* Hero — current bodyweight with its trend delta. */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        {bwCurrent ? (
          <>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={{ fontWeight: '700', fontFamily: monoFont, fontSize: 44, lineHeight: 46, color: PROGRESS_TEXT }}>
                  {bwCurrent.bodyweight_kg}
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '500', color: PROGRESS_MUTED }}>kg</Text>
              </View>
              <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginTop: 8, color: PROGRESS_MUTED }}>
                Current bodyweight
              </Text>
            </View>
            {bwDelta != null && (
              <View style={{ alignItems: 'flex-end', paddingBottom: 4 }}>
                <Delta value={bwDelta} unit="kg" color={PROGRESS_TEXT} />
                <Text style={{ fontSize: 11, marginTop: 2, color: PROGRESS_MUTED }}>since {bwStartMonth}</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={{ fontSize: 14, color: PROGRESS_MUTED }}>No bodyweight logged yet.</Text>
        )}
      </View>

      {bwSeries.length > 1 && (
        <ChartBlock
          title="Bodyweight trend"
          caption={bwDelta != null ? `${bwDelta >= 0 ? 'Up' : 'Down'} ${Math.abs(bwDelta).toFixed(1)}kg since ${bwStartMonth}.` : 'Your bodyweight over time.'}
          height={140}>
          <LineSeriesChart
            height={140}
            rows={bwSeries}
            series={[{ key: 'bw', label: 'Bodyweight (kg)', color: PROGRESS_TEXT }]}
            yPad={1}
            readout={(row) => [shortDateLabel(row.date), `Bodyweight: ${row.bw}kg`]}
          />
        </ChartBlock>
      )}

      {sleepSeries.length >= 1 ? (
        <ChartBlock
          title="Sleep duration"
          caption={sleepAvg != null ? `Averaging ${sleepAvg.toFixed(1)}h a night across ${sleepSeries.length} logs.` : 'Hours slept per night.'}
          height={140}>
          <LineSeriesChart
            height={140}
            rows={sleepSeries}
            series={[{ key: 'sleep', label: 'Sleep (h)', color: SLEEP.ink }]}
            yPad={1}
            readout={(row) => [shortDateLabel(row.date), `Sleep: ${row.sleep}h`]}
          />
        </ChartBlock>
      ) : (
        <ChartEmpty title="Sleep duration" message="No sleep duration logs recorded yet. Data will appear here once entered in your Check-in tab." />
      )}

      {caloriesSeries.length >= 1 ? (
        <ChartBlock
          title="Calorie intake"
          caption={calAvg != null ? `Averaging ${Math.round(calAvg).toLocaleString()} kcal a day across ${caloriesSeries.length} logs.` : 'Calories logged per day.'}
          height={140}>
          <LineSeriesChart
            height={140}
            rows={caloriesSeries}
            series={[{ key: 'calories', label: 'Calories', color: CALORIES.ink }]}
            yPad={100}
            readout={(row) => [shortDateLabel(row.date), `Calories: ${row.calories}`]}
          />
        </ChartBlock>
      ) : (
        <ChartEmpty title="Calorie intake" message="No calorie logs recorded yet. Data will appear here once entered in your Check-in tab." />
      )}

      {proteinBwSeries.length >= 1 ? (
        <ChartBlock
          title="Protein & bodyweight"
          caption={proteinPerKgAvg != null ? `Averaging ${proteinPerKgAvg.toFixed(2)}g protein per kg of bodyweight.` : 'Protein intake tracked against bodyweight.'}
          height={180}>
          <View style={{ flex: 1 }}>
            <LineSeriesChart
              height={156}
              rows={proteinBwSeries}
              series={[
                { key: 'protein_g', label: 'Protein (g)', color: PROTEIN.ink },
                { key: 'bw', label: 'Bodyweight (kg)', color: PROGRESS_TEXT, rightAxis: true },
              ]}
              readout={(row) => {
                const lines = [shortDateLabel(row.date)];
                if (row.protein_g != null) {
                  lines.push(`Protein: ${row.protein_g}g${row.protein_per_kg != null ? ` · ${row.protein_per_kg}g/kg` : ''}`);
                }
                if (row.bw != null) lines.push(`Bodyweight: ${row.bw}kg`);
                return lines;
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'center', columnGap: 14, paddingTop: 4 }}>
              <LegendDot color={PROTEIN.ink} label="Protein (g)" />
              <LegendDot color={PROGRESS_TEXT} label="Bodyweight (kg)" />
            </View>
          </View>
        </ChartBlock>
      ) : (
        <ChartEmpty title="Protein & bodyweight" message="No protein or bodyweight logs recorded yet. Data will appear here once entered in your Check-in tab." />
      )}

      {/* Measurements — Data Rows, color-coded per body part. */}
      <Section
        title="Measurements"
        caption="Latest reading and total change since your first log."
        action={
          <PrimaryButtonSmall onPress={() => setLogOpen(true)} label="Log" />
        }>
        <View>
          {MEASUREMENTS.map((m) => {
            const latest = latestOf(history, m.key);
            const d = deltaOf(ascending, m.key);
            return (
              <DataRow
                key={m.key}
                dot={m.color.ink}
                label={m.label}
                value={latest?.[m.key] != null ? `${latest[m.key]}cm` : '—'}
                trailing={
                  <View style={{ marginLeft: 12, width: 48, alignItems: 'flex-end' }}>
                    {d != null ? <Delta value={d} color={PROGRESS_MUTED} /> : null}
                  </View>
                }
              />
            );
          })}
        </View>
      </Section>

      {parsedSupplements.length > 0 && (
        <Section title="Current supplements">
          <View>
            {parsedSupplements.map((s: any) => {
              const detail = [s.amount != null && `${s.amount}${s.unit || ''}`, s.frequency && human(s.frequency)]
                .filter(Boolean)
                .join(' · ');
              return <DataRow key={s.key} label={human(s.key)} value={detail || undefined} valueColor={PROGRESS_MUTED} />;
            })}
          </View>
        </Section>
      )}

      <LogMeasurementSheet
        open={logOpen}
        onClose={() => setLogOpen(false)}
        onSave={async (payload) => {
          await onLog(payload);
          setLogOpen(false);
        }}
      />
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontSize: 11, color: PROGRESS_MUTED }}>{label}</Text>
    </View>
  );
}

function PrimaryButtonSmall({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <View style={{ minWidth: 64 }}>
      <PrimaryButton onPress={onPress} paddingVertical={8}>
        {label}
      </PrimaryButton>
    </View>
  );
}

function human(value: any) {
  return String(value).replaceAll('_', ' ');
}

function avg(values: number[]) {
  if (!values.length) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function parseArray(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const a = JSON.parse(raw);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function latestOf(history: any[], key: string) {
  return history.find((h) => h[key] != null);
}

function deltaOf(ascending: any[], key: string) {
  const values = ascending.filter((h) => h[key] != null);
  if (values.length < 2) return null;
  return values[values.length - 1][key] - values[0][key];
}

function sortHistory(history: any[], direction: 'asc' | 'desc') {
  const sorted = [...history].sort((a, b) => `${a.date}|${a.created_at || ''}`.localeCompare(`${b.date}|${b.created_at || ''}`));
  return direction === 'desc' ? sorted.reverse() : sorted;
}

function LogMeasurementSheet({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, number>) => Promise<void>;
}) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(k: string, v: string) {
    setError('');
    setVals((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    const payload: Record<string, number> = {};
    let sawInvalid = false;
    for (const k of ['bodyweight_kg', ...MEASUREMENTS.map((m) => m.key)]) {
      const raw = vals[k];
      if (raw === '' || raw == null) continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0) {
        sawInvalid = true;
        continue;
      }
      payload[k] = value;
    }
    if (sawInvalid) {
      setError('Measurements must be greater than 0.');
      return;
    }
    if (Object.keys(payload).length === 0) {
      setError('Enter at least one measurement before saving.');
      return;
    }
    setSaving(true);
    await onSave(payload);
    setSaving(false);
    setVals({});
    setError('');
  }

  return (
    <Sheet open={open} onClose={onClose} title="Log measurements">
      <View style={{ padding: 16, gap: 12 }}>
        <Row label="Bodyweight (kg)" value={vals.bodyweight_kg ?? ''} onChange={(v) => set('bodyweight_kg', v)} />
        {MEASUREMENTS.map((m) => (
          <Row key={m.key} label={`${m.label} (cm)`} value={vals[m.key] ?? ''} onChange={(v) => set(m.key, v)} />
        ))}
        {error ? (
          <View style={{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(211,98,58,0.14)' }}>
            <Text style={{ fontSize: 14, color: JEWEL.rust.ink }}>{error}</Text>
          </View>
        ) : null}
        <PrimaryButton onPress={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </PrimaryButton>
      </View>
    </Sheet>
  );
}

function Row({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ flex: 1, fontSize: 14, color: PROGRESS_MUTED }}>{label}</Text>
      <TextInput
        keyboardType="decimal-pad"
        inputMode="decimal"
        value={value}
        onChangeText={onChange}
        style={{
          width: 112,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          fontFamily: monoFont,
          textAlign: 'right',
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderWidth: 1,
          borderColor: PROGRESS_BORDER,
          color: PROGRESS_TEXT,
        }}
      />
    </View>
  );
}
