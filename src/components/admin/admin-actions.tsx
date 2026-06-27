"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Check, Copy, Database, Download, FileSpreadsheet, RefreshCcw } from "lucide-react";
import { exportDataAction, importWorkbookAction, resetTestDataAction, nukeAllDataAction, seedSelectedCohortDataAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RequiredLabel } from "@/components/ui/required-indicator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type AdminActionState = { ok: boolean; message: string; data?: unknown };
type SeedItem = {
  id: string;
  group: string;
  label: string;
  description: string;
  requiredFields: string[];
};

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
      <label className="block space-y-2 text-sm font-medium text-slate-700">
        <RequiredLabel>Workbook file</RequiredLabel>
        <Input name="workbook" type="file" accept=".xlsx,.xls" required aria-required="true" />
      </label>
      <CopyConfirmation label="Legacy import confirmation text" value="IMPORT_MORPH_OPS" />
      <label className="block space-y-2 text-sm font-medium text-slate-700">
        <RequiredLabel>Confirmation text</RequiredLabel>
        <Input name="confirmation" required aria-required="true" placeholder="Paste IMPORT_MORPH_OPS" autoComplete="off" spellCheck={false} />
      </label>
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
      <label className="block space-y-2 text-sm font-medium text-slate-700">
        <RequiredLabel>Confirmation text</RequiredLabel>
        <Input name="confirmation" required aria-required="true" placeholder="Paste RESET_TEST_DATA" autoComplete="off" spellCheck={false} />
      </label>
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
      <label className="block space-y-2 text-sm font-medium text-slate-700">
        <RequiredLabel>Confirmation text</RequiredLabel>
        <Input name="confirmation" required aria-required="true" placeholder="Type NUKE EVERYTHING" autoComplete="off" spellCheck={false} />
      </label>
      <Button disabled={isPending} variant="destructive" className="w-full">
        <AlertTriangle className="size-4" />
        {isPending ? "Wiping everything..." : "Nuke all data"}
      </Button>
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-rose-700"}>{state.message}</p> : null}
    </form>
  );
}

export function SeedSelectedDataForm({
  cohorts,
  seedCatalog,
  groupLabels,
}: {
  cohorts: Array<{ id: string; name: string }>;
  seedCatalog: Record<string, SeedItem[]>;
  groupLabels: Record<string, string>;
}) {
  const [state, action, isPending] = useActionState(seedSelectedCohortDataAction, initialState);
  const groups = Object.entries(seedCatalog);

  if (!cohorts.length) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Create a cohort first, then return here to add only the seed data you want.
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-2 text-sm font-medium text-slate-700">
        <RequiredLabel>Cohort</RequiredLabel>
        <select name="cohortId" className="app-select h-11 w-full" defaultValue={cohorts[0]?.id ?? ""}>
          {cohorts.map((cohort) => (
            <option key={cohort.id} value={cohort.id}>
              {cohort.name}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
          <RequiredLabel>Seed data selection</RequiredLabel>
          <span className="text-xs font-normal text-muted-foreground">Choose one or more seed items to add.</span>
        </div>
        {groups.map(([group, items]) => (
          <fieldset key={group} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-950">{groupLabels[group] ?? group}</legend>
            <div className="mt-3 grid gap-3">
              {items.map((item) => (
                <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                  <input name="seedItems" value={item.id} type="checkbox" className="mt-1 size-4 rounded border-slate-300" />
                  <span>
                    <span className="block font-medium text-slate-900">{item.label}</span>
                    <span className="mt-1 block text-slate-600">{item.description}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Required fields</span>
                      {item.requiredFields.map((field) => (
                        <span key={field} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {field}
                        </span>
                      ))}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <Button disabled={isPending} className="w-full">
        <Database className="size-4" />
        {isPending ? "Adding seed data..." : "Add selected seed data"}
      </Button>
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-rose-700"}>{state.message}</p> : null}
      {state.data ? <Textarea readOnly value={JSON.stringify(state.data, null, 2)} /> : null}
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
