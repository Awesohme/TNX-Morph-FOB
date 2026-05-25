import { CalendarDays, ListChecks } from "lucide-react";
import { createCommentAction } from "@/lib/actions/records";
import { formatDateLabel, formatFieldValue, taskTone, type WorkflowTaskRow } from "@/lib/workflow";
import type { ModuleKey } from "@/lib/modules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { TaskCreateModal, TaskInlineUpdateForm } from "@/components/workflow/task-controls";

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
  workflowReady,
}: {
  moduleKey: ModuleKey;
  cohortId: string;
  recordId: string;
  returnTo: string;
  tasks: WorkflowTaskRow[];
  comments: CommentRow[];
  activity: ActivityRow[];
  workflowReady: boolean;
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
            <p className="text-sm text-muted-foreground">Create and update linked follow-up items for this record.</p>
          </div>

          {workflowReady ? (
            <div className="flex justify-end rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
              <TaskCreateModal
                title="Create linked follow-up task"
                description="Capture the next action, owner, and due date for this record."
                triggerLabel="Add linked task"
                cohortId={cohortId}
                returnTo={returnTo}
                sourceRecordType={moduleKey}
                sourceRecordId={recordId}
              />
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
              Workflow tables are not available in this environment yet. Run the workflow migration to enable linked tasks, comments, and activity history.
            </div>
          )}

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

                  <TaskInlineUpdateForm task={task} returnTo={returnTo} />
                </Card>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-muted-foreground">
                No follow-up tasks yet. Add one from the linked task modal for this record.
              </div>
            )}
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Notes</p>
            <h2 className="font-display text-2xl font-semibold">Comments</h2>
          </div>

          {workflowReady ? (
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
          ) : null}

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
