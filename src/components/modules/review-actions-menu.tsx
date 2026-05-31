"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { updateRecordFieldAction } from "@/lib/actions/records";
import { SelectMenu } from "@/components/ui/select-menu";
import { cn } from "@/lib/utils";

const REVIEW_STATUS = ["Not Reviewed", "In Review", "Feedback Sent", "Needs Resubmission", "Closed"];
const OUTCOMES = ["", "Pass", "Needs work", "Fail"];

/**
 * Consolidates the per-review inline controls into a single "Update" popover. Replacing the
 * always-on 4-column control grid keeps each row light and avoids the wide layout that broke
 * the reviews page when zoomed out on the PWA.
 */
export function ReviewActionsMenu({
  id,
  reviewStatus,
  reviewer,
  finalStatus,
  reviewerOptions,
  recordHref,
  returnTo,
  canGrade = true,
}: {
  id: string;
  reviewStatus: string;
  reviewer: string;
  finalStatus: string;
  reviewerOptions: string[];
  recordHref: string;
  returnTo: string;
  // CMs view submission status but don't grade — they only get "Open full record".
  canGrade?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function update(field: string, value: string) {
    const fd = new FormData();
    fd.set("table", "assignment_reviews");
    fd.set("id", id);
    fd.set("field", field);
    fd.set("value", value);
    fd.set("returnTo", returnTo);
    startTransition(async () => {
      await updateRecordFieldAction(fd);
      router.refresh();
    });
  }

  // CMs (canGrade=false) only get a link into the full record — no grading controls.
  if (!canGrade) {
    return (
      <Link
        href={recordHref}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Open full record
        <ArrowUpRight className="size-4" />
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        Update
        <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-72 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600">Review status</span>
            <SelectMenu
              value={reviewStatus}
              onChange={(v) => update("review_status", v)}
              options={REVIEW_STATUS.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <div className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600">Reviewer</span>
            <SelectMenu
              value={reviewer}
              placeholder="Assign reviewer"
              onChange={(v) => update("reviewer", v)}
              options={reviewerOptions.map((r) => ({ value: r, label: r }))}
            />
          </div>
          <div className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600">Final outcome</span>
            <SelectMenu
              value={finalStatus}
              placeholder="Set outcome"
              onChange={(v) => update("final_status", v)}
              options={OUTCOMES.map((o) => ({ value: o, label: o || "—" }))}
            />
          </div>
          <Link
            href={recordHref}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Open full record
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
