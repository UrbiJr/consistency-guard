"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildPlan, type Analysis } from "@/lib/analyze";
import { useI18n } from "@/lib/i18n";
import {
  CONSISTENCY_EXCELLENT,
  ON_DEMAND_CONSISTENCY_LIMIT,
  SPECULATIVE_CONCENTRATION_LIMIT,
} from "@/lib/rules";

const GOLD_LOT_SIZES = [0.25, 0.5, 1];

export function Planner({ analysis }: { analysis: Analysis }) {
  const { t, f } = useI18n();
  const p = t.planner;

  const suggestedTarget = Math.max(
    analysis.options.initialBalance * 0.03,
    Math.ceil(analysis.netProfit / 500) * 500,
  );
  const [target, setTarget] = useState(suggestedTarget);
  const [threshold, setThreshold] = useState<number>(ON_DEMAND_CONSISTENCY_LIMIT);

  const plan = useMemo(() => buildPlan(analysis, target), [analysis, target]);

  const capPerWin = target * threshold;
  const minWinners = Math.ceil(1 / threshold);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{p.title}</CardTitle>
        <CardDescription>{p.desc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="target-profit">{p.targetLabel}</Label>
            <Input
              id="target-profit"
              type="number"
              min={0}
              step={250}
              value={target}
              onChange={(event) => setTarget(Math.max(0, Number(event.target.value) || 0))}
            />
            <p className="text-xs text-muted-foreground">
              {p.targetHint(f.pct(target / analysis.options.initialBalance, 2))}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="threshold">{p.ratioLabel}</Label>
            <select
              id="threshold"
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value))}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              <option value={SPECULATIVE_CONCENTRATION_LIMIT}>{p.thresholds.speculative}</option>
              <option value={ON_DEMAND_CONSISTENCY_LIMIT}>{p.thresholds.onDemand}</option>
              <option value={CONSISTENCY_EXCELLENT}>{p.thresholds.excellent}</option>
            </select>
            <p className="text-xs text-muted-foreground">{p.ratioHint}</p>
          </div>
        </div>

        <div className="grid gap-4 rounded-lg border bg-muted/40 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">{p.capLabel}</p>
            <p className="mt-1 font-mono text-2xl tabular-nums text-primary">{f.usd(capPerWin)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{p.minWinners}</p>
            <p className="mt-1 font-mono text-2xl tabular-nums">{minWinners}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{p.spreadLabel}</p>
            <p className="mt-1 font-mono text-2xl tabular-nums">{p.days(minWinners)}</p>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground sm:col-span-3">
            {p.capNote}
          </p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">{p.goldTitle}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {GOLD_LOT_SIZES.map((lots) => (
              <div key={lots} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{p.goldLot(f.num(lots))}</p>
                <p className="mt-1 font-mono text-lg tabular-nums">
                  {f.num(capPerWin / (100 * lots), 2)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {p.goldMove(
                    f.pct((lots * 4000 * 100) / 10 / analysis.options.initialBalance, 0),
                  )}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{p.goldNote}</p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">{p.tableTitle}</p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{p.colRatio}</TableHead>
                  <TableHead className="text-right">{p.colRequired}</TableHead>
                  <TableHead className="text-right">{p.colRemaining}</TableHead>
                  <TableHead className="text-right">{p.colCap}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">{p.thresholds[row.id]}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {f.usd(row.requiredTotalProfit)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {row.additionalProfitNeeded > 0 ? f.usd(row.additionalProfitNeeded) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {f.usd(row.maxSingleWinAtTarget)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {p.tableNote(
              f.usd(
                Math.max(analysis.concentration.idea.peak, analysis.concentration.day.peak),
              ),
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
