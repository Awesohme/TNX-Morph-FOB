"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, UploadCloud } from "lucide-react";
import type { Data as SpreadsheetRow, Field as SpreadsheetField, Result as SpreadsheetResult, RowHook } from "react-spreadsheet-import/types/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RequiredLabel } from "@/components/ui/required-indicator";
import { type ImportDatasetSummary } from "@/lib/import-config";
import { cn } from "@/lib/utils";

const ReactSpreadsheetImport = dynamic(
  () => import("react-spreadsheet-import").then((module) => module.ReactSpreadsheetImport),
  { ssr: false },
);

type CohortOption = {
  id: string;
  name: string;
  status: string;
};

type ImportResult = {
  ok: boolean;
  message: string;
  data?: {
    inserted: number;
    updated: number;
    skipped: number;
    rejected: number;
    errors: Array<{ rowNumber: number; issues: string[] }>;
  };
};

type ImportRowAction = "create" | "update" | "skip";

type PendingImportRow = {
  rowIndex: number;
  rowNumber: number;
  action: ImportRowAction;
  duplicate: null | {
    id: string;
    fullName: string;
    email: string;
    whatsapp: string;
    matchType: "email" | "phone" | "name";
    confidence: number;
  };
  issues: string[];
  row: Record<string, string | boolean | null>;
};

type PendingImport = {
  datasetKey: string;
  cohortId: string;
  mode: "append" | "upsert";
  rows: Array<Record<string, string | boolean | null>>;
  reviewRows: PendingImportRow[];
  summary: {
    rows: number;
    duplicates: number;
    rejected: number;
    create: number;
    update: number;
    skip: number;
  };
};

type PreflightResult = {
  ok: boolean;
  message: string;
  data?: {
    rows: PendingImportRow[];
    summary: PendingImport["summary"];
  };
};

function downloadErrors(errors: Array<{ rowNumber: number; issues: string[] }>) {
  const lines = ["row_number,issues", ...errors.map((error) => `${error.rowNumber},"${error.issues.join(" | ").replaceAll('"', '""')}"`)];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "import-errors.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function fieldTypeFor(field: ImportDatasetSummary["fields"][number]) {
  if (field.type === "boolean") {
    return { type: "checkbox" } as const;
  }
  if (field.type === "select" && field.options?.length) {
    return {
      type: "select",
      options: field.options.map((option) => ({ label: option, value: option })),
    } as const;
  }
  return { type: "input" } as const;
}

function toImportValue(value: string | boolean | undefined) {
  if (value === undefined) return null;
  return value;
}

export function TemplateImportManager({
  datasets,
  cohorts,
}: {
  datasets: ImportDatasetSummary[];
  cohorts: CohortOption[];
}) {
  const router = useRouter();
  const [selectedDatasetKey, setSelectedDatasetKey] = useState<string | null>(null);
  const [mode, setMode] = useState<"append" | "upsert">("append");
  const [selectedCohortId, setSelectedCohortId] = useState<string>(cohorts.find((cohort) => cohort.status === "active")?.id ?? cohorts[0]?.id ?? "");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedDataset = useMemo(
    () => datasets.find((dataset) => dataset.key === selectedDatasetKey) ?? null,
    [datasets, selectedDatasetKey],
  );

  const rsiFields = useMemo<SpreadsheetField<string>[]>(
    () =>
      selectedDataset?.fields.map((field) => ({
        key: field.key,
        label: field.label,
        alternateMatches: field.alternateMatches,
        example: field.example,
        fieldType: fieldTypeFor(field),
        validations: [
          ...(field.required
            ? [{ rule: "required" as const, errorMessage: `${field.label} is required` }]
            : []),
        ],
      })) ?? [],
    [selectedDataset],
  );

  const rowHook = useMemo<RowHook<string> | undefined>(() => {
    if (!selectedDataset) return undefined;

    return async (
      row: SpreadsheetRow<string>,
      addError: (fieldKey: string, error: { message: string; level: "info" | "warning" | "error" }) => void,
    ) => {
      for (const field of selectedDataset.fields) {
        const value = row[field.key];
        const raw = value === null || value === undefined ? "" : String(value).trim();

        if (field.required && !raw) {
          addError(field.key, { message: `${field.label} is required.`, level: "error" });
          continue;
        }

        if (!raw) continue;

        if (field.type === "number" && Number.isNaN(Number(raw))) {
          addError(field.key, { message: `${field.label} must be numeric.`, level: "error" });
        }

        if (field.type === "date" && Number.isNaN(new Date(raw).valueOf())) {
          addError(field.key, { message: `${field.label} must be a valid date.`, level: "error" });
        }

        if (field.type === "select" && field.options?.length && !field.options.includes(raw)) {
          addError(field.key, { message: `${field.label} must be one of: ${field.options.join(", ")}.`, level: "error" });
        }
      }

      return row;
    };
  }, [selectedDataset]);

  async function submitImport(resultSet: SpreadsheetResult<string>) {
    if (!selectedDataset || !selectedCohortId) return;

    const rows = resultSet.validData.map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key, toImportValue(value)])),
    );

    if (selectedDataset.key === "participants") {
      const response = await fetch("/api/admin/import/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleKey: selectedDataset.key,
          cohortId: selectedCohortId,
          rows,
        }),
      });

      const payload = (await response.json()) as PreflightResult;
      if (!payload.ok || !payload.data) {
        setResult({ ok: false, message: payload.message });
        return;
      }

      setPendingImport({
        datasetKey: selectedDataset.key,
        cohortId: selectedCohortId,
        mode,
        rows,
        reviewRows: payload.data.rows,
        summary: payload.data.summary,
      });
      setResult(null);
      setSelectedDatasetKey(null);
      return;
    }

    await submitRows({
      moduleKey: selectedDataset.key,
      mode,
      cohortId: selectedCohortId,
      rows,
    });
  }

  async function submitRows(body: {
    moduleKey: string;
    mode: "append" | "upsert";
    cohortId: string;
    rows: Array<Record<string, string | boolean | null>>;
    rowActions?: Array<{ rowIndex: number; action: ImportRowAction; existingId?: string | null }>;
  }) {
    setIsSubmittingImport(true);
    const response = await fetch("/api/admin/import/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as ImportResult;
    setResult(payload);
    setIsSubmittingImport(false);
    if (payload.ok) {
      setPendingImport(null);
      setSelectedDatasetKey(null);
      startTransition(() => {
        router.refresh();
      });
    }
  }

  function setPendingRowAction(rowIndex: number, action: ImportRowAction) {
    setPendingImport((current) => {
      if (!current) return current;
      const reviewRows = current.reviewRows.map((row) => row.rowIndex === rowIndex ? { ...row, action } : row);
      return {
        ...current,
        reviewRows,
        summary: {
          ...current.summary,
          create: reviewRows.filter((row) => row.action === "create").length,
          update: reviewRows.filter((row) => row.action === "update").length,
          skip: reviewRows.filter((row) => row.action === "skip").length,
        },
      };
    });
  }

  async function confirmPendingImport() {
    if (!pendingImport) return;
    await submitRows({
      moduleKey: pendingImport.datasetKey,
      mode: pendingImport.mode,
      cohortId: pendingImport.cohortId,
      rows: pendingImport.rows,
      rowActions: pendingImport.reviewRows.map((row) => ({
        rowIndex: row.rowIndex,
        action: row.action,
        existingId: row.duplicate?.id ?? null,
      })),
    });
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Template-first import</p>
            <h2 className="mt-2 font-display text-2xl font-semibold">Bulk import operational datasets</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Choose a dataset, download its template, fill it in, then import CSV or Excel with column mapping, validation, preview, and submit.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <RequiredLabel>Target cohort</RequiredLabel>
              <select
                value={selectedCohortId}
                onChange={(event) => setSelectedCohortId(event.target.value)}
                className="flex h-11 min-w-64 rounded-[1.1rem] border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
              >
                {cohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Import mode</span>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as "append" | "upsert")}
                className="flex h-11 min-w-56 rounded-[1.1rem] border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="append">Add new only</option>
                <option value="upsert">Update existing + add new</option>
              </select>
              <span className="block text-xs font-normal text-slate-500">
                {mode === "append"
                  ? "Adds every row as a new record. Re-importing the same file creates duplicates."
                  : "Matches existing records and updates them; unmatched rows are added. Safe to re-import weekly."}
              </span>
            </label>
          </div>
        </div>
      </Card>

      {result ? (
        <Card className={cn("space-y-3", result.ok ? "border-emerald-200 bg-emerald-50/70" : "border-rose-200 bg-rose-50/70")}>
          <div className="flex items-start gap-3">
            <CheckCircle2 className={cn("mt-0.5 size-5", result.ok ? "text-emerald-700" : "text-rose-700")} />
            <div>
              <p className={cn("font-medium", result.ok ? "text-emerald-900" : "text-rose-900")}>{result.message}</p>
              {result.data ? (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-slate-700">
                    Inserted {result.data.inserted}, updated {result.data.updated}, skipped {result.data.skipped ?? 0}, rejected {result.data.rejected}.
                  </p>
                  {result.data.errors.length ? (
                    <button
                      type="button"
                      onClick={() => downloadErrors(result.data?.errors ?? [])}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                    >
                      <Download className="size-3.5" />
                      Download errors CSV
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      {pendingImport ? (
        <Card className="space-y-4 border-amber-200 bg-amber-50/60">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 size-5 text-amber-700" />
              <div>
                <p className="font-semibold text-amber-950">Review participant duplicates</p>
                <p className="mt-1 text-sm leading-6 text-amber-900">
                  {pendingImport.summary.rows} rows ready. {pendingImport.summary.duplicates} duplicate candidates found. Choose whether each matched row should update, create new, or skip.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <Badge tone="green">{pendingImport.summary.create} create</Badge>
              <Badge tone="blue">{pendingImport.summary.update} update</Badge>
              <Badge tone="amber">{pendingImport.summary.skip} skip</Badge>
            </div>
          </div>

          <div className="max-h-80 overflow-auto rounded-2xl border border-amber-200 bg-white">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Row</th>
                  <th className="px-4 py-3">Incoming</th>
                  <th className="px-4 py-3">Match</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingImport.reviewRows
                  .filter((row) => row.duplicate || row.issues.length)
                  .map((row) => {
                    const incomingName = [row.row.first_name, row.row.last_name].filter(Boolean).join(" ") || row.row.full_name || "Unnamed";
                    return (
                      <tr key={row.rowIndex}>
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-slate-500">{row.rowNumber}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-950">{incomingName}</p>
                          <p className="text-xs text-slate-500">{row.row.email || row.row.whatsapp || "No contact"}</p>
                          {row.issues.length ? <p className="mt-1 text-xs text-rose-600">{row.issues.join(" ")}</p> : null}
                        </td>
                        <td className="px-4 py-3">
                          {row.duplicate ? (
                            <div>
                              <p className="font-medium text-slate-800">{row.duplicate.fullName || "Existing participant"}</p>
                              <p className="text-xs text-slate-500">
                                {row.duplicate.email || row.duplicate.whatsapp || "No contact"} · {row.duplicate.matchType} · {row.duplicate.confidence}%
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">No duplicate</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={row.action}
                            onChange={(event) => setPendingRowAction(row.rowIndex, event.target.value as ImportRowAction)}
                            disabled={row.issues.length > 0}
                            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            <option value="update">Update</option>
                            <option value="create">Create new</option>
                            <option value="skip">Skip</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPendingImport(null)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              Cancel import
            </button>
            <Button type="button" onClick={confirmPendingImport} disabled={isSubmittingImport}>
              {isSubmittingImport ? "Importing…" : "Confirm import"}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {datasets.map((dataset) => (
          <Card key={dataset.key} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-semibold">{dataset.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{dataset.description}</p>
              </div>
              <Badge tone="blue">{dataset.fields.length} cols</Badge>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{dataset.modeDescription}</p>
              <p>{dataset.uniqueRuleDescription}</p>
            </div>
            <div className="space-y-2 rounded-2xl border border-rose-100 bg-rose-50/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">Required columns</p>
              <div className="flex flex-wrap gap-1.5">
                {dataset.fields.filter((field) => field.required).map((field) => (
                  <span key={field.key} className="rounded-full border border-rose-200 bg-white px-2 py-0.5 text-xs font-medium text-rose-800">
                    {field.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/admin/import/template/${dataset.key}?format=csv`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                <Download className="size-3.5" />
                CSV template
              </a>
              <a
                href={`/api/admin/import/template/${dataset.key}?format=xlsx`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                <FileSpreadsheet className="size-3.5" />
                XLSX template
              </a>
            </div>
            <Button className="w-full" onClick={() => setSelectedDatasetKey(dataset.key)}>
              <UploadCloud className="size-4" />
              Import {dataset.title.toLowerCase()}
            </Button>
          </Card>
        ))}
      </div>

      {!cohorts.length ? (
        <Card className="border-amber-200 bg-amber-50/70">
          <p className="text-sm text-amber-900">
            Create a cohort before running imports. Templates can still be downloaded now.
          </p>
        </Card>
      ) : null}

      {selectedDataset && selectedCohortId ? (
        <ReactSpreadsheetImport
          isOpen={Boolean(selectedDataset)}
          onClose={() => setSelectedDatasetKey(null)}
          onSubmit={submitImport}
          fields={rsiFields}
          rowHook={rowHook}
          allowInvalidSubmit={false}
          isNavigationEnabled
          maxRecords={5000}
          autoMapHeaders
          autoMapDistance={5}
          customTheme={{
            colors: {
              rsi: {
                50: "#eef6ff",
                100: "#d9ebff",
                200: "#bfdcff",
                300: "#96c6ff",
                400: "#5da6ff",
                500: "#2563eb",
                600: "#1d4ed8",
                700: "#1e40af",
                800: "#1e3a8a",
                900: "#172554",
              },
            },
          }}
        />
      ) : null}

      {isPending ? <p className="text-sm text-muted-foreground">Refreshing imported data…</p> : null}
    </div>
  );
}
