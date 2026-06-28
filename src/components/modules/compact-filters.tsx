"use client";

import Link from "next/link";
import { useState } from "react";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectMenu } from "@/components/ui/select-menu";
import type { ModuleFilterOption } from "@/lib/modules";
import { cn } from "@/lib/utils";

export type CompactFilterDefinition = {
  key: string;
  label: string;
  options: ModuleFilterOption[];
};

export function CompactFilters({
  action,
  hiddenParams = {},
  filters,
  values,
  resetHref,
  className,
}: {
  action: string;
  hiddenParams?: Record<string, string | undefined>;
  filters: CompactFilterDefinition[];
  values: Record<string, string>;
  resetHref: string;
  className?: string;
}) {
  const activeCount = filters.filter((filter) => values[filter.key]).length;
  const [open, setOpen] = useState(activeCount > 0);

  if (!filters.length) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50",
            activeCount && "border-slate-900 text-slate-950",
          )}
        >
          <Filter className="size-4" />
          <span>Filters</span>
          {activeCount ? (
            <span className="rounded-full bg-slate-950 px-1.5 py-0.5 text-[10px] font-semibold text-white">{activeCount}</span>
          ) : null}
        </button>
      </div>

      {open ? (
        <form action={action} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          {Object.entries(hiddenParams).map(([key, value]) =>
            value ? <input key={key} type="hidden" name={key} value={value} /> : null,
          )}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {filters.map((filter) => (
              <label key={filter.key} className="space-y-1.5 text-sm font-medium text-slate-700">
                <span>{filter.label}</span>
                <SelectMenu
                  name={filter.key}
                  defaultValue={values[filter.key] ?? ""}
                  placeholder={`All ${filter.label.toLowerCase()}`}
                  buttonClassName="h-10"
                  options={[{ value: "", label: `All ${filter.label.toLowerCase()}` }, ...filter.options]}
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Link
              href={resetHref}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Link>
            <Button size="sm">Apply filters</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
