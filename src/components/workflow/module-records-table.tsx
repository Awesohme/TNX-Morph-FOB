"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { bulkUpdateRecordsAction } from "@/lib/actions/records";
import { QuickUpdate } from "@/components/modules/quick-update";
import { Button } from "@/components/ui/button";
import { humanizeColumn } from "@/lib/modules";
import { formatFieldValue, type SerializableModuleConfig } from "@/lib/workflow";

// readiness_score is a 0-1 fraction of checklist items marked "Yes" — show as a percentage.
function formatCell(column: string, value: unknown) {
  if (column === "readiness_score") {
    const num = Number(value ?? 0);
    return `${Math.round(num * 100)}%`;
  }
  return formatFieldValue(value);
}

function inputTypeForField(fieldType: SerializableModuleConfig["fields"][number]["type"]) {
  if (fieldType === "number") return "number";
  if (fieldType === "date") return "date";
  return "text";
}

export function ModuleRecordsTable({
  moduleConfig,
  rows,
  activeCohortId,
}: {
  moduleConfig: SerializableModuleConfig;
  rows: Array<Record<string, unknown> & { id: string }>;
  activeCohortId?: string | null;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const returnTo = activeCohortId ? `${moduleConfig.route}?cohort=${activeCohortId}` : moduleConfig.route;

  function recordHref(id: string) {
    return activeCohortId ? `/records/${moduleConfig.key}/${id}?cohort=${activeCohortId}` : `/records/${moduleConfig.key}/${id}`;
  }
  const bulkField = useMemo(
    () => moduleConfig.fields.find((field) => moduleConfig.bulkEditableFields.includes(field.key)),
    [moduleConfig],
  );

  function toggleId(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAll() {
    setSelectedIds((current) => (current.length === rows.length ? [] : rows.map((row) => row.id)));
  }

  return (
    <div className="overflow-x-auto">
      {bulkField ? (
        <form action={bulkUpdateRecordsAction} className="flex min-w-[760px] flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <input type="hidden" name="table" value={moduleConfig.table} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="selectedIds" value={selectedIds.join(",")} />
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {selectedIds.length ? `${selectedIds.length} selected` : "Bulk update"}
          </span>
          <select
            name="field"
            defaultValue={bulkField.key}
            className="app-select h-10 w-auto min-w-40"
          >
            {moduleConfig.fields
              .filter((field) => moduleConfig.bulkEditableFields.includes(field.key))
              .map((field) => (
                <option key={field.key} value={field.key}>
                  {field.label}
                </option>
              ))}
          </select>
          {bulkField.options?.length ? (
            <select name="value" defaultValue={bulkField.options[0]} className="app-select h-10 w-auto min-w-40">
              {bulkField.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              name="value"
              type={inputTypeForField(bulkField.type)}
              className="app-input h-10 min-w-56"
              placeholder={`Enter ${bulkField.label.toLowerCase()}`}
            />
          )}
          <Button size="sm" variant="outline" disabled={!selectedIds.length}>
            Apply
          </Button>
        </form>
      ) : null}

      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          <tr>
            <th className="px-5 py-3">
              <input type="checkbox" checked={rows.length > 0 && selectedIds.length === rows.length} onChange={toggleAll} />
            </th>
            {moduleConfig.columns.map((column) => (
              <th key={column} className="px-5 py-3 font-semibold">
                {humanizeColumn(column)}
              </th>
            ))}
            <th className="px-5 py-3 font-semibold">Open</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => router.push(recordHref(row.id))}
              className="cursor-pointer bg-white align-top transition hover:bg-slate-50/60"
            >
              <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
                <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleId(row.id)} />
              </td>
              {moduleConfig.columns.map((column) => {
                const isInteractive = ["risk", "mvp_status", "demo_status", "review_status", "status", "priority"].includes(column);
                return (
                  <td
                    key={column}
                    className="max-w-[22rem] px-5 py-4"
                    onClick={isInteractive ? (event) => event.stopPropagation() : undefined}
                  >
                    {isInteractive ? (
                      <QuickUpdate table={moduleConfig.table} id={row.id} field={column} value={row[column]} returnTo={returnTo} />
                    ) : (
                      <span className="line-clamp-3 text-slate-700">{formatCell(column, row[column])}</span>
                    )}
                  </td>
                );
              })}
              <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
                <Link
                  href={recordHref(row.id)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                >
                  Open
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
