"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Copy, Database, Download, FileSpreadsheet, RefreshCcw } from "lucide-react";
import { exportDataAction, importWorkbookAction, resetTestDataAction, nukeAllDataAction, seedSelectedCohortDataAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RequiredLabel } from "@/components/ui/required-indicator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { ModalShell } from "@/components/ui/modal-shell";

type AdminActionState = { ok: boolean; message: string; data?: unknown };
type SeedItem = {
  id: string;
  group: string;
  label: string;
  description: string;
  requiredFields: string[];
};

const initialState: AdminActionState = { ok: false, message: "" };

function useActionToast(state: AdminActionState, options?: { successOnly?: boolean }) {
  const { toast } = useToast();
  const lastMessageRef = useRef("");

  useEffect(() => {
    if (!state.message || state.message === lastMessageRef.current) return;
    if (options?.successOnly && !state.ok) return;
    lastMessageRef.current = state.message;
    toast(state.message, state.ok ? "success" : "error");
  }, [options?.successOnly, state, toast]);
}

function formatItemCount(count: number) {
  return `${count} item${count === 1 ? "" : "s"}`;
}

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

export function ImportWorkbookForm({
  cohorts,
}: {
  cohorts: Array<{ id: string; name: string }>;
}) {
  const [state, action, isPending] = useActionState(importWorkbookAction, initialState);
  useActionToast(state);

  if (!cohorts.length) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Create a cohort first, then return here to restore a workbook into it.
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-2 text-sm font-medium text-slate-700">
        <RequiredLabel>Target cohort</RequiredLabel>
        <select name="cohortId" className="app-select h-11 w-full" defaultValue={cohorts[0]?.id ?? ""} required aria-required="true">
          {cohorts.map((cohort) => (
            <option key={cohort.id} value={cohort.id}>
              {cohort.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2 text-sm font-medium text-slate-700">
        <RequiredLabel>Restore mode</RequiredLabel>
        <select name="restoreMode" className="app-select h-11 w-full" defaultValue="replace" required aria-required="true">
          <option value="replace">Replace cohort data</option>
          <option value="append">Append only</option>
        </select>
      </label>
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmedRef = useRef(false);
  return (
    <form id="reset-test-data-form" action={action} onSubmit={(event) => {
      if (!confirmedRef.current) {
        event.preventDefault();
        setConfirmOpen(true);
      }
    }} className="space-y-4">
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
      <ModalShell open={confirmOpen} onClose={() => !isPending && setConfirmOpen(false)} disableClose={isPending} title="Reset test data?" description="This will delete the current test records and cannot be undone." widthClassName="max-w-md">
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button type="submit" form="reset-test-data-form" loading={isPending} className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => { confirmedRef.current = true; }}>
            {isPending ? "Resetting…" : "Reset data"}
          </Button>
        </div>
      </ModalShell>
    </form>
  );
}

export function NukeAllDataForm() {
  const [state, action, isPending] = useActionState(nukeAllDataAction, initialState);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmedRef = useRef(false);
  return (
    <form id="nuke-all-data-form" action={action} onSubmit={(event) => {
      if (!confirmedRef.current) {
        event.preventDefault();
        setConfirmOpen(true);
      }
    }} className="space-y-4">
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
      <ModalShell open={confirmOpen} onClose={() => !isPending && setConfirmOpen(false)} disableClose={isPending} title="Delete all operational data?" description="This permanently deletes all cohorts, participants, and operational records. This cannot be undone." widthClassName="max-w-md">
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button type="submit" form="nuke-all-data-form" loading={isPending} className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => { confirmedRef.current = true; }}>
            {isPending ? "Wiping everything…" : "Delete everything"}
          </Button>
        </div>
      </ModalShell>
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
  useActionToast(state, { successOnly: true });

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
          <details key={group} className="rounded-2xl border border-slate-200 bg-slate-50/60">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-950">
              <span>{groupLabels[group] ?? group}</span>
              <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span>{formatItemCount(items.length)}</span>
                <ChevronDown className="size-4" />
              </span>
            </summary>
            <div className="grid gap-3 border-t border-slate-200 p-4">
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
          </details>
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
