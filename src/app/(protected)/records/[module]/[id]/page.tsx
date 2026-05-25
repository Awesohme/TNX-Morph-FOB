import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { deleteRecordAction, updateRecordAction } from "@/lib/actions/records";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RecordForm } from "@/components/workflow/record-form";
import { RecordWorkflowPanels } from "@/components/workflow/record-workflow-panels";
import { getModuleByParam, defaultRecordTitle, toSerializableModuleConfig } from "@/lib/workflow";
import { isMissingRelationError } from "@/lib/utils";

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ module: string; id: string }>;
}) {
  const { module, id } = await params;
  const moduleConfig = getModuleByParam(module);
  const serializableModuleConfig = toSerializableModuleConfig(moduleConfig);
  const supabase = await createClient();
  await requireRole("admin", "facilitator", "community_manager");

  const [{ data: record, error: recordError }, taskResult, commentResult, activityResult] = await Promise.all([
    supabase.from(moduleConfig.table).select("*").eq("id", id).maybeSingle(),
    supabase.from("tasks").select("*").eq("source_record_type", moduleConfig.key).eq("source_record_id", id).order("created_at", { ascending: false }),
    supabase
      .from("comments")
      .select("id, body, created_at, created_by")
      .eq("source_record_type", moduleConfig.key)
      .eq("source_record_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_events")
      .select("id, event_type, title, description, created_at, created_by")
      .eq("source_record_type", moduleConfig.key)
      .eq("source_record_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (recordError || !record) {
    throw new Error(recordError?.message ?? "Record not found.");
  }

  const title = defaultRecordTitle(moduleConfig.key, record);
  const returnTo = `/records/${moduleConfig.key}/${id}`;
  const workflowUnavailable = [taskResult.error, commentResult.error, activityResult.error].some(isMissingRelationError);
  const tasks = workflowUnavailable ? [] : taskResult.data ?? [];
  const comments = workflowUnavailable ? [] : commentResult.data ?? [];
  const activity = workflowUnavailable ? [] : activityResult.data ?? [];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href={moduleConfig.route} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-slate-950">
              <ArrowLeft className="size-4" />
              Back to {moduleConfig.title}
            </Link>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{moduleConfig.singularTitle}</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Update record details, assign operational follow-ups, capture notes, and review the audit trail from this workspace.
            </p>
          </div>

          <form action={deleteRecordAction}>
            <input type="hidden" name="moduleKey" value={moduleConfig.key} />
            <input type="hidden" name="recordId" value={id} />
            <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700">
              <Trash2 className="size-4" />
              Delete
            </Button>
          </form>
        </div>
      </section>

      <Card>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Record details</p>
            <h2 className="font-display text-2xl font-semibold">Edit {moduleConfig.singularTitle.toLowerCase()}</h2>
          </div>
        </div>
        <RecordForm
          moduleConfig={serializableModuleConfig}
          action={updateRecordAction}
          values={record}
          recordId={id}
          submitLabel="Save changes"
        />
      </Card>

      <RecordWorkflowPanels
        moduleKey={moduleConfig.key}
        cohortId={String(record.cohort_id)}
        recordId={id}
        returnTo={returnTo}
        tasks={tasks as never}
        comments={comments as never}
        activity={activity as never}
        workflowReady={!workflowUnavailable}
      />
    </div>
  );
}
