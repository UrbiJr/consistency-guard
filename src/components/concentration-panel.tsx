"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Analysis, ConcentrationMetric } from "@/lib/analyze";
import type { Formatters } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import {
  CONSISTENCY_EXCELLENT,
  ON_DEMAND_CONSISTENCY_LIMIT,
  SPECULATIVE_CONCENTRATION_LIMIT,
} from "@/lib/rules";
import { cn } from "@/lib/utils";

const MARKERS = [CONSISTENCY_EXCELLENT, ON_DEMAND_CONSISTENCY_LIMIT, SPECULATIVE_CONCENTRATION_LIMIT];
const SCALE_MAX = 1.2;

function ThresholdBar({ value }: { value: number | null }) {
  if (value === null) {
    return <div className="h-2.5 w-full rounded-full bg-muted" />;
  }

  const width = (Math.min(value, SCALE_MAX) / SCALE_MAX) * 100;
  const tone =
    value > SPECULATIVE_CONCENTRATION_LIMIT
      ? "bg-negative"
      : value > ON_DEMAND_CONSISTENCY_LIMIT
        ? "bg-caution"
        : "bg-positive";

  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${width}%` }} />
      {MARKERS.map((marker) => (
        <span
          key={marker}
          className="absolute top-0 h-full w-px bg-background/80"
          style={{ left: `${(marker / SCALE_MAX) * 100}%` }}
          aria-hidden
        />
      ))}
    </div>
  );
}

function MetricRow({
  metric,
  label,
  ofNet,
  ofGross,
  peakLabel,
  f,
}: {
  metric: ConcentrationMetric;
  label: string;
  ofNet: string;
  ofGross: string;
  peakLabel: string;
  f: Formatters;
}) {
  return (
    <div className="space-y-2 border-t py-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{metric.peakLabel}</p>
        </div>
        <div className="flex items-baseline gap-4 text-right">
          <div>
            <p className="font-mono text-lg leading-none tabular-nums">
              {f.pct(metric.shareOfNet)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{ofNet}</p>
          </div>
          <div>
            <p className="font-mono text-lg leading-none tabular-nums text-muted-foreground">
              {f.pct(metric.shareOfGross)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{ofGross}</p>
          </div>
        </div>
      </div>
      <ThresholdBar value={metric.shareOfNet} />
      <p className="text-xs text-muted-foreground">{peakLabel}</p>
    </div>
  );
}

export function ConcentrationPanel({ analysis }: { analysis: Analysis }) {
  const { t, f } = useI18n();
  const c = t.concentration;
  const { concentration } = analysis;

  const rows: { metric: ConcentrationMetric; label: string }[] = [
    { metric: concentration.trade, label: c.largestTrade },
    { metric: concentration.idea, label: c.largestIdea },
    { metric: concentration.day, label: c.biggestDay },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{c.title}</CardTitle>
        <CardDescription>{c.desc}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.map((row) => (
          <MetricRow
            key={row.label}
            metric={row.metric}
            label={row.label}
            ofNet={c.ofNet}
            ofGross={c.ofGross}
            peakLabel={c.peakValue(f.usd(row.metric.peak))}
            f={f}
          />
        ))}

        <div className="mt-2 grid gap-3 rounded-lg border bg-muted/40 p-4 text-xs sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">{c.netLabel}</p>
            <p className="mt-1 font-mono text-sm tabular-nums">{f.usd(analysis.netProfit)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{c.grossLabel}</p>
            <p className="mt-1 font-mono text-sm tabular-nums">{f.usd(analysis.grossProfit)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{c.lossLabel}</p>
            <p className="mt-1 font-mono text-sm tabular-nums">{f.usd(analysis.grossLoss)}</p>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{c.footnote}</p>
      </CardContent>
    </Card>
  );
}
