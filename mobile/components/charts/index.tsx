// Entry point for all chart rendering. Skia's native module is not bundled in
// the store Expo Go client, so ChartKit (victory-native + Skia) is required
// lazily and only outside Expo Go; inside Expo Go every chart renders a
// dev-build notice instead, keeping the rest of Progress/Study usable there.
import { Text, View } from 'react-native';
import { isExpoGo } from '@/lib/runtime';
import { colors, monoFont } from '@/lib/theme';
import type {
  BarsChartProps,
  GroupedBarsChartProps,
  LineSeriesChartProps,
} from './ChartKit';

type Kit = typeof import('./ChartKit');

// eslint-disable-next-line @typescript-eslint/no-require-imports -- must stay lazy: ChartKit imports Skia, which crashes Expo Go at module load
const kit: Kit | null = isExpoGo ? null : require('./ChartKit');

export type { BarDatum, BarsChartProps, GroupedBarsChartProps, LineSeriesChartProps, LineSeriesDef } from './ChartKit';
export { shortDateLabel } from './format';

function DevBuildNotice({ height }: { height: number }) {
  return (
    <View
      style={{
        height,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.border,
        paddingHorizontal: 16,
      }}>
      <Text style={{ fontSize: 12, fontFamily: monoFont, color: colors.textMuted, textAlign: 'center' }}>
        Charts need the development build{'\n'}(Skia is not available in Expo Go)
      </Text>
    </View>
  );
}

export function LineSeriesChart(props: LineSeriesChartProps) {
  if (!kit) return <DevBuildNotice height={props.height} />;
  const Chart = kit.LineSeriesChart;
  return <Chart {...props} />;
}

export function BarsChart(props: BarsChartProps) {
  if (!kit) return <DevBuildNotice height={props.height} />;
  const Chart = kit.BarsChart;
  return <Chart {...props} />;
}

export function GroupedBarsChart(props: GroupedBarsChartProps) {
  if (!kit) return <DevBuildNotice height={props.height} />;
  const Chart = kit.GroupedBarsChart;
  return <Chart {...props} />;
}
