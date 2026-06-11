// Port of src/components/progress/CompareTab.jsx — build 1-3 series from your
// own training data, optional per-series filters, shared time window, and the
// multi-series comparison line chart. Web <select>s become PickerSheets (D4);
// the date inputs become native date pickers.
import DateTimePicker from '@react-native-community/datetimepicker';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { LineSeriesChart, shortDateLabel } from '@/components/charts';
import { PickerSheet, type PickerOption } from '@/components/ui/PickerSheet';
import { nanoid } from '@/lib/nanoid';
import { JEWEL_SERIES, NEGATIVE_INK, PROGRESS_BORDER, PROGRESS_MUTED, PROGRESS_TEXT } from '@/lib/progressTheme';
import { colors } from '@/lib/theme';
import type { Resource } from '@/hooks/useProgress';
import { ChartBlock, Empty, InlineWarning, PrimaryButton, Section } from './ui';

const SPLITS = ['Push', 'Pull', 'Legs', 'Other'];
const COMPARE_METRICS = [
  { key: 'top_set', label: 'Top set' },
  { key: 'reps_at_weight', label: 'Reps at weight' },
  { key: 'estimated_1rm', label: 'Est. 1RM' },
  { key: 'volume', label: 'Volume' },
];
const BODY_SERIES = [
  { id: 'bodyweight_kg', name: 'Bodyweight' },
  { id: 'arm_cm', name: 'Arms' },
  { id: 'chest_cm', name: 'Chest' },
  { id: 'waist_cm', name: 'Waist' },
  { id: 'thigh_cm', name: 'Thighs' },
  { id: 'calf_cm', name: 'Calves' },
];
const SOURCE_TYPES = [
  { id: 'exercise', name: 'Exercise' },
  { id: 'muscle', name: 'Muscle group' },
  { id: 'split', name: 'Split' },
  { id: 'body_metric', name: 'Body' },
];
const SET_TYPE_OPTIONS = [
  { id: '', name: 'All set types' },
  { id: 'working', name: 'Working' },
  { id: 'backoff', name: 'Backoff' },
  { id: 'drop', name: 'Drop' },
  { id: 'amrap', name: 'AMRAP' },
  { id: 'rest_pause', name: 'Rest pause' },
  { id: 'cluster', name: 'Cluster' },
];
const ROM_OPTIONS = [
  { id: '', name: 'All ROM' },
  { id: 'full', name: 'Full ROM' },
  { id: 'partial', name: 'Partial' },
  { id: 'lengthened', name: 'Lengthened' },
  { id: 'shortened', name: 'Shortened' },
];
const GROUP_OPTIONS = [
  { id: 'session', name: 'Session' },
  { id: 'week', name: 'Week' },
  { id: 'month', name: 'Month' },
];
const LINE_COLORS = JEWEL_SERIES.map((j) => j.ink);
const FILTER_KEYS = ['set_type', 'rom_category', 'equipment_type', 'split'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

type CompareRow = {
  uid: string;
  source_type: string;
  source_id: string;
  metric: string;
  target_weight?: string;
};
type Filters = Record<FilterKey, { value: string; appliesTo: string[] }>;

function makeRow(over: Partial<CompareRow> = {}): CompareRow {
  return { uid: nanoid(8), source_type: 'exercise', source_id: '', metric: 'top_set', ...over };
}

function emptyFilters(): Filters {
  return {
    set_type: { value: '', appliesTo: [] },
    rom_category: { value: '', appliesTo: [] },
    equipment_type: { value: '', appliesTo: [] },
    split: { value: '', appliesTo: [] },
  };
}

export default function CompareTab({
  resource,
  exercises = [],
  muscles = [],
  equipment = [],
  seed = '',
  onRun,
}: {
  resource: Resource;
  exercises?: any[];
  muscles?: { id: string; name: string }[];
  equipment?: { id: string; name: string }[];
  seed?: string;
  onRun: (series: any[], options: Record<string, string>) => void;
}) {
  const [rows, setRows] = useState<CompareRow[]>(() =>
    seed ? [makeRow({ source_type: 'exercise', source_id: seed })] : [makeRow()],
  );
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [options, setOptions] = useState({ from: '', to: '', group_by: 'week' });
  const [warning, setWarning] = useState('');
  const autoRan = useRef(false);
  // Which PickerSheet is open: { uid, field } for row selects, or a filter key.
  const [rowPicker, setRowPicker] = useState<{ uid: string; field: 'source_type' | 'source_id' | 'metric' } | null>(null);
  const [filterPicker, setFilterPicker] = useState<FilterKey | null>(null);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [datePicker, setDatePicker] = useState<'from' | 'to' | null>(null);

  const chartData = useMemo(() => mergeCompareSeries(resource.data || []), [resource.data]);

  function buildSeries(currentRows = rows, currentFilters = filters) {
    return currentRows
      .filter((row) => row.source_id)
      .map((row, outIndex) => {
        const def: any = {
          id: `series_${outIndex}`,
          source_type: row.source_type,
          source_id: row.source_id,
          metric: row.metric,
          label: compareLabel(row, exercises, muscles),
        };
        if (row.metric === 'reps_at_weight' && row.target_weight) def.target_weight = row.target_weight;
        for (const key of FILTER_KEYS) {
          const f = currentFilters[key];
          if (f.value && f.appliesTo.includes(row.uid)) def[key] = f.value;
        }
        return def;
      });
  }

  function run() {
    const missingWeight = rows.some(
      (row) => row.source_id && row.metric === 'reps_at_weight' && !(Number(row.target_weight) > 0),
    );
    if (missingWeight) {
      setWarning('Enter a target weight for every "Reps at weight" series before running.');
      return;
    }
    setWarning('');
    onRun(buildSeries(), cleanOptions(options));
  }

  // Auto-run once when arriving via a seeded lift and the exercise list is ready.
  useEffect(() => {
    if (seed && !autoRan.current && exercises.length) {
      autoRan.current = true;
      onRun(buildSeries(), cleanOptions(options));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, exercises]);

  function updateRow(uid: string, patch: Partial<CompareRow>) {
    setWarning('');
    setRows((prev) =>
      prev.map((row) => {
        if (row.uid !== uid) return row;
        const next = { ...row, ...patch };
        if (patch.source_type === 'body_metric') next.metric = 'measurement';
        if (patch.source_type && patch.source_type !== row.source_type) {
          next.source_id = '';
          if (patch.source_type !== 'body_metric' && next.metric === 'measurement') next.metric = 'top_set';
        }
        return next;
      }),
    );
  }

  function addRow() {
    if (rows.length >= 3) return;
    const row = makeRow();
    setRows((prev) => [...prev, row]);
    setFilters((prev) => {
      const next = { ...prev };
      for (const key of FILTER_KEYS) {
        if (next[key].value) next[key] = { ...next[key], appliesTo: [...next[key].appliesTo, row.uid] };
      }
      return next;
    });
  }

  function removeRow(uid: string) {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((row) => row.uid !== uid));
    setFilters((prev) => {
      const next = { ...prev };
      for (const key of FILTER_KEYS) {
        next[key] = { ...next[key], appliesTo: next[key].appliesTo.filter((id) => id !== uid) };
      }
      return next;
    });
  }

  function setFilterValue(key: FilterKey, value: string) {
    setFilters((prev) => ({
      ...prev,
      [key]: { value, appliesTo: value ? rows.map((r) => r.uid) : [] },
    }));
  }

  function toggleFilterSeries(key: FilterKey, uid: string) {
    setFilters((prev) => {
      const f = prev[key];
      const appliesTo = f.appliesTo.includes(uid) ? f.appliesTo.filter((id) => id !== uid) : [...f.appliesTo, uid];
      return { ...prev, [key]: { ...f, appliesTo } };
    });
  }

  const filterDefs = useMemo(
    () => [
      { key: 'set_type' as FilterKey, label: 'Set type', options: SET_TYPE_OPTIONS },
      { key: 'rom_category' as FilterKey, label: 'ROM', options: ROM_OPTIONS },
      { key: 'equipment_type' as FilterKey, label: 'Equipment', options: [{ id: '', name: 'All equipment' }, ...equipment] },
      { key: 'split' as FilterKey, label: 'Split', options: [{ id: '', name: 'All splits' }, ...SPLITS.map((s) => ({ id: s, name: s }))] },
    ],
    [equipment],
  );

  const pickerRow = rowPicker ? rows.find((r) => r.uid === rowPicker.uid) : null;
  const pickerOptions: PickerOption[] = useMemo(() => {
    if (!rowPicker || !pickerRow) return [];
    if (rowPicker.field === 'source_type') return SOURCE_TYPES.map((t) => ({ value: t.id, label: t.name }));
    if (rowPicker.field === 'source_id') {
      return sourceOptions(pickerRow.source_type, exercises, muscles).map((o: any) => ({ value: o.id, label: o.name }));
    }
    const metrics = pickerRow.source_type === 'body_metric' ? [{ key: 'measurement', label: 'Measurement' }] : COMPARE_METRICS;
    return metrics.map((m) => ({ value: m.key, label: m.label }));
  }, [rowPicker, pickerRow, exercises, muscles]);

  const activeFilterDef = filterPicker ? filterDefs.find((d) => d.key === filterPicker) : null;

  return (
    <View style={{ gap: 20 }}>
      {resource.error ? <InlineWarning message={resource.error} onRetry={run} /> : null}

      {/* Form Block — define 1-3 series, optional filters, shared time window. */}
      <Section title="Build comparison" caption="Graph 1–3 series from your own training data." divider={false}>
        <View style={{ gap: 8 }}>
          {rows.map((row, index) => (
            <View key={row.uid} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <SelectButton
                    label={SOURCE_TYPES.find((t) => t.id === row.source_type)?.name || 'Type'}
                    onPress={() => setRowPicker({ uid: row.uid, field: 'source_type' })}
                  />
                  <SelectButton
                    label={sourceOptions(row.source_type, exercises, muscles).find((o: any) => o.id === row.source_id)?.name || 'Choose'}
                    muted={!row.source_id}
                    onPress={() => setRowPicker({ uid: row.uid, field: 'source_id' })}
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <SelectButton
                    label={metricLabel(row.metric)}
                    onPress={() => setRowPicker({ uid: row.uid, field: 'metric' })}
                  />
                  {row.metric === 'reps_at_weight' ? (
                    <TextInput
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                      value={row.target_weight || ''}
                      onChangeText={(v) => updateRow(row.uid, { target_weight: v })}
                      placeholder="Target kg"
                      placeholderTextColor={PROGRESS_MUTED}
                      style={{
                        flex: 1,
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 8,
                        fontSize: 12,
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        color: PROGRESS_TEXT,
                        borderWidth: 1,
                        borderColor: PROGRESS_BORDER,
                      }}
                    />
                  ) : null}
                </View>
              </View>
              <View
                style={{
                  marginTop: 10,
                  height: 10,
                  width: 10,
                  flexShrink: 0,
                  borderRadius: 5,
                  backgroundColor: LINE_COLORS[index % LINE_COLORS.length],
                }}
              />
              <Pressable
                onPress={() => removeRow(row.uid)}
                disabled={rows.length <= 1}
                accessibilityLabel={`Remove series ${index + 1}`}
                style={{
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: PROGRESS_BORDER,
                  opacity: rows.length <= 1 ? 0.3 : 1,
                }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: PROGRESS_TEXT }}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {rows.length < 3 && (
          <Pressable onPress={addRow} hitSlop={8} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.emeraldInk }}>+ Add series</Text>
          </Pressable>
        )}

        {warning ? <Text style={{ marginTop: 8, fontSize: 12, fontWeight: '500', color: NEGATIVE_INK }}>{warning}</Text> : null}

        {/* Per-series filters: pick a value, then toggle which series it applies to. */}
        <View style={{ marginTop: 16, gap: 12 }}>
          <Text style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: PROGRESS_MUTED }}>
            Filters (optional)
          </Text>
          {filterDefs.map((def) => {
            const f = filters[def.key];
            return (
              <View key={def.key} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, width: 64, flexShrink: 0, color: PROGRESS_MUTED }}>{def.label}</Text>
                <SelectButton
                  label={def.options.find((o) => o.id === f.value)?.name || def.options[0]?.name || ''}
                  small
                  onPress={() => setFilterPicker(def.key)}
                />
                {f.value ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 10, color: PROGRESS_MUTED }}>applies to</Text>
                    {rows.map((row, i) => {
                      const on = f.appliesTo.includes(row.uid);
                      return (
                        <Pressable
                          key={row.uid}
                          onPress={() => toggleFilterSeries(def.key, row.uid)}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 999,
                            backgroundColor: on ? colors.emerald : 'transparent',
                            borderWidth: 1,
                            borderColor: on ? colors.emerald : PROGRESS_BORDER,
                          }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: on ? colors.onEmerald : PROGRESS_MUTED }}>
                            S{i + 1}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Global time controls — shared across all series. Blank dates = all time. */}
        <View style={{ marginTop: 16, flexDirection: 'row', gap: 8 }}>
          <Field label="From">
            <SelectButton
              label={options.from || 'All time'}
              muted={!options.from}
              onPress={() => setDatePicker('from')}
              onClear={options.from ? () => setOptions((prev) => ({ ...prev, from: '' })) : undefined}
            />
          </Field>
          <Field label="To">
            <SelectButton
              label={options.to || 'Now'}
              muted={!options.to}
              onPress={() => setDatePicker('to')}
              onClear={options.to ? () => setOptions((prev) => ({ ...prev, to: '' })) : undefined}
            />
          </Field>
          <Field label="Group">
            <SelectButton
              label={GROUP_OPTIONS.find((o) => o.id === options.group_by)?.name || 'Week'}
              onPress={() => setGroupPickerOpen(true)}
            />
          </Field>
        </View>

        <View style={{ marginTop: 16 }}>
          <PrimaryButton onPress={run}>Run comparison</PrimaryButton>
        </View>
      </Section>

      <ChartBlock
        title="Result"
        caption={
          chartData.lines.length
            ? chartData.lines.map((l) => l.label).join('  vs  ')
            : 'Set up your series above, then run the comparison.'
        }
        height={240}>
        {resource.loading ? (
          <Empty>Loading comparison…</Empty>
        ) : chartData.rows.length ? (
          <View style={{ flex: 1 }}>
            <LineSeriesChart
              height={216}
              rows={chartData.rows}
              xKey="date"
              series={chartData.lines.map((line, i) => ({
                key: line.key,
                label: line.label,
                color: LINE_COLORS[i % LINE_COLORS.length],
              }))}
              readout={(row) => [
                shortDateLabel(row.date),
                ...chartData.lines
                  .filter((line) => row[line.key] != null)
                  .map((line) => `${line.label}: ${row[line.key]}`),
              ]}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 12, paddingTop: 4 }}>
              {chartData.lines.map((line, i) => (
                <View key={line.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }} />
                  <Text numberOfLines={1} style={{ fontSize: 11, maxWidth: 140, color: PROGRESS_MUTED }}>
                    {line.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Empty>Select a series and tap Run.</Empty>
        )}
      </ChartBlock>

      {/* Row / filter / group pickers (D4: native pickers, not custom drums). */}
      <PickerSheet
        open={!!rowPicker}
        onClose={() => setRowPicker(null)}
        title={rowPicker?.field === 'source_type' ? 'Series source' : rowPicker?.field === 'metric' ? 'Metric' : 'Choose'}
        value={pickerRow ? (pickerRow as any)[rowPicker!.field] || '' : ''}
        options={pickerOptions}
        onSelect={(v) => rowPicker && updateRow(rowPicker.uid, { [rowPicker.field]: String(v) } as Partial<CompareRow>)}
      />
      <PickerSheet
        open={!!filterPicker}
        onClose={() => setFilterPicker(null)}
        title={activeFilterDef?.label}
        value={filterPicker ? filters[filterPicker].value : ''}
        options={(activeFilterDef?.options || []).map((o) => ({ value: o.id, label: o.name }))}
        onSelect={(v) => filterPicker && setFilterValue(filterPicker, String(v))}
      />
      <PickerSheet
        open={groupPickerOpen}
        onClose={() => setGroupPickerOpen(false)}
        title="Group by"
        value={options.group_by}
        options={GROUP_OPTIONS.map((o) => ({ value: o.id, label: o.name }))}
        onSelect={(v) => setOptions((prev) => ({ ...prev, group_by: String(v) }))}
      />
      {datePicker && (
        <DateTimePicker
          value={parseDate(options[datePicker]) || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setDatePicker(null);
            if (event.type === 'set' && date) {
              const iso = toIsoDate(date);
              setOptions((prev) => ({ ...prev, [datePicker]: iso }));
            }
          }}
        />
      )}
    </View>
  );
}

function SelectButton({
  label,
  onPress,
  onClear,
  muted,
  small,
}: {
  label: string;
  onPress: () => void;
  onClear?: () => void;
  muted?: boolean;
  small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: small ? undefined : 1,
        minWidth: small ? 120 : undefined,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: PROGRESS_BORDER,
      }}>
      <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 12, color: muted ? PROGRESS_MUTED : PROGRESS_TEXT }}>
        {label}
      </Text>
      {onClear ? (
        <Pressable onPress={onClear} hitSlop={8}>
          <Text style={{ fontSize: 12, color: PROGRESS_MUTED }}>×</Text>
        </Pressable>
      ) : (
        <Text style={{ fontSize: 9, color: PROGRESS_MUTED }}>▼</Text>
      )}
    </Pressable>
  );
}

function mergeCompareSeries(series: any[]) {
  const dates = new Map<string, Record<string, any>>();
  const lines: { key: string; label: string }[] = [];
  for (const item of series) {
    const key = item.id;
    lines.push({ key, label: item.label });
    for (const point of item.points || []) {
      const row = dates.get(point.date) || { date: point.date };
      row[key] = point.value;
      dates.set(point.date, row);
    }
  }
  return { rows: [...dates.values()].sort((a, b) => a.date.localeCompare(b.date)), lines };
}

function metricLabel(metric: string) {
  if (metric === 'measurement') return 'Measurement';
  return COMPARE_METRICS.find((m) => m.key === metric)?.label || metric;
}

function sourceOptions(type: string, exercises: any[], muscles: { id: string; name: string }[]) {
  if (type === 'body_metric') return BODY_SERIES;
  if (type === 'muscle') return muscles;
  if (type === 'split') return SPLITS.map((split) => ({ id: split, name: split }));
  return exercises;
}

function compareLabel(row: CompareRow, exercises: any[], muscles: { id: string; name: string }[]) {
  const source = sourceOptions(row.source_type, exercises, muscles).find((item: any) => item.id === row.source_id);
  return `${source?.name || row.source_id} - ${metricLabel(row.metric)}`;
}

function cleanOptions(options: Record<string, string>) {
  return Object.fromEntries(Object.entries(options).filter(([, value]) => value !== ''));
}

function parseDate(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ marginBottom: 4, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: PROGRESS_MUTED }}>
        {label}
      </Text>
      {children}
    </View>
  );
}
