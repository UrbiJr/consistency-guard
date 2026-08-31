export const en = {
  localeTag: "en-GB",
  languageName: "English",

  app: {
    name: "Consistency Guard",
    title: "Check the concentration of your profits before compliance does",
    intro:
      "Prop firms void profits when too much of an account's gain comes from one trade, one idea or one day. The limits are published as ratios, which means a perfectly sized trade can still breach them if the rest of the period gave the profit back. After a rebalance you can size the next order with no file at all. Load a trade history only once you have closed trades in the current cycle.",
  },

  setup: {
    title: "Account setup",
    desc: "These inputs decide every threshold on the page.",
    balance: "Initial account balance",
    balanceHint:
      "Every percentage limit is measured against this, not against current equity.",
    riskCap: "Risk cap per trade idea",
    riskCapHint: "Exceeding the cap is a hard breach, not a warning.",
    riskCap2: "2% — standard funded account",
    riskCap1: "1% — Prime Consistency Program",
    rollover: "Trading-day rollover",
    rolloverHint:
      "Timestamps are broker server time. Switching this can move a trade into the neighbouring day and change the consistency score.",
    rolloverMidnight: "Midnight — calendar day in the export",
    rollover17: "17:00 — daily-limit reset hour",
    cycleStart: "Cycle starts on",
    cycleStartHint:
      "Concentration is measured over a cycle. A rebalance or a payout starts a new one. Set this to today after a rebalance. You do not need an old export: the next-order panel works on an empty cycle.",
  },

  input: {
    dropTitle: "Drop your trade-history export here",
    dropDesc:
      "CSV from MT4, MT5, cTrader, DXtrade or Match-Trader — only once you have closed trades in this cycle. An old export puts the previous peak back into the ratio. Delimiters, column names and date formats are detected automatically. Everything is parsed in your browser and nothing is uploaded.",
    chooseFile: "Choose file",
    pasteToggle: "Paste instead",
    startFresh: "New cycle, no history",
    loadSample: "Load worked example",
    clear: "Clear",
    pasteLabel: "Paste the rows, including the header line",
    analysePasted: "Analyse pasted rows",
  },

  loaded: {
    summary: (filename: string, count: number) => `${filename} — ${count} trades`,
    skipped: (count: number) => `${count} non-trade row(s) skipped`,
    excluded: (count: number) => `${count} trade(s) before the cycle start excluded`,
  },

  errors: {
    title: "That export could not be read",
    fallback:
      "That file could not be read. A plain CSV export from the trading platform works best.",
    empty: "The file is empty.",
    noRows: "No readable rows were found in the file.",
    noHeader:
      "Could not find a header row. The export needs at least a profit column plus a symbol or ticket column.",
    noTradeRows:
      "The header was recognised but no trade rows could be read. Check that the profit column contains numbers.",
  },

  warnings: {
    title: "Some columns were missing",
    noDirectionColumn:
      "No buy/sell column was found, so every position was treated as a buy. Trade-idea grouping may merge opposing trades.",
    noDateColumn:
      "No date column was found. Per-day figures and the consistency score cannot be calculated.",
    noStopLossColumn:
      "No stop-loss column was found, so risk per trade idea cannot be verified against the limit.",
    unparsedDates: "Dates were present but none could be parsed. Per-day figures are unavailable.",
  },

  sample: {
    title: "You are looking at a worked example, not real records",
    body: (balance: string, ticket: string, profit: string) =>
      `This dataset is reconstructed from the figures a Hola Prime compliance email asserted about account 131001: a pre-rebalance balance of ${balance}, ticket ${ticket} worth ${profit}, and two further winners of $1,730 and $1,625. It reproduces their 101.76% figure exactly, which confirms the formula they used was a single trade divided by net cycle profit. The individual losing tickets and timestamps are filler. Load a real export to replace all of it.`,
  },

  empty: {
    title: "Nothing loaded yet",
    desc:
      "You can size the next order without a file. Export closed positions from this cycle only when you have some.",
    freshTitle: "New payout cycle",
    freshDesc:
      "There are no closed trades in this cycle, which is the right starting point after a rebalance. Set the cycle date above, then the stop, target, lot size and margin for the next order below. Load a CSV only after you have closed trades in this cycle — an old export would put the previous peak back into the ratio.",
    items: [
      {
        title: "Concentration",
        body: "Your largest trade, largest trade idea and best day, each as a share of net profit and of gross winnings, against the 60%, 40% and 20% marks.",
      },
      {
        title: "Risk and margin",
        body: "Stop-loss distance turned into a dollar risk per trade idea, with overlapping and sub-ten-minute re-entries chained together, plus peak simultaneous margin.",
      },
      {
        title: "Payout route",
        body: "Which of the three payout cycles you actually qualify for right now, and how much more profit each one still needs.",
      },
      {
        title: "Your next order",
        body: "Stop-loss and take-profit price levels, lot size and margin for the next trade, sized so that a win cannot push you past the ratio you choose.",
      },
    ],
  },

  metrics: {
    netProfit: "Net profit",
    ofInitial: (share: string) => `${share} of the initial balance`,
    consistency: "Consistency score",
    consistencyHint: "Biggest winning day over total profit",
    trades: "Trades",
    tradesHint: (wins: number, losses: number, ideas: number) =>
      `${wins} winners, ${losses} losers, ${ideas} trade ideas`,
    winRate: "Win rate",
    profitFactor: (value: string) => `Profit factor ${value}`,
    qualifyingDays: "Qualifying days",
    qualifyingHint: (minimum: string, total: number) =>
      `Days at or above ${minimum} net, out of ${total}`,
    peakMargin: "Peak margin used",
    peakMarginHint: "Estimated, against the 70% threshold",
  },

  severity: {
    ok: "Within limits",
    watch: "Watch",
    breach: "Over the limit",
    unknown: "Not enough data",
  },

  checks: {
    speculative: {
      title: "Profit concentration (clause 3.1)",
      headlineUndefined: "Net profit is not positive, so the ratio is undefined",
      headline: (share: string) =>
        `Largest trade idea is ${share} of net profit (limit 60%)`,
      detailUndefined:
        "Clause 3.1 divides by the account's overall profit. With a flat or negative account there is no meaningful denominator.",
      detail: (gross: string) =>
        `Measured against gross winnings instead of net profit the same trade idea is ${gross}. The clause does not state which denominator applies, and the two can fall on opposite sides of the limit.`,
    },
    consistency: {
      title: "Consistency score (on-demand payout)",
      headlineUndefined: "Not enough dated, profitable activity to score",
      headline: (score: string) =>
        `${score} — biggest winning day over total profit (limit 40%)`,
      detailOver: (required: string) =>
        `Above the on-demand gate. The published remedy is to keep trading until total profit reaches ${required}, not to remove profit. Bi-weekly and monthly cycles carry no published consistency gate.`,
      detailInside:
        "A score at or below 20% is described as excellent, and the current reading sits inside that band.",
      detailOutside:
        "A score at or below 20% is described as excellent. The current reading sits outside that band but within the on-demand gate.",
    },
    risk: {
      title: (limit: string) => `Risk per trade idea (${limit} hard breach)`,
      headlineNoData: "No stop-loss data in the export",
      headlineBreach: (count: number, limit: string) =>
        `${count} trade idea(s) risked more than ${limit}`,
      headlineOk: (limit: string) => `All priced trade ideas stayed within ${limit}`,
      detailMissing: (count: number) =>
        `${count} trade idea(s) have at least one leg with no stop loss on record. A position with no stop within 3 minutes is treated as infinite risk.`,
      detailOk:
        "Risk is measured from the stop-loss distance, with overlapping and sub-10-minute re-entries chained into one idea.",
    },
    margin: {
      title: "Margin utilisation (70% threshold)",
      headlineUnknown: "Not enough price or volume data to estimate margin",
      headline: (peak: string) =>
        `Peak simultaneous margin about ${peak} of the initial balance`,
      detail:
        "Estimated from published Prime leverage (metals 10:1, forex 50:1, indices 5:1, crypto 1:1). One lot of gold near $4,000 already ties up roughly 40% of a $100,000 account, so two open gold lots land close to the 70% line.",
    },
  },

  concentration: {
    title: "Where the profit came from",
    desc: "Clause 3.1 caps a “single trade idea, trading session, or isolated outcome” at 60% of the account’s overall profit, without saying whether the denominator is net profit or gross winnings. Both are shown, because the two readings can fall on opposite sides of the limit. The bars are scaled to 120% and marked at 20%, 40% and 60%.",
    largestTrade: "Largest single trade",
    largestIdea: "Largest trade idea",
    biggestDay: "Biggest winning day",
    ticket: (ticket: string) => `Ticket ${ticket}`,
    ideaLabel: (symbol: string, side: string, legs: number) =>
      `${symbol} ${side} (${legs} leg${legs === 1 ? "" : "s"})`,
    ofNet: "of net profit",
    ofGross: "of gross wins",
    peakValue: (value: string) => `Peak value ${value}`,
    netLabel: "Net profit (denominator A)",
    grossLabel: "Gross winnings (denominator B)",
    lossLabel: "Gross losses",
    footnote:
      "A ratio above 100% does not mean an oversized trade. It only means the losses in the period cancelled out most of the winnings, shrinking the denominator. On a net-profit basis a $200 win alongside $190 of losses scores 105% too.",
  },

  charts: {
    equityTitle: "Closed-trade balance",
    equityDesc: (drawdown: string) =>
      `Peak-to-trough decline of ${drawdown}. The dashed line is the initial balance.`,
    balance: "Balance",
    start: "Start",
    afterTrade: (index: number, ticket: string) =>
      `After trade ${index} — ticket ${ticket}`,
    closedTrades: "Closed trades",
    dailyTitle: "Profit by trading day",
    dailyDesc: (minimum: string) =>
      `The dashed line is ${minimum}, the minimum for a day to count towards a bi-weekly or monthly payout cycle.`,
    net: "Net",
    noDates: "No dates could be read from the export, so daily figures are unavailable.",
  },

  payout: {
    title: "Payout routes",
    desc: "Only the on-demand route carries a published consistency gate. The scheduled cycles are gated on qualifying days instead, which is often the easier path off a concentrated account.",
    eligible: "Eligible",
    blocked: "Blocked",
    yourShare: (split: string) => `your share at a ${split} split`,
    cycles: {
      biweekly: {
        label: "Bi-weekly",
        note: "No published consistency-score gate. Needs 3 days each at or above 0.5% of the initial balance.",
      },
      monthly: {
        label: "Monthly",
        note: "Highest split. Needs 7 days each at or above 0.5% of the initial balance.",
      },
      onDemand: {
        label: "On-demand",
        note: "Biggest winning day must stay at or below 40% of total account profit, and total profit must reach 2%.",
      },
    },
    blockers: {
      notInProfit: "The account is not in profit.",
      belowMinProfit: (share: string, amount: string) =>
        `Total profit is below the ${share} minimum (${amount}).`,
      consistencyTooHigh: (score: string, required: string, limit: string) =>
        `Consistency score is ${score}; total profit needs to reach ${required} to bring it to ${limit}.`,
      notEnoughDays: (have: number, need: number, minimum: string) =>
        `${have} of ${need} qualifying days (each needs ${minimum}+ net).`,
    },
  },

  planner: {
    title: "How large a win can you afford to take?",
    desc: "There is no fixed take-profit that is safe or unsafe. The published limits are all ratios, so a win is only ever “too big” relative to the total profit sitting in the account when the account is reviewed. Set a target and the cap follows.",
    targetLabel: "Total profit you plan to reach",
    targetHint: (share: string) => `${share} of the initial balance.`,
    ratioLabel: "Ratio you want to stay under",
    ratioHint:
      "Aiming at the limit leaves no room for a losing trade to shrink the denominator.",
    capLabel: "Cap per trade and per day",
    minWinners: "Minimum equal winners",
    spreadLabel: "Spread across at least",
    days: (count: number) => `${count} days`,
    capNote:
      "The cap applies to a whole trade idea and to a whole day, not to one ticket. Two same-direction entries on one symbol within ten minutes of each other count as one idea, and everything closed on the same day counts as one day.",
    goldTitle: "Gold position sizing for that cap",
    goldLot: (lots: string) => `${lots} lot XAUUSD`,
    goldMove: (margin: string) => `move to reach the cap · about ${margin} margin`,
    goldNote:
      "One lot of gold is $100 per dollar of price. Margin is estimated at the published 10:1 metals leverage with gold near $4,000, which is why a single lot already ties up roughly 40% of a $100,000 account.",
    tableTitle: "What your current peak already requires",
    colRatio: "Ratio",
    colRequired: "Total profit needed",
    colRemaining: "Still to earn",
    colCap: "Cap at your target",
    tableNote: (peak: string) =>
      `“Total profit needed” keeps your existing largest peak of ${peak} inside each ratio. Taking a partial payout resets the cycle, so the peak that matters is the one inside the current cycle.`,
    thresholds: {
      speculative: "60% — the clause 3.1 hard limit",
      onDemand: "40% — on-demand payout gate",
      excellent: "20% — the band described as excellent",
    },
  },

  nextTrade: {
    title: "Your next order",
    desc: "Type the entry, stop and take-profit you want to place. Lot size, risk budget and the rest still apply. The panel then tells you whether those prices stay inside the published limits, and what to change if they do not.",
    symbol: "Symbol",
    direction: "Direction",
    buy: "Buy",
    sell: "Sell",
    entry: "Intended entry price",
    lots: "Lot size",
    lotsHint: (suggested: string, ceiling: string) =>
      `Up to ${suggested} keeps margin within ${ceiling}.`,
    risk: "Risk budget for this trade idea",
    riskHint: (actual: string, budget: string) =>
      `${actual} at your stop. Budget ${budget}.`,
    useSuggested: "Use suggested stop and target",
    suggestedHint: (stop: string, target: string) =>
      `Suggested from the budget and the ratio: SL ${stop} · TP ${target}`,
    limitsTitle: "Do these levels respect the limits?",
    limitsPass: "Yes — this order stays inside the selected limits",
    limitsFail: "No — change a price, the lot size or the risk budget",
    threshold: "Concentration ratio to respect",
    thresholdBinding: "This ratio sets the highest compliant target below.",
    thresholdNotBinding: (winners: number) =>
      `With no profit in the cycle this ratio cannot cap the target yet, because the first win is 100% of profit whatever its size. What it does set is the plan: ${winners} similar-sized winners before the ratio is satisfied.`,
    marginCeiling: "Working margin ceiling",
    marginCeilingHint:
      "30% is the ceiling imposed inside the Prime Consistency Program. 70% is the excessive-margin threshold that justifies a rebalance on its own.",
    bookedToday: "Profit already booked today",
    bookedTodayHint:
      "Counts against the day cap, because the published consistency score uses the best day rather than the best trade.",
    orderTitle: "Place this order",
    entryLevel: "Entry",
    stopLevel: "Stop loss",
    targetLevel: "Take profit",
    maxTargetLevel: "Highest compliant target",
    distance: (value: string) => `${value} away`,
    riskLabel: "Risk",
    rewardRisk: "Reward to risk",
    margin: "Margin",
    windowTitle: "Compliant profit window",
    windowRange: (min: string, max: string) => `between ${min} and ${max}`,
    windowClosedShort: "no single trade can satisfy both bounds",
    windowUndefined: "undefined until the cycle is in profit",
    windowExplain:
      "The upper bound stops this trade becoming the new offending peak. The lower bound exists because a win that is too small barely moves the denominator, so it cannot pull an already-concentrated account back inside the ratio.",
    headroomTitle: "Loss the cycle can absorb",
    headroomNow: "As things stand",
    headroomAfterWin: "If this trade hits its target",
    headroomExplain:
      "The denominator is net profit with losing trades included, so compliance is never settled when a trade closes. A later drawdown shrinks the denominator and can push a win that was compliant at the time back over the limit. This is the cushion you have before that happens, and it is the reason to bank a payout rather than leave profit exposed.",
    headroomBreached: "already over the limit",
    plannedWinnersTitle: "Winners this ratio needs",
    plannedWinnersUnit: (count: number) => `${count} of similar size`,
    plannedWinnersExplain:
      "There is no cushion to report yet. A cycle with no profit has no ratio to erode, and the opening win is 100% of profit whatever its size, so no target avoids that. The cushion appears once a second result gives the ratio something to measure. Until then the ratio only tells you how many winners to plan for.",
    valuePerPoint: (value: string) => `${value} per 1.00 of price at this size`,
    noPrices: "Enter a symbol this tool can price to get stop and target levels.",
    issues: {
      unknownSymbol:
        "This symbol is not in the contract-size table, so dollar risk and price levels cannot be derived. Figures below are shown only where they do not depend on it.",
      riskOverHardCap: (risk: string, cap: string) =>
        `Risking ${risk} exceeds the ${cap} hard-breach cap on a single trade idea. Reduce the risk before placing this order.`,
      marginOverCeiling: (margin: string, ceiling: string) =>
        `Margin of ${margin} is above your ${ceiling} working ceiling. Still legal, but it leaves no room for a second position.`,
      marginOverHardLimit: (margin: string, limit: string) =>
        `Margin of ${margin} reaches the ${limit} excessive-margin threshold, which is grounds for a rebalance on its own. Cut the lot size.`,
      noProfitYet: (winners: number) =>
        `The cycle is not in profit yet, so no ratio can be satisfied by a single trade: the first win is 100% of profit by definition. Plan on at least ${winners} similar-sized winners before the ratio means anything, and keep them within the risk cap.`,
      dayCapUsedUp: (booked: string) =>
        `You have already booked ${booked} today, which is more than the day cap allows at this ratio. Another win today would make today the offending peak. Stop for the day.`,
      windowEmpty: (trades: number, target: string) =>
        `No single win can restore this ratio. At ${target} per win it takes about ${trades} more winners, because the existing peak only comes back inside the limit as total profit grows.`,
      mustExceedMinimum: (minimum: string) =>
        `A win below ${minimum} leaves the existing peak outside the ratio. Anything smaller is safe to take, it just will not fix the concentration on its own.`,
      targetBelowRisk: (target: string, risk: string) =>
        `The take-profit of ${target} is smaller than the ${risk} you are risking, so this setup is worse than break-even at a 50% hit rate. Cut the risk or raise the target.`,
      targetOverWindow: (target: string, max: string) =>
        `A win of ${target} sits above the ${max} cap at this ratio. Tighten the take-profit or wait until the cycle has more profit.`,
      stopWrongSide:
        "The stop is on the wrong side of the entry for this direction. On a buy it must sit below entry; on a sell, above.",
      targetWrongSide:
        "The take-profit is on the wrong side of the entry for this direction. On a buy it must sit above entry; on a sell, below.",
      stopTooTight:
        "Stop and entry are the same price, so the dollar risk cannot be measured. Move the stop.",
      riskOverWorkingBudget: (risk: string, budget: string) =>
        `This stop risks ${risk}, which is above the ${budget} you set as the working budget. It is still legal if it stays under the hard-breach cap, but it is larger than the size you chose.`,
      splitEntriesShareCap:
        "The risk cap applies to the whole trade idea. Splitting into several entries on the same symbol and direction, or re-entering within 10 minutes, shares this one budget rather than getting a new one.",
      lossErodesRatio: (headroom: string) =>
        `The cycle can absorb ${headroom} of further losses before your existing best result breaches the ratio on its own. Losing trades count in the denominator, so a drawdown raises the ratio without you placing a single oversized trade.`,
    },
    checks: {
      stopSide: {
        pass: "Stop is on the correct side of entry",
        fail: "Stop is on the wrong side of entry for this direction",
      },
      targetSide: {
        pass: "Take-profit is on the correct side of entry",
        fail: "Take-profit is on the wrong side of entry for this direction",
      },
      riskHardCap: {
        pass: (risk: string, cap: string) => `Risk at the stop is ${risk}, inside the ${cap} hard-breach cap`,
        fail: (risk: string, cap: string) => `Risk at the stop is ${risk}, over the ${cap} hard-breach cap`,
      },
      riskWorking: {
        pass: (risk: string, budget: string) => `Risk at the stop is ${risk}, inside the ${budget} budget`,
        fail: (risk: string, budget: string) => `Risk at the stop is ${risk}, above the ${budget} budget`,
      },
      marginHard: {
        pass: (margin: string, limit: string) => `Margin is ${margin}, below the ${limit} excessive-margin line`,
        fail: (margin: string, limit: string) => `Margin is ${margin}, at or above the ${limit} excessive-margin line`,
      },
      marginWorking: {
        pass: (margin: string, ceiling: string) => `Margin is ${margin}, inside the ${ceiling} working ceiling`,
        fail: (margin: string, ceiling: string) => `Margin is ${margin}, above the ${ceiling} working ceiling`,
      },
      targetMax: {
        pass: (profit: string, max: string) => `A win of ${profit} stays at or under the ${max} cap at this ratio`,
        fail: (profit: string, max: string) => `A win of ${profit} is above the ${max} cap at this ratio`,
        unknown: "The cycle is not in profit yet, so this win cannot be scored against a ratio",
      },
      targetMin: {
        pass: (min: string) => `This take-profit is large enough to pull the existing peak back inside the ratio (minimum ${min})`,
        fail: (min: string) => `This take-profit is below ${min}, so it will not pull the existing peak back inside the ratio`,
        unknown: "No minimum win applies until the cycle is in profit and already concentrated",
      },
      rewardRisk: {
        pass: (ratio: string) => `Reward to risk is ${ratio}:1`,
        fail: (ratio: string) => `Reward to risk is ${ratio}:1, worse than 1:1`,
        unknown: "Reward to risk cannot be measured until both stop and target are valid",
      },
    },
  },

  tables: {
    trades: (count: number) => `Trades (${count})`,
    ideas: (count: number) => `Trade ideas (${count})`,
    days: (count: number) => `Days (${count})`,
    ideasNote:
      "Same symbol and direction, either overlapping in time or reopened within ten minutes, chained into one idea. This is the unit the risk cap applies to.",
    colTicket: "Ticket",
    colClosed: "Closed",
    colOpened: "Opened",
    colSymbol: "Symbol",
    colSide: "Side",
    colLots: "Lots",
    colStop: "Stop",
    colNet: "Net",
    colShare: "% of net profit",
    colLegs: "Legs",
    colRisk: "Risk at stop",
    colMargin: "Margin",
    colDay: "Day",
    colTradeCount: "Trades",
    colCounts: "Counts for a cycle",
    noStop: "none",
    yes: "yes",
    no: "no",
    buy: "buy",
    sell: "sell",
  },

  reference: {
    title: "The published numbers",
    desc: "Transcribed from Hola Prime’s own pages. Review sites quote 20%, 35%, 40% and 60% for the concentration limit more or less interchangeably, so it is worth citing only the firm’s own wording.",
    quoteFooter: "Prohibited Trading Practices, clause 3.1. The",
    archiveLink: (date: string) => `archived version of ${date}`,
    quoteFooterEnd:
      "of the same page contains no concentration clause and no percentage at all.",
    facts: [
      { label: "Risk per trade idea, funded account", value: "2% of initial balance — hard breach" },
      { label: "Risk per trade idea, inside the Consistency Program", value: "1% — hard breach" },
      { label: "Stop-loss deadline", value: "Within 3 minutes of opening, else treated as infinite risk" },
      { label: "One trade idea", value: "Same symbol and direction, overlapping or reopened within 10 minutes" },
      { label: "Excessive margin", value: "70% utilisation or above" },
      { label: "Aggregate margin inside the Consistency Program", value: "30% ceiling" },
      { label: "Profit concentration", value: "Above 60% of overall profit from one idea, session or outcome" },
      { label: "Consistency score", value: "Biggest winning day ÷ current total account profit" },
      { label: "On-demand payout", value: "Score at or below 40%, plus 2% minimum total profit, 80% split" },
      { label: "Bi-weekly payout", value: "3 qualifying days in 14, 80% split" },
      { label: "Monthly payout", value: "7 qualifying days in 30, 95% split" },
      { label: "Qualifying day", value: "Closed net profit of at least 0.5% of the initial balance" },
    ],
  },

  footer: {
    text: "Rule values are transcribed from Hola Prime’s published pages and were checked in August 2026. Firms change these terms without notice, so confirm against the live pages and your own account agreement before acting. This is a calculator, not legal or financial advice, and it has no connection to Hola Prime.",
  },
};

export type Dict = typeof en;
