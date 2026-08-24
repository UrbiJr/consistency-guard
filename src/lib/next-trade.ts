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
  classifySymbol,
  contractSizeFor,
} from "./rules";

export type Direction = "buy" | "sell";

export type NextTradeInput = {
  symbol: string;
  direction: Direction;
  entryPrice: number;
  lots: number;
  /** Share of the initial balance to risk on this trade idea. */
  riskFraction: number;
  /** Concentration ratio to stay within. */
  threshold: number;
  /** Realised profit already booked today, which counts against the day cap. */
  profitBookedToday: number;
  /** Margin ceiling to size against: 0.30 under the Consistency Program, else 0.70. */
  marginCeiling: number;
};

export type NextTradeIssue = {
  id:
    | "unknownSymbol"
    | "riskOverHardCap"
    | "marginOverCeiling"
    | "marginOverHardLimit"
    | "noProfitYet"
    | "dayCapUsedUp"
    | "windowEmpty"
    | "mustExceedMinimum"
    | "targetBelowRisk"
    | "splitEntriesShareCap"
    | "lossErodesRatio";
  severity: Severity;
  values?: Record<string, number>;
};

export type NextTradePlan = {
  contractSize: number | null;
  leverage: number;
  /** Dollar move per 1.00 of price at the chosen lot size. */
  valuePerPricePoint: number | null;

  riskUsd: number;
  hardRiskCapUsd: number;
  stopDistance: number | null;
  stopPrice: number | null;

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
  maxProfitDistance: number | null;
  maxProfitPrice: number | null;
  rewardRisk: number | null;

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

export function planNextTrade(analysis: Analysis, input: NextTradeInput): NextTradePlan {
  const balance = analysis.options.initialBalance;
  const contractSize = contractSizeFor(input.symbol);
  const leverage = PRIME_LEVERAGE[classifySymbol(input.symbol)] ?? 50;
  const issues: NextTradeIssue[] = [];

  const riskUsd = balance * input.riskFraction;
  const hardRiskCapUsd = balance * analysis.options.riskLimit;

  const valuePerPricePoint =
    contractSize !== null && input.lots > 0 ? contractSize * input.lots : null;

  if (contractSize === null) {
    issues.push({ id: "unknownSymbol", severity: "unknown" });
  }
  if (riskUsd > hardRiskCapUsd) {
    issues.push({
      id: "riskOverHardCap",
      severity: "breach",
      values: { riskUsd, hardRiskCapUsd },
    });
  }

  const stopDistance = valuePerPricePoint ? riskUsd / valuePerPricePoint : null;
  const stopPrice =
    stopDistance !== null
      ? input.direction === "buy"
        ? input.entryPrice - stopDistance
        : input.entryPrice + stopDistance
      : null;

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

  // A 1.5:1 reward-to-risk target, pulled inside the window when one exists.
  const preferredProfit = riskUsd * 1.5;
  let targetProfit: number | null;
  if (maxProfit === null) {
    targetProfit = preferredProfit;
  } else if (windowOpen) {
    targetProfit = Math.min(Math.max(preferredProfit, minProfit), maxProfit);
  } else if (maxProfit > 0) {
    // Window closed: stay under the upper bound and accumulate across trades.
    targetProfit = Math.min(preferredProfit, maxProfit);
  } else {
    targetProfit = null;
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

  if (windowOpen && minProfit > 0) {
    issues.push({ id: "mustExceedMinimum", severity: "watch", values: { minProfit } });
  }

  if (targetProfit !== null && targetProfit < riskUsd) {
    issues.push({
      id: "targetBelowRisk",
      severity: "watch",
      values: { targetProfit, riskUsd },
    });
  }

  issues.push({ id: "splitEntriesShareCap", severity: "ok" });

  const targetDistance =
    targetProfit !== null && valuePerPricePoint ? targetProfit / valuePerPricePoint : null;
  const targetPrice =
    targetDistance !== null
      ? input.direction === "buy"
        ? input.entryPrice + targetDistance
        : input.entryPrice - targetDistance
      : null;

  const maxProfitDistance =
    maxProfit !== null && maxProfit > 0 && valuePerPricePoint
      ? maxProfit / valuePerPricePoint
      : null;
  const maxProfitPrice =
    maxProfitDistance !== null
      ? input.direction === "buy"
        ? input.entryPrice + maxProfitDistance
        : input.entryPrice - maxProfitDistance
      : null;

  // Both cushions stay null until a ratio exists to erode. Reporting "already
  // over the limit" for the opening trade of a cycle would be arithmetically
  // true and completely uninformative: every possible first win is 100% of
  // profit, so there is no size that avoids it.
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

  const decimals = priceDecimals(input.symbol, input.entryPrice);

  return {
    contractSize,
    leverage,
    valuePerPricePoint,
    riskUsd,
    hardRiskCapUsd,
    stopDistance,
    stopPrice: stopPrice === null ? null : round(stopPrice, decimals),
    marginUsd,
    marginFraction,
    maxLotsByMargin,
    maxProfit,
    minProfit,
    windowOpen,
    targetProfit,
    targetDistance,
    targetPrice: targetPrice === null ? null : round(targetPrice, decimals),
    maxProfitDistance,
    maxProfitPrice: maxProfitPrice === null ? null : round(maxProfitPrice, decimals),
    rewardRisk: targetProfit !== null && riskUsd > 0 ? targetProfit / riskUsd : null,
    tradesNeeded,
    minWinnersFromScratch,
    hasEstablishedRatio,
    thresholdBinds: maxProfit !== null,
    lossHeadroomNow,
    lossHeadroomAfterWin,
    issues,
  };
}

/** Worst issue severity, for the panel's overall badge. */
export function planSeverity(plan: NextTradePlan): Severity {
  if (plan.issues.some((i) => i.severity === "breach")) return "breach";
  if (plan.issues.some((i) => i.severity === "watch")) return "watch";
  if (plan.issues.some((i) => i.severity === "unknown")) return "unknown";
  return "ok";
}
