"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { bulkUpdateRecordsAction } from "@/lib/actions/records";
import { QuickUpdate } from "@/components/modules/quick-update";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { humanizeColumn, type ModuleConfig } from "@/lib/modules";
import { formatFieldValue } from "@/lib/workflow";

function toneFor(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("red") || text.includes("blocked") || text.includes("needs") || text.includes("high")) return "red";
  if (text.includes("amber") || text.includes("progress") || text.includes("review") || text.includes("medium")) return "amber";
  if (text.includes("green") || text.includes("done") || text.includes("completed") || text.includes("closed") || text.includes("low")) return "green";
  return "neutral";
}

function inputTypeForField(fieldType: ModuleConfig["fields"][number]["type"]) {
  if (fieldType === "number") return "number";
  if (fieldType === "date") return "date";
  return "text";
}

export function ModuleRecordsTable({
  moduleConfig,
  rows,
}: {
  moduleConfig: ModuleConfig;
  rows: Array<Record<string, unknown> & { id: string }>;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
        <form action={bulkUpdateRecordsAction} className="flex min-w-[760px] flex-wrap items-center gap-3 border-b bg-slate-50/80 px-5 py-4">
          <input type="hidden" name="table" value={moduleConfig.table} />
          <input type="hidden" name="returnTo" value={moduleConfig.route} />
          <input type="hidden" name="selectedIds" value={selectedIds.join(",")} />
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {selectedIds.length ? `${selectedIds.length} selected` : "Bulk update"}
          </span>
          <select
            name="field"
            defaultValue={bulkField.key}
            className="h-10 rounded-full border border-slate-200 bg-white px-3 text-sm outline-none"
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
            <select name="value" defaultValue={bulkField.options[0]} className="h-10 rounded-full border border-slate-200 bg-white px-3 text-sm outline-none">
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
              className="h-10 min-w-56 rounded-full border border-slate-200 bg-white px-4 text-sm outline-none"
              placeholder={`Enter ${bulkField.label.toLowerCase()}`}
            />
          )}
          <Button size="sm" variant="outline" disabled={!selectedIds.length}>
            Apply
          </Button>
        </form>
      ) : null}

      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted-foreground">
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
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.id} className="bg-white/55 align-top transition hover:bg-white">
              <td className="px-5 py-4">
                <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleId(row.id)} />
              </td>
              {moduleConfig.columns.map((column) => (
                <td key={column} className="max-w-[22rem] px-5 py-4">
                  {["risk", "mvp_status", "demo_status", "review_status", "status", "priority"].includes(column) ? (
                    <QuickUpdate table={moduleConfig.table} id={row.id} field={column} value={row[column]} returnTo={moduleConfig.route} />
                  ) : ["risk", "status", "review_status", "priority"].includes(column) ? (
                    <Badge tone={toneFor(row[column])}>{formatFieldValue(row[column])}</Badge>
                  ) : (
                    <span className="line-clamp-3 text-slate-700">{formatFieldValue(row[column])}</span>
                  )}
                </td>
              ))}
              <td className="px-5 py-4">
                <Link
                  href={`/records/${moduleConfig.key}/${row.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
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
