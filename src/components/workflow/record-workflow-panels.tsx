import { CalendarDays, UserRound } from "lucide-react";
import { createCommentAction } from "@/lib/actions/records";
import { addAttachmentAction, attachResourceToRecordAction } from "@/lib/actions/ops";
import { formatDateLabel, formatFieldValue, taskTone, type WorkflowTaskRow } from "@/lib/workflow";
import type { ModuleKey } from "@/lib/modules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SelectMenu } from "@/components/ui/select-menu";
import { TaskCreateModal, TaskInlineUpdateForm } from "@/components/workflow/task-controls";
import { ActivityDrawer } from "@/components/workflow/activity-drawer";
import { MentionPicker } from "@/components/workflow/mention-picker";

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

type ResourceRow = {
  id: string;
  title: string;
  resource_type: string;
  url: string | null;
  file_url: string | null;
  notes: string | null;
};

type AttachmentRow = {
  id: string;
  file_name: string;
  file_url: string;
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
  resources,
  attachments,
  availableResources,
  assignees,
  workflowReady,
}: {
  moduleKey: ModuleKey;
  cohortId: string;
  recordId: string;
  returnTo: string;
  tasks: WorkflowTaskRow[];
  comments: CommentRow[];
  activity: ActivityRow[];
  resources: ResourceRow[];
  attachments: AttachmentRow[];
  availableResources: Array<{ id: string; title: string; resource_type: string }>;
  assignees: Array<{ id: string; label: string }>;
  workflowReady: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <ActivityDrawer activity={activity} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Follow-up queue</p>
              <h2 className="text-xl font-semibold">Tasks</h2>
            </div>
            <p className="text-sm text-muted-foreground">Create and update linked follow-up items for this record.</p>
          </div>

          {workflowReady ? (
            <div className="flex justify-end rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <TaskCreateModal
                title="Create linked follow-up task"
                description="Capture the next action, owner, and due date for this record."
                triggerLabel="Add linked task"
              cohortId={cohortId}
              returnTo={returnTo}
              sourceRecordType={moduleKey}
              sourceRecordId={recordId}
              assignees={assignees}
            />
          </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
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
                      <h3 className="mt-2.5 text-base font-semibold text-slate-900">{task.title}</h3>
                      {task.description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{task.description}</p> : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
                        <CalendarDays className="size-3.5" />
                        {formatDateLabel(task.due_at)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1">
                        <UserRound className="size-3.5" />
                        {task.assigned_label || "Unassigned"}
                      </span>
                    </div>
                  </div>

                  <TaskInlineUpdateForm task={task} returnTo={returnTo} assignees={assignees} />
                </Card>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-muted-foreground">
                No follow-up tasks yet. Add one from the linked task modal for this record.
              </div>
            )}
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Notes</p>
            <h2 className="text-xl font-semibold">Comments</h2>
          </div>

          {workflowReady ? (
            <form action={createCommentAction} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <input type="hidden" name="sourceRecordType" value={moduleKey} />
              <input type="hidden" name="sourceRecordId" value={recordId} />
              <input type="hidden" name="cohortId" value={cohortId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <Textarea name="body" placeholder="Capture context, decisions, blockers, or next steps" rows={4} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <MentionPicker people={assignees} />
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
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-muted-foreground">
                No comments yet.
              </div>
            )}
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Resources</p>
            <h2 className="text-xl font-semibold">Links and files</h2>
          </div>

          <form action={attachResourceToRecordAction} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-[1fr_auto]">
            <input type="hidden" name="cohortId" value={cohortId} />
            <input type="hidden" name="sourceRecordType" value={moduleKey} />
            <input type="hidden" name="sourceRecordId" value={recordId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <SelectMenu
              name="resourceId"
              defaultValue=""
              placeholder="Attach existing library resource"
              buttonClassName="h-11"
              options={availableResources.map((resource) => ({
                value: resource.id,
                label: `${resource.title} · ${resource.resource_type}`,
              }))}
            />
            <Button size="sm" variant="outline">
              Attach resource
            </Button>
          </form>

          <form action={addAttachmentAction} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-[1fr_1fr]">
            <input type="hidden" name="cohortId" value={cohortId} />
            <input type="hidden" name="sourceRecordType" value={moduleKey} />
            <input type="hidden" name="sourceRecordId" value={recordId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input name="fileName" placeholder="Attachment label" className="app-input h-11" />
            <input name="fileUrl" placeholder="External attachment URL" className="app-input h-11" />
            <input
              name="file"
              type="file"
              className="app-input h-11 md:col-span-2 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm"
            />
            <div className="flex justify-end md:col-span-2">
              <Button size="sm">Save attachment</Button>
            </div>
          </form>

          <div className="space-y-3">
            {resources.map((resource) => (
              <Card key={resource.id} className="border border-slate-200 bg-white p-4 shadow-none">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="blue">{resource.resource_type}</Badge>
                </div>
                <p className="mt-3 font-semibold text-slate-950">{resource.title}</p>
                {resource.notes ? <p className="mt-2 text-sm text-muted-foreground">{resource.notes}</p> : null}
                {resource.url ? <a href={resource.url} className="mt-3 block text-sm font-medium text-slate-700 underline underline-offset-2">Open URL</a> : null}
                {resource.file_url ? <a href={resource.file_url} className="mt-1 block text-sm font-medium text-slate-700 underline underline-offset-2">Open file</a> : null}
              </Card>
            ))}
            {attachments.map((attachment) => (
              <Card key={attachment.id} className="border border-slate-200 bg-white p-4 shadow-none">
                <p className="font-semibold text-slate-950">{attachment.file_name}</p>
                <a href={attachment.file_url} className="mt-2 block text-sm font-medium text-slate-700 underline underline-offset-2">
                  Open attachment
                </a>
              </Card>
            ))}
            {!resources.length && !attachments.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-muted-foreground">
                No resources or attachments linked to this record yet.
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
