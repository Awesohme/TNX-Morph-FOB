"use server";

import { revalidatePath } from "next/cache";
import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUsers } from "@/lib/actions/notifications";
import { cohortWeekThemeTitle } from "@/lib/cohort-weeks";
import { getParticipantDisplayName } from "@/lib/participants";
import { resolvePublicCohort } from "@/lib/public-cohorts";
import { isSubmissionsOpen } from "@/lib/submission-config";
import { safeErrorMessage } from "@/lib/utils";
import type { SubmissionState } from "@/lib/actions/submission-state";
import { freshSubmissionReviewState, unambiguousLegacyReview } from "@/lib/submission-review";
import { scanListRows } from "@/lib/list-pagination";

/**
 * Active CMs assigned to the cohort + all active admins — the people who should hear about
 * a new submission. Returns a de-duped list of user ids (best-effort; never throws).
 */
async function submissionRecipients(
  supabase: ReturnType<typeof createAdminClient>,
  cohortId: string,
): Promise<string[]> {
  try {
    const [{ data: members }, { data: admins }] = await Promise.all([
      supabase
        .from("cohort_members")
        .select("user_id, profiles:user_id(role, is_active)")
        .eq("cohort_id", cohortId),
      supabase.from("profiles").select("id").eq("role", "admin").eq("is_active", true),
    ]);
    const cmIds = (members ?? [])
      .filter((m) => {
        const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        return p?.role === "community_manager" && p?.is_active;
      })
      .map((m) => m.user_id as string);
    const adminIds = (admins ?? []).map((a) => a.id as string);
    return Array.from(new Set([...cmIds, ...adminIds].filter(Boolean)));
  } catch {
    return [];
  }
}

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function submissionWeekKey(week: string) {
  const match = week.match(/week\s*(\d+)/i);
  return match ? `week_${match[1]}` : week.trim().toLowerCase().replace(/\s+/g, "_");
}

/**
 * Public worksheet submission. Runs with the service-role client (the page is
 * unauthenticated), so every input is validated against the cohort server-side:
 *  - cohort exists and submissions are open
 *  - the selected participant belongs to that cohort
 * On success, uploads the worksheet and flips the matching assignment_reviews row to
 * Submitted (creating it if no row exists yet) so it surfaces in the Reviews workspace.
 */
export async function submitWorksheetAction(
  _prev: SubmissionState,
  formData: FormData,
): Promise<SubmissionState> {
  try {
    const cohortSlug = text(formData.get("cohortSlug"));
    const participantId = text(formData.get("participantId"));
    const challenge = text(formData.get("challenge"));
    const supportNeeded = text(formData.get("supportNeeded"));
    const file = formData.get("worksheet");

    if (!cohortSlug || !participantId) {
      return { ok: false, message: "Please pick your name before submitting." };
    }

    const supabase = createAdminClient();

    const cohort = await resolvePublicCohort<{
      id: string;
      slug: string;
      submission_week?: string | null;
      submission_label?: string | null;
      submissions_open?: boolean | null;
      submissions_opens_at?: string | null;
      submissions_closes_at?: string | null;
    }>(
      supabase,
      cohortSlug,
      "id, slug, submission_week, submission_label",
    );
    if (!cohort) return { ok: false, message: "This submission link is not valid." };
    let windowConfig: {
      submission_week?: string | null;
      submission_label?: string | null;
      submissions_open?: boolean | null;
      submissions_opens_at?: string | null;
      submissions_closes_at?: string | null;
    } | null = null;
    try {
      const { data } = await supabase
        .from("cohorts")
        .select("submission_week, submission_label, submissions_open, submissions_opens_at, submissions_closes_at")
        .eq("id", cohort.id)
        .maybeSingle();
      windowConfig = data;
    } catch {
      windowConfig = null;
    }
    const submissionWindow = {
      // Fail closed if the settings record cannot be read, rather than accepting a
      // public submission without verifying that the team opened the window.
      submissions_open: windowConfig?.submissions_open ?? false,
      submissions_opens_at: windowConfig?.submissions_opens_at ?? null,
      submissions_closes_at: windowConfig?.submissions_closes_at ?? null,
    };
    if (!isSubmissionsOpen(submissionWindow)) {
      return { ok: false, message: "Submissions are currently closed for this cohort." };
    }
    const week = text(windowConfig?.submission_week ?? cohort.submission_week ?? "");
    if (!week) {
      return { ok: false, message: "The team has not set the active submission week yet." };
    }

    // Participant must belong to this cohort — never trust the client-supplied id alone.
    const { data: participant } = await supabase
      .from("participants")
      .select("id, full_name")
      .eq("id", participantId)
      .eq("cohort_id", cohort.id)
      .maybeSingle();
    if (!participant) return { ok: false, message: "We could not match you to this cohort." };
    const participantName = getParticipantDisplayName(participant);
    const { data: planRows } = await supabase
      .from("cohort_plan_items")
      .select("week_label, sort_order, theme")
      .eq("cohort_id", cohort.id)
      .order("sort_order", { ascending: true });
    const assignmentTitle = text(windowConfig?.submission_label ?? cohort.submission_label ?? "")
      || cohortWeekThemeTitle(week, planRows);

    let submissionBucket: string | null = null;
    let submissionPath: string | null = null;
    if (file instanceof File && file.size > 0) {
      // Friendly guard so an oversized file returns an inline message instead of a raw
      // 500. Keep below the Server Action bodySizeLimit configured in next.config.ts.
      if (file.size > 9 * 1024 * 1024) {
        return { ok: false, message: "That file is too large. Please upload a file under 9MB." };
      }
      const env = getServerEnv();
      const extension = file.name.includes(".") ? file.name.split(".").pop() : "";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension ? `.${extension}` : ""}`;
      const path = `submissions/${cohort.id}/${participantId}/${fileName}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from(env.storageBucketName)
        .upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: false });
      if (uploadError) throw uploadError;
      submissionBucket = env.storageBucketName;
      submissionPath = path;
    }

    const notesParts = [
      challenge ? `Challenge faced: ${challenge}` : "",
      supportNeeded ? `Support needed: ${supportNeeded}` : "",
    ].filter(Boolean);
    const notes = notesParts.join("\n");

    // Stable IDs prevent same-name students (or renamed students) sharing a worksheet.
    const reviewColumns = "id, participant_name";
    const { data: boundReview, error: reviewLookupError } = await supabase
      .from("assignment_reviews")
      .select(reviewColumns)
      .eq("cohort_id", cohort.id)
      .eq("participant_id", participantId)
      .eq("week", week)
      .maybeSingle();
    if (reviewLookupError) throw reviewLookupError;
    let existingReview = boundReview;
    if (!existingReview) {
      const [{ data: cohortParticipants, error: namesError }, { data: legacyReviews, error: legacyError }] = await Promise.all([
        scanListRows((from, to) => supabase.from("participants").select("id, full_name").eq("cohort_id", cohort.id).order("id").range(from, to)),
        scanListRows((from, to) => supabase.from("assignment_reviews").select(reviewColumns).eq("cohort_id", cohort.id).eq("week", week).is("participant_id", null).order("id").range(from, to)),
      ]);
      if (namesError) throw namesError;
      if (legacyError) throw legacyError;
      const candidate = unambiguousLegacyReview(participantId, participantName, cohortParticipants ?? [], legacyReviews ?? []);
      existingReview = candidate ? legacyReviews?.find((row) => row.id === candidate.id) ?? null : null;
    }

    const submissionFields = {
      cohort_id: cohort.id,
      participant_id: participantId,
      participant_name: participantName,
      week,
      submitted: true,
      submitted_at: new Date().toISOString(),
      ...freshSubmissionReviewState,
      ...(assignmentTitle ? { assignment: assignmentTitle } : {}),
      ...(submissionBucket ? { submission_bucket: submissionBucket, submission_path: submissionPath } : {}),
      ...(notes ? { notes } : {}),
    };

    // Claim a unique imported legacy row without racing another submission's claim.
    let claimedLegacy = false;
    if (!boundReview && existingReview) {
      const { data: claimed, error } = await supabase
        .from("assignment_reviews")
        .update(submissionFields)
        .eq("id", existingReview.id)
        .eq("cohort_id", cohort.id)
        .is("participant_id", null)
        .select("id")
        .maybeSingle();
      if (error && error.code !== "23505") throw error;
      claimedLegacy = Boolean(claimed);
    }
    if (!claimedLegacy) {
      const { error } = await supabase.from("assignment_reviews").upsert(submissionFields, {
        onConflict: "cohort_id,participant_id,week",
      });
      if (error) throw error;
    }

    const weekKey = submissionWeekKey(week);
    const { data: participantRow } = await supabase
      .from("participants")
      .select("submissions")
      .eq("id", participantId)
      .maybeSingle();
    const submissions = typeof participantRow?.submissions === "object" && participantRow?.submissions
      ? (participantRow.submissions as Record<string, unknown>)
      : {};
    const { error: participantUpdateError } = await supabase
      .from("participants")
      .update({
        submissions: {
          ...submissions,
          [weekKey]: "Yes",
        },
      })
      .eq("id", participantId);
    if (participantUpdateError) throw participantUpdateError;

    // Follow-ups should never make a successfully saved submission look like it failed.
    if (supportNeeded.toLowerCase().startsWith("yes")) {
      try {
        const { error } = await supabase.from("tasks").insert({
          cohort_id: cohort.id,
          title: `Support requested: ${participantName} (${week})`,
          description: [supportNeeded, challenge ? `Challenge: ${challenge}` : ""].filter(Boolean).join("\n"),
          priority: "High",
          status: "Open",
          assigned_label: "CMs",
          task_type: "follow_up",
        });
        if (error) throw error;
      } catch (error) {
        console.error("Could not create submission support task", error);
      }
    }

    // Let the cohort's active CMs + admins know a submission landed (in-app + web push).
    try {
      const recipients = await submissionRecipients(supabase, cohort.id);
      await notifyUsers(supabase, {
        userIds: recipients,
        type: "announcement",
        title: "New submission",
        body: `${participantName} submitted ${week}.`,
        link: "/activities",
        cohortId: cohort.id,
      });
    } catch (error) {
      console.error("Could not notify the team about a submission", error);
    }

    revalidatePath("/activities");
    revalidatePath("/participants");
    revalidatePath("/dashboard");
    revalidatePath("/tasks");
    return { ok: true, message: "Submission received. Thank you!" };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error) };
  }
}
