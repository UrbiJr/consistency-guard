"use client";

import { useRef, useState } from "react";
import { FileUp, FlaskConical, ClipboardPaste, X, CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = {
  onText: (text: string, filename: string) => void;
  onLoadSample: () => void;
  onStartFresh: () => void;
  hasData: boolean;
  onClear: () => void;
};

export function DataInput({ onText, onLoadSample, onStartFresh, hasData, onClear }: Props) {
  const { t } = useI18n();
  const i = t.input;
  const [dragging, setDragging] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => onText(String(reader.result ?? ""), file.name);
    reader.readAsText(file);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) readFile(file);
        }}
        className={cn(
          "rounded-xl border border-dashed p-6 text-center transition-colors sm:p-8",
          dragging ? "border-primary bg-primary/5" : "border-border bg-card/40",
        )}
      >
        <FileUp className="mx-auto size-6 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-sm font-medium">{i.dropTitle}</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">{i.dropDesc}</p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" onClick={() => inputRef.current?.click()}>
            {i.chooseFile}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPasting((v) => !v)}>
            <ClipboardPaste aria-hidden />
            {i.pasteToggle}
          </Button>
          <Button size="sm" variant="outline" onClick={onStartFresh}>
            <CalendarPlus aria-hidden />
            {i.startFresh}
          </Button>
          <Button size="sm" variant="ghost" onClick={onLoadSample}>
            <FlaskConical aria-hidden />
            {i.loadSample}
          </Button>
          {hasData ? (
            <Button size="sm" variant="ghost" onClick={onClear}>
              <X aria-hidden />
              {i.clear}
            </Button>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt,.tsv,text/csv,text/plain"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) readFile(file);
            event.target.value = "";
          }}
        />
      </div>

      {pasting ? (
        <div className="space-y-2 rounded-xl border bg-card/40 p-4">
          <label htmlFor="paste-area" className="text-xs font-medium text-muted-foreground">
            {i.pasteLabel}
          </label>
          <textarea
            id="paste-area"
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            rows={6}
            spellCheck={false}
            placeholder="Ticket,Open Time,Type,Volume,Symbol,Open Price,S/L,T/P,Close Time,Close Price,Commission,Swap,Profit"
            className="w-full resize-y rounded-lg border bg-background p-3 font-mono text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          />
          <Button
            size="sm"
            disabled={!pasted.trim()}
            onClick={() => {
              onText(pasted, "pasted rows");
              setPasting(false);
            }}
          >
            {i.analysePasted}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
