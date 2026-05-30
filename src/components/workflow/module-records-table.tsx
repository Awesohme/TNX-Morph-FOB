"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { bulkUpdateRecordsAction } from "@/lib/actions/records";
import { QuickUpdate } from "@/components/modules/quick-update";
import { Button } from "@/components/ui/button";
import { SelectMenu } from "@/components/ui/select-menu";
import { humanizeColumn } from "@/lib/modules";
import { formatFieldValue, type SerializableModuleConfig } from "@/lib/workflow";

// readiness_score is a 0-1 fraction of checklist items marked "Yes".
function readinessTone(pct: number) {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

// Render readiness as a small gauge + % so progress reads at a glance.
function ReadinessGauge({ value }: { value: unknown }) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(value ?? 0) * 100)));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${readinessTone(pct)}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-700">{pct}%</span>
    </div>
  );
}


function inputTypeForField(fieldType: SerializableModuleConfig["fields"][number]["type"]) {
  if (fieldType === "number") return "number";
  if (fieldType === "date") return "date";
  return "text";
}

// Fields that hold a person/owner — bulk-edit these with a roles+team dropdown.
const OWNER_FIELDS = ["owner", "support", "cm", "cm_owner", "session_lead", "reviewer"];

export function ModuleRecordsTable({
  moduleConfig,
  rows,
  activeCohortId,
  ownerOptions = [],
  readOnly = false,
}: {
  moduleConfig: SerializableModuleConfig;
  rows: Array<Record<string, unknown> & { id: string }>;
  activeCohortId?: string | null;
  ownerOptions?: string[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const returnTo = activeCohortId ? `${moduleConfig.route}?cohort=${activeCohortId}` : moduleConfig.route;

  function recordHref(id: string) {
    return activeCohortId ? `/records/${moduleConfig.key}/${id}?cohort=${activeCohortId}` : `/records/${moduleConfig.key}/${id}`;
  }
  const bulkFields = useMemo(
    () => moduleConfig.fields.filter((field) => moduleConfig.bulkEditableFields.includes(field.key)),
    [moduleConfig],
  );
  const [bulkFieldKey, setBulkFieldKey] = useState(bulkFields[0]?.key ?? "");
  const bulkField = bulkFields.find((field) => field.key === bulkFieldKey) ?? bulkFields[0];
  const [bulkValue, setBulkValue] = useState(bulkFields[0]?.options?.[0] ?? "");

  function onBulkFieldChange(nextKey: string) {
    setBulkFieldKey(nextKey);
    const nextField = bulkFields.find((field) => field.key === nextKey);
    // Reset the value when switching fields so a stale select value isn't submitted.
    setBulkValue(nextField?.options?.[0] ?? "");
  }

  function toggleId(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAll() {
    setSelectedIds((current) => (current.length === rows.length ? [] : rows.map((row) => row.id)));
  }

  return (
    <div className="overflow-x-auto">
      {bulkField && !readOnly ? (
        <form action={bulkUpdateRecordsAction} className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-4 md:min-w-[760px]">
          <input type="hidden" name="table" value={moduleConfig.table} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="selectedIds" value={selectedIds.join(",")} />
          <input type="hidden" name="field" value={bulkFieldKey} />
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {selectedIds.length ? `${selectedIds.length} selected` : "Bulk update"}
          </span>
          <SelectMenu
            ariaLabel="Field to bulk update"
            value={bulkFieldKey}
            onChange={onBulkFieldChange}
            className="w-auto min-w-40"
            options={bulkFields.map((field) => ({ value: field.key, label: field.label }))}
          />
          {bulkField?.options?.length ? (
            <SelectMenu
              ariaLabel="Bulk update value"
              name="value"
              value={bulkValue}
              onChange={setBulkValue}
              className="w-auto min-w-40"
              options={bulkField.options.map((option) => ({ value: option, label: option }))}
            />
          ) : bulkField && OWNER_FIELDS.includes(bulkField.key) && ownerOptions.length ? (
            <SelectMenu
              ariaLabel="Bulk update owner"
              name="value"
              value={bulkValue}
              onChange={setBulkValue}
              placeholder="Select owner"
              className="w-auto min-w-48"
              options={ownerOptions.map((option) => ({ value: option, label: option }))}
            />
          ) : (
            <input
              name="value"
              type={inputTypeForField(bulkField?.type ?? "text")}
              className="app-input h-10 min-w-56"
              placeholder={`Enter ${bulkField?.label.toLowerCase() ?? "value"}`}
            />
          )}
          <Button size="sm" variant="outline" disabled={!selectedIds.length}>
            Apply
          </Button>
        </form>
      ) : null}

      {/* Desktop: table. Mobile: stacked cards (below). */}
      <table className="hidden w-full min-w-[760px] text-left text-sm md:table">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          <tr>
            <th className="px-5 py-3">
              <input type="checkbox" aria-label="Select all records" checked={rows.length > 0 && selectedIds.length === rows.length} onChange={toggleAll} />
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
                <input type="checkbox" aria-label="Select record" checked={selectedIds.includes(row.id)} onChange={() => toggleId(row.id)} />
              </td>
              {moduleConfig.columns.map((column) => {
                const isInteractive = !readOnly && ["risk", "mvp_status", "demo_status", "review_status", "status", "priority"].includes(column);
                return (
                  <td
                    key={column}
                    className="max-w-[22rem] px-5 py-4"
                    onClick={isInteractive ? (event) => event.stopPropagation() : undefined}
                  >
                    {isInteractive ? (
                      <QuickUpdate table={moduleConfig.table} id={row.id} field={column} value={row[column]} returnTo={returnTo} />
                    ) : column === "readiness_score" ? (
                      <ReadinessGauge value={row[column]} />
                    ) : (
                      <span className="line-clamp-3 text-slate-700">{formatFieldValue(row[column])}</span>
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

      {/* Mobile: each record as a card with label/value pairs. */}
      <div className="space-y-3 p-3 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <label className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" aria-label="Select record" checked={selectedIds.includes(row.id)} onChange={() => toggleId(row.id)} />
              </label>
              <Link href={recordHref(row.id)} className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                Open
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            <dl className="mt-2 space-y-2">
              {moduleConfig.columns.map((column) => {
                const isInteractive = !readOnly && ["risk", "mvp_status", "demo_status", "review_status", "status", "priority"].includes(column);
                return (
                  <div key={column} className="flex items-center justify-between gap-3">
                    <dt className="text-xs font-medium text-slate-500">{humanizeColumn(column)}</dt>
                    <dd className="min-w-0 text-right text-sm text-slate-800">
                      {isInteractive ? (
                        <QuickUpdate table={moduleConfig.table} id={row.id} field={column} value={row[column]} returnTo={returnTo} />
                      ) : column === "readiness_score" ? (
                        <ReadinessGauge value={row[column]} />
                      ) : (
                        <span className="line-clamp-2">{formatFieldValue(row[column])}</span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
