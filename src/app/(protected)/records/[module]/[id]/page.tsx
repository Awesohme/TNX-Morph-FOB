import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { updateRecordAction } from "@/lib/actions/records";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RecordForm } from "@/components/workflow/record-form";
import { DeleteRecordButton } from "@/components/workflow/delete-record-button";
import { RecordWorkflowPanels } from "@/components/workflow/record-workflow-panels";
import { ApplicationProfile, type ApplicationProfileRow } from "@/components/participants/application-profile";
import { ReviewSubmission } from "@/components/reviews/review-submission";
import { ParticipantEscalationsPanel } from "@/components/escalations/participant-escalations-panel";
import { ParticipantAttendancePanel, type AttendanceRow } from "@/components/participants/participant-attendance-panel";
import { normalizeAttendanceWeekLabel } from "@/lib/attendance";
import { getParticipantDisplayName } from "@/lib/participants";
import { getModuleByParam, defaultRecordTitle, formatFieldValue, toSerializableModuleConfig, type SerializableModuleConfig } from "@/lib/workflow";
import { cn, isMissingRelationError } from "@/lib/utils";
import { createSignedStorageUrl } from "@/lib/storage";
import { IconModalButton } from "@/components/ui/icon-modal-button";
import { InlineFieldUpdate, QuickUpdate } from "@/components/modules/quick-update";
import { ReadinessChecklist } from "@/components/sessions/readiness-checklist";

export default async function RecordDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string; id: string }>;
  searchParams: Promise<{ cohort?: string; week?: string; cm?: string }>;
}) {
  const { module, id } = await params;
  const { cohort: requestedCohortId, week: requestedWeek, cm: requestedCm } = await searchParams;
  const moduleConfig = getModuleByParam(module);
  const serializableModuleConfig = toSerializableModuleConfig(moduleConfig);
  const supabase = await createClient();
  const session = await requireRole("admin", "facilitator", "community_manager");

  const [{ data: record, error: recordError }, taskResult, commentResult, activityResult] = await Promise.all([
    supabase.from(moduleConfig.table).select("*").eq("id", id).maybeSingle(),
    supabase.from("tasks").select("*").eq("source_record_type", moduleConfig.key).eq("source_record_id", id).order("created_at", { ascending: false }),
    supabase
      .from("comments")
      .select("id, body, created_at, created_by, metadata, profiles:created_by(full_name, email)")
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
  const participantRecordReadOnly = session.role === "community_manager" && moduleConfig.key === "participants";
  const returnTo = `/records/${moduleConfig.key}/${id}`;
  const searchBits = [
    `cohort=${requestedCohortId || String(record.cohort_id)}`,
    moduleConfig.key === "community" && requestedWeek ? `week=${encodeURIComponent(requestedWeek)}` : "",
    moduleConfig.key === "community" && requestedCm ? `cm=${encodeURIComponent(requestedCm)}` : "",
  ].filter(Boolean);
  const backTo = `${moduleConfig.route}?${searchBits.join("&")}`;
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

  // Escalations — shown only on participant profiles (staff-only; service role client bypasses RLS).
  let participantEscalations: Array<{ id: string; category: string; severity: string; notes: string | null; status: string; created_at: string }> = [];
  if (moduleConfig.key === "participants") {
    const supabaseAdmin = (await import("@/lib/supabase/admin")).createAdminClient();
    const { data: escRows } = await supabaseAdmin
      .from("escalations")
      .select("id, category, severity, notes, status, created_at")
      .eq("participant_id", id)
      .order("created_at", { ascending: false });
    participantEscalations = (escRows ?? []) as typeof participantEscalations;
  }

  // Participants for CM report form (community module) — used in pill multiselect.
  let participantsForForm: Array<{ id: string; name: string }> = [];
  if (moduleConfig.key === "community" && record.cohort_id) {
    const { data: parts } = await supabase
      .from("participants")
      .select("id, first_name, last_name, full_name")
      .eq("cohort_id", String(record.cohort_id))
      .order("full_name", { ascending: true });
    participantsForForm = (parts ?? []).map((p) => ({ id: p.id, name: getParticipantDisplayName(p) }));
  }

  // Read-only applicant profile (participants only), matched by email or participant id.
  let applicationProfile: ApplicationProfileRow | null = null;
  let linkedParticipant: Record<string, unknown> | null = null;
  let cohortName = "";
  let attendanceRows: AttendanceRow[] = [];
  let attendanceWeeks: string[] = [];
  if (moduleConfig.key === "participants") {
    const email = record.email ? String(record.email).trim().toLowerCase() : "";
    const supabaseAdmin = (await import("@/lib/supabase/admin")).createAdminClient();
    const [{ data: profileData }, { data: cohortRow }, { data: attRows }, { data: planWeeks }] = await Promise.all([
      email
        ? supabase.from("application_profiles").select("*").eq("email", email).maybeSingle()
        : supabase.from("application_profiles").select("*").eq("participant_id", id).maybeSingle(),
      supabase.from("cohorts").select("name").eq("id", String(record.cohort_id)).maybeSingle(),
      supabaseAdmin
        .from("attendance")
        .select("week, signed_in_at, signed_out_at, topic_baseline, knowledge_before_rating, session_takeaway, session_summary, next_step, knowledge_after_rating, feedback")
        .eq("participant_id", id)
        .eq("cohort_id", String(record.cohort_id)),
      supabase.from("cohort_plan_items").select("week_label, sort_order").eq("cohort_id", String(record.cohort_id)).order("sort_order", { ascending: true }),
    ]);
    applicationProfile = (profileData as ApplicationProfileRow | null) ?? null;
    cohortName = (cohortRow?.name as string) ?? "";
    attendanceRows = ((attRows ?? []) as AttendanceRow[]).map((row) => ({ ...row, week: normalizeAttendanceWeekLabel(row.week) }));
    const planWeekList = Array.from(new Set((planWeeks ?? []).map((w) => normalizeAttendanceWeekLabel(w.week_label))));
    // Fall back to the standard week list if the cohort has no plan items yet.
    attendanceWeeks = planWeekList.length ? planWeekList : ["Week 0", "Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"];
  }
  if (moduleConfig.key === "alumni") {
    const email = record.email ? String(record.email).trim() : "";
    const name = record.name ? String(record.name).trim() : "";
    const { data: participantMatch } = await (email
      ? supabase
          .from("participants")
          .select("*")
          .eq("cohort_id", String(record.cohort_id))
          .ilike("email", email)
          .maybeSingle()
      : supabase
          .from("participants")
          .select("*")
          .eq("cohort_id", String(record.cohort_id))
          .ilike("full_name", name)
          .maybeSingle());
    linkedParticipant = (participantMatch as Record<string, unknown> | null) ?? null;
  }
  const senderFirstName = (session.fullName || session.email || "the Morph team").split(" ")[0];

  // For review records, sign the uploaded worksheet so the submission panel can link it.
  let reviewFileUrl: string | null = null;
  if (moduleConfig.key === "reviews" && record.submission_bucket && record.submission_path) {
    reviewFileUrl = await createSignedStorageUrl(String(record.submission_bucket), String(record.submission_path));
  }
  const sessionChecklist = moduleConfig.key === "sessions" && typeof record.checklist === "object" && record.checklist
    ? (record.checklist as Record<string, string>)
    : null;
  const sessionChecklistItems = moduleConfig.key === "sessions"
    ? (moduleConfig.fields.find((field) => field.key === "checklist")?.checklistItems ?? [])
    : [];

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

          <div className="flex items-center gap-2">
            {participantRecordReadOnly ? null : (
              <IconModalButton
                label={`Edit ${moduleConfig.singularTitle.toLowerCase()}`}
                title={`Edit ${moduleConfig.singularTitle.toLowerCase()}`}
                description="Update record details without taking over the whole page."
                widthClassName="max-w-4xl"
              >
                <RecordForm
                  moduleConfig={serializableModuleConfig}
                  action={updateRecordAction}
                  values={record}
                  recordId={id}
                  cohortId={String(record.cohort_id)}
                  submitLabel="Save changes"
                  participants={participantsForForm}
                />
              </IconModalButton>
            )}
            {session.role === "community_manager" || participantRecordReadOnly ? null : (
              <DeleteRecordButton moduleKey={moduleConfig.key} recordId={id} recordLabel={moduleConfig.singularTitle} />
            )}
          </div>
        </div>
      </section>

      {moduleConfig.key === "reviews" ? (
        <ReviewSubmission record={record} fileUrl={reviewFileUrl} />
      ) : null}

      {sessionChecklist ? (
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Readiness checklist</p>
              <p className="mt-1 text-sm text-muted-foreground">Visible in view mode so you do not have to open edit first.</p>
            </div>
            <Badge tone="blue">
              {sessionChecklistItems.filter((item) => String(sessionChecklist[item.key] ?? "").toLowerCase() === "yes").length}/{sessionChecklistItems.length} ready
            </Badge>
          </div>
          <ReadinessChecklist
            recordId={id}
            returnTo={returnTo}
            items={sessionChecklistItems}
            checklist={sessionChecklist}
          />
        </Card>
      ) : null}

      {applicationProfile ? (
        <ApplicationProfile profile={applicationProfile} senderName={senderFirstName} cohortName={cohortName} />
      ) : null}

      {moduleConfig.key === "participants" ? (
        <ParticipantAttendancePanel weeks={attendanceWeeks} rows={attendanceRows} />
      ) : null}

      <Card className="space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Record details</p>
            <h2 className="text-xl font-semibold">{moduleConfig.key === "alumni" ? "Alumni profile" : `${moduleConfig.singularTitle} details`}</h2>
            <p className="text-sm text-muted-foreground">
              {participantRecordReadOnly
                ? "The actual fields for this participant live here so you can inspect the important profile details without changing the core record."
                : "The actual fields for this record live here, so you can inspect and update the important stuff without hunting through workflow panels."}
            </p>
          </div>
          {moduleConfig.key === "alumni" ? (
            <Badge tone="blue">Certificate + follow-up controls</Badge>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {moduleConfig.fields.map((field) => (
            <OverviewField key={field.key} label={field.label} wide={field.type === "textarea" || field.type === "checklist" || field.type === "weekday_accordion" || field.type === "participant_multiselect"}>
              <OverviewEditable
                moduleConfig={serializableModuleConfig}
                table={moduleConfig.table}
                id={id}
                fieldKey={field.key}
                value={record[field.key]}
                returnTo={returnTo}
                readOnly={participantRecordReadOnly}
                participants={participantsForForm}
              />
            </OverviewField>
          ))}
        </div>
      </Card>

      {moduleConfig.key === "alumni" ? (
        <Card className="space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Source profile</p>
            <h2 className="text-xl font-semibold">Participant context</h2>
            <p className="text-sm text-muted-foreground">Copied-over participant context so the alumni record still feels tied to the actual person behind it.</p>
          </div>

          {linkedParticipant ? (
            <div className="grid gap-4 md:grid-cols-2">
              <OverviewField label="Full name">
                <OverviewStaticValue value={getParticipantDisplayName(linkedParticipant)} />
              </OverviewField>
              <OverviewField label="Email">
                <OverviewStaticValue value={linkedParticipant.email} />
              </OverviewField>
              <OverviewField label="WhatsApp">
                <OverviewStaticValue value={linkedParticipant.whatsapp} />
              </OverviewField>
              <OverviewField label="CM owner">
                <OverviewStaticValue value={linkedParticipant.cm_owner} />
              </OverviewField>
              <OverviewField label="MVP status">
                <OverviewStaticValue value={linkedParticipant.mvp_status} />
              </OverviewField>
              <OverviewField label="Demo status">
                <OverviewStaticValue value={linkedParticipant.demo_status} />
              </OverviewField>
              <OverviewField label="Risk">
                <OverviewStaticValue value={linkedParticipant.risk} />
              </OverviewField>
              <OverviewField label="Next action" wide>
                <OverviewStaticValue value={linkedParticipant.next_action} multiline />
              </OverviewField>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm text-muted-foreground">
              We could not find a linked participant record for this alumni entry yet.
            </div>
          )}
        </Card>
      ) : null}

      {moduleConfig.key === "participants" ? (
        <ParticipantEscalationsPanel
          escalations={participantEscalations}
          cohortId={String(record.cohort_id)}
          participantId={id}
          participantName={getParticipantDisplayName(record)}
          returnTo={returnTo}
        />
      ) : null}

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

function OverviewField({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4", wide ? "md:col-span-2" : "")}>
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">{label}</p>
      {children}
    </div>
  );
}

function OverviewStaticValue({ value, multiline = false }: { value: unknown; multiline?: boolean }) {
  return (
    <p className={cn("text-sm text-slate-700", multiline ? "whitespace-pre-wrap leading-6" : "")}>
      {formatFieldValue(value)}
    </p>
  );
}

const DAY_LABELS: Record<string, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function OverviewEditable({
  moduleConfig,
  table,
  id,
  fieldKey,
  value,
  returnTo,
  readOnly = false,
  participants = [],
}: {
  moduleConfig: SerializableModuleConfig;
  table: string;
  id: string;
  fieldKey: string;
  value: unknown;
  returnTo: string;
  readOnly?: boolean;
  participants?: Array<{ id: string; name: string }>;
}) {
  const field = moduleConfig.fields.find((item) => item.key === fieldKey);
  if (!field) return <OverviewStaticValue value={value} />;
  if (readOnly) return <OverviewStaticValue value={value} multiline={field.type === "textarea"} />;

  if (field.type === "weekday_accordion") {
    const days = value && typeof value === "object" ? (value as Record<string, boolean>) : {};
    const active = DAY_ORDER.filter((d) => days[d]);
    if (!active.length) return <p className="text-sm text-muted-foreground">—</p>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {active.map((d) => <Badge key={d} tone="blue">{DAY_LABELS[d]}</Badge>)}
      </div>
    );
  }

  if (field.type === "participant_multiselect") {
    const ids: string[] = Array.isArray(value) ? (value as string[]) : [];
    if (!ids.length) return <p className="text-sm text-muted-foreground">—</p>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {ids.map((pid) => {
          const p = participants.find((x) => x.id === pid);
          return <Badge key={pid} tone="neutral">{p ? p.name : pid.slice(0, 8)}</Badge>;
        })}
      </div>
    );
  }

  if (field.type === "checklist") {
    const checklist = typeof value === "object" && value ? (value as Record<string, string>) : {};
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {(field.checklistItems ?? []).map((item) => {
          const ready = String(checklist[item.key] ?? "").toLowerCase() === "yes";
          return (
            <div key={item.key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              <span className="text-slate-700">{item.label}</span>
              <Badge tone={ready ? "green" : "amber"}>{ready ? "Ready" : "Pending"}</Badge>
            </div>
          );
        })}
      </div>
    );
  }

  if (field.type === "boolean" || field.type === "select") {
    return <QuickUpdate table={table} id={id} field={fieldKey} value={value} returnTo={returnTo} />;
  }

  if (field.type === "text" || field.type === "date" || field.type === "number") {
    return <InlineFieldUpdate table={table} id={id} field={fieldKey} value={value} returnTo={returnTo} placeholder={field.label} />;
  }

  return <OverviewStaticValue value={value} multiline />;
}
