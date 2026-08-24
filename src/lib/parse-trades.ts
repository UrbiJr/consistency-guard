/**
 * Tolerant parser for broker trade-history exports.
 *
 * MT4/MT5/cTrader/DXtrade all export "CSV" with different delimiters, different
 * column names, a variable number of preamble rows, and localised number and date
 * formats. Rather than demand one shape, this scans for the header row and maps
 * whatever it finds onto a common trade record.
 */

export type Direction = "buy" | "sell";

export type Trade = {
  id: string;
  ticket: string;
  symbol: string;
  direction: Direction;
  volume: number | null;
  openTime: Date | null;
  closeTime: Date | null;
  openPrice: number | null;
  closePrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  /** The broker's profit column, before commission and swap. */
  grossProfit: number;
  commission: number;
  swap: number;
  fee: number;
  /** grossProfit + commission + swap + fee, i.e. what actually hit the balance. */
  netProfit: number;
};

/** Warnings are codes rather than sentences so the UI can localise them. */
export type ParseWarning =
  | "noDirectionColumn"
  | "noDateColumn"
  | "noStopLossColumn"
  | "unparsedDates";

export type ParseErrorCode = "empty" | "noRows" | "noHeader" | "noTradeRows";

export type ParseResult = {
  trades: Trade[];
  warnings: ParseWarning[];
  /** Header names found in the file, useful when a mapping looks wrong. */
  detectedColumns: Record<string, string>;
  skippedRows: number;
};

export class TradeParseError extends Error {
  constructor(readonly code: ParseErrorCode) {
    super(code);
    this.name = "TradeParseError";
  }
}

const DELIMITERS = [",", ";", "\t", "|"] as const;

function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 40).join("\n");
  let best = ",";
  let bestScore = -1;
  for (const d of DELIMITERS) {
    const counts = sample
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => line.split(d).length);
    if (counts.length === 0) continue;
    const max = Math.max(...counts);
    if (max <= 1) continue;
    // Prefer the delimiter that yields the most columns, consistently.
    const modal = counts.filter((c) => c === max).length;
    const score = max * 10 + modal;
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

/** Minimal RFC4180-style splitter: handles quoted fields and escaped quotes. */
function splitRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

const COLUMN_ALIASES: Record<string, string[]> = {
  ticket: ["ticket", "position", "positionid", "position_id", "deal", "dealid", "order", "orderid", "id", "tradeid", "trade_id", "no"],
  symbol: ["symbol", "instrument", "asset", "pair", "market", "product", "ticker"],
  direction: ["type", "side", "direction", "action", "buysell", "buy/sell", "ordertype", "tradetype"],
  volume: ["volume", "lots", "lot", "size", "lotsize", "quantity", "qty", "amount", "units", "closedvolume"],
  openTime: ["opentime", "open_time", "timeopen", "entrytime", "entry_time", "openingtime", "opened", "time", "datetime", "date", "opendate"],
  closeTime: ["closetime", "close_time", "timeclose", "exittime", "exit_time", "closingtime", "closed", "closedate"],
  openPrice: ["openprice", "open_price", "priceopen", "entryprice", "entry_price", "entry", "open", "price"],
  closePrice: ["closeprice", "close_price", "priceclose", "exitprice", "exit_price", "exit", "close"],
  stopLoss: ["sl", "stoploss", "stop_loss", "s/l", "stop"],
  takeProfit: ["tp", "takeprofit", "take_profit", "t/p", "target"],
  grossProfit: ["profit", "pnl", "p/l", "pl", "netpl", "net", "grossprofit", "gross_profit", "profitloss", "profit/loss", "result", "netprofit", "net_profit", "realizedpl", "realisedpl"],
  commission: ["commission", "commissions", "comm", "fees"],
  swap: ["swap", "swaps", "rollover", "interest", "financing"],
  fee: ["fee", "charges", "othercharges"],
};

function canonicalise(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9/]/g, "");
}

function buildColumnMap(header: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const used = new Set<number>();

  // Exact matches first so that "Close Price" never steals the "Price" slot.
  for (const pass of [0, 1]) {
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (map[field] !== undefined) continue;
      for (let i = 0; i < header.length; i += 1) {
        if (used.has(i)) continue;
        const cell = canonicalise(header[i]);
        if (!cell) continue;
        const hit = pass === 0 ? aliases.includes(cell) : aliases.some((a) => cell.includes(a));
        if (hit) {
          map[field] = i;
          used.add(i);
          break;
        }
      }
    }
  }
  return map;
}

function looksLikeHeader(row: string[]): boolean {
  const map = buildColumnMap(row);
  const hasMoney = map.grossProfit !== undefined;
  const hasIdentity = map.symbol !== undefined || map.ticket !== undefined;
  const mostlyText = row.filter((c) => c.trim() && !/^-?[\d.,\s]+$/.test(c.trim())).length >= 3;
  return hasMoney && hasIdentity && mostlyText;
}

function parseNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  let s = raw.trim();
  if (!s || s === "-" || s === "—" || /^n\/?a$/i.test(s)) return null;

  const negative = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()]/g, "").replace(/^[-+]/, "");
  s = s.replace(/[^\d.,]/g, "");
  if (!s) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // Whichever separator comes last is the decimal point.
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    const decimals = s.length - lastComma - 1;
    // "1,234" is thousands; "1,23" is a decimal comma.
    s = decimals === 3 && s.indexOf(",") === lastComma && s.length > 4
      ? s.replace(/,/g, "")
      : s.replace(",", ".");
  }

  const value = Number.parseFloat(s);
  if (Number.isNaN(value)) return null;
  return negative ? -value : value;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  // MT5: 2026.08.14 15:04:32 — and ISO-ish variants.
  let m = s.match(
    /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (m) {
    return new Date(
      Number(m[1]), Number(m[2]) - 1, Number(m[3]),
      Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0),
    );
  }

  // 14/08/2026 15:04 or 14.08.2026 — day first, which is the common broker default.
  m = s.match(
    /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (m) {
    return new Date(
      Number(m[3]), Number(m[2]) - 1, Number(m[1]),
      Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0),
    );
  }

  // 14 Aug 2026 15:04
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (month !== undefined) {
      return new Date(
        Number(m[3]), month, Number(m[1]),
        Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0),
      );
    }
  }

  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function parseDirection(raw: string | undefined): Direction | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (/\b(buy|long|bought|acquisto|compra)\b/.test(s) || s.trim() === "0") return "buy";
  if (/\b(sell|short|sold|vendita|vendi)\b/.test(s) || s.trim() === "1") return "sell";
  if (s.includes("buy")) return "buy";
  if (s.includes("sell")) return "sell";
  return null;
}

/** Rows that are cash movements or report furniture rather than trades. */
function isNonTradeRow(row: string[], map: Record<string, number>): boolean {
  const joined = row.join(" ").toLowerCase();
  if (/^\s*(balance|credit|deposit|withdrawal|rebalance|adjustment)\b/i.test(row[map.direction ?? -1] ?? "")) {
    return true;
  }
  if (/\b(total|totals|summary|closed p\/l|floating p\/l|grand total|subtotal)\b/.test(joined)) {
    const numeric = row.filter((c) => parseNumber(c) !== null).length;
    return numeric <= 3;
  }
  return false;
}

export function parseTrades(text: string): ParseResult {
  if (!text.trim()) throw new TradeParseError("empty");

  const delimiter = detectDelimiter(text);
  const rows = splitRows(text, delimiter);
  if (rows.length === 0) throw new TradeParseError("noRows");

  const headerIndex = rows.findIndex((row, i) => i < 40 && looksLikeHeader(row));
  if (headerIndex === -1) throw new TradeParseError("noHeader");

  const header = rows[headerIndex];
  const map = buildColumnMap(header);
  const warnings: ParseWarning[] = [];
  const trades: Trade[] = [];
  let skippedRows = 0;

  const cell = (row: string[], field: string): string | undefined => {
    const index = map[field];
    return index === undefined ? undefined : row[index];
  };

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (looksLikeHeader(row)) continue;
    if (isNonTradeRow(row, map)) {
      skippedRows += 1;
      continue;
    }

    const grossProfit = parseNumber(cell(row, "grossProfit"));
    const symbol = (cell(row, "symbol") ?? "").trim();
    if (grossProfit === null || !symbol) {
      skippedRows += 1;
      continue;
    }

    const commission = parseNumber(cell(row, "commission")) ?? 0;
    const swap = parseNumber(cell(row, "swap")) ?? 0;
    const fee = parseNumber(cell(row, "fee")) ?? 0;
    const direction = parseDirection(cell(row, "direction")) ?? "buy";
    const openTime = parseDate(cell(row, "openTime"));
    const closeTime = parseDate(cell(row, "closeTime")) ?? openTime;
    const ticket = (cell(row, "ticket") ?? "").trim() || `row-${i}`;

    trades.push({
      id: `${ticket}-${i}`,
      ticket,
      symbol,
      direction,
      volume: parseNumber(cell(row, "volume")),
      openTime,
      closeTime,
      openPrice: parseNumber(cell(row, "openPrice")),
      closePrice: parseNumber(cell(row, "closePrice")),
      stopLoss: parseNumber(cell(row, "stopLoss")) || null,
      takeProfit: parseNumber(cell(row, "takeProfit")) || null,
      grossProfit,
      commission,
      swap,
      fee,
      netProfit: grossProfit + commission + swap + fee,
    });
  }

  if (trades.length === 0) throw new TradeParseError("noTradeRows");

  if (map.direction === undefined) warnings.push("noDirectionColumn");
  if (map.closeTime === undefined && map.openTime === undefined) {
    warnings.push("noDateColumn");
  }
  if (map.stopLoss === undefined) warnings.push("noStopLossColumn");
  if (trades.every((t) => t.closeTime === null)) warnings.push("unparsedDates");

  const detectedColumns: Record<string, string> = {};
  for (const [field, index] of Object.entries(map)) {
    detectedColumns[field] = header[index]?.trim() || `column ${index + 1}`;
  }

  return { trades, warnings, detectedColumns, skippedRows };
}
