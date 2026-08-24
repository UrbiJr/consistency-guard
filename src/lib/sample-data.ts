/**
 * A reconstruction of Hola Prime funded account 131001, built only from figures
 * the compliance email itself asserted:
 *
 *   - pre-rebalance balance $101,985, so cycle net profit was $1,985
 *   - ticket 10371712 (XAUUSD buy) made $2,020
 *   - $2,020 / $1,985 = 101.76%, the exact percentage quoted in the email
 *   - two further winners of $1,730 and $1,625
 *   - every position was 1.00 lot
 *
 * Gross winnings therefore total $5,375 and losses total -$3,390. The individual
 * losing tickets, timestamps, prices and stop levels below are plausible filler,
 * not real records: they exist so the ratios can be demonstrated end to end.
 * Load a real export to replace all of it.
 */

export const SAMPLE_LABEL = "Reconstruction — account 131001";

export const SAMPLE_CSV = `Ticket,Open Time,Type,Volume,Symbol,Open Price,S/L,T/P,Close Time,Close Price,Commission,Swap,Profit
10298431,2026.08.10 09:14:00,Buy,1.00,XAUUSD,4032.40,4026.40,4052.40,2026.08.10 11:02:00,4026.63,-3.00,0.00,-577.00
10311902,2026.08.11 08:30:00,Buy,1.00,XAUUSD,4041.10,4035.10,4058.43,2026.08.11 14:12:00,4058.43,-3.00,0.00,1733.00
10322744,2026.08.12 10:05:00,Sell,1.00,XAUUSD,4055.20,4061.20,4035.20,2026.08.12 12:40:00,4061.27,-3.00,0.00,-607.00
10334185,2026.08.13 09:50:00,Buy,1.00,XAUUSD,4049.80,4043.80,4069.80,2026.08.13 13:20:00,4044.38,-3.00,0.00,-542.00
10349077,2026.08.17 08:45:00,Buy,1.00,XAUUSD,4062.50,4056.50,4078.78,2026.08.17 11:30:00,4078.78,-3.00,0.00,1628.00
10351236,2026.08.17 13:10:00,Sell,1.00,XAUUSD,4074.60,4080.60,4054.60,2026.08.17 15:05:00,4080.77,-3.00,0.00,-617.00
10360518,2026.08.18 09:20:00,Buy,1.00,XAUUSD,4068.30,4062.30,4088.30,2026.08.18 12:15:00,4063.18,-3.00,0.00,-512.00
10371712,2026.08.20 08:55:00,Buy,1.00,XAUUSD,4071.90,4065.90,4092.13,2026.08.20 13:40:00,4092.13,-3.00,0.00,2023.00
10374903,2026.08.20 14:30:00,Sell,1.00,XAUUSD,4095.40,4101.40,4075.40,2026.08.20 16:20:00,4100.57,-3.00,0.00,-517.00
`;

/** What the compliance email asserted, for side-by-side comparison. */
export const EMAIL_CLAIM = {
  ticket: "10371712",
  tradeProfit: 2020,
  assertedShare: 1.0176,
  preRebalanceBalance: 101_985,
  rebalancedTo: 100_000,
  profitRemoved: 1_985,
};

export const SAMPLE_FILENAME = "account-131001-reconstruction.csv";
