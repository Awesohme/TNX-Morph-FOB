"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createTaskStateAction, type TaskActionState } from "@/lib/actions/records";

const initial: TaskActionState = { ok: false, message: "" };

/**
 * Todoist-style inline quick-add: type a title, hit enter, task is created without a modal.
 */
export function TaskQuickAdd({ cohortId }: { cohortId: string }) {
  const router = useRouter();
  const [state, action] = useActionState(createTaskStateAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={action} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
      <input type="hidden" name="cohortId" value={cohortId} />
      <input type="hidden" name="returnTo" value="/tasks" />
      <input type="hidden" name="priority" value="Medium" />
      <Plus className="size-4 shrink-0 text-slate-400" />
      <input
        name="title"
        aria-label="New task title"
        required
        placeholder="Add a task and press Enter"
        className="h-7 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
      />
      {state.message && !state.ok ? <span className="text-xs text-rose-600">{state.message}</span> : null}
    </form>
  );
}
