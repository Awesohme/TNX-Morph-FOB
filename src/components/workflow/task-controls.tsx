"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PencilLine, Plus } from "lucide-react";
import { createTaskStateAction, updateTaskStateAction, type TaskActionState } from "@/lib/actions/records";
import { type WorkflowTaskRow } from "@/lib/workflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModalShell } from "@/components/ui/modal-shell";
import { SelectMenu } from "@/components/ui/select-menu";

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
  assignees = [],
}: {
  title: string;
  description: string;
  triggerLabel: string;
  cohortId: string;
  cohortName?: string;
  returnTo: string;
  sourceRecordType?: string;
  sourceRecordId?: string;
  assignees?: Array<{ id: string; label: string }>;
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

      <ModalShell open={open} onClose={() => setOpen(false)} title={title} description={description}>
        <div className="mb-4 flex flex-wrap gap-2">
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
            <SelectMenu
              name="assignedTo"
              defaultValue=""
              placeholder="Assign to a teammate"
              buttonClassName="h-11"
              options={assignees.map((assignee) => ({ value: assignee.id, label: assignee.label }))}
            />
            <Input name="dueAt" type="date" />
            <SelectMenu
              name="priority"
              defaultValue="Medium"
              buttonClassName="h-11"
              options={[
                { value: "Low", label: "Low priority" },
                { value: "Medium", label: "Medium priority" },
                { value: "High", label: "High priority" },
              ]}
            />
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
      </ModalShell>
    </>
  );
}

export function TaskInlineUpdateForm({
  task,
  returnTo,
  assignees = [],
}: {
  task: WorkflowTaskRow;
  returnTo: string;
  assignees?: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState(updateTaskStateAction, initialState);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [router, state.ok]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span>{task.status}</span>
          <span>{task.assigned_label || "Unassigned"}</span>
          <span>{task.due_at ? String(task.due_at).slice(0, 10) : "No due date"}</span>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen((value) => !value)}>
          <PencilLine className="size-4" />
          {open ? "Close" : "Edit"}
        </Button>
      </div>

      {open ? (
        <form action={action} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Input name="title" defaultValue={task.title ?? ""} placeholder="Task title" className="md:col-span-5" />
          <Textarea name="description" defaultValue={task.description ?? ""} placeholder="Context, expected outcome, or handoff notes" rows={3} className="md:col-span-5" />
          <SelectMenu
            name="status"
            defaultValue={task.status}
            buttonClassName="h-11"
            options={[
              { value: "Open", label: "Open" },
              { value: "In Progress", label: "In progress" },
              { value: "Blocked", label: "Blocked" },
              { value: "Done", label: "Done" },
              { value: "Closed", label: "Closed" },
            ]}
          />
          <SelectMenu
            name="assignedTo"
            defaultValue={task.assigned_to ?? ""}
            placeholder="Unassigned"
            buttonClassName="h-11"
            options={assignees.map((assignee) => ({ value: assignee.id, label: assignee.label }))}
          />
          <Input name="dueAt" type="date" defaultValue={task.due_at ? String(task.due_at).slice(0, 10) : ""} />
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          {state.message ? (
            <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-rose-700"} md:col-span-4`}>{state.message}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
