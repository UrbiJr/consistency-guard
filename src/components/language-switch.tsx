"use client";

import { Languages } from "lucide-react";

import { DICTS, LANGS, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitch() {
  const { lang, setLang } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <Languages className="size-4 text-muted-foreground" aria-hidden />
      <div
        role="group"
        aria-label="Language"
        className="inline-flex overflow-hidden rounded-md border"
      >
        {LANGS.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={lang === code}
            className={cn(
              "px-2.5 py-1 text-xs font-medium transition-colors",
              lang === code
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {DICTS[code].languageName}
          </button>
        ))}
      </div>
    </div>
  );
}
