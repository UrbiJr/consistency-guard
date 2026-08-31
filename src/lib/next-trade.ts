/**
 * Turns the current state of an account into the parameters of the next order.
 *
 * The concentration rules are ratios over the *whole cycle*, so the size of a
 * compliant win depends on what is already in the account. That makes the safe
 * take-profit a moving target, and it is the number a trader actually needs
 * before placing an order — not after a compliance review.
 *
 * Given profit already in the cycle N, the largest existing peak L (the largest
 * of the biggest trade idea, the best day, and the largest isolated ticket —
 * Vincent's three units under clause 3.1), profit already booked today D, and a
 * target ratio T, a winning trade of P leaves the account compliant when both of
 * these hold:
 *
 *   D + P <= T * (N + P)     the new day must not become the offending peak
 *   L     <= T * (N + P)     the existing peak must fall back inside the ratio
 *
 * Rearranged, that is a window:
 *
 *   P <= (T * N - D) / (1 - T)      upper bound
 *   P >= L / T - N                  lower bound
 *
 * The lower bound is the counter-intuitive one: when an account is already over
 * concentrated, a *too small* win cannot fix it, because it barely moves the
 * denominator. If the window is empty no single trade can restore the ratio and
 * the only route is several smaller wins, which is what `tradesNeeded` reports.
 */

import type { Analysis, Severity } from "./analyze";
import {
  MAX_MARGIN_UTILISATION,
  PRIME_LEVERAGE,
  SPECULATIVE_CONCENTRATION_LIMIT,
  classifySymbol,
  contractSizeFor,
} from "./rules";

export type Direction = "buy" | "sell";

export type NextTradeInput = {
  symbol: string;
  direction: Direction;
  entryPrice: number;
  lots: number;
  /** Share of the initial balance treated as the working risk budget. */
  riskFraction: number;
  /** Concentration ratio to stay within. */
  threshold: number;
  /** Realised profit already booked today, which counts against the day cap. */
  profitBookedToday: number;
  /** Margin ceiling to size against: 0.30 under the Consistency Program, else 0.70. */
  marginCeiling: number;
  /**
   * Optional prices typed by the trader. When omitted the stop is sized to the
   * risk budget and the target is pulled inside the compliant window. When set,
   * those prices are the order and every limit is checked against them.
   */
  stopPrice?: number | null;
  targetPrice?: number | null;
};

export type NextTradeIssue = {
  id:
    | "unknownSymbol"
    | "riskOverHardCap"
    | "riskOverWorkingBudget"
    | "marginOverCeiling"
    | "marginOverHardLimit"
    | "noProfitYet"
    | "dayCapUsedUp"
    | "windowEmpty"
    | "mustExceedMinimum"
    | "targetBelowRisk"
    | "targetOverWindow"
    | "stopWrongSide"
    | "targetWrongSide"
    | "stopTooTight"
    | "splitEntriesShareCap"
    | "lossErodesRatio";
  severity: Severity;
  values?: Record<string, number>;
};

export type LimitCheckId =
  | "stopSide"
  | "targetSide"
  | "riskHardCap"
  | "riskWorking"
  | "marginHard"
  | "marginWorking"
  | "targetMax"
  | "targetMin"
  | "rewardRisk";

export type LimitCheck = {
  id: LimitCheckId;
  pass: boolean;
  severity: Severity;
  values?: Record<string, number>;
};

export type NextTradePlan = {
  contractSize: number | null;
  leverage: number;
  /** Dollar move per 1.00 of price at the chosen lot size. */
  valuePerPricePoint: number | null;

  /** Dollar risk implied by the stop that will actually be placed. */
  riskUsd: number;
  /** Working budget from the risk dropdown (initial balance × riskFraction). */
  workingRiskUsd: number;
  hardRiskCapUsd: number;
  stopDistance: number | null;
  stopPrice: number | null;
  /** Stop sized to the risk budget, ignoring any typed override. */
  suggestedStopPrice: number | null;
  /** Whether the stop comes from a typed price rather than the risk budget. */
  manualStop: boolean;
  /** Whether the target comes from a typed price rather than the window. */
  manualTarget: boolean;

  marginUsd: number | null;
  marginFraction: number | null;
  maxLotsByMargin: number | null;

  /** Upper bound of the compliant profit window, null when undefined. */
  maxProfit: number | null;
  /** Lower bound: the smallest win that pulls the existing peak back inside T. */
  minProfit: number;
  /** Whether a single trade can satisfy both bounds at once. */
  windowOpen: boolean;

  /** The profit this plan targets, inside the window where one exists. */
  targetProfit: number | null;
  targetDistance: number | null;
  targetPrice: number | null;
  /** Target pulled inside the window at 1.5R, ignoring any typed override. */
  suggestedTargetPrice: number | null;
  maxProfitDistance: number | null;
  maxProfitPrice: number | null;
  rewardRisk: number | null;
  /** Share of net profit this win would represent if it closed at the target. */
  resultingShare: number | null;
  checks: LimitCheck[];

  /** Wins of `targetProfit` still needed when no single trade can restore the ratio. */
  tradesNeeded: number | null;
  /** Equal-sized winners needed to hold the ratio from a standing start. */
  minWinnersFromScratch: number;

  /**
   * True once the cycle holds a positive net profit and an existing peak, which
   * is when a concentration ratio starts describing anything. Before that the
   * first win is 100% of profit by definition, so measuring it against a limit
   * says nothing about the trade.
   */
  hasEstablishedRatio: boolean;
  /** True when the chosen ratio actually constrains this trade's target. */
  thresholdBinds: boolean;

  /**
   * How much the cycle can still lose before the existing peak breaches the
   * ratio. Negative means the ratio is already breached, null while there is no
   * established ratio to erode.
   *
   * This matters because the denominator is net profit with losing trades
   * included, which the firm confirmed in writing. Compliance is therefore not
   * settled when a trade closes: a later drawdown shrinks the denominator and
   * can push a win that was compliant at the time back over the limit.
   */
  lossHeadroomNow: number | null;
  /** The same cushion recalculated as if this trade reaches its target. */
  lossHeadroomAfterWin: number | null;

  issues: NextTradeIssue[];
};

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Sensible price precision for displaying stop and target levels. */
export function priceDecimals(symbol: string, entryPrice: number): number {
  const size = contractSizeFor(symbol);
  if (size === 100_000) return entryPrice > 20 ? 3 : 5;
  if (entryPrice >= 1000) return 2;
  if (entryPrice >= 10) return 2;
  return 4;
}

function applyStop(
  direction: Direction,
  entryPrice: number,
  distance: number,
): number {
  return direction === "buy" ? entryPrice - distance : entryPrice + distance;
}

function applyTarget(
  direction: Direction,
  entryPrice: number,
  distance: number,
): number {
  return direction === "buy" ? entryPrice + distance : entryPrice - distance;
}

function stopDistanceFromPrices(
  direction: Direction,
  entryPrice: number,
  stopPrice: number,
): number {
  return direction === "buy" ? entryPrice - stopPrice : stopPrice - entryPrice;
}

function targetDistanceFromPrices(
  direction: Direction,
  entryPrice: number,
  targetPrice: number,
): number {
  return direction === "buy" ? targetPrice - entryPrice : entryPrice - targetPrice;
}

export function planNextTrade(analysis: Analysis, input: NextTradeInput): NextTradePlan {
  const balance = analysis.options.initialBalance;
  const contractSize = contractSizeFor(input.symbol);
  const leverage = PRIME_LEVERAGE[classifySymbol(input.symbol)] ?? 50;
  const issues: NextTradeIssue[] = [];
  const checks: LimitCheck[] = [];
  const decimals = priceDecimals(input.symbol, input.entryPrice);

  const workingRiskUsd = balance * input.riskFraction;
  const hardRiskCapUsd = balance * analysis.options.riskLimit;

  const valuePerPricePoint =
    contractSize !== null && input.lots > 0 ? contractSize * input.lots : null;

  if (contractSize === null) {
    issues.push({ id: "unknownSymbol", severity: "unknown" });
  }

  const suggestedStopDistance = valuePerPricePoint ? workingRiskUsd / valuePerPricePoint : null;
  const suggestedStopPrice =
    suggestedStopDistance !== null
      ? applyStop(input.direction, input.entryPrice, suggestedStopDistance)
      : null;

  const typedStop =
    input.stopPrice !== undefined && input.stopPrice !== null && Number.isFinite(input.stopPrice)
      ? input.stopPrice
      : null;
  const manualStop = typedStop !== null;
  const stopPrice = typedStop ?? suggestedStopPrice;
  const signedStop =
    stopPrice !== null ? stopDistanceFromPrices(input.direction, input.entryPrice, stopPrice) : null;
  const stopOnCorrectSide = signedStop !== null && signedStop > 0;
  const stopDistance = signedStop !== null ? Math.abs(signedStop) : suggestedStopDistance;

  if (manualStop && signedStop !== null && signedStop <= 0) {
    if (signedStop === 0) {
      issues.push({ id: "stopTooTight", severity: "breach" });
    } else {
      issues.push({ id: "stopWrongSide", severity: "breach" });
    }
  }

  const riskUsd =
    valuePerPricePoint && stopDistance !== null ? stopDistance * valuePerPricePoint : workingRiskUsd;

  if (riskUsd > hardRiskCapUsd) {
    issues.push({
      id: "riskOverHardCap",
      severity: "breach",
      values: { riskUsd, hardRiskCapUsd },
    });
  } else if (manualStop && stopOnCorrectSide && riskUsd > workingRiskUsd + 0.5) {
    issues.push({
      id: "riskOverWorkingBudget",
      severity: "watch",
      values: { riskUsd, workingRiskUsd },
    });
  }

  const marginUsd =
    contractSize !== null && input.entryPrice > 0
      ? (input.entryPrice * contractSize * input.lots) / leverage
      : null;
  const marginFraction = marginUsd !== null && balance > 0 ? marginUsd / balance : null;

  const maxLotsByMargin =
    contractSize !== null && input.entryPrice > 0
      ? Math.max(
          0,
          Math.floor(
            ((input.marginCeiling * balance * leverage) / (input.entryPrice * contractSize)) * 100,
          ) / 100,
        )
      : null;

  if (marginFraction !== null) {
    if (marginFraction >= MAX_MARGIN_UTILISATION) {
      issues.push({
        id: "marginOverHardLimit",
        severity: "breach",
        values: { marginFraction, limit: MAX_MARGIN_UTILISATION },
      });
    } else if (marginFraction > input.marginCeiling) {
      issues.push({
        id: "marginOverCeiling",
        severity: "watch",
        values: { marginFraction, ceiling: input.marginCeiling },
      });
    }
  }

  const netProfit = analysis.netProfit;
  const peak = Math.max(
    analysis.concentration.trade.peak,
    analysis.concentration.idea.peak,
    analysis.concentration.day.peak,
  );
  const t = input.threshold;
  const minWinnersFromScratch = t > 0 ? Math.ceil(1 / t) : 0;

  let maxProfit: number | null = null;
  let minProfit = 0;

  if (netProfit > 0 && t > 0 && t < 1) {
    maxProfit = (t * netProfit - input.profitBookedToday) / (1 - t);
    minProfit = Math.max(0, peak / t - netProfit);
  } else {
    issues.push({
      id: "noProfitYet",
      severity: "unknown",
      values: { minWinners: minWinnersFromScratch },
    });
  }

  if (maxProfit !== null && maxProfit <= 0) {
    issues.push({
      id: "dayCapUsedUp",
      severity: "watch",
      values: { bookedToday: input.profitBookedToday },
    });
  }

  const windowOpen = maxProfit !== null && maxProfit > 0 && minProfit <= maxProfit;

  const preferredProfit = workingRiskUsd * 1.5;
  let suggestedTargetProfit: number | null;
  if (maxProfit === null) {
    suggestedTargetProfit = preferredProfit;
  } else if (windowOpen) {
    suggestedTargetProfit = Math.min(Math.max(preferredProfit, minProfit), maxProfit);
  } else if (maxProfit > 0) {
    suggestedTargetProfit = Math.min(preferredProfit, maxProfit);
  } else {
    suggestedTargetProfit = null;
  }

  const suggestedTargetDistance =
    suggestedTargetProfit !== null && valuePerPricePoint
      ? suggestedTargetProfit / valuePerPricePoint
      : null;
  const suggestedTargetPrice =
    suggestedTargetDistance !== null
      ? applyTarget(input.direction, input.entryPrice, suggestedTargetDistance)
      : null;

  const typedTarget =
    input.targetPrice !== undefined &&
    input.targetPrice !== null &&
    Number.isFinite(input.targetPrice)
      ? input.targetPrice
      : null;
  const manualTarget = typedTarget !== null;
  const targetPrice = typedTarget ?? suggestedTargetPrice;
  const signedTarget =
    targetPrice !== null
      ? targetDistanceFromPrices(input.direction, input.entryPrice, targetPrice)
      : null;
  const targetOnCorrectSide = signedTarget !== null && signedTarget > 0;
  const targetDistance =
    signedTarget !== null ? Math.abs(signedTarget) : suggestedTargetDistance;
  const targetProfit =
    valuePerPricePoint && targetDistance !== null
      ? targetDistance * valuePerPricePoint
      : suggestedTargetProfit;

  if (manualTarget && signedTarget !== null && signedTarget <= 0) {
    issues.push({ id: "targetWrongSide", severity: "breach" });
  }

  let tradesNeeded: number | null = null;
  if (!windowOpen && maxProfit !== null && targetProfit !== null && targetProfit > 0) {
    const shortfall = peak / t - netProfit;
    if (shortfall > 0) {
      tradesNeeded = Math.ceil(shortfall / targetProfit);
      issues.push({
        id: "windowEmpty",
        severity: "watch",
        values: { tradesNeeded, targetProfit, shortfall },
      });
    }
  }

  if (manualTarget && maxProfit !== null && maxProfit > 0 && targetOnCorrectSide && targetProfit !== null) {
    if (targetProfit > maxProfit + 0.5) {
      issues.push({
        id: "targetOverWindow",
        severity: t >= SPECULATIVE_CONCENTRATION_LIMIT ? "breach" : "watch",
        values: { targetProfit, maxProfit },
      });
    }
  }

  if (windowOpen && minProfit > 0) {
    if (!manualTarget || (targetProfit !== null && targetProfit + 0.5 < minProfit)) {
      issues.push({ id: "mustExceedMinimum", severity: "watch", values: { minProfit } });
    }
  }

  if (targetProfit !== null && targetOnCorrectSide !== false && targetProfit < riskUsd) {
    issues.push({
      id: "targetBelowRisk",
      severity: "watch",
      values: { targetProfit, riskUsd },
    });
  }

  issues.push({ id: "splitEntriesShareCap", severity: "ok" });

  const maxProfitDistance =
    maxProfit !== null && maxProfit > 0 && valuePerPricePoint
      ? maxProfit / valuePerPricePoint
      : null;
  const maxProfitPrice =
    maxProfitDistance !== null
      ? applyTarget(input.direction, input.entryPrice, maxProfitDistance)
      : null;

  const hasEstablishedRatio = netProfit > 0 && peak > 0;
  const lossHeadroomNow = hasEstablishedRatio && t > 0 ? netProfit - peak / t : null;
  const lossHeadroomAfterWin =
    hasEstablishedRatio && targetProfit !== null && t > 0
      ? netProfit + targetProfit - Math.max(peak, targetProfit) / t
      : null;

  if (lossHeadroomNow !== null && lossHeadroomNow > 0) {
    issues.push({
      id: "lossErodesRatio",
      severity: "ok",
      values: { headroom: lossHeadroomNow },
    });
  }

  const resultingShare =
    targetProfit !== null && netProfit + targetProfit > 0
      ? Math.max(peak, targetProfit) / (netProfit + targetProfit)
      : null;

  const check = (
    id: LimitCheckId,
    pass: boolean,
    severity: Severity,
    values?: Record<string, number>,
  ): LimitCheck => ({ id, pass, severity, values });

  checks.push(
    check(
      "stopSide",
      stopPrice === null ? false : stopOnCorrectSide,
      stopPrice === null ? "unknown" : stopOnCorrectSide ? "ok" : "breach",
    ),
    check(
      "targetSide",
      targetPrice === null ? false : targetOnCorrectSide,
      targetPrice === null ? "unknown" : targetOnCorrectSide ? "ok" : "breach",
    ),
    check(
      "riskHardCap",
      riskUsd <= hardRiskCapUsd,
      riskUsd > hardRiskCapUsd ? "breach" : "ok",
      { riskUsd, hardRiskCapUsd },
    ),
    check(
      "riskWorking",
      riskUsd <= workingRiskUsd + 0.5,
      riskUsd > workingRiskUsd + 0.5 ? "watch" : "ok",
      { riskUsd, workingRiskUsd },
    ),
    check(
      "marginHard",
      marginFraction === null ? false : marginFraction < MAX_MARGIN_UTILISATION,
      marginFraction === null
        ? "unknown"
        : marginFraction >= MAX_MARGIN_UTILISATION
          ? "breach"
          : "ok",
      marginFraction === null ? undefined : { marginFraction, limit: MAX_MARGIN_UTILISATION },
    ),
    check(
      "marginWorking",
      marginFraction === null ? false : marginFraction <= input.marginCeiling,
      marginFraction === null
        ? "unknown"
        : marginFraction > input.marginCeiling
          ? "watch"
          : "ok",
      marginFraction === null ? undefined : { marginFraction, ceiling: input.marginCeiling },
    ),
    check(
      "targetMax",
      maxProfit === null || maxProfit <= 0 || !targetOnCorrectSide || targetProfit === null
        ? false
        : targetProfit <= maxProfit + 0.5,
      maxProfit === null || maxProfit <= 0 || !targetOnCorrectSide
        ? "unknown"
        : targetProfit !== null && targetProfit > maxProfit + 0.5
          ? t >= SPECULATIVE_CONCENTRATION_LIMIT
            ? "breach"
            : "watch"
          : "ok",
      targetProfit !== null && maxProfit !== null
        ? { targetProfit, maxProfit }
        : undefined,
    ),
    check(
      "targetMin",
      !windowOpen ||
        minProfit <= 0 ||
        (targetOnCorrectSide && targetProfit !== null && targetProfit + 0.5 >= minProfit),
      !windowOpen || minProfit <= 0 || !targetOnCorrectSide
        ? "unknown"
        : targetProfit !== null && targetProfit + 0.5 >= minProfit
          ? "ok"
          : "watch",
      { minProfit },
    ),
    check(
      "rewardRisk",
      targetOnCorrectSide && targetProfit !== null && riskUsd > 0 && targetProfit >= riskUsd,
      !targetOnCorrectSide || targetProfit === null
        ? "unknown"
        : targetProfit < riskUsd
          ? "watch"
          : "ok",
      targetProfit !== null ? { targetProfit, riskUsd } : undefined,
    ),
  );

  const roundPrice = (value: number | null) =>
    value === null ? null : round(value, decimals);

  return {
    contractSize,
    leverage,
    valuePerPricePoint,
    riskUsd,
    workingRiskUsd,
    hardRiskCapUsd,
    stopDistance,
    stopPrice: roundPrice(stopPrice),
    suggestedStopPrice: roundPrice(suggestedStopPrice),
    manualStop,
    manualTarget,
    marginUsd,
    marginFraction,
    maxLotsByMargin,
    maxProfit,
    minProfit,
    windowOpen,
    targetProfit,
    targetDistance,
    targetPrice: roundPrice(targetPrice),
    suggestedTargetPrice: roundPrice(suggestedTargetPrice),
    maxProfitDistance,
    maxProfitPrice: roundPrice(maxProfitPrice),
    rewardRisk: targetProfit !== null && riskUsd > 0 ? targetProfit / riskUsd : null,
    resultingShare,
    checks,
    tradesNeeded,
    minWinnersFromScratch,
    hasEstablishedRatio,
    thresholdBinds: maxProfit !== null,
    lossHeadroomNow,
    lossHeadroomAfterWin,
    issues,
  };
}

/**
 * Checks that answer “do these prices stay inside the limits you selected?”
 * A take-profit that is merely too small to restore an already-broken ratio,
 * or a reward-to-risk below 1, is still legal — it is not a limit breach.
 */
const LIMIT_VERDICT_IDS: readonly LimitCheckId[] = [
  "stopSide",
  "targetSide",
  "riskHardCap",
  "riskWorking",
  "marginHard",
  "marginWorking",
  "targetMax",
];

export function planRespectsLimits(plan: NextTradePlan): boolean {
  return plan.checks
    .filter((item) => LIMIT_VERDICT_IDS.includes(item.id))
    .every((item) => item.pass || item.severity === "unknown");
}

/** Worst issue or failed-check severity, for the panel's overall badge. */
export function planSeverity(plan: NextTradePlan): Severity {
  const ranks: Severity[] = [
    ...plan.issues.map((i) => i.severity),
    ...plan.checks.filter((c) => !c.pass).map((c) => c.severity),
  ];
  if (ranks.some((s) => s === "breach")) return "breach";
  if (ranks.some((s) => s === "watch")) return "watch";
  if (ranks.some((s) => s === "unknown")) return "unknown";
  return "ok";
}
