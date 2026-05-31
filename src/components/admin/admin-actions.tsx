"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Check, Copy, Download, FileSpreadsheet, RefreshCcw } from "lucide-react";
import { exportDataAction, importWorkbookAction, resetTestDataAction, nukeAllDataAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type AdminActionState = { ok: boolean; message: string; data?: unknown };

const initialState: AdminActionState = { ok: false, message: "" };

function CopyConfirmation({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="rounded-2xl border border-border bg-muted/45 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <button
          type="button"
          onClick={copyValue}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition",
            copied ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-background hover:bg-white",
          )}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <code className="block break-all text-sm font-semibold text-slate-700">{value}</code>
    </div>
  );
}

export function ImportWorkbookForm() {
  const [state, action, isPending] = useActionState(importWorkbookAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <Input name="workbook" type="file" accept=".xlsx,.xls" />
      <CopyConfirmation label="Legacy import confirmation text" value="IMPORT_MORPH_OPS" />
      <Input name="confirmation" placeholder="Paste IMPORT_MORPH_OPS" autoComplete="off" spellCheck={false} />
      <Button disabled={isPending} className="w-full">
        <FileSpreadsheet className="size-4" />
        {isPending ? "Migrating..." : "Run legacy workbook migration"}
      </Button>
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-rose-700"}>{state.message}</p> : null}
      {state.data ? <Textarea readOnly value={JSON.stringify(state.data, null, 2)} /> : null}
    </form>
  );
}

export function ResetTestDataForm() {
  const [state, action, isPending] = useActionState(resetTestDataAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <CopyConfirmation label="Reset confirmation text" value="RESET_TEST_DATA" />
      <Input name="confirmation" placeholder="Paste RESET_TEST_DATA" autoComplete="off" spellCheck={false} />
      <Button disabled={isPending} variant="destructive" className="w-full">
        <RefreshCcw className="size-4" />
        {isPending ? "Resetting..." : "Reset test data"}
      </Button>
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-rose-700"}>{state.message}</p> : null}
    </form>
  );
}

export function NukeAllDataForm() {
  const [state, action, isPending] = useActionState(nukeAllDataAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <p>
          Deletes <strong>all cohorts, participants, and operational data</strong> so the app starts fresh.
          Accounts, team, and configuration are kept. This cannot be undone — export a backup first.
        </p>
      </div>
      <CopyConfirmation label="Type this to confirm" value="NUKE EVERYTHING" />
      <Input name="confirmation" placeholder="Type NUKE EVERYTHING" autoComplete="off" spellCheck={false} />
      <Button disabled={isPending} variant="destructive" className="w-full">
        <AlertTriangle className="size-4" />
        {isPending ? "Wiping everything..." : "Nuke all data"}
      </Button>
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-rose-700"}>{state.message}</p> : null}
    </form>
  );
}

export function ExportDataForm() {
  const [state, action, isPending] = useActionState(exportDataAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <Button disabled={isPending} variant="outline" className="w-full">
        <Download className="size-4" />
        {isPending ? "Generating..." : "Generate JSON export"}
      </Button>
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-rose-700"}>{state.message}</p> : null}
      {state.data ? <Textarea readOnly value={JSON.stringify(state.data, null, 2)} /> : null}
    </form>
  );
}
