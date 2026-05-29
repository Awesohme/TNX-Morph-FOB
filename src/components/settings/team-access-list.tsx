"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Status = "active" | "deactivated" | "pending";
type Filter = "active" | "deactivated" | "all";

/**
 * Wraps the server-rendered profile cards and filters them by status. Defaults to Active so
 * deactivated/pending users don't clutter the list.
 */
export function TeamAccessList({
  items,
}: {
  items: Array<{ id: string; status: Status; card: ReactNode }>;
}) {
  const [filter, setFilter] = useState<Filter>("active");
  const counts = {
    active: items.filter((i) => i.status === "active").length,
    deactivated: items.filter((i) => i.status === "deactivated").length,
    all: items.length,
  };
  const visible = items.filter((i) => (filter === "all" ? true : i.status === filter));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["active", "deactivated", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-xl border px-3 py-1.5 text-xs font-medium capitalize transition",
              filter === f ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {visible.length ? visible.map((i) => <div key={i.id}>{i.card}</div>) : (
          <p className="text-sm text-muted-foreground">No {filter === "all" ? "" : filter} users.</p>
        )}
      </div>
    </div>
  );
}
