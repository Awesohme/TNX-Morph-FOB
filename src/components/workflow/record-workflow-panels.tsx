import { CalendarDays, ListChecks, MessageSquareText, WandSparkles } from "lucide-react";
import { createCommentAction, createTaskAction, seedWorkflowTaskAction, updateTaskAction } from "@/lib/actions/records";
import { formatDateLabel, formatFieldValue, taskTone, type WorkflowTaskRow } from "@/lib/workflow";
import type { ModuleKey } from "@/lib/modules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
};

type ActivityRow = {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
};

function actorLabel(profile?: { full_name: string | null; email: string | null } | null) {
  return profile?.full_name || profile?.email || "System";
}

export function RecordWorkflowPanels({
  moduleKey,
  cohortId,
  recordId,
  returnTo,
  tasks,
  comments,
  activity,
}: {
  moduleKey: ModuleKey;
  cohortId: string;
  recordId: string;
  returnTo: string;
  tasks: WorkflowTaskRow[];
  comments: CommentRow[];
  activity: ActivityRow[];
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-5">
        <Card className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Follow-up queue</p>
              <h2 className="font-display text-2xl font-semibold">Tasks</h2>
            </div>
            <form action={seedWorkflowTaskAction}>
              <input type="hidden" name="moduleKey" value={moduleKey} />
              <input type="hidden" name="recordId" value={recordId} />
              <input type="hidden" name="cohortId" value={cohortId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <Button variant="outline" size="sm">
                <WandSparkles className="size-4" />
                Run rules
              </Button>
            </form>
          </div>

          <form action={createTaskAction} className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
            <input type="hidden" name="sourceRecordType" value={moduleKey} />
            <input type="hidden" name="sourceRecordId" value={recordId} />
            <input type="hidden" name="cohortId" value={cohortId} />
            <input type="hidden" name="returnTo" value={returnTo} />
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
            <Textarea name="description" placeholder="Context, expected output, or follow-up notes" rows={3} />
            <div className="flex justify-end">
              <Button size="sm">Add task</Button>
            </div>
          </form>

          <div className="space-y-3">
            {tasks.length ? (
              tasks.map((task) => (
                <Card key={task.id} className="space-y-4 border border-slate-200 bg-white p-4 shadow-none">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone={taskTone(task.status, task.priority)}>{task.status}</Badge>
                        <Badge>{task.priority}</Badge>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-slate-900">{task.title}</h3>
                      {task.description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{task.description}</p> : null}
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="size-3.5" />
                        {formatDateLabel(task.due_at)}
                      </div>
                      <p className="mt-2">{task.assigned_label || "Unassigned"}</p>
                    </div>
                  </div>

                  <form action={updateTaskAction} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
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
                    <Button size="sm" variant="outline">
                      Update
                    </Button>
                  </form>
                </Card>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-muted-foreground">
                No follow-up tasks yet. Add one manually or run the workflow rules for this record.
              </div>
            )}
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Notes</p>
            <h2 className="font-display text-2xl font-semibold">Comments</h2>
          </div>

          <form action={createCommentAction} className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
            <input type="hidden" name="sourceRecordType" value={moduleKey} />
            <input type="hidden" name="sourceRecordId" value={recordId} />
            <input type="hidden" name="cohortId" value={cohortId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <Textarea name="body" placeholder="Capture context, decisions, blockers, or next steps" rows={4} />
            <div className="flex justify-end">
              <Button size="sm">Add comment</Button>
            </div>
          </form>

          <div className="space-y-3">
            {comments.length ? (
              comments.map((comment) => (
                <Card key={comment.id} className="border border-slate-200 bg-white p-4 shadow-none">
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{actorLabel(comment.profiles)}</span>
                    <span>{formatDateLabel(comment.created_at)}</span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.body}</p>
                </Card>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-muted-foreground">
                No comments yet.
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Audit trail</p>
          <h2 className="font-display text-2xl font-semibold">Activity</h2>
        </div>
        <div className="space-y-4">
          {activity.length ? (
            activity.map((event) => (
              <div key={event.id} className="flex gap-3 rounded-[1.4rem] border border-slate-200 bg-white p-4">
                <div className="mt-1 grid size-10 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white">
                  <ListChecks className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{actorLabel(event.profiles)}</span>
                    <span>•</span>
                    <span>{formatDateLabel(event.created_at)}</span>
                  </div>
                  <p className="mt-2 font-medium text-slate-900">{event.title}</p>
                  {event.description ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{formatFieldValue(event.description)}</p>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-muted-foreground">
              Activity will appear here as records are updated, tasks are created, and comments are added.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
