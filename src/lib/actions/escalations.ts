"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeErrorMessage } from "@/lib/utils";
import type { EscalationState } from "@/lib/escalation-config";

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createEscalationAction(
  _prev: EscalationState,
  formData: FormData,
): Promise<EscalationState> {
  const session = await requireRole("admin", "facilitator", "community_manager");
  try {
    const cohortId = text(formData.get("cohortId"));
    const participantId = text(formData.get("participantId")) || null;
    const participantName = text(formData.get("participantName")) || null;
    const category = text(formData.get("category"));
    const severity = text(formData.get("severity")) || "Medium";
    const notes = text(formData.get("notes")) || null;
    const returnTo = text(formData.get("returnTo")) || "/";

    if (!cohortId || !category) return { ok: false, message: "Cohort and category are required." };

    const supabase = createAdminClient();
    let evidenceBucket: string | null = null;
    let evidencePath: string | null = null;

    const file = formData.get("evidence");
    if (file instanceof File && file.size > 0) {
      if (file.size > 9 * 1024 * 1024) return { ok: false, message: "Evidence file must be under 9MB." };
      const env = getServerEnv();
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext ? `.${ext}` : ""}`;
      const path = `escalations/${cohortId}/${participantId ?? "general"}/${fileName}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from(env.storageBucketName)
        .upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: false });
      if (uploadError) throw uploadError;
      evidenceBucket = env.storageBucketName;
      evidencePath = path;
    }

    const { error } = await supabase.from("escalations").insert({
      cohort_id: cohortId,
      participant_id: participantId || null,
      participant_name: participantName,
      category,
      severity,
      notes,
      evidence_bucket: evidenceBucket,
      evidence_path: evidencePath,
      status: "Pending review",
      created_by: session.id,
      updated_by: session.id,
    });
    if (error) throw error;

    revalidatePath(returnTo);
    revalidatePath("/community");
    return { ok: true, message: "Escalation recorded." };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error) };
  }
}

export async function updateEscalationStatusAction(formData: FormData): Promise<void> {
  await requireRole("admin", "facilitator", "community_manager");
  try {
    const escalationId = text(formData.get("escalationId"));
    const status = text(formData.get("status"));
    const returnTo = text(formData.get("returnTo")) || "/";
    if (!escalationId || !status) throw new Error("Escalation and status are required.");
    const supabase = createAdminClient();
    const { error } = await supabase.from("escalations").update({ status }).eq("id", escalationId);
    if (error) throw error;
    revalidatePath(returnTo);
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}
