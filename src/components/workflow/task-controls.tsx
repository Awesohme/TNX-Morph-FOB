"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilLine, Plus } from "lucide-react";
import { createTaskStateAction, updateTaskStateAction, type TaskActionState } from "@/lib/actions/records";
import { type WorkflowTaskRow } from "@/lib/workflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModalShell } from "@/components/ui/modal-shell";
import { RequiredLabel } from "@/components/ui/required-indicator";
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
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              <RequiredLabel>Task title</RequiredLabel>
              <Input name="title" required aria-required="true" />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              <span>Assign to</span>
              <SelectMenu
                name="assignedTo"
                defaultValue=""
                placeholder="Assign to a teammate"
                buttonClassName="h-11"
                options={assignees.map((assignee) => ({ value: assignee.id, label: assignee.label }))}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              <span>Due date</span>
              <Input name="dueAt" type="date" />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              <span>Priority</span>
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
            </label>
          </div>

          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            <span>Description</span>
            <Textarea name="description" placeholder="Context, expected outcome, or handoff notes" rows={4} />
          </label>

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

const TASK_STATUS_OPTIONS = [
  { value: "Open", label: "Open" },
  { value: "In Progress", label: "In progress" },
  { value: "Blocked", label: "Blocked" },
  { value: "Done", label: "Done" },
  { value: "Closed", label: "Closed" },
];

/**
 * Compact status dropdown that updates a task's status directly — a second, faster way to
 * change status without opening the full edit form. Submits status-only so it never wipes
 * assignee/due (the action guards on field presence).
 */
export function TaskStatusQuickSelect({ taskId, status, returnTo }: { taskId: string; status: string; returnTo: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [isPending, startTransition] = useTransition();

  function onChange(next: string) {
    const previous = value;
    setValue(next);
    const fd = new FormData();
    fd.set("taskId", taskId);
    fd.set("status", next);
    fd.set("returnTo", returnTo);
    startTransition(async () => {
      const result = await updateTaskStateAction(initialState, fd);
      if (!result.ok) setValue(previous);
      router.refresh();
    });
  }

  return (
    <SelectMenu
      value={value}
      onChange={onChange}
      loading={isPending}
      buttonClassName="h-8 min-w-[8rem] text-xs"
      options={TASK_STATUS_OPTIONS}
    />
  );
}

export function TaskInlineUpdateForm({
  task,
  returnTo,
  assignees = [],
  open: controlledOpen,
  onOpenChange,
}: {
  task: WorkflowTaskRow;
  returnTo: string;
  assignees?: Array<{ id: string; label: string }>;
  // Controlled: parent owns open + renders its own trigger (e.g. a pencil).
  // Uncontrolled (omit both): the form manages its own open state and renders its own pencil toggle.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const [state, action, isPending] = useActionState(updateTaskStateAction, initialState);

  // Close the editor once a save finishes successfully. Track the pending→done edge so a
  // repeated save (status unchanged, state.ok already true) still collapses the panel.
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !isPending && state.ok) {
      setOpen(false);
      router.refresh();
    }
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state.ok, router]);

  return (
    <div className="space-y-3">
      {/* Uncontrolled mode renders its own toggle; controlled callers supply an external trigger. */}
      {!isControlled ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(!open)}>
            <PencilLine className="size-4" />
            {open ? "Close" : "Edit"}
          </Button>
        </div>
      ) : null}

      {open ? (
      <form action={action} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="space-y-1.5 text-sm font-medium text-slate-700 md:col-span-5">
            <RequiredLabel>Task title</RequiredLabel>
            <Input name="title" required aria-required="true" defaultValue={task.title ?? ""} />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700 md:col-span-5">
            <span>Description</span>
            <Textarea name="description" defaultValue={task.description ?? ""} placeholder="Context, expected outcome, or handoff notes" rows={3} />
          </label>
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
