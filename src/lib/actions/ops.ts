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

export async function saveResourceAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator", "community_manager");
  try {
    const supabase = createAdminClient();
    const resourceId = optionalText(formData.get("resourceId"));
    const cohortId = text(formData.get("cohortId"));
    const upload = formData.get("file");
    const uploadedFile = upload instanceof File && upload.size > 0 ? upload : null;
    const uploadedMeta = uploadedFile
      ? await uploadFormFile({
          supabase,
          file: uploadedFile,
          prefix: `resources/${cohortId}`,
        })
      : null;
    const payload = {
      cohort_id: cohortId,
      title: text(formData.get("title")),
      resource_type: text(formData.get("resourceType")) || "Link",
      week_label: optionalText(formData.get("weekLabel")),
      owner_label: optionalText(formData.get("ownerLabel")),
      url: optionalText(formData.get("url")),
      file_url: optionalText(formData.get("fileUrl")),
      notes: optionalText(formData.get("notes")),
      status: text(formData.get("status")) || "Active",
      ...uploadedMeta,
      updated_by: session.id,
    };

    if (!payload.cohort_id || !payload.title) throw new Error("Resource title and cohort are required.");

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
