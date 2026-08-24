/**
 * Hola Prime rule parameters, transcribed from the firm's own published pages.
 *
 * Every threshold here is quoted rather than inferred, because in a compliance
 * dispute the only numbers worth citing are the ones the firm published itself.
 * Third-party review sites disagree wildly on these values (20% / 35% / 40% /
 * 60% all appear in circulation) — none of those are used here.
 */

export type RuleSource = {
  label: string;
  url: string;
};

export const SOURCES = {
  prohibited: {
    label: "Prohibited Trading Practices",
    url: "https://holaprime.com/trading-rules-list/trading-rules-prohibited-trading-practices",
  },
  consistency: {
    label: "Risk Control — Consistency",
    url: "https://holaprime.com/risk-control/consistency/",
  },
  primeChallenge: {
    label: "Prime Challenge — rules, risk & rewards",
    url: "https://holaprime.com/forex/faq/hola-prime-challenges/hola-prime-1-step-prime-challenge/",
  },
  pcp: {
    label: "Prime Consistency Program",
    url: "https://holaprime.com/forex/faq/prime-consistency-program/what-is-hola-primes-prime-consistency-program",
  },
  payouts: {
    label: "Payout Request, Eligibility & KYC",
    url: "https://holaprime.com/forex/faq/payouts/payout-request-eligibility-kyc/",
  },
} satisfies Record<string, RuleSource>;

/**
 * Clause 3.1 of Prohibited Trading Practices, as published (checked Aug 2026).
 * Note the numeric threshold: the compliance emails circulating in Aug 2026
 * paraphrase this clause *without* the 60% figure.
 */
export const SPECULATIVE_CONCENTRATION_LIMIT = 0.6;

export const SPECULATIVE_CLAUSE_QUOTE =
  "Trading activity must demonstrate consistent profitability across a meaningful " +
  "number of trades. If more than 60% of the account's overall profit is derived " +
  "from a single trade idea, trading session, or isolated outcome, such activity " +
  "will be classified as speculative trading. The profits from such trades shall " +
  "be reversed and the trader may be placed under Prime Consistency Program.";

/**
 * The clause above is absent from the 7 Dec 2025 snapshot of the same page:
 * http://web.archive.org/web/20251207010843/https://holaprime.com/trading-rules-list/trading-rules-prohibited-trading-practices/
 * Hola Prime also date-gates rules by purchase date elsewhere ("For accounts sold
 * on and after 15th September 2025, your loss on a single trade idea..."), which
 * makes the effective date of this clause a fair question to put to them.
 */
export const SPECULATIVE_CLAUSE_ABSENT_BEFORE = "2025-12-07";

/** On-demand payout gate. Numerator is the biggest winning DAY, not a single trade. */
export const ON_DEMAND_CONSISTENCY_LIMIT = 0.4;

/** Direct-model accounts only, per the Risk Control page. */
export const DIRECT_MODEL_CONSISTENCY_LIMIT = 0.15;

/** "A Consistency Score above 20% is considered excellent" — Risk Control page. */
export const CONSISTENCY_EXCELLENT = 0.2;

/** Risk per trade idea on funded accounts. Hard breach if exceeded. */
export const MAX_RISK_PER_IDEA = 0.02;

/** Reduced cap applied to accounts inside the Prime Consistency Program. */
export const PCP_MAX_RISK_PER_IDEA = 0.01;

/** Margin utilisation at or above this is "excessive" and triggers a rebalance. */
export const MAX_MARGIN_UTILISATION = 0.7;

/** Aggregate margin cap inside the Prime Consistency Program. */
export const PCP_MAX_MARGIN_UTILISATION = 0.3;

/** A day counts as a "profitable trading day" only at or above this. */
export const PROFITABLE_DAY_MIN = 0.005;

/** Minimum total profit before an on-demand payout can be requested. */
export const ON_DEMAND_MIN_PROFIT = 0.02;

/** Positions chained into one trade idea if reopened within this window. */
export const REENTRY_WINDOW_MINUTES = 10;

/** A stop loss must exist within this many minutes of opening a position. */
export const STOP_LOSS_DEADLINE_MINUTES = 3;

export type PayoutCycle = "biweekly" | "monthly" | "onDemand";

export const PAYOUT_CYCLES: Record<
  PayoutCycle,
  {
    label: string;
    split: number;
    /** Minimum qualifying profitable days, null when the cycle has no such gate. */
    minProfitableDays: number | null;
    /** Consistency-score gate, null when the cycle has no such gate. */
    consistencyLimit: number | null;
    windowDays: number | null;
    minTotalProfit: number | null;
    note: string;
  }
> = {
  biweekly: {
    label: "Bi-weekly",
    split: 0.8,
    minProfitableDays: 3,
    consistencyLimit: null,
    windowDays: 14,
    minTotalProfit: null,
    note: "No published consistency-score gate. Needs 3 days each at or above 0.5% of the initial balance.",
  },
  monthly: {
    label: "Monthly",
    split: 0.95,
    minProfitableDays: 7,
    consistencyLimit: null,
    windowDays: 30,
    minTotalProfit: null,
    note: "Highest split. Needs 7 days each at or above 0.5% of the initial balance.",
  },
  onDemand: {
    label: "On-demand",
    split: 0.8,
    minProfitableDays: null,
    consistencyLimit: ON_DEMAND_CONSISTENCY_LIMIT,
    windowDays: null,
    minTotalProfit: ON_DEMAND_MIN_PROFIT,
    note: "Biggest winning day must stay at or below 40% of total account profit, and total profit must reach 2%.",
  },
};

/**
 * Contract sizes used to turn a stop-loss distance into a dollar risk figure.
 * Deliberately conservative and USD-quote only; anything unrecognised is
 * reported as unknown rather than silently mis-priced.
 */
export const CONTRACT_SIZES: Record<string, number> = {
  XAUUSD: 100,
  XAGUSD: 5000,
  XPTUSD: 100,
  XPDUSD: 100,
  BTCUSD: 1,
  ETHUSD: 1,
  US30: 1,
  NAS100: 1,
  SPX500: 1,
  GER40: 1,
  UK100: 1,
  USOIL: 1000,
  UKOIL: 1000,
  XTIUSD: 1000,
};

/** Leverage published for Prime accounts, used for the margin estimate. */
export const PRIME_LEVERAGE: Record<string, number> = {
  forex: 50,
  exotics: 5,
  commodities: 2,
  indices: 5,
  metals: 10,
  crypto: 1,
};

export function normaliseSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export type AssetClass = keyof typeof PRIME_LEVERAGE;

export function classifySymbol(symbol: string): AssetClass {
  const s = normaliseSymbol(symbol);
  if (/^(XAU|XAG|XPT|XPD)/.test(s)) return "metals";
  if (/^(BTC|ETH|SOL|XRP|LTC|ADA|DOGE)/.test(s)) return "crypto";
  if (/(US30|NAS100|SPX500|GER40|UK100|JP225|AUS200|HK50|EU50)/.test(s)) return "indices";
  if (/(OIL|XTI|XBR|NGAS)/.test(s)) return "commodities";
  if (/(TRY|ZAR|MXN|SEK|NOK|HUF|PLN|CZK|DKK|SGD|HKD|CNH|THB)/.test(s)) return "exotics";
  return "forex";
}

/**
 * Contract size for a symbol, defaulting FX pairs to the standard 100,000 units.
 * Returns null when the symbol is not recognised, so callers can surface that
 * rather than present a fabricated risk number.
 */
export function contractSizeFor(symbol: string): number | null {
  const s = normaliseSymbol(symbol);
  const direct = Object.keys(CONTRACT_SIZES).find((key) => s.startsWith(key));
  if (direct) return CONTRACT_SIZES[direct];
  if (/^[A-Z]{6}$/.test(s)) return 100_000;
  return null;
}
