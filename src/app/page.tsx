"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Info, ShieldCheck } from "lucide-react";

import { Charts } from "@/components/charts";
import { ConcentrationPanel } from "@/components/concentration-panel";
import { DataInput } from "@/components/data-input";
import { DataTables } from "@/components/data-tables";
import { LanguageSwitch } from "@/components/language-switch";
import { MetricStrip } from "@/components/metric-strip";
import { NextTradePanel } from "@/components/next-trade-panel";
import { Planner } from "@/components/planner";
import { PayoutPanel } from "@/components/payout-panel";
import { RuleChecks } from "@/components/rule-checks";
import { RuleReference } from "@/components/rule-reference";
import { SetupBar } from "@/components/setup-bar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  analyze,
  assessPayout,
  evaluateRules,
  DEFAULT_OPTIONS,
  type AnalysisOptions,
} from "@/lib/analyze";
import { useI18n } from "@/lib/i18n";
import { parseTrades, TradeParseError, type ParseResult } from "@/lib/parse-trades";
import { EMAIL_CLAIM, SAMPLE_CSV, SAMPLE_FILENAME } from "@/lib/sample-data";

type Loaded = {
  filename: string;
  parsed: ParseResult;
  isSample: boolean;
};

export default function Home() {
  const { t, f } = useI18n();
  const [options, setOptions] = useState<AnalysisOptions>(DEFAULT_OPTIONS);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = (text: string, filename: string, isSample = false) => {
    try {
      const parsed = parseTrades(text);
      setLoaded({ filename, parsed, isSample });
      setError(null);
    } catch (cause) {
      setLoaded(null);
      setError(cause instanceof TradeParseError ? t.errors[cause.code] : t.errors.fallback);
    }
  };

  const analysis = useMemo(
    () => analyze(loaded?.parsed.trades ?? [], options),
    [loaded, options],
  );
  const checks = useMemo(() => evaluateRules(analysis), [analysis]);
  const payouts = useMemo(() => assessPayout(analysis), [analysis]);
  const hasClosedTrades = analysis.trades.length > 0;

  const startFreshCycle = () => {
    setLoaded(null);
    setError(null);
    if (!options.cycleStart) {
      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      setOptions({ ...options, cycleStart: stamp });
    }
    requestAnimationFrame(() => {
      document.getElementById("next-order")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="size-5" aria-hidden />
              <span className="text-xs font-semibold tracking-wide uppercase">{t.app.name}</span>
            </div>
            <LanguageSwitch />
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t.app.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {t.app.intro}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.setup.title}</CardTitle>
            <CardDescription>{t.setup.desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SetupBar options={options} onChange={setOptions} />
            <DataInput
              onText={(text, filename) => load(text, filename)}
              onLoadSample={() => load(SAMPLE_CSV, SAMPLE_FILENAME, true)}
              onStartFresh={startFreshCycle}
              hasData={loaded !== null}
              onClear={() => {
                setLoaded(null);
                setError(null);
              }}
            />
          </CardContent>
        </Card>

        {error ? (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden />
            <AlertTitle>{t.errors.title}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loaded?.isSample ? (
          <Alert>
            <Info aria-hidden />
            <AlertTitle>{t.sample.title}</AlertTitle>
            <AlertDescription>
              <p>
                {t.sample.body(
                  f.usd(EMAIL_CLAIM.preRebalanceBalance),
                  EMAIL_CLAIM.ticket,
                  f.usd(EMAIL_CLAIM.tradeProfit),
                )}
              </p>
            </AlertDescription>
          </Alert>
        ) : null}

        {loaded ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {[
                t.loaded.summary(loaded.filename, analysis.trades.length),
                loaded.parsed.skippedRows > 0
                  ? t.loaded.skipped(loaded.parsed.skippedRows)
                  : null,
                analysis.excludedByCycleStart > 0
                  ? t.loaded.excluded(analysis.excludedByCycleStart)
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <span className="font-mono">
              {Object.entries(loaded.parsed.detectedColumns)
                .map(([field, column]) => `${field}→${column}`)
                .join("  ")}
            </span>
          </div>
        ) : null}

        {loaded?.parsed.warnings.length ? (
          <Alert>
            <AlertTriangle aria-hidden />
            <AlertTitle>{t.warnings.title}</AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-4">
                {loaded.parsed.warnings.map((warning) => (
                  <li key={warning}>{t.warnings[warning]}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        {!hasClosedTrades ? (
          <Alert>
            <Info aria-hidden />
            <AlertTitle>{t.empty.freshTitle}</AlertTitle>
            <AlertDescription>{t.empty.freshDesc}</AlertDescription>
          </Alert>
        ) : null}

        {hasClosedTrades ? (
          <>
            <MetricStrip analysis={analysis} />
            <RuleChecks checks={checks} />
          </>
        ) : null}

        <NextTradePanel analysis={analysis} />

        {hasClosedTrades ? (
          <>
            <ConcentrationPanel analysis={analysis} />
            <Charts analysis={analysis} />
            <PayoutPanel readiness={payouts} />
            <Planner analysis={analysis} />
            <DataTables
              analysis={analysis}
              highlightTicket={loaded?.isSample ? EMAIL_CLAIM.ticket : undefined}
            />
          </>
        ) : null}

        <RuleReference />

        <footer className="border-t pt-6 pb-2 text-xs leading-relaxed text-muted-foreground">
          <p>{t.footer.text}</p>
        </footer>
      </main>
    </div>
  );
}
