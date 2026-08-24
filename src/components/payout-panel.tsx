"use client";

import { Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PayoutBlocker, PayoutReadiness } from "@/lib/analyze";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function PayoutPanel({ readiness }: { readiness: PayoutReadiness[] }) {
  const { t, f } = useI18n();
  const p = t.payout;

  const blockerText = (blocker: PayoutBlocker): string => {
    switch (blocker.id) {
      case "notInProfit":
        return p.blockers.notInProfit;
      case "belowMinProfit":
        return p.blockers.belowMinProfit(f.pct(blocker.fraction, 0), f.usd(blocker.needed));
      case "consistencyTooHigh":
        return p.blockers.consistencyTooHigh(
          f.pct(blocker.score),
          f.usd(blocker.requiredProfit),
          f.pct(blocker.limit, 0),
        );
      case "notEnoughDays":
        return p.blockers.notEnoughDays(blocker.have, blocker.need, f.usd(blocker.dayMinimum));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{p.title}</CardTitle>
        <CardDescription>{p.desc}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        {readiness.map((item) => {
          const cycle = p.cycles[item.cycle];
          return (
            <div
              key={item.cycle}
              className={cn(
                "flex flex-col rounded-lg border p-4",
                item.eligible ? "border-positive/40 bg-positive/5" : "border-border bg-muted/30",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{cycle.label}</p>
                <Badge
                  className={cn(
                    "border",
                    item.eligible
                      ? "border-positive/40 bg-positive/10 text-positive"
                      : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {item.eligible ? (
                    <>
                      <Check className="size-3" aria-hidden /> {p.eligible}
                    </>
                  ) : (
                    <>
                      <X className="size-3" aria-hidden /> {p.blocked}
                    </>
                  )}
                </Badge>
              </div>

              <p className="mt-2 font-mono text-lg tabular-nums">{f.usd(item.traderShare)}</p>
              <p className="text-xs text-muted-foreground">
                {p.yourShare(f.pct(item.split, 0))}
              </p>

              <p className="mt-3 text-xs text-muted-foreground">{cycle.note}</p>

              {item.blockers.length > 0 ? (
                <ul className="mt-3 space-y-1.5 border-t pt-3 text-xs text-muted-foreground">
                  {item.blockers.map((blocker) => (
                    <li key={blocker.id} className="flex gap-2">
                      <span
                        className="mt-1.5 size-1 shrink-0 rounded-full bg-negative"
                        aria-hidden
                      />
                      <span>{blockerText(blocker)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
