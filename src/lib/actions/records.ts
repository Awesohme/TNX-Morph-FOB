"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole, type CurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModuleByKey, getModuleByTable, humanizeColumn, type ModuleConfig, type ModuleField, type ModuleKey } from "@/lib/modules";
import { cmWritableTables, editableFieldsByTable } from "@/lib/record-config";
import { pushRecordToGoogleSheet } from "@/lib/sync";
import { activityDescription, coerceFieldValue, defaultRecordTitle, getModuleField } from "@/lib/workflow";
import { isMissingRelationError, safeErrorMessage } from "@/lib/utils";

type WorkflowTriggerEvent = "record_created" | "record_updated";
export type TaskActionState = { ok: boolean; message: string };
const initialTaskActionState: TaskActionState = { ok: false, message: "" };

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function optionalText(value: FormDataEntryValue | null) {
  const parsed = text(value);
  return parsed || null;
}

function taskSchemaMessage(error: unknown) {
  if (!error || typeof error !== "object") return null;

  const candidate = error as { code?: string; message?: string };
  const message = candidate.message?.toLowerCase() ?? "";
  if (candidate.code === "23502" && (message.includes("source_record_type") || message.includes("source_record_id"))) {
    return "Standalone tasks are not enabled in this database yet. Re-run workflow migration 002 to make source record fields optional.";
  }

  return null;
}

function assertModuleAccess(session: CurrentUser, moduleConfig: ModuleConfig) {
  if (session.role === "community_manager" && !cmWritableTables.has(moduleConfig.table)) {
    throw new Error("Community managers cannot update this module.");
  }
}

function parseRecordPayload(formData: FormData, moduleConfig: ModuleConfig) {
  const payload: Record<string, unknown> = {};

  for (const field of moduleConfig.fields) {
    if (field.editable === false) continue;

    const rawValue =
      field.type === "boolean"
        ? formData.has(field.key)
          ? "true"
          : "false"
        : text(formData.get(field.key));

    if (field.required && !rawValue.trim()) {
      throw new Error(`${field.label} is required.`);
    }

    payload[field.key] = coerceFieldValue(field, rawValue);
  }

  return payload;
}

async function writeAuditLog(
  supabase: ReturnType<typeof createAdminClient>,
  session: CurrentUser,
  action: string,
  entityTable: string,
  entityId: string,
  metadata: Record<string, unknown>,
) {
  await supabase.from("audit_logs").insert({
    actor_id: session.id,
    action,
    entity_table: entityTable,
    entity_id: entityId,
    metadata,
  });
}

async function writeActivityEvent(
  supabase: ReturnType<typeof createAdminClient>,
  session: CurrentUser,
  params: {
    cohortId: string;
    moduleKey: ModuleKey;
    recordId?: string | null;
    eventType: string;
    title: string;
    description?: string | null;
    payload?: Record<string, unknown>;
  },
) {
  if (!params.recordId) return;
  await supabase.from("activity_events").insert({
    cohort_id: params.cohortId,
    source_record_type: params.moduleKey,
    source_record_id: params.recordId,
    event_type: params.eventType,
    title: params.title,
    description: params.description ?? null,
    payload: params.payload ?? {},
    created_by: session.id,
  });
}

function ruleMatches(rule: Record<string, unknown>, payload: Record<string, unknown>) {
  const fieldName = String(rule.field_name ?? "");
  if (!fieldName) return true;

  const comparator = String(rule.comparator ?? "equals");
  const expectedValue = String(rule.expected_value ?? "");
  const actualValue = payload[fieldName];

  switch (comparator) {
    case "truthy":
      return Boolean(actualValue);
    case "contains":
      return String(actualValue ?? "").toLowerCase().includes(expectedValue.toLowerCase());
    case "greater_than":
      return Number(actualValue ?? 0) > Number(expectedValue || 0);
    case "less_than":
      return Number(actualValue ?? 0) < Number(expectedValue || 0);
    case "not_equals":
      return String(actualValue ?? "") !== expectedValue;
    case "equals":
    default:
      return String(actualValue ?? "") === expectedValue;
  }
}

async function runWorkflowRules(
  supabase: ReturnType<typeof createAdminClient>,
  session: CurrentUser,
  params: {
    cohortId: string;
    moduleKey: ModuleKey;
    table: string;
    recordId: string;
    triggerEvent: WorkflowTriggerEvent;
    payload: Record<string, unknown>;
  },
) {
  const { data: rules, error } = await supabase
    .from("workflow_rules")
    .select("*")
    .in("module_key", [params.moduleKey, params.table])
    .eq("trigger_event", params.triggerEvent)
    .eq("is_active", true);

  if (error) {
    if (isMissingRelationError(error)) return;
    throw error;
  }
  if (!rules?.length) return;

  for (const rule of rules) {
    const matched = ruleMatches(rule, params.payload);
    if (!matched) {
      await supabase.from("workflow_runs").insert({
        cohort_id: params.cohortId,
        workflow_rule_id: rule.id,
        source_record_type: params.moduleKey,
        source_record_id: params.recordId,
        trigger_event: params.triggerEvent,
        status: "skipped",
        details: { reason: "condition_not_met" },
        created_by: session.id,
      });
      continue;
    }

    // Track whether this rule actually produced a new follow-up. We only want to log an
    // activity event when something new happened — re-saving a record re-evaluates every
    // matching rule, and emitting the event each time floods the audit trail with
    // identical lines (e.g. "Finish session prep" repeated on each save).
    let createdNewAction = false;
    if (rule.output_action === "create_task") {
      const title = String(rule.task_title ?? "Follow up");
      const { data: existingTask } = await supabase
        .from("tasks")
        .select("id")
        .eq("source_record_type", params.moduleKey)
        .eq("source_record_id", params.recordId)
        .eq("title", title)
        .in("status", ["Open", "In Progress", "Blocked"])
        .limit(1)
        .maybeSingle();

      if (!existingTask) {
        const assignedLabel = rule.assigned_label ? String(rule.assigned_label) : null;
        const { error: createTaskError } = await supabase.from("tasks").insert({
          cohort_id: params.cohortId,
          source_record_type: params.moduleKey,
          source_record_id: params.recordId,
          title,
          description: rule.task_description,
          priority: rule.task_priority ?? "Medium",
          status: "Open",
          assigned_label: assignedLabel,
          metadata: { workflow_rule_id: rule.id, trigger_event: params.triggerEvent },
          created_by: session.id,
          updated_by: session.id,
        });
        if (createTaskError && !isMissingRelationError(createTaskError)) throw createTaskError;
        createdNewAction = !createTaskError;
      }
    } else {
      // Non-task output actions don't dedupe against an existing task, so treat them as a
      // single fired action per evaluation.
      createdNewAction = true;
    }

    if (createdNewAction) {
      await writeActivityEvent(supabase, session, {
        cohortId: params.cohortId,
        moduleKey: params.moduleKey,
        recordId: params.recordId,
        eventType: "workflow_rule_triggered",
        title: String(rule.task_title ?? "Workflow rule triggered"),
        description: String(rule.task_description ?? "An internal workflow rule generated a follow-up action."),
        payload: { workflow_rule_id: rule.id, output_action: rule.output_action },
      });
    }

    const { error: workflowRunError } = await supabase.from("workflow_runs").insert({
      cohort_id: params.cohortId,
      workflow_rule_id: rule.id,
      source_record_type: params.moduleKey,
      source_record_id: params.recordId,
      trigger_event: params.triggerEvent,
      status: "completed",
      details: { output_action: rule.output_action },
      created_by: session.id,
    });
    if (workflowRunError && !isMissingRelationError(workflowRunError)) throw workflowRunError;
  }
}

async function loadRecordOrThrow(
  supabase: ReturnType<typeof createAdminClient>,
  table: string,
  recordId: string,
) {
  const { data, error } = await supabase.from(table).select("*").eq("id", recordId).maybeSingle();
  if (error || !data) throw error ?? new Error("Record not found.");
  return data as Record<string, unknown>;
}

async function createTaskRecord(
  supabase: ReturnType<typeof createAdminClient>,
  session: CurrentUser,
  formData: FormData,
) {
  const sourceRecordTypeText = text(formData.get("sourceRecordType"));
  const sourceRecordId = optionalText(formData.get("sourceRecordId"));
  const cohortId = text(formData.get("cohortId"));
  const title = text(formData.get("title"));
  const description = optionalText(formData.get("description"));
  const dueAt = optionalText(formData.get("dueAt"));
  const priority = text(formData.get("priority")) || "Medium";
  const assignedTo = optionalText(formData.get("assignedTo"));
  const assignedLabel = optionalText(formData.get("assignedLabel"));

  if (!cohortId || !title) throw new Error("Task details are incomplete.");

  const sourceRecordType = sourceRecordTypeText ? (sourceRecordTypeText as ModuleKey) : null;
  let resolvedAssignedLabel = assignedLabel;
  if (assignedTo) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", assignedTo)
      .maybeSingle();
    resolvedAssignedLabel = assignedLabel || profile?.full_name || profile?.email || assignedLabel;
  }
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      cohort_id: cohortId,
      source_record_type: sourceRecordType,
      source_record_id: sourceRecordId,
      title,
      description,
      due_at: dueAt,
      priority,
      assigned_to: assignedTo,
      assigned_label: resolvedAssignedLabel,
      status: "Open",
      created_by: session.id,
      updated_by: session.id,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Could not create task.");

  await writeAuditLog(supabase, session, "create_task", "tasks", data.id, { sourceRecordType, sourceRecordId, title });
  if (sourceRecordType && sourceRecordId) {
    await writeActivityEvent(supabase, session, {
      cohortId,
      moduleKey: sourceRecordType,
      recordId: sourceRecordId,
      eventType: "task_created",
      title: "Follow-up task created",
      description: title,
      payload: { task_id: data.id, priority, due_at: dueAt },
    });
  }

  return { id: data.id, cohortId, sourceRecordType, sourceRecordId };
}

async function updateTaskRecord(
  supabase: ReturnType<typeof createAdminClient>,
  session: CurrentUser,
  formData: FormData,
) {
  const taskId = text(formData.get("taskId"));
  const status = text(formData.get("status"));
  const priority = text(formData.get("priority"));
  const assignedTo = optionalText(formData.get("assignedTo"));
  const assignedLabel = optionalText(formData.get("assignedLabel"));
  const dueAt = optionalText(formData.get("dueAt"));
  // Only treat title/description as edits when the field is actually present in the
  // submitted form. A status-only edit must not wipe the existing context.
  const titleProvided = formData.has("title");
  const descriptionProvided = formData.has("description");
  const title = text(formData.get("title"));
  const description = optionalText(formData.get("description"));
  if (!taskId) throw new Error("Task is missing.");

  const { data: existing, error: existingError } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (existingError || !existing) throw existingError ?? new Error("Task not found.");

  let resolvedAssignedLabel = assignedLabel;
  if (assignedTo) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", assignedTo)
      .maybeSingle();
    resolvedAssignedLabel = assignedLabel || profile?.full_name || profile?.email || assignedLabel;
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      status: status || existing.status,
      priority: priority || existing.priority,
      assigned_to: assignedTo,
      assigned_label: resolvedAssignedLabel,
      due_at: dueAt,
      ...(titleProvided && title ? { title } : {}),
      ...(descriptionProvided ? { description } : {}),
      updated_by: session.id,
    })
    .eq("id", taskId);
  if (error) throw error;

  await writeAuditLog(supabase, session, "update_task", "tasks", taskId, { status, priority, assignedLabel, dueAt });
  if (existing.source_record_type && existing.source_record_id) {
    await writeActivityEvent(supabase, session, {
      cohortId: String(existing.cohort_id),
      moduleKey: existing.source_record_type as ModuleKey,
      recordId: String(existing.source_record_id),
      eventType: "task_updated",
      title: "Follow-up task updated",
      description: `${existing.title} is now ${status || existing.status}.`,
      payload: { task_id: taskId, status, priority, due_at: dueAt, assigned_to: assignedTo },
    });
  }

  return { taskId, existing };
}

function changedFields(previous: Record<string, unknown>, next: Record<string, unknown>) {
  return Object.entries(next).filter(([key, value]) => JSON.stringify(previous[key]) !== JSON.stringify(value));
}

export async function updateRecordFieldAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator", "community_manager");
  try {
    const table = text(formData.get("table"));
    const id = text(formData.get("id"));
    const fieldKey = text(formData.get("field"));
    const value = text(formData.get("value"));
    const returnTo = text(formData.get("returnTo")) || "/";

    const moduleConfig = getModuleByTable(table);
    const allowedFields = editableFieldsByTable[table] ?? [];
    if (!moduleConfig || !id || !allowedFields.includes(fieldKey)) {
      throw new Error("This field cannot be updated from the UI.");
    }

    assertModuleAccess(session, moduleConfig);

    const field = getModuleField(moduleConfig, fieldKey);
    const supabase = createAdminClient();
    const existing = await loadRecordOrThrow(supabase, table, id);
    const nextValue = coerceFieldValue(field, value);

    const { error } = await supabase
      .from(table)
      .update({ [fieldKey]: nextValue, updated_by: session.id })
      .eq("id", id);
    if (error) throw error;

    await writeAuditLog(supabase, session, "update_record_field", table, id, { field: fieldKey, value: nextValue });
    await writeActivityEvent(supabase, session, {
      cohortId: String(existing.cohort_id),
      moduleKey: moduleConfig.key,
      recordId: id,
      eventType: "field_updated",
      title: `${humanizeColumn(fieldKey)} updated`,
      description: activityDescription(table, fieldKey, nextValue),
      payload: { field: fieldKey, value: nextValue },
    });
    await runWorkflowRules(supabase, session, {
      cohortId: String(existing.cohort_id),
      moduleKey: moduleConfig.key,
      table,
      recordId: id,
      triggerEvent: "record_updated",
      payload: { ...existing, [fieldKey]: nextValue },
    });
    await pushRecordToGoogleSheet({
      table,
      recordId: id,
      cohortId: String(existing.cohort_id),
      initiatedBy: session.id,
    });

    revalidatePath(returnTo);
    revalidatePath("/dashboard");
    revalidatePath("/tasks");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function createRecordAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator", "community_manager");
  try {
    const moduleKey = text(formData.get("moduleKey")) as ModuleKey;
    const cohortId = text(formData.get("cohortId"));
    const moduleConfig = getModuleByKey(moduleKey);
    if (!moduleConfig || !cohortId) throw new Error("Module or cohort is missing.");

    assertModuleAccess(session, moduleConfig);
    const payload = parseRecordPayload(formData, moduleConfig);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(moduleConfig.table)
      .insert({
        ...payload,
        cohort_id: cohortId,
        created_by: session.id,
        updated_by: session.id,
      })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("Could not create record.");

    await writeAuditLog(supabase, session, "create_record", moduleConfig.table, data.id, payload);
    await writeActivityEvent(supabase, session, {
      cohortId,
      moduleKey,
      recordId: data.id,
      eventType: "record_created",
      title: `${moduleConfig.singularTitle} created`,
      description: `${moduleConfig.singularTitle} was added to the operations system.`,
      payload,
    });
    await runWorkflowRules(supabase, session, {
      cohortId,
      moduleKey,
      table: moduleConfig.table,
      recordId: data.id,
      triggerEvent: "record_created",
      payload,
    });
    await pushRecordToGoogleSheet({
      table: moduleConfig.table,
      recordId: data.id,
      cohortId,
      initiatedBy: session.id,
    });

    revalidatePath(moduleConfig.route);
    revalidatePath("/dashboard");
    revalidatePath("/tasks");
    redirect(`/records/${moduleKey}/${data.id}?created=1`);
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function updateRecordAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator", "community_manager");
  try {
    const moduleKey = text(formData.get("moduleKey")) as ModuleKey;
    const recordId = text(formData.get("recordId"));
    const moduleConfig = getModuleByKey(moduleKey);
    if (!moduleConfig || !recordId) throw new Error("Record payload is incomplete.");

    assertModuleAccess(session, moduleConfig);
    const payload = parseRecordPayload(formData, moduleConfig);
    const supabase = createAdminClient();
    const existing = await loadRecordOrThrow(supabase, moduleConfig.table, recordId);
    const changes = changedFields(existing, payload);

    const { error } = await supabase
      .from(moduleConfig.table)
      .update({ ...payload, updated_by: session.id })
      .eq("id", recordId);
    if (error) throw error;

    for (const [fieldKey, value] of changes) {
      await writeActivityEvent(supabase, session, {
        cohortId: String(existing.cohort_id),
        moduleKey,
        recordId,
        eventType: "field_updated",
        title: `${humanizeColumn(fieldKey)} updated`,
        description: activityDescription(moduleConfig.table, fieldKey, value),
        payload: { field: fieldKey, value },
      });
    }

    await writeAuditLog(supabase, session, "update_record", moduleConfig.table, recordId, { fields: Object.keys(payload) });
    await runWorkflowRules(supabase, session, {
      cohortId: String(existing.cohort_id),
      moduleKey,
      table: moduleConfig.table,
      recordId,
      triggerEvent: "record_updated",
      payload: { ...existing, ...payload },
    });
    await pushRecordToGoogleSheet({
      table: moduleConfig.table,
      recordId,
      cohortId: String(existing.cohort_id),
      initiatedBy: session.id,
    });

    revalidatePath(moduleConfig.route);
    revalidatePath(`/records/${moduleKey}/${recordId}`);
    revalidatePath("/dashboard");
    revalidatePath("/tasks");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function createTaskAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator", "community_manager");
  try {
    const returnTo = text(formData.get("returnTo")) || "/tasks";
    const supabase = createAdminClient();
    await createTaskRecord(supabase, session, formData);

    revalidatePath("/tasks");
    revalidatePath(returnTo);
    revalidatePath("/dashboard");
  } catch (error) {
    throw new Error(taskSchemaMessage(error) ?? safeErrorMessage(error));
  }
}

export async function updateTaskAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator", "community_manager");
  try {
    const returnTo = text(formData.get("returnTo")) || "/tasks";
    const supabase = createAdminClient();
    await updateTaskRecord(supabase, session, formData);

    revalidatePath("/tasks");
    revalidatePath(returnTo);
    revalidatePath("/dashboard");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function createTaskStateAction(
  _prevState: TaskActionState = initialTaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const session = await requireRole("admin", "facilitator", "community_manager");
  try {
    const returnTo = text(formData.get("returnTo")) || "/tasks";
    const supabase = createAdminClient();
    await createTaskRecord(supabase, session, formData);

    revalidatePath("/tasks");
    revalidatePath(returnTo);
    revalidatePath("/dashboard");
    return { ok: true, message: "Task saved." };
  } catch (error) {
    return { ok: false, message: taskSchemaMessage(error) ?? safeErrorMessage(error) };
  }
}

export async function updateTaskStateAction(
  _prevState: TaskActionState = initialTaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const session = await requireRole("admin", "facilitator", "community_manager");
  try {
    const returnTo = text(formData.get("returnTo")) || "/tasks";
    const supabase = createAdminClient();
    await updateTaskRecord(supabase, session, formData);

    revalidatePath("/tasks");
    revalidatePath(returnTo);
    revalidatePath("/dashboard");
    return { ok: true, message: "Task updated." };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error) };
  }
}

export async function createCommentAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator", "community_manager");
  try {
    const sourceRecordType = text(formData.get("sourceRecordType")) as ModuleKey;
    const sourceRecordId = text(formData.get("sourceRecordId"));
    const cohortId = text(formData.get("cohortId"));
    const body = text(formData.get("body"));
    const returnTo = text(formData.get("returnTo")) || "/";

    if (!cohortId || !sourceRecordId || !body) throw new Error("Comment body is required.");

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("comments")
      .insert({
        cohort_id: cohortId,
        source_record_type: sourceRecordType,
        source_record_id: sourceRecordId,
        body,
        created_by: session.id,
        updated_by: session.id,
      })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("Could not create comment.");

    await writeAuditLog(supabase, session, "create_comment", "comments", data.id, { sourceRecordType, sourceRecordId });
    await writeActivityEvent(supabase, session, {
      cohortId,
      moduleKey: sourceRecordType,
      recordId: sourceRecordId,
      eventType: "comment_added",
      title: "Comment added",
      description: body,
      payload: { comment_id: data.id },
    });

    revalidatePath(returnTo);
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function bulkUpdateRecordsAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator", "community_manager");
  try {
    const table = text(formData.get("table"));
    const moduleConfig = getModuleByTable(table);
    const fieldKey = text(formData.get("field"));
    const rawValue = text(formData.get("value"));
    const selectedIds = text(formData.get("selectedIds"))
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const returnTo = text(formData.get("returnTo")) || "/";

    if (!moduleConfig || !selectedIds.length) throw new Error("Select at least one record.");
    assertModuleAccess(session, moduleConfig);

    const field = getModuleField(moduleConfig, fieldKey);
    if (!field || !moduleConfig.bulkEditableFields.includes(fieldKey)) {
      throw new Error("This bulk action is not available for the selected module.");
    }

    const supabase = createAdminClient();
    const { data: existingRows, error: existingError } = await supabase
      .from(table)
      .select("*")
      .in("id", selectedIds);
    if (existingError) throw existingError;

    const nextValue = coerceFieldValue(field, rawValue);
    const { error } = await supabase
      .from(table)
      .update({ [fieldKey]: nextValue, updated_by: session.id })
      .in("id", selectedIds);
    if (error) throw error;

    for (const row of existingRows ?? []) {
      await writeActivityEvent(supabase, session, {
        cohortId: String(row.cohort_id),
        moduleKey: moduleConfig.key,
        recordId: String(row.id),
        eventType: "bulk_updated",
        title: `${humanizeColumn(fieldKey)} updated in bulk`,
        description: activityDescription(table, fieldKey, nextValue),
        payload: { field: fieldKey, value: nextValue, bulk: true },
      });
      await runWorkflowRules(supabase, session, {
        cohortId: String(row.cohort_id),
        moduleKey: moduleConfig.key,
        table,
        recordId: String(row.id),
        triggerEvent: "record_updated",
        payload: { ...(row as Record<string, unknown>), [fieldKey]: nextValue },
      });
      await pushRecordToGoogleSheet({
        table,
        recordId: String(row.id),
        cohortId: String(row.cohort_id),
        initiatedBy: session.id,
      });
    }

    await writeAuditLog(supabase, session, "bulk_update_records", table, selectedIds[0], {
      selectedIds,
      field: fieldKey,
      value: nextValue,
    });

    revalidatePath(returnTo);
    revalidatePath("/dashboard");
    revalidatePath("/tasks");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function seedWorkflowTaskAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator", "community_manager");
  try {
    const moduleKey = text(formData.get("moduleKey")) as ModuleKey;
    const recordId = text(formData.get("recordId"));
    const cohortId = text(formData.get("cohortId"));
    const returnTo = text(formData.get("returnTo")) || "/";
    const moduleConfig = getModuleByKey(moduleKey);
    if (!moduleConfig || !recordId || !cohortId) throw new Error("Workflow task cannot be generated yet.");

    const supabase = createAdminClient();
    const record = await loadRecordOrThrow(supabase, moduleConfig.table, recordId);
    await runWorkflowRules(supabase, session, {
      cohortId,
      moduleKey,
      table: moduleConfig.table,
      recordId,
      triggerEvent: "record_updated",
      payload: record,
    });

    revalidatePath("/tasks");
    revalidatePath(returnTo);
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function deleteRecordAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator");
  try {
    const moduleKey = text(formData.get("moduleKey")) as ModuleKey;
    const recordId = text(formData.get("recordId"));
    const moduleConfig = getModuleByKey(moduleKey);
    if (!moduleConfig || !recordId) throw new Error("Record cannot be deleted.");

    const supabase = createAdminClient();
    const existing = await loadRecordOrThrow(supabase, moduleConfig.table, recordId);
    const title = defaultRecordTitle(moduleKey, existing);

    const { error } = await supabase.from(moduleConfig.table).delete().eq("id", recordId);
    if (error) throw error;

    await writeAuditLog(supabase, session, "delete_record", moduleConfig.table, recordId, { title });
    revalidatePath(moduleConfig.route);
    revalidatePath("/dashboard");
    revalidatePath("/tasks");
    redirect(`${moduleConfig.route}?deleted=1`);
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}
