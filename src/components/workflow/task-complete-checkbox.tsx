"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { updateTaskStateAction } from "@/lib/actions/records";
import { cn } from "@/lib/utils";

/**
 * Todoist-style round checkbox: click to mark a task Done (or reopen). Updates the task
 * status without opening the editor.
 */
export function TaskCompleteCheckbox({ taskId, status }: { taskId: string; status: string }) {
  const router = useRouter();
  const [done, setDone] = useState(["Done", "Closed"].includes(status));
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !done;
    setDone(next);
    const fd = new FormData();
    fd.set("taskId", taskId);
    fd.set("status", next ? "Done" : "Open");
    fd.set("returnTo", "/tasks");
    startTransition(async () => {
      const result = await updateTaskStateAction(undefined, fd);
      if (!result.ok) {
        // Roll back the optimistic toggle if the server rejected the update.
        setDone(!next);
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={done ? "Reopen task" : "Mark task done"}
      className={cn(
        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition",
        done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-emerald-400",
      )}
    >
      <Check className="size-3" strokeWidth={3} />
    </button>
  );
}
