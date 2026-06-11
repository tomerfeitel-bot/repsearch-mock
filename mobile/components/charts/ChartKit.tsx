// The Victory Native XL (Skia) chart kit — the mobile equivalent of the six
// Recharts instances on web. This is the ONLY module that imports
// victory-native / @shopify/react-native-skia: Skia's native module does not
// exist inside Expo Go, so everything here must be reached through
// components/charts/index.tsx, which lazily requires this file outside Expo Go.
//
// Recharts → Victory translation notes:
// - Recharts `<Line dataKey>` rows become CartesianChart `data` + `yKeys`;
//   missing values stay null and `connectMissingData` reproduces `connectNulls`.
// - Hover tooltips become a press readout: the chart's press state is mirrored
//   into React state (one runOnJS per index change) and rendered as a bubble
//   above the plot, with Skia markers on the pressed points.
// - Per-bar `<Cell>` fills become one `Bar` per point with `barCount` pinned.
import { useEffect, useMemo, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import {
  Circle,
  DashPathEffect,
  Line as SkiaLine,
  matchFont,
  vec,
} from '@shopify/react-native-skia';
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import {
  Bar,
  BarGroup,
  CartesianChart,
  Line as ChartLine,
  Scatter,
  useChartPressState,
} from 'victory-native';
import { monoFont } from '@/lib/theme';
import { shortDateLabel } from './format';

const AXIS_LABEL_COLOR_DEFAULT = '#aab3ab';
const GRID_STROKE = 'rgba(255,255,255,0.06)';

function useAxisFont(size = 10) {
  return useMemo(
    () =>
      matchFont({
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: size,
      }),
    [size],
  );
}

/* ------------------------------------------------------------------ */
/* Press readout                                                       */
/* ------------------------------------------------------------------ */

// Mirrors the victory press state's matched index into React state so callers
// can render row-level readouts (the web tooltips) with plain RN views.
function usePressedIndex(state: any, enabled: boolean) {
  const [index, setIndex] = useState<number | null>(null);
  useAnimatedReaction(
    () => (state.isActive.value ? state.matchedIndex.value : -1),
    (current, previous) => {
      if (current !== previous) runOnJS(setIndex)(current < 0 ? null : current);
    },
  );
  useEffect(() => {
    if (!enabled && index !== null) setIndex(null);
  }, [enabled, index]);
  return enabled ? index : null;
}

function ReadoutBubble({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 4,
        left: 4,
        zIndex: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#363c37',
        backgroundColor: 'rgba(13,15,14,0.94)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        maxWidth: '92%',
      }}>
      {lines.map((line, i) => (
        <Text
          key={i}
          numberOfLines={1}
          style={{ fontSize: 11, fontFamily: monoFont, color: i === 0 ? '#f3f5f1' : '#aab3ab' }}>
          {line}
        </Text>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Line charts                                                         */
/* ------------------------------------------------------------------ */

export type LineSeriesDef = { key: string; label: string; color: string; rightAxis?: boolean };

export type LineSeriesChartProps = {
  rows: Record<string, any>[];
  xKey?: string;
  series: LineSeriesDef[];
  height: number;
  // Extra y-domain padding in data units (the web's domain={['dataMin - 1', 'dataMax + 1']}).
  yPad?: number;
  showDots?: boolean;
  formatXLabel?: (label: any) => string;
  // Readout lines for the pressed row; defaults to "x" + one line per series.
  readout?: (row: Record<string, any>) => string[];
  axisLabelColor?: string;
};

export function LineSeriesChart(props: LineSeriesChartProps) {
  // Remount when the series shape changes — the press state's y-record is
  // fixed at mount (CompareTab swaps series_0..n between runs).
  const seriesKey = props.series.map((s) => s.key).join('|');
  return <LineSeriesChartInner key={seriesKey} {...props} />;
}

function LineSeriesChartInner({
  rows,
  xKey = 'date',
  series,
  height,
  yPad,
  showDots = true,
  formatXLabel,
  readout,
  axisLabelColor = AXIS_LABEL_COLOR_DEFAULT,
}: LineSeriesChartProps) {
  const font = useAxisFont();
  const yKeys = useMemo(() => series.map((s) => s.key), [series]);
  const pressInit = useMemo(() => {
    const y: Record<string, number> = {};
    for (const k of yKeys) y[k] = 0;
    return { x: '' as string | number, y };
  }, [yKeys]);
  const { state: pressState, isActive } = useChartPressState(pressInit as any);
  const pressedIndex = usePressedIndex(pressState, true);

  // Press readouts re-render this component per matched index while dragging,
  // so keep the row scans (domain min/max) off that path.
  const yAxes: any[] = useMemo(() => {
    const leftKeys = series.filter((s) => !s.rightAxis).map((s) => s.key);
    const rightKeys = series.filter((s) => s.rightAxis).map((s) => s.key);

    const domainFor = (keys: string[]) => {
      if (yPad == null || !keys.length) return undefined;
      let min = Infinity;
      let max = -Infinity;
      for (const row of rows) {
        for (const k of keys) {
          const v = row[k];
          if (typeof v === 'number' && Number.isFinite(v)) {
            if (v < min) min = v;
            if (v > max) max = v;
          }
        }
      }
      if (!Number.isFinite(min) || !Number.isFinite(max)) return undefined;
      return [min - yPad, max + yPad] as [number, number];
    };

    const axes: any[] = [
      {
        yKeys: leftKeys.length ? leftKeys : yKeys,
        font,
        labelColor: axisLabelColor,
        lineColor: GRID_STROKE,
        axisSide: 'left',
        tickCount: 4,
        domain: domainFor(leftKeys.length ? leftKeys : yKeys),
      },
    ];
    if (rightKeys.length) {
      axes.push({
        yKeys: rightKeys,
        font,
        labelColor: axisLabelColor,
        lineColor: 'transparent',
        axisSide: 'right',
        tickCount: 4,
        domain: domainFor(rightKeys),
      });
    }
    return axes;
  }, [series, yKeys, rows, yPad, font, axisLabelColor]);

  const pressedRow = pressedIndex != null ? rows[pressedIndex] : null;
  const readoutLines = pressedRow
    ? readout
      ? readout(pressedRow)
      : [
          String(pressedRow[xKey] ?? ''),
          ...series
            .filter((s) => pressedRow[s.key] != null)
            .map((s) => `${s.label}: ${pressedRow[s.key]}`),
        ]
    : [];

  if (!rows.length) return <View style={{ height }} />;

  return (
    <View style={{ height, width: '100%' }}>
      <ReadoutBubble lines={readoutLines} />
      <CartesianChart
        data={rows as any}
        xKey={xKey as never}
        yKeys={yKeys as never[]}
        padding={{ top: 12, bottom: 0, left: 0, right: showDots ? 6 : 0 }}
        domainPadding={{ left: 8, right: 8, top: 8 }}
        chartPressState={pressState as any}
        xAxis={{
          font,
          labelColor: axisLabelColor,
          lineColor: 'transparent',
          tickCount: Math.min(5, rows.length),
          formatXLabel: (formatXLabel || shortDateLabel) as any,
        }}
        yAxis={yAxes}>
        {({ points }: any) => (
          <>
            {series.map((s) => (
              <ChartLine
                key={s.key}
                points={points[s.key]}
                color={s.color}
                strokeWidth={2.5}
                curveType="monotoneX"
                connectMissingData
              />
            ))}
            {showDots &&
              series.map((s) =>
                rows.length <= 40 ? (
                  <Scatter key={`${s.key}-dots`} points={points[s.key]} radius={3} color={s.color} />
                ) : null,
              )}
            {isActive &&
              series.map((s) => (
                <Circle
                  key={`${s.key}-press`}
                  cx={pressState.x.position}
                  cy={(pressState.y as any)[s.key].position}
                  r={5}
                  color={s.color}
                />
              ))}
          </>
        )}
      </CartesianChart>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Bar charts                                                          */
/* ------------------------------------------------------------------ */

export type BarDatum = {
  label: string;
  value: number | null;
  color?: string;
  opacity?: number;
  // Symmetric error in data units (the web RelationshipDetail's ErrorBar).
  error?: number | null;
};

export type BarsChartProps = {
  data: BarDatum[];
  height: number;
  color?: string;
  errorColor?: string;
  formatXLabel?: (label: any) => string;
  readout?: (d: BarDatum) => string[];
  axisLabelColor?: string;
};

export function BarsChart(props: BarsChartProps) {
  return <BarsChartInner key={String(props.data.length)} {...props} />;
}

function BarsChartInner({
  data,
  height,
  color = '#6fcab8',
  errorColor = '#aab3ab',
  formatXLabel,
  readout,
  axisLabelColor = AXIS_LABEL_COLOR_DEFAULT,
}: BarsChartProps) {
  const font = useAxisFont();
  const rows = useMemo(() => data.map((d) => ({ x: d.label, y: d.value })), [data]);
  const hasErrors = data.some((d) => d.error != null && d.value != null);
  const { state: pressState } = useChartPressState({ x: '', y: { y: 0 } });
  const pressedIndex = usePressedIndex(pressState, true);
  const pressed = pressedIndex != null ? data[pressedIndex] : null;
  const readoutLines = pressed
    ? readout
      ? readout(pressed)
      : [pressed.label, pressed.value != null ? String(pressed.value) : '—']
    : [];

  if (!data.length) return <View style={{ height }} />;

  return (
    <View style={{ height, width: '100%' }}>
      <ReadoutBubble lines={readoutLines} />
      <CartesianChart
        data={rows as any}
        xKey={'x' as never}
        yKeys={['y'] as never[]}
        padding={{ top: 12, bottom: 0, left: 0, right: 0 }}
        domainPadding={{ left: 24, right: 24, top: hasErrors ? 18 : 8 }}
        domain={{ y: [Math.min(0, ...data.map((d) => d.value ?? 0))] as [number] }}
        chartPressState={pressState as any}
        xAxis={{
          font,
          labelColor: axisLabelColor,
          lineColor: 'transparent',
          tickCount: data.length,
          formatXLabel: (formatXLabel || ((l: any) => String(l))) as any,
        }}
        yAxis={[{ font, labelColor: axisLabelColor, lineColor: GRID_STROKE, tickCount: 4 }]}>
        {({ points, chartBounds, yScale }: any) => (
          <>
            {data.map((d, i) => (
              <Bar
                key={i}
                points={[points.y[i]]}
                chartBounds={chartBounds}
                barCount={data.length}
                innerPadding={0.35}
                roundedCorners={{ topLeft: 4, topRight: 4 }}
                color={d.color || color}
                opacity={d.opacity ?? 1}
              />
            ))}
            {hasErrors &&
              data.map((d, i) => {
                if (d.error == null || d.value == null) return null;
                const px = points.y[i]?.x;
                if (px == null) return null;
                const yTop = yScale(d.value + d.error);
                const yBottom = yScale(d.value - d.error);
                return (
                  <ErrorWhisker key={`err-${i}`} x={px} yTop={yTop} yBottom={yBottom} color={errorColor} />
                );
              })}
          </>
        )}
      </CartesianChart>
    </View>
  );
}

function ErrorWhisker({ x, yTop, yBottom, color }: { x: number; yTop: number; yBottom: number; color: string }) {
  const cap = 4;
  return (
    <>
      <SkiaLine p1={vec(x, yTop)} p2={vec(x, yBottom)} color={color} strokeWidth={1.5} />
      <SkiaLine p1={vec(x - cap, yTop)} p2={vec(x + cap, yTop)} color={color} strokeWidth={1.5} />
      <SkiaLine p1={vec(x - cap, yBottom)} p2={vec(x + cap, yBottom)} color={color} strokeWidth={1.5} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Grouped bars (cohort compare)                                       */
/* ------------------------------------------------------------------ */

export type GroupedBarsChartProps = {
  data: { label: string; a: number | null; b: number | null }[];
  height: number;
  aColor: string;
  bColor: string;
  // Bucket label (string) to mark with a dashed vertical reference line — the
  // web CompareResultChart's "your bucket" ReferenceLine.
  referenceLabel?: string | null;
  referenceColor?: string;
  formatXLabel?: (label: any) => string;
  readout?: (d: { label: string; a: number | null; b: number | null }) => string[];
  axisLabelColor?: string;
};

export function GroupedBarsChart(props: GroupedBarsChartProps) {
  return <GroupedBarsChartInner key={String(props.data.length)} {...props} />;
}

function GroupedBarsChartInner({
  data,
  height,
  aColor,
  bColor,
  referenceLabel,
  referenceColor = '#f3f5f1',
  formatXLabel,
  readout,
  axisLabelColor = AXIS_LABEL_COLOR_DEFAULT,
}: GroupedBarsChartProps) {
  const font = useAxisFont();
  const rows = useMemo(() => data.map((d) => ({ x: d.label, a: d.a, b: d.b })), [data]);
  const { state: pressState } = useChartPressState({ x: '', y: { a: 0, b: 0 } });
  const pressedIndex = usePressedIndex(pressState, true);
  const pressed = pressedIndex != null ? data[pressedIndex] : null;
  const readoutLines = pressed
    ? readout
      ? readout(pressed)
      : [pressed.label, `A: ${pressed.a ?? '—'}`, `B: ${pressed.b ?? '—'}`]
    : [];
  const referenceIndex = referenceLabel != null ? data.findIndex((d) => d.label === referenceLabel) : -1;

  if (!data.length) return <View style={{ height }} />;

  return (
    <View style={{ height, width: '100%' }}>
      <ReadoutBubble lines={readoutLines} />
      <CartesianChart
        data={rows as any}
        xKey={'x' as never}
        yKeys={['a', 'b'] as never[]}
        padding={{ top: 12, bottom: 0, left: 0, right: 0 }}
        domainPadding={{ left: 28, right: 28, top: 8 }}
        domain={{ y: [Math.min(0, ...data.flatMap((d) => [d.a ?? 0, d.b ?? 0]))] as [number] }}
        chartPressState={pressState as any}
        xAxis={{
          font,
          labelColor: axisLabelColor,
          lineColor: 'transparent',
          tickCount: data.length,
          formatXLabel: (formatXLabel || ((l: any) => String(l))) as any,
        }}
        yAxis={[{ font, labelColor: axisLabelColor, lineColor: GRID_STROKE, tickCount: 4 }]}>
        {({ points, chartBounds }: any) => (
          <>
            <BarGroup
              chartBounds={chartBounds}
              betweenGroupPadding={0.35}
              withinGroupPadding={0.12}
              roundedCorners={{ topLeft: 3, topRight: 3 }}>
              <BarGroup.Bar points={points.a} color={aColor} />
              <BarGroup.Bar points={points.b} color={bColor} />
            </BarGroup>
            {referenceIndex >= 0 && points.a[referenceIndex] != null && (
              <SkiaLine
                p1={vec(points.a[referenceIndex].x, chartBounds.top)}
                p2={vec(points.a[referenceIndex].x, chartBounds.bottom)}
                color={referenceColor}
                strokeWidth={1}>
                <DashPathEffect intervals={[2, 3]} />
              </SkiaLine>
            )}
          </>
        )}
      </CartesianChart>
    </View>
  );
}
