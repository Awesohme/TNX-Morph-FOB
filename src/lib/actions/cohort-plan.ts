"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeErrorMessage } from "@/lib/utils";
import type { PlanItemState } from "@/lib/actions/cohort-plan-state";

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}
function optionalText(value: FormDataEntryValue | null) {
  return text(value) || null;
}

/**
 * Create or update one cohort_plan_items row (a week of the cohort plan). Admin/facilitator
 * only — matches the cohort_plan_items_write RLS policy.
 */
export async function savePlanItemAction(_prev: PlanItemState, formData: FormData): Promise<PlanItemState> {
  const session = await requireRole("admin", "facilitator");
  try {
    const cohortId = text(formData.get("cohortId"));
    const id = optionalText(formData.get("id"));
    const weekLabel = text(formData.get("week_label"));
    if (!cohortId || !weekLabel) return { ok: false, message: "Cohort and week label are required." };

    const payload = {
      cohort_id: cohortId,
      week_label: weekLabel,
      sort_order: Number(text(formData.get("sort_order")) || "0") || 0,
      theme: optionalText(formData.get("theme")),
      session_type: optionalText(formData.get("session_type")),
      live_session_focus: optionalText(formData.get("live_session_focus")),
      student_output: optionalText(formData.get("student_output")),
      async_task: optionalText(formData.get("async_task")),
      owner_label: optionalText(formData.get("owner_label")),
      support_label: optionalText(formData.get("support_label")),
      success_metric: optionalText(formData.get("success_metric")),
      risk: optionalText(formData.get("risk")),
      mitigation: optionalText(formData.get("mitigation")),
    };

    const supabase = createAdminClient();
    if (id) {
      const { error } = await supabase
        .from("cohort_plan_items")
        .update({ ...payload, updated_by: session.id })
        .eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("cohort_plan_items")
        .insert({ ...payload, created_by: session.id, updated_by: session.id });
      if (error) throw error;
    }

    revalidatePath(`/cohorts/${cohortId}`);
    return { ok: true, message: id ? "Week updated." : "Week added." };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error) };
  }
}

/** Delete a cohort plan week. Admin/facilitator only. */
export async function deletePlanItemAction(formData: FormData): Promise<void> {
  await requireRole("admin", "facilitator");
  const id = text(formData.get("id"));
  const cohortId = text(formData.get("cohortId"));
  if (!id) return;
  const supabase = createAdminClient();
  const { error } = await supabase.from("cohort_plan_items").delete().eq("id", id);
  if (error) throw error;
  if (cohortId) revalidatePath(`/cohorts/${cohortId}`);
}
