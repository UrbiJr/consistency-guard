/**
 * Sanity check for the parser and the rule engine.
 *
 * Run with: npm run selfcheck
 *
 * The expected numbers come from the Hola Prime compliance email for account
 * 131001, so a change that breaks these assertions is a change that would have
 * produced the wrong figures in a real dispute.
 */

import { parseTrades } from "../src/lib/parse-trades";
import { analyze, assessPayout, buildPlan, evaluateRules, DEFAULT_OPTIONS } from "../src/lib/analyze";
import { planNextTrade, planRespectsLimits } from "../src/lib/next-trade";
import { SAMPLE_CSV, EMAIL_CLAIM } from "../src/lib/sample-data";
import { en } from "../src/lib/i18n/en";
import { it } from "../src/lib/i18n/it";
import { createFormatters } from "../src/lib/format";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown, tolerance = 0.01) {
  const ok =
    typeof actual === "number" && typeof expected === "number"
      ? Math.abs(actual - expected) <= tolerance
      : actual === expected;
  if (!ok) {
    failures += 1;
    console.error(`FAIL  ${label}\n      expected ${String(expected)}, got ${String(actual)}`);
  } else {
    console.log(`ok    ${label}  ->  ${String(actual)}`);
  }
}

const parsed = parseTrades(SAMPLE_CSV);
check("trades parsed", parsed.trades.length, 9);
check("no skipped rows", parsed.skippedRows, 0);

const analysis = analyze(parsed.trades, DEFAULT_OPTIONS);

check("net profit", analysis.netProfit, 1985);
check("gross winnings", analysis.grossProfit, 5375);
check("gross losses", analysis.grossLoss, -3390);
check("largest single trade", analysis.concentration.trade.peak, EMAIL_CLAIM.tradeProfit);

// The exact percentage the compliance team quoted.
check(
  "largest trade as share of net profit",
  Number((analysis.concentration.trade.shareOfNet! * 100).toFixed(2)),
  101.76,
);

// The same trade measured against gross winnings, which lands under the 60% limit.
check(
  "largest trade as share of gross winnings",
  Number((analysis.concentration.trade.shareOfGross! * 100).toFixed(1)),
  37.6,
);

// The published consistency score uses the biggest winning DAY, not one trade.
check("biggest winning day", analysis.concentration.day.peak, 1730);
check(
  "consistency score",
  Number((analysis.consistencyScore! * 100).toFixed(1)),
  87.2,
);

check("trading days", analysis.days.length, 7);
check("days qualifying for a payout cycle", analysis.qualifyingDays, 3);

// Nine separate ideas: nothing overlapped or re-entered inside 10 minutes.
check("trade ideas", analysis.ideas.length, 9);
check("risk-limit breaches", analysis.riskBreaches.length, 0);
check("ideas missing a stop loss", analysis.missingStopLossIdeas.length, 0);
check(
  "risk on the flagged idea (USD)",
  analysis.ideas.find((i) => i.trades.some((t) => t.ticket === EMAIL_CLAIM.ticket))!.riskUsd!,
  600,
);
check(
  "peak simultaneous margin (%)",
  Number((analysis.peakConcurrentMargin! * 100).toFixed(1)),
  40.9,
  0.2,
);

const speculative = evaluateRules(analysis).find((c) => c.id === "speculative")!;
check("clause 3.1 verdict", speculative.severity, "breach");

// The cycle-start filter is what makes the tool usable after a rebalance.
const afterRebalance = analyze(parsed.trades, {
  ...DEFAULT_OPTIONS,
  cycleStart: "2026-08-19",
});
check("trades kept after the cycle start", afterRebalance.trades.length, 2);
check("trades excluded by the cycle start", afterRebalance.excludedByCycleStart, 7);
check("net profit in the new cycle", afterRebalance.netProfit, 1500);

const payouts = assessPayout(analysis);
check(
  "bi-weekly cycle eligible",
  payouts.find((p) => p.cycle === "biweekly")!.eligible,
  true,
);
check(
  "on-demand cycle eligible",
  payouts.find((p) => p.cycle === "onDemand")!.eligible,
  false,
);

const plan = buildPlan(analysis, 3000);
check(
  "profit needed to clear the 60% limit",
  Math.round(plan.find((r) => r.threshold === 0.6)!.requiredTotalProfit),
  3367,
  1,
);
check(
  "max single win at a $3,000 target, 40% gate",
  Math.round(plan.find((r) => r.threshold === 0.4)!.maxSingleWinAtTarget),
  1200,
);

// --- Next-trade parameters -------------------------------------------------
// Half a lot of gold at 4100: $50 per dollar of price, 10:1 metals leverage.
const setup = {
  symbol: "XAUUSD",
  direction: "buy" as const,
  entryPrice: 4100,
  lots: 0.5,
  riskFraction: 0.005,
  profitBookedToday: 0,
  marginCeiling: 0.5,
};

const at60 = planNextTrade(analysis, { ...setup, threshold: 0.6 });
check("risk in dollars", at60.riskUsd, 500);
check("stop distance", at60.stopDistance!, 10);
check("stop price", at60.stopPrice!, 4090);
check("margin used", Number((at60.marginFraction! * 100).toFixed(1)), 20.5);
check("largest lot size within the margin ceiling", at60.maxLotsByMargin!, 1.21);
check("upper bound of the compliant window", at60.maxProfit!, 2977.5, 0.5);
check("lower bound of the compliant window", Math.round(at60.minProfit), 1382, 1);
check("a single trade can restore the ratio at 60%", at60.windowOpen, true);
check("target profit", Math.round(at60.targetProfit!), 1382, 1);
check("target price", at60.targetPrice!, 4127.63, 0.02);
check("reward to risk", Number(at60.rewardRisk!.toFixed(2)), 2.76);
check(
  "warns that a smaller win cannot fix the concentration",
  at60.issues.some((i) => i.id === "mustExceedMinimum"),
  true,
);

// Losing trades sit in the denominator, so a drawdown alone can breach the
// ratio. At 60% the existing peak is already outside, hence a negative cushion,
// and aiming at the window's lower bound lands exactly on the limit.
check("loss cushion as things stand", Math.round(at60.lossHeadroomNow!), -1382, 1);
check("loss cushion if the target is hit", Math.round(at60.lossHeadroomAfterWin!), 0, 1);

const at20 = planNextTrade(analysis, { ...setup, threshold: 0.2 });
check("no single trade can reach 20%", at20.windowOpen, false);
check("target capped by the upper bound at 20%", Math.round(at20.targetProfit!), 496, 1);
check("winners still needed at 20%", at20.tradesNeeded!, 17);
check(
  "warns the compliant target is below the risk taken",
  at20.issues.some((i) => i.id === "targetBelowRisk"),
  true,
);

// Booking too much today closes the window for the rest of the day.
const usedUp = planNextTrade(analysis, {
  ...setup,
  threshold: 0.4,
  profitBookedToday: 1500,
});
check(
  "flags that the day cap is already spent",
  usedUp.issues.some((i) => i.id === "dayCapUsedUp"),
  true,
);

// A cycle with no profit yet: no ratio can be met by one trade, by definition.
const flat = analyze(
  parseTrades("Ticket,Close Time,Type,Volume,Symbol,Profit\n1,2026-09-01 10:00,Buy,0.50,XAUUSD,-200\n")
    .trades,
  DEFAULT_OPTIONS,
);
const fresh = planNextTrade(flat, { ...setup, threshold: 0.2 });
check("window undefined without profit", fresh.maxProfit, null);
check("ratio is not established on a fresh cycle", fresh.hasEstablishedRatio, false);
check("threshold does not bind yet", fresh.thresholdBinds, false);
check("no loss cushion until a ratio exists", fresh.lossHeadroomNow, null);
check("no after-win cushion either", fresh.lossHeadroomAfterWin, null);
check(
  "explains the first win is always 100% of profit",
  fresh.issues.some((i) => i.id === "noProfitYet"),
  true,
);
check("equal winners needed to hold 20%", fresh.minWinnersFromScratch, 5);
const fresh40 = planNextTrade(flat, { ...setup, threshold: 0.4 });
const fresh60 = planNextTrade(flat, { ...setup, threshold: 0.6 });
check("equal winners needed to hold 40%", fresh40.minWinnersFromScratch, 3);
check("equal winners needed to hold 60%", fresh60.minWinnersFromScratch, 2);
check("first-trade target stays at 1.5R regardless of ratio", fresh.targetProfit, fresh60.targetProfit);

const blank = analyze([], DEFAULT_OPTIONS);
check("empty history is a valid cycle", blank.trades.length, 0);
check("empty cycle net profit", blank.netProfit, 0);
const blankPlan = planNextTrade(blank, { ...setup, threshold: 0.4 });
check("empty cycle has no established ratio", blankPlan.hasEstablishedRatio, false);
check("empty cycle 40% needs 3 similar winners", blankPlan.minWinnersFromScratch, 3);

function checkPass(plan: ReturnType<typeof planNextTrade>, id: string) {
  return plan.checks.find((item) => item.id === id)?.pass ?? false;
}

check("suggested prices sit inside the selected limits", planRespectsLimits(at60), true);
check("suggested stop-side check passes", checkPass(at60, "stopSide"), true);
check("suggested target-max check passes", checkPass(at60, "targetMax"), true);

const typedMatch = planNextTrade(analysis, {
  ...setup,
  threshold: 0.6,
  stopPrice: at60.stopPrice,
  targetPrice: at60.targetPrice,
});
check("typing the suggested stop keeps the price", typedMatch.stopPrice!, at60.stopPrice!);
check("typing the suggested target keeps the price", typedMatch.targetPrice!, at60.targetPrice!, 0.02);
check("typing the suggested prices still respects the limits", planRespectsLimits(typedMatch), true);
check("typed matching plan is marked as a manual stop", typedMatch.manualStop, true);
check("typed matching plan is marked as a manual target", typedMatch.manualTarget, true);

const wrongStop = planNextTrade(analysis, {
  ...setup,
  threshold: 0.6,
  stopPrice: 4110,
});
check(
  "stop above entry on a buy is flagged",
  wrongStop.issues.some((i) => i.id === "stopWrongSide"),
  true,
);
check("wrong-side stop fails the side check", checkPass(wrongStop, "stopSide"), false);
check("wrong-side stop does not respect the limits", planRespectsLimits(wrongStop), false);

const wideStop = planNextTrade(analysis, {
  ...setup,
  threshold: 0.6,
  stopPrice: 4070,
});
check("a 30-dollar gold stop on 0.5 lot risks 1500", wideStop.riskUsd, 1500);
check(
  "stop wider than the working budget is flagged",
  wideStop.issues.some((i) => i.id === "riskOverWorkingBudget"),
  true,
);
check("wide stop fails the working-budget check", checkPass(wideStop, "riskWorking"), false);
check("wide stop still inside the 2% hard cap", checkPass(wideStop, "riskHardCap"), true);
check(
  "stop over the working budget does not respect the selected limits",
  planRespectsLimits(wideStop),
  false,
);

const overTarget = planNextTrade(analysis, {
  ...setup,
  threshold: 0.6,
  targetPrice: 4300,
});
check(
  "take-profit above the window is flagged",
  overTarget.issues.some((i) => i.id === "targetOverWindow"),
  true,
);
check("oversize take-profit fails the max-target check", checkPass(overTarget, "targetMax"), false);
check("oversize take-profit does not respect the limits", planRespectsLimits(overTarget), false);

const smallTarget = planNextTrade(analysis, {
  ...setup,
  threshold: 0.6,
  targetPrice: 4110,
});
check("a small take-profit still sits under the cap", checkPass(smallTarget, "targetMax"), true);
check(
  "a small take-profit fails the restore-the-ratio check",
  checkPass(smallTarget, "targetMin"),
  false,
);
check(
  "a small take-profit still respects the published limits",
  planRespectsLimits(smallTarget),
  true,
);

const sellWrongTarget = planNextTrade(analysis, {
  ...setup,
  direction: "sell",
  threshold: 0.6,
  targetPrice: 4200,
});
check(
  "take-profit above entry on a sell is flagged",
  sellWrongTarget.issues.some((i) => i.id === "targetWrongSide"),
  true,
);
check("wrong-side take-profit fails the side check", checkPass(sellWrongTarget, "targetSide"), false);
check("wrong-side take-profit does not respect the limits", planRespectsLimits(sellWrongTarget), false);

// --- Translations ----------------------------------------------------------
// Every key must exist in both languages, with the same shape, or the Italian
// UI silently renders "undefined" somewhere.
function shape(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) return value.flatMap((item, i) => shape(item, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      shape(child, path ? `${path}.${key}` : key),
    );
  }
  return [`${path}:${typeof value}`];
}

// Intl's currency style renders USD as "US$1,985" in en-GB and "1985 USD" in
// it-IT, so the formatters build the symbol themselves.
const enFmt = createFormatters(en.localeTag);
const itFmt = createFormatters(it.localeTag);
check("English currency", enFmt.usd(1985), "$1,985");
check("Italian currency", itFmt.usd(1985), "$1.985");
check("English decimals", enFmt.num(27.63, 2), "27.63");
check("Italian decimals", itFmt.num(27.63, 2), "27,63");
check("English percent", enFmt.pct(0.872), "87.2%");
check("Italian percent", itFmt.pct(0.872), "87,2%");

const enShape = shape(en).sort();
const itShape = shape(it).sort();
check("translation keys match", itShape.length, enShape.length);
const mismatched = enShape.filter((key, i) => itShape[i] !== key);
if (mismatched.length > 0) {
  failures += 1;
  console.error(`FAIL  translation shape differs\n      ${mismatched.slice(0, 5).join("\n      ")}`);
} else {
  console.log(`ok    translation shape identical  ->  ${enShape.length} leaves`);
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
