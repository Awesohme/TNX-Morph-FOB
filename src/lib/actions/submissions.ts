"use server";

import { revalidatePath } from "next/cache";
import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUsers } from "@/lib/actions/notifications";
import { getParticipantDisplayName } from "@/lib/participants";
import { resolvePublicCohort } from "@/lib/public-cohorts";
import { isSubmissionsOpen } from "@/lib/submission-config";
import { safeErrorMessage } from "@/lib/utils";
import type { SubmissionState } from "@/lib/actions/submission-state";

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

/**
 * The public form offers descriptive week options ("Week 1 - Product Development…"),
 * but assignment_reviews buckets strictly on the canonical "Week N" label (that's what
 * the Reviews workspace groups + filters by). Collapse to "Week N" so submissions land
 * in the right bucket and update the participant's seeded row instead of duplicating it.
 */
function canonicalWeek(week: string) {
  const match = week.match(/week\s*(\d+)/i);
  return match ? `Week ${match[1]}` : week;
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
    const week = canonicalWeek(text(formData.get("week")));
    const challenge = text(formData.get("challenge"));
    const supportNeeded = text(formData.get("supportNeeded"));
    const file = formData.get("worksheet");

    if (!cohortSlug || !participantId || !week) {
      return { ok: false, message: "Please pick your name and the submission week." };
    }

    const supabase = createAdminClient();

    const cohort = await resolvePublicCohort<{
      id: string;
      slug: string;
      submissions_open: boolean;
      submissions_opens_at: string | null;
      submissions_closes_at: string | null;
    }>(
      supabase,
      cohortSlug,
      "id, slug, submissions_open, submissions_opens_at, submissions_closes_at",
    );
    if (!cohort) return { ok: false, message: "This submission link is not valid." };
    if (!isSubmissionsOpen(cohort)) {
      return { ok: false, message: "Submissions are currently closed for this cohort." };
    }

    // Participant must belong to this cohort — never trust the client-supplied id alone.
    const { data: participant } = await supabase
      .from("participants")
      .select("id, first_name, last_name, full_name")
      .eq("id", participantId)
      .eq("cohort_id", cohort.id)
      .maybeSingle();
    if (!participant) return { ok: false, message: "We could not match you to this cohort." };
    const participantName = getParticipantDisplayName(participant);

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

    // Match an existing review row for this participant + week, else create one.
    const { data: existingReview } = await supabase
      .from("assignment_reviews")
      .select("id")
      .eq("cohort_id", cohort.id)
      .eq("participant_name", participantName)
      .eq("week", week)
      .limit(1)
      .maybeSingle();

    const submissionFields = {
      submitted: true,
      submitted_at: new Date().toISOString(),
      ...(submissionBucket ? { submission_bucket: submissionBucket, submission_path: submissionPath } : {}),
      ...(notes ? { notes } : {}),
    };

    if (existingReview) {
      const { error } = await supabase
        .from("assignment_reviews")
        .update(submissionFields)
        .eq("id", existingReview.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("assignment_reviews").insert({
        cohort_id: cohort.id,
        week,
        participant_name: participantName,
        review_status: "Not Reviewed",
        ...submissionFields,
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

    // If the student flagged they need support, raise a follow-up task so the team sees it.
    if (supportNeeded.toLowerCase().startsWith("yes")) {
      await supabase.from("tasks").insert({
        cohort_id: cohort.id,
        title: `Support requested: ${participantName} (${week})`,
        description: [supportNeeded, challenge ? `Challenge: ${challenge}` : ""].filter(Boolean).join("\n"),
        priority: "High",
        status: "Open",
        assigned_label: "CMs",
        task_type: "follow_up",
      });
    }

    // Let the cohort's active CMs + admins know a submission landed (in-app + web push).
    const recipients = await submissionRecipients(supabase, cohort.id);
    await notifyUsers(supabase, {
      userIds: recipients,
      type: "announcement",
      title: "New submission",
      body: `${participantName} submitted ${week}.`,
      link: "/activities",
      cohortId: cohort.id,
    });

    revalidatePath("/activities");
    revalidatePath("/participants");
    revalidatePath("/dashboard");
    revalidatePath("/tasks");
    return { ok: true, message: "Submission received. Thank you!" };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error) };
  }
}
