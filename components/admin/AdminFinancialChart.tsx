import { useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import Svg, { Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import type { AdminFinancePeriod } from '@/types/admin';

const PAD = { top: 12, right: 8, bottom: 4, left: 42 };

export type AdminFinancialChartProps = {
  /** Drive default empty bucket labels (Mon–Sun, W1–W5, months). */
  period: AdminFinancePeriod;
  labels: string[];
  income: number[];
  profit: number[];
  incomeColor: string;
  profitColor: string;
  gridColor: string;
  axisLabelColor: string;
  height?: number;
};

function compactInr(n: number): string {
  if (!Number.isFinite(n)) return '₹0';
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (a >= 1e3) return `₹${(n / 1e3).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}

/** When API returns nothing — normal grid + flat lines at ₹0 for the selected period. */
function placeholderForPeriod(period: AdminFinancePeriod): {
  labels: string[];
  income: number[];
  profit: number[];
} {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  switch (period) {
    case 'daily':
      return {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        income: Array(7).fill(0),
        profit: Array(7).fill(0),
      };
    case 'weekly':
      return {
        labels: ['W1', 'W2', 'W3', 'W4', 'W5'],
        income: Array(5).fill(0),
        profit: Array(5).fill(0),
      };
    case 'monthly':
    default:
      return {
        labels: months,
        income: Array(12).fill(0),
        profit: Array(12).fill(0),
      };
  }
}

function buildDisplaySeries(
  period: AdminFinancePeriod,
  labels: string[],
  income: number[],
  profit: number[]
): {
  lbs: string[];
  inc: number[];
  pr: number[];
  isPlaceholder: boolean;
} {
  const ni = income.length;
  const np = profit.length;
  if (ni === 0 && np === 0) {
    const ph = placeholderForPeriod(period);
    return {
      lbs: ph.labels,
      inc: ph.income,
      pr: ph.profit,
      isPlaceholder: true,
    };
  }

  const n = Math.max(ni, np, labels.length, 1);
  const inc = Array.from({ length: n }, (_, i) => (i < ni ? income[i]! : 0));
  const pr = Array.from({ length: n }, (_, i) => (i < np ? profit[i]! : 0));
  let lbs: string[];
  if (labels.length >= n) lbs = labels.slice(0, n);
  else if (labels.length > 0) {
    lbs = [
      ...labels,
      ...Array.from({ length: n - labels.length }, (_, i) => String(labels.length + i + 1)),
    ];
  } else {
    lbs = Array.from({ length: n }, (_, i) => String(i + 1));
  }
  return { lbs, inc, pr, isPlaceholder: false };
}

export function AdminFinancialChart({
  period,
  labels,
  income,
  profit,
  incomeColor,
  profitColor,
  gridColor,
  axisLabelColor,
  height = 216,
}: AdminFinancialChartProps) {
  const [width, setWidth] = useState(280);
  const onLayout = (e: LayoutChangeEvent) => {
    const nw = e.nativeEvent.layout.width;
    if (nw > 40) setWidth(nw);
  };

  const { lbs, inc, pr, isPlaceholder } = buildDisplaySeries(period, labels, income, profit);
  const n = Math.min(lbs.length, inc.length, pr.length);

  const w = width;
  const h = height;
  const innerW = w - PAD.left - PAD.right;
  const innerH = h - PAD.top - PAD.bottom;
  const maxY = Math.max(1, ...inc.slice(0, n), ...pr.slice(0, n));

  const yAt = (v: number) => PAD.top + innerH - (v / maxY) * innerH;
  const xAt = (i: number, len: number) =>
    PAD.left + (len <= 1 ? innerW / 2 : (i / (len - 1)) * innerW);

  const areaPath = (values: number[]) => {
    let d = '';
    for (let i = 0; i < values.length; i++) {
      const x = xAt(i, values.length);
      const y = yAt(values[i]);
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    const yb = PAD.top + innerH;
    d += ` L ${xAt(values.length - 1, values.length)} ${yb} L ${xAt(0, values.length)} ${yb} Z`;
    return d;
  };

  const linePath = (values: number[]) => {
    let d = '';
    for (let i = 0; i < values.length; i++) {
      const x = xAt(i, values.length);
      const y = yAt(values[i]);
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
  };

  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, t) => (maxY * (tickCount - t)) / tickCount);

  const showLbs = lbs.slice(0, n);
  const showInc = inc.slice(0, n);
  const showPr = pr.slice(0, n);

  return (
    <View onLayout={onLayout}>
      {isPlaceholder ? (
        <Text style={{ color: axisLabelColor, fontSize: 11, marginBottom: 8 }}>
          No series from API — empty chart ({period}). Switch Daily / Weekly / Monthly to refetch.
        </Text>
      ) : null}
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={incomeColor} stopOpacity={isPlaceholder ? 0.12 : 0.32} />
            <Stop offset="1" stopColor={incomeColor} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={profitColor} stopOpacity={isPlaceholder ? 0.12 : 0.32} />
            <Stop offset="1" stopColor={profitColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {ticks.map((tv, ti) => {
          const y = yAt(tv);
          return (
            <G key={ti}>
              <Line
                x1={PAD.left}
                y1={y}
                x2={w - PAD.right}
                y2={y}
                stroke={gridColor}
                strokeWidth={1}
                strokeDasharray="4,6"
              />
              <SvgText x={4} y={y + 4} fill={axisLabelColor} fontSize={10}>
                {compactInr(tv)}
              </SvgText>
            </G>
          );
        })}
        <Path d={areaPath(showPr)} fill="url(#fillProfit)" />
        <Path
          d={linePath(showPr)}
          stroke={profitColor}
          strokeWidth={isPlaceholder ? 1.25 : 2.25}
          fill="none"
          strokeLinecap="round"
          strokeOpacity={isPlaceholder ? 0.45 : 1}
        />
        <Path d={areaPath(showInc)} fill="url(#fillIncome)" />
        <Path
          d={linePath(showInc)}
          stroke={incomeColor}
          strokeWidth={isPlaceholder ? 1.25 : 2.25}
          fill="none"
          strokeLinecap="round"
          strokeOpacity={isPlaceholder ? 0.45 : 1}
        />
      </Svg>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingLeft: PAD.left,
          paddingRight: PAD.right,
          marginTop: 4,
        }}
      >
        {showLbs.map((lb, i) => (
          <Text
            key={`${lb}-${i}`}
            style={{ color: axisLabelColor, fontSize: 10, flex: 1, textAlign: 'center' }}
            numberOfLines={1}
          >
            {lb}
          </Text>
        ))}
      </View>
    </View>
  );
}
