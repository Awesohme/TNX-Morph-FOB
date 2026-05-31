"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { canSendPush, sendPushNotification } from "@/lib/push";
import { dispatchDueReminders } from "@/lib/reminders";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeErrorMessage } from "@/lib/utils";

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function optionalText(value: FormDataEntryValue | null) {
  const parsed = text(value);
  return parsed || null;
}

async function uploadFormFile({
  supabase,
  file,
  prefix,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  file: File;
  prefix: string;
}) {
  const env = getServerEnv();
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension ? `.${extension}` : ""}`;
  const path = `${prefix}/${fileName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(env.storageBucketName).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;

  return {
    storage_bucket: env.storageBucketName,
    storage_path: path,
    mime_type: file.type || "application/octet-stream",
    file_size: file.size,
  };
}

async function writeAudit(
  supabase: ReturnType<typeof createAdminClient>,
  actorId: string,
  action: string,
  metadata: Record<string, unknown>,
) {
  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action,
    metadata,
  });
}

// Guard against locking the whole org out: block demoting/deactivating the last active admin.
async function assertNotLastActiveAdmin(
  supabase: ReturnType<typeof createAdminClient>,
  profileId: string,
) {
  const { data: target } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", profileId)
    .maybeSingle();
  if (!target || target.role !== "admin" || !target.is_active) return; // not an active admin
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("is_active", true);
  if ((count ?? 0) <= 1) {
    throw new Error("Cannot remove the last active admin. Promote another admin first.");
  }
}

export async function saveCohortAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin");
  try {
    const supabase = createAdminClient();
    const cohortId = optionalText(formData.get("cohortId"));
    const payload = {
      slug: text(formData.get("slug")),
      name: text(formData.get("name")),
      description: optionalText(formData.get("description")),
      starts_on: optionalText(formData.get("starts_on")),
      ends_on: optionalText(formData.get("ends_on")),
      status: text(formData.get("status")) || "planning",
      updated_by: session.id,
    };

    if (!payload.slug || !payload.name) {
      throw new Error("Cohort name and slug are required.");
    }

    if (cohortId) {
      const { error } = await supabase.from("cohorts").update(payload).eq("id", cohortId);
      if (error) throw error;
      await writeAudit(supabase, session.id, "update_cohort", { cohortId, ...payload });
    } else {
      const { data, error } = await supabase
        .from("cohorts")
        .insert({ ...payload, created_by: session.id })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("Could not create cohort.");
      await writeAudit(supabase, session.id, "create_cohort", { cohortId: data.id, ...payload });
    }

    revalidatePath("/cohorts");
    revalidatePath("/dashboard");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function updateProfileAccessAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin");
  try {
    const supabase = createAdminClient();
    const profileId = text(formData.get("profileId"));
    const role = text(formData.get("role")) || "community_manager";
    const isActive = text(formData.get("isActive")) === "true";
    const cohortId = optionalText(formData.get("cohortId"));

    if (!profileId) throw new Error("Profile is missing.");

    // If this change demotes the admin away or deactivates them, ensure they're not the last.
    if (role !== "admin" || !isActive) {
      await assertNotLastActiveAdmin(supabase, profileId);
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role, is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", profileId);
    if (profileError) throw profileError;

    if (cohortId) {
      const { data: existingMembership } = await supabase
        .from("cohort_members")
        .select("id")
        .eq("cohort_id", cohortId)
        .eq("user_id", profileId)
        .maybeSingle();

      if (!existingMembership) {
        const { error: membershipError } = await supabase.from("cohort_members").insert({
          cohort_id: cohortId,
          user_id: profileId,
          role,
        });
        if (membershipError) throw membershipError;
      } else {
        const { error: membershipError } = await supabase
          .from("cohort_members")
          .update({ role })
          .eq("id", existingMembership.id);
        if (membershipError) throw membershipError;
      }
    }

    await writeAudit(supabase, session.id, "update_profile_access", {
      profileId,
      role,
      isActive,
      cohortId,
    });

    revalidatePath("/settings");
    revalidatePath("/cohorts");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function removeCohortMembershipAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin");
  try {
    const supabase = createAdminClient();
    const membershipId = text(formData.get("membershipId"));
    if (!membershipId) throw new Error("Membership is missing.");

    const { error } = await supabase.from("cohort_members").delete().eq("id", membershipId);
    if (error) throw error;

    await writeAudit(supabase, session.id, "remove_cohort_membership", { membershipId });
    revalidatePath("/settings");
    revalidatePath("/cohorts");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

const REQUIRED_WEEKS = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
const DEMO_DONE = ["Live Presented", "Recorded Submitted"];

/**
 * Promote qualifying participants to the Alumni page. A participant qualifies when their
 * demo is presented AND they have a submitted assignment_reviews row for every required
 * week. Idempotent: skips anyone already in alumni (matched by email within the cohort).
 */
export async function promoteEligibleAlumniAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator");
  try {
    const cohortId = text(formData.get("cohortId"));
    if (!cohortId) throw new Error("Cohort is required.");
    const supabase = createAdminClient();

    const [{ data: participants }, { data: reviews }, { data: existingAlumni }] = await Promise.all([
      supabase.from("participants").select("id, full_name, email, whatsapp, demo_status, alumni_joined").eq("cohort_id", cohortId),
      supabase.from("assignment_reviews").select("participant_name, week, submitted").eq("cohort_id", cohortId),
      supabase.from("alumni").select("email").eq("cohort_id", cohortId),
    ]);

    const alumniEmails = new Set((existingAlumni ?? []).map((a) => String(a.email ?? "").toLowerCase()).filter(Boolean));

    // Submitted weeks per participant name.
    const submittedByName = new Map<string, Set<string>>();
    for (const r of reviews ?? []) {
      if (!r.submitted) continue;
      const name = String(r.participant_name ?? "");
      if (!submittedByName.has(name)) submittedByName.set(name, new Set());
      submittedByName.get(name)!.add(String(r.week ?? ""));
    }

    const toPromote = (participants ?? []).filter((p) => {
      const email = String(p.email ?? "").toLowerCase();
      if (email && alumniEmails.has(email)) return false;
      if (!DEMO_DONE.includes(String(p.demo_status))) return false;
      const submitted = submittedByName.get(String(p.full_name ?? "")) ?? new Set();
      return REQUIRED_WEEKS.every((w) => submitted.has(w));
    });

    if (toPromote.length) {
      const rows = toPromote.map((p) => ({
        cohort_id: cohortId,
        name: p.full_name ?? "",
        email: p.email ?? null,
        whatsapp: p.whatsapp ?? null,
        created_by: session.id,
        updated_by: session.id,
      }));
      const { error: insertError } = await supabase.from("alumni").insert(rows);
      if (insertError) throw insertError;
      // Mark participants as joined.
      const ids = toPromote.map((p) => p.id);
      await supabase.from("participants").update({ alumni_joined: true }).in("id", ids);
      await writeAudit(supabase, session.id, "promote_alumni", { cohortId, count: toPromote.length });
    }

    revalidatePath("/alumni");
    revalidatePath("/participants");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

// Deactivate or reactivate a user. Deactivation keeps all their data/authorship but blocks
// login (auth gates on is_active) and hides them from assignee/reviewer pickers.
export async function setProfileActiveAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin");
  try {
    const supabase = createAdminClient();
    const profileId = text(formData.get("profileId"));
    const activate = formData.get("activate") === "true";
    if (!profileId) throw new Error("Profile is missing.");
    if (profileId === session.id) throw new Error("You cannot deactivate your own account.");
    if (!activate) {
      await assertNotLastActiveAdmin(supabase, profileId);
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        is_active: activate,
        deactivated_at: activate ? null : new Date().toISOString(),
      })
      .eq("id", profileId);
    if (error) throw error;

    await writeAudit(supabase, session.id, activate ? "reactivate_user" : "deactivate_user", { profileId });
    revalidatePath("/settings");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function saveResourceAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator", "community_manager");
  try {
    const supabase = createAdminClient();
    const resourceId = optionalText(formData.get("resourceId"));
    // Blank cohortId = "all cohorts" (column is nullable).
    const cohortId = optionalText(formData.get("cohortId"));
    const upload = formData.get("file");
    const uploadedFile = upload instanceof File && upload.size > 0 ? upload : null;
    const uploadedMeta = uploadedFile
      ? await uploadFormFile({
          supabase,
          file: uploadedFile,
          prefix: `resources/${cohortId ?? "all"}`,
        })
      : null;
    const url = optionalText(formData.get("url"));
    const fileUrl = optionalText(formData.get("fileUrl"));
    // Auto-detect the type from what was actually provided so an uploaded file isn't
    // mislabelled as "Link". An explicit non-default choice from the user still wins.
    const explicitType = text(formData.get("resourceType"));
    const hasFile = Boolean(uploadedMeta) || Boolean(fileUrl);
    const hasUrl = Boolean(url);
    const resolvedType =
      explicitType && explicitType !== "Link"
        ? explicitType
        : hasFile && !hasUrl
          ? "File"
          : explicitType || "Link";
    const payload = {
      cohort_id: cohortId,
      title: text(formData.get("title")),
      resource_type: resolvedType,
      week_label: optionalText(formData.get("weekLabel")),
      owner_label: optionalText(formData.get("ownerLabel")),
      url,
      file_url: fileUrl,
      notes: optionalText(formData.get("notes")),
      status: text(formData.get("status")) || "Active",
      ...uploadedMeta,
      updated_by: session.id,
    };

    if (!payload.title) throw new Error("Resource title is required.");

    if (resourceId) {
      const { error } = await supabase.from("resources").update(payload).eq("id", resourceId);
      if (error) throw error;
      await writeAudit(supabase, session.id, "update_resource", { resourceId, ...payload });
    } else {
      const { data, error } = await supabase
        .from("resources")
        .insert({ ...payload, created_by: session.id })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("Could not create resource.");
      await writeAudit(supabase, session.id, "create_resource", { resourceId: data.id, ...payload });
    }

    revalidatePath("/resources");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function deleteResourceAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator", "community_manager");
  try {
    const resourceId = text(formData.get("resourceId"));
    if (!resourceId) throw new Error("Resource is missing.");
    const supabase = createAdminClient();
    const { error } = await supabase.from("resources").delete().eq("id", resourceId);
    if (error) throw error;
    await writeAudit(supabase, session.id, "delete_resource", { resourceId });
    revalidatePath("/resources");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function attachResourceToRecordAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator", "community_manager");
  try {
    const supabase = createAdminClient();
    const cohortId = text(formData.get("cohortId"));
    const resourceId = text(formData.get("resourceId"));
    const sourceRecordType = text(formData.get("sourceRecordType"));
    const sourceRecordId = text(formData.get("sourceRecordId"));
    const returnTo = text(formData.get("returnTo")) || "/";

    if (!cohortId || !resourceId || !sourceRecordType || !sourceRecordId) {
      throw new Error("Resource attachment is incomplete.");
    }

    const { error } = await supabase.from("record_resources").insert({
      cohort_id: cohortId,
      resource_id: resourceId,
      source_record_type: sourceRecordType,
      source_record_id: sourceRecordId,
      created_by: session.id,
    });
    if (error) throw error;

    await writeAudit(supabase, session.id, "attach_resource_to_record", {
      cohortId,
      resourceId,
      sourceRecordType,
      sourceRecordId,
    });

    revalidatePath(returnTo);
    revalidatePath("/resources");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function addAttachmentAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator", "community_manager");
  try {
    const supabase = createAdminClient();
    const cohortId = text(formData.get("cohortId"));
    const sourceRecordType = text(formData.get("sourceRecordType"));
    const sourceRecordId = text(formData.get("sourceRecordId"));
    const fileName = text(formData.get("fileName"));
    const fileUrl = optionalText(formData.get("fileUrl"));
    const upload = formData.get("file");
    const uploadedFile = upload instanceof File && upload.size > 0 ? upload : null;
    const returnTo = text(formData.get("returnTo")) || "/";

    if (!cohortId || !sourceRecordType || !sourceRecordId || (!fileName && !uploadedFile) || (!fileUrl && !uploadedFile)) {
      throw new Error("Attachment details are incomplete.");
    }

    const uploadedMeta = uploadedFile
      ? await uploadFormFile({
          supabase,
          file: uploadedFile,
          prefix: `attachments/${cohortId}/${sourceRecordType}/${sourceRecordId}`,
        })
      : null;

    const { error } = await supabase.from("attachments").insert({
      cohort_id: cohortId,
      source_record_type: sourceRecordType,
      source_record_id: sourceRecordId,
      file_name: fileName || uploadedFile?.name,
      file_url: fileUrl,
      ...uploadedMeta,
      created_by: session.id,
    });
    if (error) throw error;

    await writeAudit(supabase, session.id, "add_attachment", {
      cohortId,
      sourceRecordType,
      sourceRecordId,
      fileName: fileName || uploadedFile?.name,
      fileUrl,
    });

    revalidatePath(returnTo);
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function createCommunityReminderAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator");
  try {
    const supabase = createAdminClient();
    const cohortId = text(formData.get("cohortId"));
    const cmLabel = text(formData.get("cmLabel"));
    const assignedTo = optionalText(formData.get("assignedTo"));
    const sourceRecordId = optionalText(formData.get("sourceRecordId"));
    const returnTo = text(formData.get("returnTo")) || "/community";

    if (!cohortId || !cmLabel) throw new Error("Community manager reminder is incomplete.");

    const title = `Reminder: weekly CM update for ${cmLabel}`;
    const { data: existingTask } = await supabase
      .from("tasks")
      .select("id")
      .eq("cohort_id", cohortId)
      .eq("title", title)
      .in("status", ["Open", "In Progress", "Blocked"])
      .maybeSingle();

    let taskId = existingTask?.id ?? null;
    if (!existingTask) {
      const { data: createdTask, error } = await supabase
        .from("tasks")
        .insert({
          cohort_id: cohortId,
          source_record_type: sourceRecordId ? "community" : null,
          source_record_id: sourceRecordId,
          title,
          description: `Check in with ${cmLabel}, confirm weekly report status, and clear any blockers.`,
          status: "Open",
          priority: "Medium",
          assigned_to: assignedTo,
          assigned_label: cmLabel,
          created_by: session.id,
          updated_by: session.id,
        })
        .select("id")
        .single();
      if (error || !createdTask) throw error ?? new Error("Could not create reminder task.");
      taskId = createdTask.id;
    }

    if (assignedTo && canSendPush()) {
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", assignedTo)
        .eq("is_active", true);

      for (const subscription of subscriptions ?? []) {
        try {
          await sendPushNotification(subscription, {
            title: "Morph Ops reminder",
            body: `Weekly CM update pending for ${cmLabel}.`,
            url: returnTo,
            taskId,
          });
          await supabase.from("reminder_deliveries").insert({
            cohort_id: cohortId,
            task_id: taskId,
            user_id: assignedTo,
            subscription_id: subscription.id,
            delivery_kind: "cm_report_needed",
            status: "sent",
            metadata: { source: "manual_cm_reminder" },
          });
        } catch (error) {
          await supabase.from("reminder_deliveries").insert({
            cohort_id: cohortId,
            task_id: taskId,
            user_id: assignedTo,
            subscription_id: subscription.id,
            delivery_kind: "cm_report_needed",
            status: "failed",
            error_message: error instanceof Error ? error.message : "Push send failed.",
            metadata: { source: "manual_cm_reminder" },
          });
        }
      }
    }

    await writeAudit(supabase, session.id, "create_cm_reminder", {
      cohortId,
      cmLabel,
      assignedTo,
      sourceRecordId,
      taskId,
    });

    revalidatePath(returnTo);
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function sendDueRemindersNowAction(): Promise<void> {
  await requireRole("admin", "facilitator");
  try {
    await dispatchDueReminders();
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    revalidatePath("/community");
    revalidatePath("/settings");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function toggleSubmissionsOpenAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator");
  try {
    const cohortId = text(formData.get("cohortId"));
    const open = formData.get("submissionsOpen") === "true";
    if (!cohortId) throw new Error("Cohort is required.");
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("cohorts")
      .update({ submissions_open: open, updated_by: session.id })
      .eq("id", cohortId);
    if (error) throw error;
    await writeAudit(supabase, session.id, "toggle_submissions_open", { cohortId, open });
    revalidatePath("/activities");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function toggleAttendanceOpenAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator");
  try {
    const cohortId = text(formData.get("cohortId"));
    const open = formData.get("attendanceOpen") === "true";
    if (!cohortId) throw new Error("Cohort is required.");
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("cohorts")
      .update({ attendance_open: open, updated_by: session.id })
      .eq("id", cohortId);
    if (error) throw error;
    await writeAudit(supabase, session.id, "toggle_attendance_open", { cohortId, open });
    revalidatePath("/participants");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function setAttendanceWindowAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator");
  try {
    const cohortId = text(formData.get("cohortId"));
    if (!cohortId) throw new Error("Cohort is required.");
    // Empty datetime inputs clear the bound (unbounded that side).
    const opensAt = optionalText(formData.get("attendanceOpensAt"));
    const closesAt = optionalText(formData.get("attendanceClosesAt"));
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("cohorts")
      .update({
        attendance_opens_at: opensAt ? new Date(opensAt).toISOString() : null,
        attendance_closes_at: closesAt ? new Date(closesAt).toISOString() : null,
        updated_by: session.id,
      })
      .eq("id", cohortId);
    if (error) throw error;
    await writeAudit(supabase, session.id, "set_attendance_window", { cohortId, opensAt, closesAt });
    revalidatePath("/participants");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}
