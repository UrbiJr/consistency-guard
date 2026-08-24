"use client";

import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RuleCheck } from "@/lib/analyze";
import { useI18n } from "@/lib/i18n";
import { SOURCES } from "@/lib/rules";
import { SEVERITY_ORDER, SEVERITY_STYLES } from "@/lib/severity";
import { cn } from "@/lib/utils";

export function RuleChecks({ checks }: { checks: RuleCheck[] }) {
  const { t, f } = useI18n();
  const c = t.checks;

  const render = (check: RuleCheck): { title: string; headline: string; detail: string } => {
    switch (check.id) {
      case "speculative":
        return {
          title: c.speculative.title,
          headline:
            check.shareOfNet === null
              ? c.speculative.headlineUndefined
              : c.speculative.headline(f.pct(check.shareOfNet)),
          detail:
            check.shareOfNet === null
              ? c.speculative.detailUndefined
              : c.speculative.detail(f.pct(check.shareOfGross)),
        };
      case "consistency":
        return {
          title: c.consistency.title,
          headline:
            check.score === null
              ? c.consistency.headlineUndefined
              : c.consistency.headline(f.pct(check.score)),
          detail:
            check.severity === "watch" && check.requiredProfit !== null
              ? c.consistency.detailOver(f.usd(check.requiredProfit))
              : check.withinExcellentBand
                ? c.consistency.detailInside
                : c.consistency.detailOutside,
        };
      case "risk":
        return {
          title: c.risk.title(f.pct(check.limitFraction, 0)),
          headline: !check.hasStopData
            ? c.risk.headlineNoData
            : check.breachCount > 0
              ? c.risk.headlineBreach(check.breachCount, f.usd(check.limitUsd))
              : c.risk.headlineOk(f.usd(check.limitUsd)),
          detail:
            check.missingStopCount > 0
              ? c.risk.detailMissing(check.missingStopCount)
              : c.risk.detailOk,
        };
      case "margin":
        return {
          title: c.margin.title,
          headline:
            check.peak === null ? c.margin.headlineUnknown : c.margin.headline(f.pct(check.peak)),
          detail: c.margin.detail,
        };
    }
  };

  const sorted = [...checks].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sorted.map((check) => {
        const style = SEVERITY_STYLES[check.severity];
        const source = SOURCES[check.sourceKey];
        const copy = render(check);
        return (
          <Card key={check.id} className={cn("gap-3 border", style.ring)}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-sm font-semibold">{copy.title}</CardTitle>
                <Badge className={cn("shrink-0 border", style.badge)}>
                  {t.severity[check.severity]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-medium">{copy.headline}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{copy.detail}</p>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {source.label}
                <ExternalLink className="size-3" aria-hidden />
              </a>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
