"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { cohortSwitchHref } from "@/lib/cohort-selection";
import { cn } from "@/lib/utils";

export function CohortSwitcher({
  cohorts,
  activeCohortId,
  basePath,
}: {
  cohorts: Array<{ id: string; name: string }>;
  activeCohortId?: string | null;
  basePath: string;
}) {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();
  const selected = cohorts.find((cohort) => cohort.id === activeCohortId);
  if (!cohorts.length) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        <span>Cohorts</span><span aria-hidden="true">·</span>
        <span className="truncate">{selected?.name ?? "Choose cohort"}</span>
        <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
      </button>
      <ModalShell open={open} onClose={() => setOpen(false)} title="Choose cohort" widthClassName="max-w-md">
        <nav aria-label="Cohorts" className="space-y-2">
          {cohorts.map((cohort) => {
            const active = cohort.id === activeCohortId;
            return (
              <Link
                key={cohort.id}
                href={cohortSwitchHref(basePath, searchParams.toString(), cohort.id)}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900",
                  active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                )}
              >
                {cohort.name}
                {active ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
              </Link>
            );
          })}
        </nav>
      </ModalShell>
    </>
  );
}
