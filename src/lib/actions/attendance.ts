"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeErrorMessage } from "@/lib/utils";
import type { AttendanceState } from "@/lib/attendance-config";

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function attendanceAction(
  _prev: AttendanceState,
  formData: FormData,
): Promise<AttendanceState> {
  try {
    const cohortSlug = text(formData.get("cohortSlug"));
    const participantId = text(formData.get("participantId"));
    const week = text(formData.get("week"));
    const mode = text(formData.get("mode")); // "sign_in" | "sign_out"

    if (!cohortSlug || !participantId || !week || !mode) {
      return { ok: false, message: "Please select your name, the week, and an action." };
    }

    const supabase = createAdminClient();

    const { data: cohort } = await supabase
      .from("cohorts")
      .select("id")
      .eq("slug", cohortSlug)
      .maybeSingle();
    if (!cohort) return { ok: false, message: "This attendance link is not valid." };

    // Participant must belong to this cohort.
    const { data: participant } = await supabase
      .from("participants")
      .select("id, full_name")
      .eq("id", participantId)
      .eq("cohort_id", cohort.id)
      .maybeSingle();
    if (!participant) return { ok: false, message: "We could not match you to this cohort." };

    const { data: existing } = await supabase
      .from("attendance")
      .select("id, signed_in_at, signed_out_at")
      .eq("cohort_id", cohort.id)
      .eq("participant_id", participantId)
      .eq("week", week)
      .maybeSingle();

    if (mode === "sign_in") {
      if (existing) {
        // Already signed in — just confirm
        return { ok: true, message: `You're already signed in for ${week}.`, action: "signed_in" };
      }
      const { error } = await supabase.from("attendance").insert({
        cohort_id: cohort.id,
        participant_id: participantId,
        week,
        signed_in_at: new Date().toISOString(),
      });
      if (error) throw error;
      revalidatePath("/");
      return { ok: true, message: `Signed in for ${week}. Welcome, ${participant.full_name ?? "participant"}!`, action: "signed_in" };
    }

    if (mode === "sign_out") {
      if (!existing) {
        return { ok: false, message: "You haven't signed in for this week yet. Please sign in first." };
      }
      if (existing.signed_out_at) {
        return { ok: true, message: `You're already signed out for ${week}.`, action: "signed_out" };
      }
      const { error } = await supabase.from("attendance").update({ signed_out_at: new Date().toISOString() }).eq("id", existing.id);
      if (error) throw error;
      revalidatePath("/");
      return { ok: true, message: `Signed out for ${week}. See you next session!`, action: "signed_out" };
    }

    return { ok: false, message: "Unknown action." };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error) };
  }
}
