"use client";

import { useOptimistic, useTransition } from "react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { toggleChecklistItemAction } from "@/lib/actions/records";
import { cn } from "@/lib/utils";

type ChecklistItem = { key: string; label: string };

export function ReadinessChecklist({
  recordId,
  returnTo,
  items,
  checklist,
}: {
  recordId: string;
  returnTo: string;
  items: ChecklistItem[];
  checklist: Record<string, string>;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    checklist,
    (state, itemKey: string) => {
      const current = String(state[itemKey] ?? "No").toLowerCase();
      return { ...state, [itemKey]: current === "yes" ? "No" : "Yes" };
    },
  );

  const readyCount = items.filter((item) => String(optimistic[item.key] ?? "").toLowerCase() === "yes").length;

  function toggle(itemKey: string) {
    startTransition(async () => {
      setOptimistic(itemKey);
      const formData = new FormData();
      formData.set("recordId", recordId);
      formData.set("itemKey", itemKey);
      formData.set("returnTo", returnTo);
      await toggleChecklistItemAction(formData);
    });
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2" data-ready={readyCount}>
      {items.map((item) => {
        const done = String(optimistic[item.key] ?? "").toLowerCase() === "yes";
        return (
          <div key={item.key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
            <span className="text-slate-700">{item.label}</span>
            <div className="flex items-center gap-2.5">
              <span className={cn("text-xs font-medium", done ? "text-emerald-600" : "text-amber-700")}>
                {done ? "Done" : "Pending"}
              </span>
              <ToggleSwitch
                checked={done}
                disabled={isPending}
                ariaLabel={`Mark ${item.label} as ${done ? "Pending" : "Done"}`}
                onChange={() => toggle(item.key)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
