"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createTaskStateAction, updateTaskStateAction, type TaskActionState } from "@/lib/actions/records";
import { type WorkflowTaskRow } from "@/lib/workflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const initialState: TaskActionState = { ok: false, message: "" };

export function TaskCreateModal({
  title,
  description,
  triggerLabel,
  cohortId,
  cohortName,
  returnTo,
  sourceRecordType,
  sourceRecordId,
}: {
  title: string;
  description: string;
  triggerLabel: string;
  cohortId: string;
  cohortName?: string;
  returnTo: string;
  sourceRecordType?: string;
  sourceRecordId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState(createTaskStateAction, initialState);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [router, state.ok]);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {triggerLabel}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/45 px-4 py-10 backdrop-blur-sm">
          <Card className="relative z-[201] w-full max-w-2xl space-y-5 border-white/70 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Task composer</p>
                <h2 className="mt-2 font-display text-3xl font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label="Close task modal">
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {cohortName ? <Badge tone="blue">{cohortName}</Badge> : null}
              {sourceRecordType && sourceRecordId ? <Badge>Linked task</Badge> : <Badge tone="amber">Standalone task</Badge>}
            </div>

            <form action={action} className="grid gap-3">
              <input type="hidden" name="cohortId" value={cohortId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              {sourceRecordType ? <input type="hidden" name="sourceRecordType" value={sourceRecordType} /> : null}
              {sourceRecordId ? <input type="hidden" name="sourceRecordId" value={sourceRecordId} /> : null}

              <div className="grid gap-3 md:grid-cols-2">
                <Input name="title" placeholder="Task title" />
                <Input name="assignedLabel" placeholder="Owner or team" />
                <Input name="dueAt" type="date" />
                <select
                  name="priority"
                  defaultValue="Medium"
                  className="flex h-12 w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="Low">Low priority</option>
                  <option value="Medium">Medium priority</option>
                  <option value="High">High priority</option>
                </select>
              </div>

              <Textarea name="description" placeholder="Context, expected outcome, or handoff notes" rows={4} />

              {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-rose-700"}>{state.message}</p> : null}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={isPending}>{isPending ? "Saving..." : "Save task"}</Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </>
  );
}

export function TaskInlineUpdateForm({
  task,
  returnTo,
}: {
  task: WorkflowTaskRow;
  returnTo: string;
}) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(updateTaskStateAction, initialState);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  return (
    <form action={action} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
      <input type="hidden" name="taskId" value={task.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <select
        name="status"
        defaultValue={task.status}
        className="flex h-11 w-full rounded-[1.1rem] border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
      >
        <option value="Open">Open</option>
        <option value="In Progress">In progress</option>
        <option value="Blocked">Blocked</option>
        <option value="Done">Done</option>
        <option value="Closed">Closed</option>
      </select>
      <Input name="assignedLabel" defaultValue={task.assigned_label ?? ""} placeholder="Owner" />
      <Input name="dueAt" type="date" defaultValue={task.due_at ? String(task.due_at).slice(0, 10) : ""} />
      <Button size="sm" variant="outline" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </Button>
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-rose-700"} md:col-span-4`}>{state.message}</p>
      ) : null}
    </form>
  );
}
