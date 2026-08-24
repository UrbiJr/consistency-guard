/**
 * Locale-aware formatters. Amounts stay in USD because that is the account
 * currency, but the thousands and decimal separators follow the display
 * language, so an Italian reader sees $1.985 rather than $1,985.
 */

export type Formatters = ReturnType<typeof createFormatters>;

export function createFormatters(locale: string) {
  /**
   * The dollar sign is written by hand rather than left to Intl's currency
   * style. Intl renders USD as "US$1,985" in en-GB and "1985 USD" in it-IT,
   * dropping the grouping separator entirely in the Italian case, and neither
   * is what a trader reads on a platform. Grouping and decimals still follow
   * the display language.
   */
  const usd = (value: number, fractionDigits = 0) =>
    `$${value.toLocaleString(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      useGrouping: true,
    })}`;

  const signedUsd = (value: number, fractionDigits = 0) => {
    const formatted = usd(Math.abs(value), fractionDigits);
    if (value > 0) return `+${formatted}`;
    if (value < 0) return `-${formatted}`;
    return formatted;
  };

  const pct = (value: number | null, fractionDigits = 1) => {
    if (value === null || !Number.isFinite(value)) return "—";
    return `${(value * 100).toLocaleString(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })}%`;
  };

  const num = (value: number | null, fractionDigits = 2) => {
    if (value === null || !Number.isFinite(value)) return "—";
    if (value === null || !Number.isFinite(value)) return "—";
    return value.toLocaleString(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      useGrouping: true,
    });
  };

  const shortDate = (date: Date | null) => {
    if (!date) return "—";
    return date.toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const dateTime = (date: Date | null) => {
    if (!date) return "—";
    return `${date.toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
    })} ${date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`;
  };

  return { usd, signedUsd, pct, num, shortDate, dateTime };
}

export function toneForValue(value: number): string {
  if (value > 0) return "text-positive";
  if (value < 0) return "text-negative";
  return "text-muted-foreground";
}
