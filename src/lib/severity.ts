import type { Severity } from "./analyze";

export const SEVERITY_STYLES: Record<
  Severity,
  { label: string; badge: string; ring: string; dot: string }
> = {
  ok: {
    label: "Within limits",
    badge: "border-positive/40 bg-positive/10 text-positive",
    ring: "border-positive/30",
    dot: "bg-positive",
  },
  watch: {
    label: "Watch",
    badge: "border-caution/40 bg-caution/10 text-caution",
    ring: "border-caution/30",
    dot: "bg-caution",
  },
  breach: {
    label: "Over the limit",
    badge: "border-negative/40 bg-negative/10 text-negative",
    ring: "border-negative/40",
    dot: "bg-negative",
  },
  unknown: {
    label: "Not enough data",
    badge: "border-border bg-muted text-muted-foreground",
    ring: "border-border",
    dot: "bg-muted-foreground",
  },
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  breach: 0,
  watch: 1,
  unknown: 2,
  ok: 3,
};
