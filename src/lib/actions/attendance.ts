"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUsers } from "@/lib/actions/notifications";
import { normalizeAttendanceWeekLabel } from "@/lib/attendance";
import { getParticipantDisplayName } from "@/lib/participants";
import { safeErrorMessage } from "@/lib/utils";
import { isAttendanceOpen, type AttendanceState } from "@/lib/attendance-config";

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function rating(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(5, Math.max(1, parsed));
}

async function attendanceRecipients(
  supabase: ReturnType<typeof createAdminClient>,
  cohortId: string,
) {
  try {
    const [{ data: members }, { data: admins }] = await Promise.all([
      supabase
        .from("cohort_members")
        .select("user_id, profiles:user_id(role, is_active)")
        .eq("cohort_id", cohortId),
      supabase.from("profiles").select("id").eq("role", "admin").eq("is_active", true),
    ]);
    const cmIds = (members ?? [])
      .filter((member) => {
        const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
        return profile?.role === "community_manager" && profile?.is_active;
      })
      .map((member) => member.user_id as string);
    const adminIds = (admins ?? []).map((admin) => admin.id as string);
    return Array.from(new Set([...cmIds, ...adminIds].filter(Boolean)));
  } catch {
    return [];
  }
}

export async function attendanceAction(
  _prev: AttendanceState,
  formData: FormData,
): Promise<AttendanceState> {
  try {
    const cohortSlug = text(formData.get("cohortSlug"));
    const participantId = text(formData.get("participantId"));
    const mode = text(formData.get("mode")); // "sign_in" | "sign_out"
    const topicBaseline = text(formData.get("topicBaseline"));
    const knowledgeBeforeRating = rating(formData.get("knowledgeBeforeRating"));
    const sessionTakeaway = text(formData.get("sessionTakeaway"));
    const sessionSummary = text(formData.get("sessionSummary"));
    const nextStep = text(formData.get("nextStep"));
    const knowledgeAfterRating = rating(formData.get("knowledgeAfterRating"));
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
      .select("id, first_name, last_name, full_name")
      .eq("id", participantId)
      .eq("cohort_id", cohort.id)
      .maybeSingle();
    if (!participant) return { ok: false, message: "We could not match you to this cohort." };
    const participantName = getParticipantDisplayName(participant);
    const participantLink = `/records/participants/${participantId}?cohort=${cohort.id}`;

    const { data: existing } = await supabase
      .from("attendance")
      .select("id, signed_in_at, signed_out_at")
      .eq("cohort_id", cohort.id)
      .eq("participant_id", participantId)
      .eq("week", week)
      .maybeSingle();

    if (mode === "sign_in") {
      if (!topicBaseline || !knowledgeBeforeRating) {
        return { ok: false, message: "Please tell us what you know about the topic and rate your current knowledge before signing in." };
      }
      if (existing) {
        if (topicBaseline || knowledgeBeforeRating) {
          await supabase
            .from("attendance")
            .update({
              topic_baseline: topicBaseline,
              knowledge_before_rating: knowledgeBeforeRating,
            })
            .eq("id", existing.id);
        }
        return { ok: true, message: `You're already signed in for ${week}.`, action: "signed_in", participantId };
      }
      const { error } = await supabase.from("attendance").insert({
        cohort_id: cohort.id,
        participant_id: participantId,
        week,
        signed_in_at: new Date().toISOString(),
        topic_baseline: topicBaseline,
        knowledge_before_rating: knowledgeBeforeRating,
      });
      if (error) throw error;
      const recipients = await attendanceRecipients(supabase, cohort.id);
      await notifyUsers(supabase, {
        userIds: recipients,
        type: "attendance",
        title: "Participant signed in",
        body: `${participantName} signed in for ${week}.`,
        link: participantLink,
        cohortId: cohort.id,
      });
      revalidatePath("/");
      revalidatePath("/dashboard");
      revalidatePath("/participants");
      revalidatePath(`/participants?cohort=${cohort.id}`);
      revalidatePath(`/records/participants/${participantId}`);
      revalidatePath(`/records/participants/${participantId}?cohort=${cohort.id}`);
      return { ok: true, message: `Signed in for ${week}. Welcome, ${participantName}!`, action: "signed_in", participantId };
    }

    if (mode === "sign_out") {
      if (!existing) {
        return { ok: false, message: "You haven't signed in for this session yet. Please sign in first." };
      }
      if (!sessionTakeaway || !sessionSummary || !nextStep || !knowledgeAfterRating) {
        return { ok: false, message: "Please complete the sign-out reflection before submitting." };
      }
      const update: Record<string, unknown> = { signed_out_at: existing.signed_out_at ?? new Date().toISOString() };
      if (feedback) update.feedback = feedback;
      update.session_takeaway = sessionTakeaway;
      update.session_summary = sessionSummary;
      update.next_step = nextStep;
      update.knowledge_after_rating = knowledgeAfterRating;
      const { error } = await supabase.from("attendance").update(update).eq("id", existing.id);
      if (error) throw error;
      const recipients = await attendanceRecipients(supabase, cohort.id);
      await notifyUsers(supabase, {
        userIds: recipients,
        type: "attendance",
        title: "Participant signed out",
        body: `${participantName} signed out for ${week}.`,
        link: participantLink,
        cohortId: cohort.id,
      });
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
