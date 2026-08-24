"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import { createFormatters, type Formatters } from "@/lib/format";
import { en, type Dict } from "./en";
import { it } from "./it";

export type Lang = "en" | "it";

export const DICTS: Record<Lang, Dict> = { en, it };
export const LANGS: Lang[] = ["en", "it"];

const STORAGE_KEY = "consistency-guard.lang";

/**
 * The chosen language lives in localStorage, which makes it external state.
 * Reading it through useSyncExternalStore keeps the server render ("en") and
 * the hydrated client render consistent without a setState-in-effect dance.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readLang(): Lang {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "it") return stored;
  return navigator.language?.toLowerCase().startsWith("it") ? "it" : "en";
}

function serverLang(): Lang {
  return "en";
}

type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
  f: Formatters;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, serverLang);

  const setLang = useCallback((next: Lang) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    for (const listener of listeners) listener();
  }, []);

  const value = useMemo<I18nValue>(() => {
    const t = DICTS[lang];
    return { lang, setLang, t, f: createFormatters(t.localeTag) };
  }, [lang, setLang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside an I18nProvider");
  return value;
}
