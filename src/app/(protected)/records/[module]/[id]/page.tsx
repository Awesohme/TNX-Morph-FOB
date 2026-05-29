import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { deleteRecordAction, updateRecordAction } from "@/lib/actions/records";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecordForm } from "@/components/workflow/record-form";
import { RecordWorkflowPanels } from "@/components/workflow/record-workflow-panels";
import { getModuleByParam, defaultRecordTitle, toSerializableModuleConfig } from "@/lib/workflow";
import { isMissingRelationError } from "@/lib/utils";
import { createSignedStorageUrl } from "@/lib/storage";

export default async function RecordDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string; id: string }>;
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { module, id } = await params;
  const { cohort: requestedCohortId } = await searchParams;
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
  const backTo = `${moduleConfig.route}?cohort=${requestedCohortId || String(record.cohort_id)}`;
  const workflowUnavailable = [taskResult.error, commentResult.error, activityResult.error].some(isMissingRelationError);
  const tasks = workflowUnavailable ? [] : taskResult.data ?? [];
  const comments = workflowUnavailable ? [] : commentResult.data ?? [];
  const activity = workflowUnavailable ? [] : activityResult.data ?? [];
  const [{ data: linkedResources, error: linkedResourcesError }, { data: attachments }, availableResourcesResult, { data: profiles }] = await Promise.all([
    supabase
      .from("record_resources")
      .select("id, resources:resource_id(id, title, resource_type, url, file_url, notes, storage_bucket, storage_path)")
      .eq("source_record_type", moduleConfig.key)
      .eq("source_record_id", id),
    supabase
      .from("attachments")
      .select("id, file_name, file_url, storage_bucket, storage_path")
      .eq("source_record_type", moduleConfig.key)
      .eq("source_record_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("resources").select("id, title, resource_type").eq("cohort_id", String(record.cohort_id)).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email").eq("is_active", true).order("full_name", { ascending: true }),
  ]);
  const resourceUnavailable = isMissingRelationError(linkedResourcesError) || isMissingRelationError(availableResourcesResult.error);
  const resources = resourceUnavailable
    ? []
    : (
        await Promise.all(
          (linkedResources ?? []).map(async (item) => {
          const resource = Array.isArray(item.resources) ? item.resources[0] : item.resources;
            if (!resource) return null;
            return {
              ...resource,
              file_url: (await createSignedStorageUrl(resource.storage_bucket, resource.storage_path)) ?? resource.file_url,
            };
          }),
        )
      ).filter(Boolean);
  const resolvedAttachments = await Promise.all(
    (attachments ?? []).map(async (attachment) => ({
      ...attachment,
      file_url: (await createSignedStorageUrl(attachment.storage_bucket, attachment.storage_path)) ?? attachment.file_url,
    })),
  );
  const assignees = (profiles ?? []).map((profile) => ({
    id: profile.id,
    label: profile.full_name || profile.email || "Unknown user",
  }));

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href={backTo} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-slate-950">
              <ArrowLeft className="size-4" />
              Back to {moduleConfig.title}
            </Link>
            <p className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{moduleConfig.singularTitle}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
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

      <details className="app-panel group">
        <summary className="mb-6 cursor-pointer list-none">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Record details</p>
              <h2 className="mt-1 text-xl font-semibold">Edit {moduleConfig.singularTitle.toLowerCase()}</h2>
            </div>
            <Badge tone="blue">Edit fields</Badge>
          </div>
        </summary>
        <RecordForm
          moduleConfig={serializableModuleConfig}
          action={updateRecordAction}
          values={record}
          recordId={id}
          submitLabel="Save changes"
        />
      </details>

      <RecordWorkflowPanels
        moduleKey={moduleConfig.key}
        cohortId={String(record.cohort_id)}
        recordId={id}
        returnTo={returnTo}
        tasks={tasks as never}
        comments={comments as never}
        activity={activity as never}
        resources={resources as never}
        attachments={resolvedAttachments as never}
        availableResources={resourceUnavailable ? [] : ((availableResourcesResult.data ?? []) as never)}
        assignees={assignees}
        workflowReady={!workflowUnavailable}
      />
    </div>
  );
}
