"use client";

import { ExternalLink } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import {
  SOURCES,
  SPECULATIVE_CLAUSE_ABSENT_BEFORE,
  SPECULATIVE_CLAUSE_QUOTE,
} from "@/lib/rules";

const ARCHIVE_URL =
  "http://web.archive.org/web/20251207010843/https://holaprime.com/trading-rules-list/trading-rules-prohibited-trading-practices/";

export function RuleReference() {
  const { t, f } = useI18n();
  const r = t.reference;
  const archiveDate = f.shortDate(new Date(`${SPECULATIVE_CLAUSE_ABSENT_BEFORE}T00:00:00`));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{r.title}</CardTitle>
        <CardDescription>{r.desc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <blockquote className="rounded-lg border-l-2 border-primary bg-muted/40 p-4 text-sm italic leading-relaxed">
          &ldquo;{SPECULATIVE_CLAUSE_QUOTE}&rdquo;
          <footer className="mt-2 text-xs not-italic text-muted-foreground">
            {r.quoteFooter}{" "}
            <a
              href={ARCHIVE_URL}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              {r.archiveLink(archiveDate)}
            </a>{" "}
            {r.quoteFooterEnd}
          </footer>
        </blockquote>

        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {r.facts.map((fact) => (
            <div key={fact.label} className="border-b pb-2">
              <dt className="text-xs text-muted-foreground">{fact.label}</dt>
              <dd className="text-sm">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {Object.values(SOURCES).map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {source.label}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
