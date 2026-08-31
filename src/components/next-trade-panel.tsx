"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, CircleAlert, Crosshair, RotateCcw, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Analysis } from "@/lib/analyze";
import { useI18n } from "@/lib/i18n";
import {
  planNextTrade,
  planRespectsLimits,
  planSeverity,
  priceDecimals,
  type Direction,
  type LimitCheck,
} from "@/lib/next-trade";
import {
  CONSISTENCY_EXCELLENT,
  MAX_MARGIN_UTILISATION,
  ON_DEMAND_CONSISTENCY_LIMIT,
  PCP_MAX_MARGIN_UTILISATION,
  SPECULATIVE_CONCENTRATION_LIMIT,
} from "@/lib/rules";
import { SEVERITY_STYLES } from "@/lib/severity";
import { cn } from "@/lib/utils";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

const RISK_CHOICES = [0.0025, 0.005, 0.0075, 0.01, 0.015, 0.02];

function lastPriceFor(analysis: Analysis, symbol: string): number | null {
  const matches = analysis.trades
    .filter((t) => t.symbol.toUpperCase() === symbol.toUpperCase())
    .filter((t) => t.closePrice !== null || t.openPrice !== null);
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1];
  return last.closePrice ?? last.openPrice ?? null;
}

function fallbackEntry(symbol: string): number {
  return /XAU/i.test(symbol) ? 4670 : 4000;
}

function defaultSymbol(analysis: Analysis): string {
  const counts = new Map<string, number>();
  for (const trade of analysis.trades) {
    const key = trade.symbol.toUpperCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best = "XAUUSD";
  let bestCount = 0;
  for (const [symbol, count] of counts) {
    if (count > bestCount) {
      best = symbol;
      bestCount = count;
    }
  }
  return best;
}

function Level({
  label,
  price,
  detail,
  tone,
  icon,
}: {
  label: string;
  price: string;
  detail: string;
  tone?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-background/60 p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className={cn("mt-1 font-mono text-xl tabular-nums", tone)}>{price}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}

export function NextTradePanel({ analysis }: { analysis: Analysis }) {
  const { t, f } = useI18n();
  const nt = t.nextTrade;

  const symbols = useMemo(
    () => [...new Set(analysis.trades.map((trade) => trade.symbol.toUpperCase()))],
    [analysis.trades],
  );

  const [symbol, setSymbol] = useState(() => defaultSymbol(analysis));
  const [direction, setDirection] = useState<Direction>("buy");
  const [lots, setLots] = useState(0.5);
  const [riskFraction, setRiskFraction] = useState(0.005);
  const [threshold, setThreshold] = useState(ON_DEMAND_CONSISTENCY_LIMIT);
  const [profitBookedToday, setProfitBookedToday] = useState(0);
  const [marginCeiling, setMarginCeiling] = useState(
    analysis.options.riskLimit <= 0.01 ? PCP_MAX_MARGIN_UTILISATION : 0.5,
  );

  const [entryOverride, setEntryOverride] = useState<number | null>(null);
  const [stopOverride, setStopOverride] = useState<number | null>(null);
  const [targetOverride, setTargetOverride] = useState<number | null>(null);
  const entryPrice = entryOverride ?? lastPriceFor(analysis, symbol) ?? fallbackEntry(symbol);

  const plan = useMemo(
    () =>
      planNextTrade(analysis, {
        symbol,
        direction,
        entryPrice,
        lots,
        riskFraction,
        threshold,
        profitBookedToday,
        marginCeiling,
        stopPrice: stopOverride,
        targetPrice: targetOverride,
      }),
    [
      analysis,
      symbol,
      direction,
      entryPrice,
      lots,
      riskFraction,
      threshold,
      profitBookedToday,
      marginCeiling,
      stopOverride,
      targetOverride,
    ],
  );

  const decimals = priceDecimals(symbol, entryPrice);
  const severity = planSeverity(plan);
  const style = SEVERITY_STYLES[severity];

  const issueText = (issue: (typeof plan.issues)[number]): string => {
    const v = issue.values ?? {};
    switch (issue.id) {
      case "unknownSymbol":
        return nt.issues.unknownSymbol;
      case "riskOverHardCap":
        return nt.issues.riskOverHardCap(f.usd(v.riskUsd), f.usd(v.hardRiskCapUsd));
      case "marginOverCeiling":
        return nt.issues.marginOverCeiling(f.pct(v.marginFraction), f.pct(v.ceiling, 0));
      case "marginOverHardLimit":
        return nt.issues.marginOverHardLimit(f.pct(v.marginFraction), f.pct(v.limit, 0));
      case "noProfitYet":
        return nt.issues.noProfitYet(v.minWinners ?? 0);
      case "dayCapUsedUp":
        return nt.issues.dayCapUsedUp(f.usd(v.bookedToday));
      case "windowEmpty":
        return nt.issues.windowEmpty(v.tradesNeeded ?? 0, f.usd(v.targetProfit));
      case "mustExceedMinimum":
        return nt.issues.mustExceedMinimum(f.usd(v.minProfit));
      case "targetBelowRisk":
        return nt.issues.targetBelowRisk(f.usd(v.targetProfit), f.usd(v.riskUsd));
      case "targetOverWindow":
        return nt.issues.targetOverWindow(f.usd(v.targetProfit), f.usd(v.maxProfit));
      case "stopWrongSide":
        return nt.issues.stopWrongSide;
      case "targetWrongSide":
        return nt.issues.targetWrongSide;
      case "stopTooTight":
        return nt.issues.stopTooTight;
      case "riskOverWorkingBudget":
        return nt.issues.riskOverWorkingBudget(f.usd(v.riskUsd), f.usd(v.workingRiskUsd));
      case "splitEntriesShareCap":
        return nt.issues.splitEntriesShareCap;
      case "lossErodesRatio":
        return nt.issues.lossErodesRatio(f.usd(v.headroom));
    }
  };

  const checkText = (item: LimitCheck): string => {
    const v = item.values ?? {};
    const c = nt.checks;
    switch (item.id) {
      case "stopSide":
        return item.pass ? c.stopSide.pass : c.stopSide.fail;
      case "targetSide":
        return item.pass ? c.targetSide.pass : c.targetSide.fail;
      case "riskHardCap":
        return (item.pass ? c.riskHardCap.pass : c.riskHardCap.fail)(
          f.usd(v.riskUsd),
          f.usd(v.hardRiskCapUsd),
        );
      case "riskWorking":
        return (item.pass ? c.riskWorking.pass : c.riskWorking.fail)(
          f.usd(v.riskUsd),
          f.usd(v.workingRiskUsd),
        );
      case "marginHard":
        return (item.pass ? c.marginHard.pass : c.marginHard.fail)(
          f.pct(v.marginFraction),
          f.pct(v.limit, 0),
        );
      case "marginWorking":
        return (item.pass ? c.marginWorking.pass : c.marginWorking.fail)(
          f.pct(v.marginFraction),
          f.pct(v.ceiling, 0),
        );
      case "targetMax":
        if (item.severity === "unknown") return c.targetMax.unknown;
        return (item.pass ? c.targetMax.pass : c.targetMax.fail)(
          f.usd(v.targetProfit),
          f.usd(v.maxProfit),
        );
      case "targetMin":
        if (item.severity === "unknown") return c.targetMin.unknown;
        return (item.pass ? c.targetMin.pass : c.targetMin.fail)(f.usd(v.minProfit));
      case "rewardRisk":
        if (item.severity === "unknown") return c.rewardRisk.unknown;
        return (item.pass ? c.rewardRisk.pass : c.rewardRisk.fail)(f.num(plan.rewardRisk ?? 0, 2));
    }
  };

  const limitsOk = planRespectsLimits(plan);
  const stopInvalid = plan.checks.some(
    (item) => (item.id === "stopSide" || item.id === "riskHardCap") && !item.pass,
  );
  const targetInvalid = plan.checks.some(
    (item) =>
      (item.id === "targetSide" || item.id === "targetMax") &&
      !item.pass &&
      item.severity !== "unknown",
  );

  const readPrice = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : null;
  };

  const headroom = (value: number | null) =>
    value === null ? "—" : value > 0 ? f.usd(value) : nt.headroomBreached;

  const windowLabel =
    plan.maxProfit === null
      ? nt.windowUndefined
      : plan.windowOpen
        ? nt.windowRange(f.usd(Math.max(plan.minProfit, 0)), f.usd(plan.maxProfit))
        : nt.windowClosedShort;

  return (
    <Card id="next-order">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crosshair className="size-4 text-primary" aria-hidden />
              {nt.title}
            </CardTitle>
            <CardDescription className="mt-1.5">{nt.desc}</CardDescription>
          </div>
          <Badge className={cn("shrink-0 border", style.badge)}>
            {t.severity[severity]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="nt-symbol">{nt.symbol}</Label>
            <Input
              id="nt-symbol"
              list="nt-symbol-options"
              value={symbol}
              onChange={(event) => {
                setSymbol(event.target.value.toUpperCase());
                setEntryOverride(null);
                setStopOverride(null);
                setTargetOverride(null);
              }}
            />
            <datalist id="nt-symbol-options">
              {symbols.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nt-direction">{nt.direction}</Label>
            <select
              id="nt-direction"
              className={selectClass}
              value={direction}
              onChange={(event) => {
                setDirection(event.target.value as Direction);
                setStopOverride(null);
                setTargetOverride(null);
              }}
            >
              <option value="buy">{nt.buy}</option>
              <option value="sell">{nt.sell}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nt-entry">{nt.entryLevel}</Label>
            <Input
              id="nt-entry"
              type="number"
              step="any"
              min={0}
              value={entryPrice}
              onChange={(event) =>
                setEntryOverride(Math.max(0, Number(event.target.value) || 0))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nt-stop">{nt.stopLevel}</Label>
            <Input
              id="nt-stop"
              type="number"
              step="any"
              min={0}
              value={stopOverride ?? plan.suggestedStopPrice ?? ""}
              aria-invalid={stopInvalid}
              aria-describedby="nt-limits"
              onChange={(event) => setStopOverride(readPrice(event.target.value))}
            />
            {plan.suggestedStopPrice !== null ? (
              <p className="text-xs text-muted-foreground">
                {nt.distance(f.num(Math.abs((stopOverride ?? plan.suggestedStopPrice) - entryPrice), decimals))}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nt-target">{nt.targetLevel}</Label>
            <Input
              id="nt-target"
              type="number"
              step="any"
              min={0}
              value={targetOverride ?? plan.suggestedTargetPrice ?? ""}
              aria-invalid={targetInvalid}
              aria-describedby="nt-limits"
              onChange={(event) => setTargetOverride(readPrice(event.target.value))}
            />
            {plan.maxProfitPrice !== null ? (
              <p className="text-xs text-muted-foreground">
                {nt.maxTargetLevel}: {f.num(plan.maxProfitPrice, decimals)}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nt-lots">{nt.lots}</Label>
            <Input
              id="nt-lots"
              type="number"
              step={0.01}
              min={0.01}
              value={lots}
              onChange={(event) => setLots(Math.max(0.01, Number(event.target.value) || 0.01))}
            />
            {plan.maxLotsByMargin !== null ? (
              <p className="text-xs text-muted-foreground">
                {nt.lotsHint(f.num(plan.maxLotsByMargin), f.pct(marginCeiling, 0))}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nt-risk">{nt.risk}</Label>
            <select
              id="nt-risk"
              className={selectClass}
              value={riskFraction}
              onChange={(event) => setRiskFraction(Number(event.target.value))}
            >
              {RISK_CHOICES.map((choice) => (
                <option key={choice} value={choice}>
                  {f.pct(choice, 2)}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {nt.riskHint(f.usd(plan.riskUsd), f.usd(plan.workingRiskUsd))}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nt-threshold">{nt.threshold}</Label>
            <select
              id="nt-threshold"
              className={selectClass}
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value))}
            >
              <option value={SPECULATIVE_CONCENTRATION_LIMIT}>
                {t.planner.thresholds.speculative}
              </option>
              <option value={ON_DEMAND_CONSISTENCY_LIMIT}>{t.planner.thresholds.onDemand}</option>
              <option value={CONSISTENCY_EXCELLENT}>{t.planner.thresholds.excellent}</option>
            </select>
            <p className="text-xs text-muted-foreground">
              {plan.thresholdBinds
                ? nt.thresholdBinding
                : nt.thresholdNotBinding(plan.minWinnersFromScratch)}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nt-margin">{nt.marginCeiling}</Label>
            <select
              id="nt-margin"
              className={selectClass}
              value={marginCeiling}
              onChange={(event) => setMarginCeiling(Number(event.target.value))}
            >
              <option value={PCP_MAX_MARGIN_UTILISATION}>
                {f.pct(PCP_MAX_MARGIN_UTILISATION, 0)}
              </option>
              <option value={0.5}>{f.pct(0.5, 0)}</option>
              <option value={MAX_MARGIN_UTILISATION}>
                {f.pct(MAX_MARGIN_UTILISATION, 0)}
              </option>
            </select>
            <p className="text-xs text-muted-foreground">{nt.marginCeilingHint}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nt-today">{nt.bookedToday}</Label>
            <Input
              id="nt-today"
              type="number"
              step={50}
              value={profitBookedToday}
              onChange={(event) => setProfitBookedToday(Number(event.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">{nt.bookedTodayHint}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {plan.suggestedStopPrice !== null && plan.suggestedTargetPrice !== null
              ? nt.suggestedHint(
                  f.num(plan.suggestedStopPrice, decimals),
                  f.num(plan.suggestedTargetPrice, decimals),
                )
              : null}
          </p>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted"
            onClick={() => {
              setStopOverride(null);
              setTargetOverride(null);
            }}
          >
            <RotateCcw className="size-3" aria-hidden />
            {nt.useSuggested}
          </button>
        </div>

        <div
          id="nt-limits"
          role="status"
          aria-live="polite"
          className={cn(
            "rounded-xl border p-4 space-y-3",
            limitsOk ? "border-positive/40 bg-positive/5" : "border-negative/40 bg-negative/5",
          )}
        >
          <div>
            <p className="text-sm font-semibold">{nt.limitsTitle}</p>
            <p
              className={cn(
                "mt-1 text-sm font-medium",
                limitsOk ? "text-positive" : "text-negative",
              )}
            >
              {limitsOk ? nt.limitsPass : nt.limitsFail}
            </p>
          </div>
          <ul className="space-y-2">
            {plan.checks.map((item) => {
              const Icon =
                item.pass && item.severity !== "unknown"
                  ? CheckCircle2
                  : item.severity === "breach"
                    ? XCircle
                    : CircleAlert;
              const tone =
                item.pass && item.severity !== "unknown"
                  ? "text-positive"
                  : item.severity === "breach"
                    ? "text-negative"
                    : item.severity === "watch"
                      ? "text-caution"
                      : "text-muted-foreground";
              return (
                <li key={item.id} className="flex items-start gap-2 text-sm leading-relaxed">
                  <Icon className={cn("mt-0.5 size-4 shrink-0", tone)} aria-hidden />
                  <span className={cn(item.pass && item.severity !== "unknown" ? "text-foreground" : tone)}>
                    {checkText(item)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-xl border bg-muted/40 p-4">
          <p className="mb-3 text-sm font-medium">{nt.orderTitle}</p>

          {plan.contractSize === null ? (
            <p className="text-sm text-muted-foreground">{nt.noPrices}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Level
                label={nt.entryLevel}
                price={f.num(entryPrice, decimals)}
                detail={nt.valuePerPoint(f.usd(plan.valuePerPricePoint ?? 0))}
                icon={
                  direction === "buy" ? (
                    <ArrowUpRight className="size-3" aria-hidden />
                  ) : (
                    <ArrowDownRight className="size-3" aria-hidden />
                  )
                }
              />
              <Level
                label={nt.stopLevel}
                price={f.num(plan.stopPrice, decimals)}
                detail={nt.distance(f.num(plan.stopDistance, decimals))}
                tone="text-negative"
              />
              <Level
                label={nt.targetLevel}
                price={f.num(plan.targetPrice, decimals)}
                detail={nt.distance(f.num(plan.targetDistance, decimals))}
                tone="text-positive"
              />
              <Level
                label={nt.maxTargetLevel}
                price={f.num(plan.maxProfitPrice, decimals)}
                detail={
                  plan.maxProfit === null
                    ? nt.windowUndefined
                    : nt.distance(f.num(plan.maxProfitDistance, decimals))
                }
              />
            </div>
          )}

          <div className="mt-4 grid gap-3 border-t pt-4 text-xs sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">{nt.riskLabel}</p>
              <p className="mt-1 font-mono text-sm tabular-nums">
                {f.usd(plan.riskUsd)} · {f.pct(riskFraction, 2)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{nt.targetLevel}</p>
              <p className="mt-1 font-mono text-sm tabular-nums">
                {plan.targetProfit === null ? "—" : f.usd(plan.targetProfit)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{nt.rewardRisk}</p>
              <p className="mt-1 font-mono text-sm tabular-nums">
                {plan.rewardRisk === null ? "—" : `${f.num(plan.rewardRisk, 2)} : 1`}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{nt.margin}</p>
              <p className="mt-1 font-mono text-sm tabular-nums">
                {f.pct(plan.marginFraction)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">{nt.windowTitle}</p>
            <p className="mt-1 font-mono text-lg tabular-nums">{windowLabel}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {nt.windowExplain}
            </p>
          </div>

          {plan.hasEstablishedRatio ? (
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">{nt.headroomTitle}</p>
              <div className="mt-1 flex flex-wrap gap-x-8 gap-y-2">
                <div>
                  <p
                    className={cn(
                      "font-mono text-lg tabular-nums",
                      plan.lossHeadroomNow !== null && plan.lossHeadroomNow <= 0
                        ? "text-negative"
                        : undefined,
                    )}
                  >
                    {headroom(plan.lossHeadroomNow)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{nt.headroomNow}</p>
                </div>
                <div>
                  <p
                    className={cn(
                      "font-mono text-lg tabular-nums",
                      plan.lossHeadroomAfterWin !== null && plan.lossHeadroomAfterWin <= 0
                        ? "text-negative"
                        : undefined,
                    )}
                  >
                    {headroom(plan.lossHeadroomAfterWin)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{nt.headroomAfterWin}</p>
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {nt.headroomExplain}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">{nt.plannedWinnersTitle}</p>
              <p className="mt-1 font-mono text-lg tabular-nums">
                {nt.plannedWinnersUnit(plan.minWinnersFromScratch)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {nt.plannedWinnersExplain}
              </p>
            </div>
          )}
        </div>

        <ul className="space-y-2.5">
          {plan.issues.map((issue) => (
            <li key={issue.id} className="flex gap-2.5 text-xs leading-relaxed">
              <span
                className={cn(
                  "mt-1.5 size-1.5 shrink-0 rounded-full",
                  SEVERITY_STYLES[issue.severity].dot,
                )}
                aria-hidden
              />
              <span className="text-muted-foreground">{issueText(issue)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
