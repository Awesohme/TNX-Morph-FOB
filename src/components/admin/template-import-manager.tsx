"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, FileSpreadsheet, UploadCloud } from "lucide-react";
import type { Data as SpreadsheetRow, Field as SpreadsheetField, Result as SpreadsheetResult, RowHook } from "react-spreadsheet-import/types/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    rejected: number;
    errors: Array<{ rowNumber: number; issues: string[] }>;
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

    const response = await fetch("/api/admin/import/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleKey: selectedDataset.key,
        mode,
        cohortId: selectedCohortId,
        rows,
      }),
    });

    const payload = (await response.json()) as ImportResult;
    setResult(payload);
    if (payload.ok) {
      setSelectedDatasetKey(null);
      startTransition(() => {
        router.refresh();
      });
    }
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
              <span>Target cohort</span>
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
                <option value="append">Append new rows</option>
                <option value="upsert">Upsert existing rows</option>
              </select>
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
                    Inserted {result.data.inserted}, updated {result.data.updated}, rejected {result.data.rejected}.
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
