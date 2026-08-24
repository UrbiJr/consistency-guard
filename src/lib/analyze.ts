import type { Trade } from "./parse-trades";
import {
  CONSISTENCY_EXCELLENT,
  MAX_MARGIN_UTILISATION,
  MAX_RISK_PER_IDEA,
  ON_DEMAND_CONSISTENCY_LIMIT,
  PAYOUT_CYCLES,
  PROFITABLE_DAY_MIN,
  PRIME_LEVERAGE,
  REENTRY_WINDOW_MINUTES,
  SPECULATIVE_CONCENTRATION_LIMIT,
  classifySymbol,
  contractSizeFor,
  type PayoutCycle,
} from "./rules";

export type AnalysisOptions = {
  initialBalance: number;
  /** Hour at which the trading day rolls over, in the timestamps' own timezone. */
  dayRolloverHour: number;
  /** Overrides the published 2% cap, e.g. 1% inside the Prime Consistency Program. */
  riskLimit: number;
  /**
   * Ignore trades closed before this date (yyyy-mm-dd). Concentration is measured
   * over a cycle, and a rebalance or a payout starts a new one, so an export that
   * still contains the old history would otherwise report a peak that no longer
   * counts against you.
   */
  cycleStart: string | null;
};

export const DEFAULT_OPTIONS: AnalysisOptions = {
  initialBalance: 100_000,
  dayRolloverHour: 0,
  riskLimit: MAX_RISK_PER_IDEA,
  cycleStart: null,
};

export type TradeIdea = {
  id: string;
  symbol: string;
  direction: Trade["direction"];
  trades: Trade[];
  netProfit: number;
  volume: number;
  openTime: Date | null;
  closeTime: Date | null;
  /** Dollar risk implied by the stop losses, null when any leg has no stop. */
  riskUsd: number | null;
  /** True when at least one leg carried no stop loss at all. */
  missingStopLoss: boolean;
  /** Estimated peak margin as a fraction of the initial balance. */
  marginUtilisation: number | null;
};

export type TradingDay = {
  key: string;
  date: Date;
  netProfit: number;
  tradeCount: number;
  /** Counts towards a bi-weekly or monthly payout cycle. */
  qualifiesForPayout: boolean;
};

export type ConcentrationMetric = {
  label: string;
  /** Largest single unit of profit, in dollars. */
  peak: number;
  /** Identifier of whatever produced the peak. */
  peakLabel: string;
  /** Peak as a share of net account profit. Null when net profit is not positive. */
  shareOfNet: number | null;
  /** Peak as a share of gross winnings, which ignores offsetting losses. */
  shareOfGross: number | null;
};

export type Analysis = {
  options: AnalysisOptions;
  trades: Trade[];
  ideas: TradeIdea[];
  days: TradingDay[];
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  winCount: number;
  lossCount: number;
  winRate: number | null;
  totalCommission: number;
  totalSwap: number;
  averageWin: number | null;
  averageLoss: number | null;
  profitFactor: number | null;
  /** Peak-to-trough decline of the closed-trade equity curve, in dollars. */
  maxDrawdown: number;
  equityCurve: { index: number; balance: number; label: string }[];
  concentration: {
    trade: ConcentrationMetric;
    idea: ConcentrationMetric;
    day: ConcentrationMetric;
  };
  /** The official score: biggest winning day over current total account profit. */
  consistencyScore: number | null;
  biggestWinningDay: TradingDay | null;
  qualifyingDays: number;
  riskBreaches: TradeIdea[];
  missingStopLossIdeas: TradeIdea[];
  /** Highest margin held at any one moment, as a fraction of the initial balance. */
  peakConcurrentMargin: number | null;
  peakConcurrentMarginAt: Date | null;
  hasDates: boolean;
  hasStopLossData: boolean;
  /** Trades dropped by the cycle-start filter. */
  excludedByCycleStart: number;
};

/** Margin tied up by a single position, as a fraction of the initial balance. */
function positionMargin(trade: Trade, initialBalance: number): number | null {
  if (trade.openPrice === null || trade.volume === null || initialBalance <= 0) return null;
  const contractSize = contractSizeFor(trade.symbol);
  if (contractSize === null) return null;
  const leverage = PRIME_LEVERAGE[classifySymbol(trade.symbol)] ?? 50;
  return (trade.openPrice * contractSize * trade.volume) / leverage / initialBalance;
}

/**
 * Sweeps position open/close events to find the peak simultaneous margin load,
 * which is what the 70% "excessive margin" rule actually measures. Hedged
 * positions are counted additively, the conservative reading.
 */
function peakMargin(
  trades: Trade[],
  initialBalance: number,
): { peak: number | null; at: Date | null } {
  type Event = { time: number; delta: number };
  const events: Event[] = [];

  for (const trade of trades) {
    if (!trade.openTime) continue;
    const margin = positionMargin(trade, initialBalance);
    if (margin === null) continue;
    const close = trade.closeTime ?? trade.openTime;
    events.push({ time: trade.openTime.getTime(), delta: margin });
    events.push({ time: close.getTime(), delta: -margin });
  }

  if (events.length === 0) return { peak: null, at: null };
  // Closes settle before opens at the same instant, so a flat-and-reverse does
  // not register as double exposure.
  events.sort((a, b) => a.time - b.time || a.delta - b.delta);

  let running = 0;
  let peak = 0;
  let at: Date | null = null;
  for (const event of events) {
    running += event.delta;
    if (running > peak) {
      peak = running;
      at = new Date(event.time);
    }
  }
  return { peak, at };
}

function dayKey(date: Date, rolloverHour: number): string {
  const shifted = new Date(date.getTime());
  if (rolloverHour > 0) {
    shifted.setHours(shifted.getHours() + (24 - rolloverHour));
  }
  const y = shifted.getFullYear();
  const m = `${shifted.getMonth() + 1}`.padStart(2, "0");
  const d = `${shifted.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function ideaRisk(trades: Trade[]): { riskUsd: number | null; missingStopLoss: boolean } {
  let total = 0;
  let missing = false;
  let priced = false;

  for (const trade of trades) {
    if (trade.stopLoss === null || trade.openPrice === null || trade.volume === null) {
      missing = true;
      continue;
    }
    const contractSize = contractSizeFor(trade.symbol);
    if (contractSize === null) {
      missing = true;
      continue;
    }
    total += Math.abs(trade.openPrice - trade.stopLoss) * contractSize * trade.volume;
    priced = true;
  }

  if (!priced) return { riskUsd: null, missingStopLoss: true };
  return { riskUsd: total, missingStopLoss: missing };
}

function ideaMargin(trades: Trade[], initialBalance: number): number | null {
  let notional = 0;
  let priced = false;

  for (const trade of trades) {
    if (trade.openPrice === null || trade.volume === null) continue;
    const contractSize = contractSizeFor(trade.symbol);
    if (contractSize === null) continue;
    const leverage = PRIME_LEVERAGE[classifySymbol(trade.symbol)] ?? 50;
    notional += (trade.openPrice * contractSize * trade.volume) / leverage;
    priced = true;
  }

  if (!priced || initialBalance <= 0) return null;
  return notional / initialBalance;
}

/**
 * Groups positions into trade ideas exactly as Hola Prime describes: same symbol,
 * same direction, and either overlapping in time or reopened within 10 minutes of
 * the previous leg closing. Chains extend transitively.
 */
export function groupTradeIdeas(trades: Trade[], initialBalance: number): TradeIdea[] {
  const buckets = new Map<string, Trade[]>();
  for (const trade of trades) {
    const key = `${trade.symbol.toUpperCase()}|${trade.direction}`;
    const list = buckets.get(key) ?? [];
    list.push(trade);
    buckets.set(key, list);
  }

  const windowMs = REENTRY_WINDOW_MINUTES * 60 * 1000;
  const ideas: TradeIdea[] = [];

  for (const [key, list] of buckets) {
    const timed = list
      .filter((t) => t.openTime !== null)
      .sort((a, b) => a.openTime!.getTime() - b.openTime!.getTime());
    const untimed = list.filter((t) => t.openTime === null);

    let chain: Trade[] = [];
    let chainEnd = -Infinity;

    const flush = () => {
      if (chain.length === 0) return;
      ideas.push(buildIdea(key, chain, initialBalance, ideas.length));
      chain = [];
      chainEnd = -Infinity;
    };

    for (const trade of timed) {
      const open = trade.openTime!.getTime();
      const close = (trade.closeTime ?? trade.openTime!).getTime();
      if (chain.length > 0 && open - chainEnd > windowMs) flush();
      chain.push(trade);
      chainEnd = Math.max(chainEnd, close);
    }
    flush();

    for (const trade of untimed) {
      ideas.push(buildIdea(key, [trade], initialBalance, ideas.length));
    }
  }

  return ideas.sort((a, b) => {
    const at = a.openTime?.getTime() ?? 0;
    const bt = b.openTime?.getTime() ?? 0;
    return at - bt;
  });
}

function buildIdea(
  key: string,
  trades: Trade[],
  initialBalance: number,
  seq: number,
): TradeIdea {
  const [symbol, direction] = key.split("|");
  const { riskUsd, missingStopLoss } = ideaRisk(trades);
  const openTimes = trades.map((t) => t.openTime).filter((d): d is Date => d !== null);
  const closeTimes = trades.map((t) => t.closeTime).filter((d): d is Date => d !== null);

  return {
    id: `${key}-${seq}`,
    symbol,
    direction: direction as Trade["direction"],
    trades,
    netProfit: trades.reduce((sum, t) => sum + t.netProfit, 0),
    volume: trades.reduce((sum, t) => sum + (t.volume ?? 0), 0),
    openTime: openTimes.length ? new Date(Math.min(...openTimes.map((d) => d.getTime()))) : null,
    closeTime: closeTimes.length ? new Date(Math.max(...closeTimes.map((d) => d.getTime()))) : null,
    riskUsd,
    missingStopLoss,
    marginUtilisation: ideaMargin(trades, initialBalance),
  };
}

function share(peak: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return peak / denominator;
}

export function analyze(allTrades: Trade[], options: AnalysisOptions): Analysis {
  const cycleStart = options.cycleStart ? new Date(`${options.cycleStart}T00:00:00`) : null;
  const trades =
    cycleStart && !Number.isNaN(cycleStart.getTime())
      ? allTrades.filter((trade) => {
          const when = trade.closeTime ?? trade.openTime;
          return when === null || when >= cycleStart;
        })
      : allTrades;
  const excludedByCycleStart = allTrades.length - trades.length;

  const netProfit = trades.reduce((sum, t) => sum + t.netProfit, 0);
  const grossProfit = trades.filter((t) => t.netProfit > 0).reduce((s, t) => s + t.netProfit, 0);
  const grossLoss = trades.filter((t) => t.netProfit < 0).reduce((s, t) => s + t.netProfit, 0);
  const winners = trades.filter((t) => t.netProfit > 0);
  const losers = trades.filter((t) => t.netProfit < 0);

  const ideas = groupTradeIdeas(trades, options.initialBalance);

  const dayMap = new Map<string, TradingDay>();
  const hasDates = trades.some((t) => t.closeTime !== null);
  for (const trade of trades) {
    const when = trade.closeTime ?? trade.openTime;
    if (!when) continue;
    const key = dayKey(when, options.dayRolloverHour);
    const existing = dayMap.get(key);
    if (existing) {
      existing.netProfit += trade.netProfit;
      existing.tradeCount += 1;
    } else {
      dayMap.set(key, {
        key,
        date: new Date(`${key}T00:00:00`),
        netProfit: trade.netProfit,
        tradeCount: 1,
      qualifiesForPayout: false,
      });
    }
  }
  const days = [...dayMap.values()].sort((a, b) => a.key.localeCompare(b.key));
  const dayThreshold = options.initialBalance * PROFITABLE_DAY_MIN;
  for (const day of days) day.qualifiesForPayout = day.netProfit >= dayThreshold;

  const ordered = [...trades].sort((a, b) => {
    const at = (a.closeTime ?? a.openTime)?.getTime() ?? 0;
    const bt = (b.closeTime ?? b.openTime)?.getTime() ?? 0;
    return at - bt;
  });
  let balance = options.initialBalance;
  let peak = balance;
  let maxDrawdown = 0;
  const equityCurve = [{ index: 0, balance, label: "Start" }];
  ordered.forEach((trade, i) => {
    balance += trade.netProfit;
    peak = Math.max(peak, balance);
    maxDrawdown = Math.max(maxDrawdown, peak - balance);
    equityCurve.push({ index: i + 1, balance, label: trade.ticket });
  });

  const bestTrade = winners.reduce<Trade | null>(
    (best, t) => (best === null || t.netProfit > best.netProfit ? t : best),
    null,
  );
  const bestIdea = ideas.reduce<TradeIdea | null>(
    (best, idea) => (best === null || idea.netProfit > best.netProfit ? idea : best),
    null,
  );
  const winningDays = days.filter((d) => d.netProfit > 0);
  const biggestWinningDay = winningDays.reduce<TradingDay | null>(
    (best, d) => (best === null || d.netProfit > best.netProfit ? d : best),
    null,
  );

  const margin = peakMargin(trades, options.initialBalance);

  const buildMetric = (
    label: string,
    peakValue: number,
    peakLabel: string,
  ): ConcentrationMetric => ({
    label,
    peak: peakValue,
    peakLabel,
    shareOfNet: share(peakValue, netProfit),
    shareOfGross: share(peakValue, grossProfit),
  });

  return {
    options,
    trades,
    ideas,
    days,
    netProfit,
    grossProfit,
    grossLoss,
    winCount: winners.length,
    lossCount: losers.length,
    winRate: trades.length ? winners.length / trades.length : null,
    totalCommission: trades.reduce((s, t) => s + t.commission + t.fee, 0),
    totalSwap: trades.reduce((s, t) => s + t.swap, 0),
    averageWin: winners.length ? grossProfit / winners.length : null,
    averageLoss: losers.length ? grossLoss / losers.length : null,
    profitFactor: grossLoss !== 0 ? grossProfit / Math.abs(grossLoss) : null,
    maxDrawdown,
    equityCurve,
    concentration: {
      trade: buildMetric(
        "Largest single trade",
        bestTrade?.netProfit ?? 0,
        bestTrade ? `Ticket ${bestTrade.ticket}` : "—",
      ),
      idea: buildMetric(
        "Largest trade idea",
        bestIdea && bestIdea.netProfit > 0 ? bestIdea.netProfit : 0,
        bestIdea && bestIdea.netProfit > 0
          ? `${bestIdea.symbol} ${bestIdea.direction} (${bestIdea.trades.length} leg${bestIdea.trades.length === 1 ? "" : "s"})`
          : "—",
      ),
      day: buildMetric(
        "Biggest winning day",
        biggestWinningDay?.netProfit ?? 0,
        biggestWinningDay?.key ?? "—",
      ),
    },
    consistencyScore:
      biggestWinningDay && netProfit > 0 ? biggestWinningDay.netProfit / netProfit : null,
    biggestWinningDay,
    qualifyingDays: days.filter((d) => d.qualifiesForPayout).length,
    riskBreaches: ideas.filter(
      (i) => i.riskUsd !== null && i.riskUsd > options.initialBalance * options.riskLimit,
    ),
    missingStopLossIdeas: ideas.filter((i) => i.missingStopLoss),
    peakConcurrentMargin: margin.peak,
    peakConcurrentMarginAt: margin.at,
    hasDates,
    hasStopLossData: trades.some((t) => t.stopLoss !== null),
    excludedByCycleStart,
  };
}

export type Severity = "ok" | "watch" | "breach" | "unknown";

export type SourceKey = "prohibited" | "consistency" | "primeChallenge" | "pcp" | "payouts";

/**
 * Checks carry numbers rather than sentences so the same result can be rendered
 * in any language.
 */
export type RuleCheck =
  | {
      id: "speculative";
      severity: Severity;
      sourceKey: SourceKey;
      shareOfNet: number | null;
      shareOfGross: number | null;
    }
  | {
      id: "consistency";
      severity: Severity;
      sourceKey: SourceKey;
      score: number | null;
      /** Total profit that would bring the score down to the on-demand gate. */
      requiredProfit: number | null;
      withinExcellentBand: boolean;
    }
  | {
      id: "risk";
      severity: Severity;
      sourceKey: SourceKey;
      hasStopData: boolean;
      breachCount: number;
      missingStopCount: number;
      limitUsd: number;
      limitFraction: number;
    }
  | {
      id: "margin";
      severity: Severity;
      sourceKey: SourceKey;
      peak: number | null;
    };

export function evaluateRules(analysis: Analysis): RuleCheck[] {
  const { concentration, consistencyScore, options } = analysis;

  const peakUnit = [concentration.trade, concentration.idea, concentration.day].reduce(
    (best, unit) => (unit.peak > best.peak ? unit : best),
  );
  const peakShare = peakUnit.shareOfNet;
  const peakMarginUse = analysis.peakConcurrentMargin;

  return [
    {
      id: "speculative",
      sourceKey: "prohibited",
      severity:
        peakShare === null
          ? "unknown"
          : peakShare > SPECULATIVE_CONCENTRATION_LIMIT
            ? "breach"
            : peakShare > SPECULATIVE_CONCENTRATION_LIMIT * 0.75
              ? "watch"
              : "ok",
      shareOfNet: peakShare,
      shareOfGross: peakUnit.shareOfGross,
    },
    {
      id: "consistency",
      sourceKey: "consistency",
      severity:
        consistencyScore === null
          ? "unknown"
          : consistencyScore > ON_DEMAND_CONSISTENCY_LIMIT
            ? "watch"
            : "ok",
      score: consistencyScore,
      requiredProfit:
        concentration.day.peak > 0
          ? concentration.day.peak / ON_DEMAND_CONSISTENCY_LIMIT
          : null,
      withinExcellentBand:
        consistencyScore !== null && consistencyScore <= CONSISTENCY_EXCELLENT,
    },
    {
      id: "risk",
      sourceKey: "primeChallenge",
      severity: !analysis.hasStopLossData
        ? "unknown"
        : analysis.riskBreaches.length > 0
          ? "breach"
          : analysis.missingStopLossIdeas.length > 0
            ? "watch"
            : "ok",
      hasStopData: analysis.hasStopLossData,
      breachCount: analysis.riskBreaches.length,
      missingStopCount: analysis.missingStopLossIdeas.length,
      limitUsd: options.initialBalance * options.riskLimit,
      limitFraction: options.riskLimit,
    },
    {
      id: "margin",
      sourceKey: "prohibited",
      severity:
        peakMarginUse === null
          ? "unknown"
          : peakMarginUse >= MAX_MARGIN_UTILISATION
            ? "breach"
            : peakMarginUse >= MAX_MARGIN_UTILISATION * 0.7
              ? "watch"
              : "ok",
      peak: peakMarginUse,
    },
  ];
}

export { MAX_MARGIN_UTILISATION, PROFITABLE_DAY_MIN };

export type PayoutBlocker =
  | { id: "notInProfit" }
  | { id: "belowMinProfit"; needed: number; fraction: number }
  | { id: "consistencyTooHigh"; score: number; limit: number; requiredProfit: number }
  | { id: "notEnoughDays"; have: number; need: number; dayMinimum: number };

export type PayoutReadiness = {
  cycle: PayoutCycle;
  split: number;
  eligible: boolean;
  blockers: PayoutBlocker[];
  /** Trader's share of current net profit if paid out on this cycle. */
  traderShare: number;
};

export function assessPayout(analysis: Analysis): PayoutReadiness[] {
  return (Object.keys(PAYOUT_CYCLES) as PayoutCycle[]).map((cycle) => {
    const spec = PAYOUT_CYCLES[cycle];
    const blockers: PayoutBlocker[] = [];

    if (analysis.netProfit <= 0) blockers.push({ id: "notInProfit" });

    if (spec.minTotalProfit !== null) {
      const needed = analysis.options.initialBalance * spec.minTotalProfit;
      if (analysis.netProfit < needed) {
        blockers.push({ id: "belowMinProfit", needed, fraction: spec.minTotalProfit });
      }
    }

    if (
      spec.consistencyLimit !== null &&
      analysis.consistencyScore !== null &&
      analysis.consistencyScore > spec.consistencyLimit
    ) {
      blockers.push({
        id: "consistencyTooHigh",
        score: analysis.consistencyScore,
        limit: spec.consistencyLimit,
        requiredProfit: analysis.concentration.day.peak / spec.consistencyLimit,
      });
    }

    if (spec.minProfitableDays !== null && analysis.qualifyingDays < spec.minProfitableDays) {
      blockers.push({
        id: "notEnoughDays",
        have: analysis.qualifyingDays,
        need: spec.minProfitableDays,
        dayMinimum: analysis.options.initialBalance * PROFITABLE_DAY_MIN,
      });
    }

    return {
      cycle,
      split: spec.split,
      eligible: blockers.length === 0,
      blockers,
      traderShare: Math.max(0, analysis.netProfit) * spec.split,
    };
  });
}

/**
 * Total profit required so that a peak of `peak` sits at or below `threshold`.
 */
export function profitRequiredFor(peak: number, threshold: number): number {
  if (threshold <= 0) return Infinity;
  return peak / threshold;
}

/**
 * The largest single win that keeps you compliant at a given profit target.
 */
export function maxWinAt(targetTotalProfit: number, threshold: number): number {
  return targetTotalProfit * threshold;
}

export type ThresholdId = "speculative" | "onDemand" | "excellent";

export const THRESHOLDS: { id: ThresholdId; threshold: number }[] = [
  { id: "speculative", threshold: SPECULATIVE_CONCENTRATION_LIMIT },
  { id: "onDemand", threshold: ON_DEMAND_CONSISTENCY_LIMIT },
  { id: "excellent", threshold: CONSISTENCY_EXCELLENT },
];

export type PlanRow = {
  id: ThresholdId;
  threshold: number;
  requiredTotalProfit: number;
  additionalProfitNeeded: number;
  maxSingleWinAtTarget: number;
};

export function buildPlan(analysis: Analysis, targetTotalProfit: number): PlanRow[] {
  const peak = Math.max(analysis.concentration.idea.peak, analysis.concentration.day.peak);

  return THRESHOLDS.map(({ id, threshold }) => {
    const required = profitRequiredFor(peak, threshold);
    return {
      id,
      threshold,
      requiredTotalProfit: required,
      additionalProfitNeeded: Math.max(0, required - analysis.netProfit),
      maxSingleWinAtTarget: maxWinAt(targetTotalProfit, threshold),
    };
  });
}
