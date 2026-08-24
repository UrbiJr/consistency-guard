"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AnalysisOptions } from "@/lib/analyze";
import { useI18n } from "@/lib/i18n";
import { MAX_RISK_PER_IDEA, PCP_MAX_RISK_PER_IDEA } from "@/lib/rules";

type Props = {
  options: AnalysisOptions;
  onChange: (next: AnalysisOptions) => void;
};

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

export function SetupBar({ options, onChange }: Props) {
  const { t } = useI18n();
  const s = t.setup;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5">
        <Label htmlFor="initial-balance">{s.balance}</Label>
        <Input
          id="initial-balance"
          type="number"
          min={1000}
          step={1000}
          value={options.initialBalance}
          onChange={(event) =>
            onChange({
              ...options,
              initialBalance: Math.max(1, Number(event.target.value) || 0),
            })
          }
        />
        <p className="text-xs text-muted-foreground">{s.balanceHint}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="risk-limit">{s.riskCap}</Label>
        <select
          id="risk-limit"
          className={selectClass}
          value={options.riskLimit}
          onChange={(event) => onChange({ ...options, riskLimit: Number(event.target.value) })}
        >
          <option value={MAX_RISK_PER_IDEA}>{s.riskCap2}</option>
          <option value={PCP_MAX_RISK_PER_IDEA}>{s.riskCap1}</option>
        </select>
        <p className="text-xs text-muted-foreground">{s.riskCapHint}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rollover">{s.rollover}</Label>
        <select
          id="rollover"
          className={selectClass}
          value={options.dayRolloverHour}
          onChange={(event) =>
            onChange({ ...options, dayRolloverHour: Number(event.target.value) })
          }
        >
          <option value={0}>{s.rolloverMidnight}</option>
          <option value={17}>{s.rollover17}</option>
        </select>
        <p className="text-xs text-muted-foreground">{s.rolloverHint}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cycle-start">{s.cycleStart}</Label>
        <Input
          id="cycle-start"
          type="date"
          value={options.cycleStart ?? ""}
          onChange={(event) =>
            onChange({ ...options, cycleStart: event.target.value || null })
          }
        />
        <p className="text-xs text-muted-foreground">{s.cycleStartHint}</p>
      </div>
    </div>
  );
}
