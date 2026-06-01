"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeAttendanceWeekLabel } from "@/lib/attendance";
import { safeErrorMessage } from "@/lib/utils";
import { isAttendanceOpen, type AttendanceState } from "@/lib/attendance-config";

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
    const mode = text(formData.get("mode")); // "sign_in" | "sign_out"
    const sessionSummary = text(formData.get("sessionSummary"));
    const feedback = text(formData.get("feedback"));

    if (!cohortSlug || !participantId || !mode) {
      return { ok: false, message: "Please select your name and an action." };
    }

    const supabase = createAdminClient();

    const { data: cohort } = await supabase
      .from("cohorts")
      .select("id, attendance_open, attendance_opens_at, attendance_closes_at, attendance_week")
      .eq("slug", cohortSlug)
      .maybeSingle();
    if (!cohort) return { ok: false, message: "This attendance link is not valid." };
    if (!isAttendanceOpen(cohort)) {
      return { ok: false, message: "Attendance is closed right now. Please check with your community manager." };
    }
    // The week is server-authoritative — the active session week set by the team.
    const week = normalizeAttendanceWeekLabel(cohort.attendance_week);
    if (!week) return { ok: false, message: "No active session set. Please check with your community manager." };

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
        // Already signed in — attach any summary/feedback they added, then confirm.
        if (sessionSummary || feedback) {
          await supabase
            .from("attendance")
            .update({ ...(sessionSummary ? { session_summary: sessionSummary } : {}), ...(feedback ? { feedback } : {}) })
            .eq("id", existing.id);
        }
        return { ok: true, message: `You're already signed in for ${week}.`, action: "signed_in", participantId };
      }
      const { error } = await supabase.from("attendance").insert({
        cohort_id: cohort.id,
        participant_id: participantId,
        week,
        signed_in_at: new Date().toISOString(),
        ...(sessionSummary ? { session_summary: sessionSummary } : {}),
        ...(feedback ? { feedback } : {}),
      });
      if (error) throw error;
      revalidatePath("/");
      revalidatePath("/dashboard");
      revalidatePath("/participants");
      revalidatePath(`/participants?cohort=${cohort.id}`);
      revalidatePath(`/records/participants/${participantId}`);
      revalidatePath(`/records/participants/${participantId}?cohort=${cohort.id}`);
      return { ok: true, message: `Signed in for ${week}. Welcome, ${participant.full_name ?? "participant"}!`, action: "signed_in", participantId };
    }

    if (mode === "sign_out") {
      if (!existing) {
        return { ok: false, message: "You haven't signed in for this session yet. Please sign in first." };
      }
      const update: Record<string, unknown> = { signed_out_at: existing.signed_out_at ?? new Date().toISOString() };
      if (feedback) update.feedback = feedback;
      if (sessionSummary) update.session_summary = sessionSummary;
      const { error } = await supabase.from("attendance").update(update).eq("id", existing.id);
      if (error) throw error;
      revalidatePath("/");
      revalidatePath("/dashboard");
      revalidatePath("/participants");
      revalidatePath(`/participants?cohort=${cohort.id}`);
      revalidatePath(`/records/participants/${participantId}`);
      revalidatePath(`/records/participants/${participantId}?cohort=${cohort.id}`);
      return { ok: true, message: "See you at your next class!", action: "signed_out" };
    }

    return { ok: false, message: "Unknown action." };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error) };
  }
}
