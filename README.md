# Consistency Guard

A browser-based checker that measures a prop-firm funded account against the
concentration, risk and payout rules Hola Prime publishes, before a compliance
team measures it for you.

It exists because of a specific failure mode. Prop firms cap how much of an
account's profit may come from a single trade, a single "trade idea" or a single
day. Those caps are **ratios**, not dollar amounts, so a correctly sized trade
with a tight stop can still breach them — not because the trade was too large,
but because later losses shrank the denominator. A $2,020 win looks like 38% of
profits on one reading and 102% on another, and only one of those numbers gets
quoted back at you.

This tool computes both readings, side by side, from your own trade history.

## What it checks

| Area | What you get |
| --- | --- |
| Concentration | Largest trade, largest trade idea and best day, each as a share of **net profit** and of **gross winnings**, marked against the 60%, 40% and 20% thresholds |
| Trade ideas | Positions chained per the published definition: same symbol and direction, overlapping in time or reopened within 10 minutes |
| Risk | Stop-loss distance converted to dollar risk per trade idea, against the 2% hard-breach cap (or 1% under the Prime Consistency Program) |
| Margin | Peak *simultaneous* margin from published Prime leverage, against the 70% "excessive margin" threshold |
| Payouts | Which of the bi-weekly, monthly and on-demand routes you qualify for now, and what each still needs |
| Next order | Type entry, stop and take-profit (or let the tool suggest them), then a pass/fail checklist against risk, margin and the concentration window |
| Planning | Given a profit target, the maximum win you can take per trade idea and per day, plus gold position sizing for that cap |

## Sizing the next order

This is the part you use before clicking buy. Enter the symbol, direction,
intended entry, **stop loss**, **take profit**, lot size, the risk you want to
take and the ratio you want to respect. The panel then tells you whether those
prices stay inside the selected limits — stop on the right side, dollar risk
versus the working budget and the 2% hard cap, margin versus the working ceiling
and the 70% line, take-profit versus the concentration window.

Leave stop or target empty (or hit “use suggested”) and the tool still sizes them
for you from the budget and the ratio. Once you type your own prices, those
are the order: the engine checks them instead of overwriting them.

The interesting output is the **compliant profit window**. Writing `N` for the
profit already in the cycle, `L` for the largest existing peak (whichever is
bigger of the largest trade idea and the best day), `D` for profit already
booked today and `T` for the ratio, a winning trade of `P` leaves you compliant
only when both of these hold:

```
D + P <= T x (N + P)     ->   P <= (T x N - D) / (1 - T)     upper bound
L     <= T x (N + P)     ->   P >= L / T - N                 lower bound
```

The lower bound is the counter-intuitive half, and it is the part traders get
wrong. When an account is already over concentrated, a win that is *too small*
cannot fix it, because it barely moves the denominator. If the two bounds cross,
no single trade can restore the ratio at all and the tool says how many smaller
wins it takes instead.

On the reconstructed account, at the 60% limit the window is roughly $1,382 to
$2,978 — so one more decent win would have restored compliance. At the 20% band
the window is empty and it takes about 17 further wins, which is a concrete
answer to "how long until this is clean again".

The panel also refuses to flatter you: it flags when the compliant target is
smaller than the risk you are taking (a setup that loses money at a 50% hit
rate), when the day's profit cap is already spent, and when margin crosses your
working ceiling or the 70% line.

## Languages

English and Italian, switchable in the header and remembered in `localStorage`.
Numbers follow the display language, so the same figure reads `$1,985` or
`$1.985`. `npm run selfcheck` asserts that both dictionaries have an identical
key shape, because a missing translation would otherwise render as blank text
rather than failing loudly.

Every threshold is transcribed from Hola Prime's own pages, quoted in
`src/lib/rules.ts` with a link. Third-party review sites report the
concentration limit as 20%, 35%, 40% and 60% more or less interchangeably; none
of those secondary figures are used.

## Public site

Live at [https://urbijr.github.io/consistency-guard/](https://urbijr.github.io/consistency-guard/).
Parsing still happens only in your browser; the hosted copy does not receive your CSV.

## Running it

```bash
npm install
npm run dev          # http://localhost:43917
```

```bash
npm run selfcheck    # asserts the engine against a real compliance dispute
npm run lint
npm run build
```

`npm run selfcheck` is the important one. It parses the reconstructed dataset in
`src/lib/sample-data.ts` and asserts, among other things, that the largest trade
comes to **101.76%** of net profit — the exact figure a Hola Prime compliance
email quoted for account 131001. Reproducing it confirms the formula the firm
applied was *one trade divided by net cycle profit*, and any change that breaks
that assertion would have produced the wrong number in a live dispute.

## Loading your history

Drop in a closed-position CSV export from MT4, MT5, cTrader, DXtrade or
Match-Trader. Delimiter, header position, column names, decimal comma and the
common date formats are all detected. Parsing happens entirely in the browser;
nothing is uploaded anywhere.

The parser needs a profit column plus a symbol or ticket column. Without dates
it cannot produce daily figures or a consistency score, and without a stop-loss
column it cannot verify risk per trade idea — it says so rather than guessing.

Four inputs drive every threshold on the page: the **initial balance** (all
percentage limits are measured against this, never against current equity), the
**risk cap** (2% standard, 1% inside the Prime Consistency Program), the **day
rollover hour**, which matters because moving a trade across the day boundary
changes the consistency score, and the **cycle start date**.

Set the cycle start whenever a rebalance or a payout has reset your cycle.
Concentration is measured per cycle, so an export that still contains the old
history would otherwise report a peak that no longer counts against you.

## Case notes

`docs/` contains the analysis this tool was built to support: how the 101.76%
figure was reconstructed, which arguments in the dispute hold up and which do
not, and the trading parameters that stay inside every published limit.

## Caveats

Rule values were checked in August 2026 and firms change terms without notice —
confirm against the live pages and your own account agreement. Margin figures
are estimates from published leverage, not broker-reported values. This is a
calculator, not legal or financial advice, and it has no connection to Hola
Prime.
