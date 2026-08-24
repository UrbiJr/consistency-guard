"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PROFITABLE_DAY_MIN, type Analysis } from "@/lib/analyze";
import { toneForValue } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("mt-1 font-mono text-xl tabular-nums", tone)}>{value}</p>
        {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function MetricStrip({ analysis }: { analysis: Analysis }) {
  const { t, f } = useI18n();
  const m = t.metrics;
  const { netProfit, options } = analysis;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Metric
        label={m.netProfit}
        value={f.signedUsd(netProfit)}
        hint={m.ofInitial(f.pct(netProfit / options.initialBalance, 2))}
        tone={toneForValue(netProfit)}
      />
      <Metric
        label={m.consistency}
        value={f.pct(analysis.consistencyScore)}
        hint={m.consistencyHint}
      />
      <Metric
        label={m.trades}
        value={String(analysis.trades.length)}
        hint={m.tradesHint(analysis.winCount, analysis.lossCount, analysis.ideas.length)}
      />
      <Metric
        label={m.winRate}
        value={f.pct(analysis.winRate)}
        hint={
          analysis.profitFactor !== null
            ? m.profitFactor(f.num(analysis.profitFactor, 2))
            : undefined
        }
      />
      <Metric
        label={m.qualifyingDays}
        value={String(analysis.qualifyingDays)}
        hint={m.qualifyingHint(
          f.usd(options.initialBalance * PROFITABLE_DAY_MIN),
          analysis.days.length,
        )}
      />
      <Metric
        label={m.peakMargin}
        value={f.pct(analysis.peakConcurrentMargin)}
        hint={m.peakMarginHint}
      />
    </div>
  );
}
