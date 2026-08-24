"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MAX_MARGIN_UTILISATION, type Analysis } from "@/lib/analyze";
import { toneForValue } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function DataTables({
  analysis,
  highlightTicket,
}: {
  analysis: Analysis;
  highlightTicket?: string;
}) {
  const { t, f } = useI18n();
  const c = t.tables;
  const riskLimitUsd = analysis.options.initialBalance * analysis.options.riskLimit;
  const side = (direction: "buy" | "sell") => (direction === "buy" ? c.buy : c.sell);

  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs defaultValue="trades">
          <TabsList>
            <TabsTrigger value="trades">{c.trades(analysis.trades.length)}</TabsTrigger>
            <TabsTrigger value="ideas">{c.ideas(analysis.ideas.length)}</TabsTrigger>
            <TabsTrigger value="days">{c.days(analysis.days.length)}</TabsTrigger>
          </TabsList>

          <TabsContent value="trades" className="mt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{c.colTicket}</TableHead>
                    <TableHead>{c.colClosed}</TableHead>
                    <TableHead>{c.colSymbol}</TableHead>
                    <TableHead>{c.colSide}</TableHead>
                    <TableHead className="text-right">{c.colLots}</TableHead>
                    <TableHead className="text-right">{c.colStop}</TableHead>
                    <TableHead className="text-right">{c.colNet}</TableHead>
                    <TableHead className="text-right">{c.colShare}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.trades.map((trade) => (
                    <TableRow
                      key={trade.id}
                      className={cn(
                        highlightTicket && trade.ticket === highlightTicket && "bg-primary/10",
                      )}
                    >
                      <TableCell className="font-mono text-xs">{trade.ticket}</TableCell>
                      <TableCell className="text-xs">{f.dateTime(trade.closeTime)}</TableCell>
                      <TableCell className="text-xs">{trade.symbol}</TableCell>
                      <TableCell className="text-xs">{side(trade.direction)}</TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {f.num(trade.volume)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {trade.stopLoss !== null ? (
                          f.num(trade.stopLoss)
                        ) : (
                          <span className="text-caution">{c.noStop}</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-mono text-xs tabular-nums",
                          toneForValue(trade.netProfit),
                        )}
                      >
                        {f.signedUsd(trade.netProfit, 2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {analysis.netProfit > 0 && trade.netProfit > 0
                          ? f.pct(trade.netProfit / analysis.netProfit)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="ideas" className="mt-4">
            <p className="mb-3 text-xs text-muted-foreground">{c.ideasNote}</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{c.colOpened}</TableHead>
                    <TableHead>{c.colSymbol}</TableHead>
                    <TableHead>{c.colSide}</TableHead>
                    <TableHead className="text-right">{c.colLegs}</TableHead>
                    <TableHead className="text-right">{c.colLots}</TableHead>
                    <TableHead className="text-right">{c.colRisk}</TableHead>
                    <TableHead className="text-right">{c.colMargin}</TableHead>
                    <TableHead className="text-right">{c.colNet}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.ideas.map((idea) => {
                    const over = idea.riskUsd !== null && idea.riskUsd > riskLimitUsd;
                    return (
                      <TableRow key={idea.id}>
                        <TableCell className="text-xs">{f.dateTime(idea.openTime)}</TableCell>
                        <TableCell className="text-xs">{idea.symbol}</TableCell>
                        <TableCell className="text-xs">{side(idea.direction)}</TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {idea.trades.length}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {f.num(idea.volume)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {idea.riskUsd === null ? (
                            <span className="text-caution">{c.noStop}</span>
                          ) : (
                            <span className={over ? "text-negative" : undefined}>
                              {f.usd(idea.riskUsd)} ·{" "}
                              {f.pct(idea.riskUsd / analysis.options.initialBalance, 2)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          <span
                            className={
                              idea.marginUtilisation !== null &&
                              idea.marginUtilisation >= MAX_MARGIN_UTILISATION
                                ? "text-negative"
                                : undefined
                            }
                          >
                            {f.pct(idea.marginUtilisation)}
                          </span>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono text-xs tabular-nums",
                            toneForValue(idea.netProfit),
                          )}
                        >
                          {f.signedUsd(idea.netProfit, 2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="days" className="mt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{c.colDay}</TableHead>
                    <TableHead className="text-right">{c.colTradeCount}</TableHead>
                    <TableHead className="text-right">{c.colNet}</TableHead>
                    <TableHead className="text-right">{c.colShare}</TableHead>
                    <TableHead className="text-right">{c.colCounts}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.days.map((day) => (
                    <TableRow key={day.key}>
                      <TableCell className="text-xs">{f.shortDate(day.date)}</TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {day.tradeCount}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-mono text-xs tabular-nums",
                          toneForValue(day.netProfit),
                        )}
                      >
                        {f.signedUsd(day.netProfit, 2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {analysis.netProfit > 0 && day.netProfit > 0
                          ? f.pct(day.netProfit / analysis.netProfit)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          className={cn(
                            "border",
                            day.qualifiesForPayout
                              ? "border-positive/40 bg-positive/10 text-positive"
                              : "border-border bg-muted text-muted-foreground",
                          )}
                        >
                          {day.qualifiesForPayout ? c.yes : c.no}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
