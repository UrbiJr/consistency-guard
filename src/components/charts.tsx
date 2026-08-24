"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PROFITABLE_DAY_MIN, type Analysis } from "@/lib/analyze";
import { useI18n } from "@/lib/i18n";

const axisStyle = { fontSize: 11, fill: "var(--muted-foreground)" };

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  fontSize: "12px",
  color: "var(--popover-foreground)",
};

export function Charts({ analysis }: { analysis: Analysis }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <EquityChart analysis={analysis} />
      <DailyChart analysis={analysis} />
    </div>
  );
}

function EquityChart({ analysis }: { analysis: Analysis }) {
  const { t, f } = useI18n();
  const c = t.charts;
  const data = analysis.equityCurve;
  const values = data.map((d) => d.balance);
  const min = Math.min(...values, analysis.options.initialBalance);
  const max = Math.max(...values, analysis.options.initialBalance);
  const padding = Math.max((max - min) * 0.15, 200);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{c.equityTitle}</CardTitle>
        <CardDescription className="text-xs">
          {c.equityDesc(f.usd(analysis.maxDrawdown))}
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-0">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="index"
              tick={axisStyle}
              stroke="var(--border)"
              tickLine={false}
              label={{
                value: c.closedTrades,
                position: "insideBottom",
                offset: -2,
                style: axisStyle,
              }}
            />
            <YAxis
              domain={[min - padding, max + padding]}
              tick={axisStyle}
              stroke="var(--border)"
              tickLine={false}
              width={70}
              tickFormatter={(value: number) => f.usd(value)}
            />
            <ReferenceLine
              y={analysis.options.initialBalance}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [f.usd(Number(value), 2), c.balance]}
              labelFormatter={(label) => {
                const index = Number(label);
                return index === 0 ? c.start : c.afterTrade(index, data[index]?.label ?? "");
              }}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#equityFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function DailyChart({ analysis }: { analysis: Analysis }) {
  const { t, f } = useI18n();
  const c = t.charts;
  const data = analysis.days.map((day) => ({
    key: day.key.slice(5),
    netProfit: day.netProfit,
  }));
  const qualifying = analysis.options.initialBalance * PROFITABLE_DAY_MIN;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{c.dailyTitle}</CardTitle>
        <CardDescription className="text-xs">{c.dailyDesc(f.usd(qualifying))}</CardDescription>
      </CardHeader>
      <CardContent className="pl-0">
        {data.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">{c.noDates}</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="key" tick={axisStyle} stroke="var(--border)" tickLine={false} />
              <YAxis
                tick={axisStyle}
                stroke="var(--border)"
                tickLine={false}
                width={70}
                tickFormatter={(value: number) => f.usd(value)}
              />
              <ReferenceLine y={0} stroke="var(--border)" />
              <ReferenceLine
                y={qualifying}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [f.signedUsd(Number(value), 2), c.net]}
              />
              <Bar dataKey="netProfit" radius={[3, 3, 0, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.key}
                    fill={entry.netProfit >= 0 ? "var(--color-positive)" : "var(--color-negative)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
