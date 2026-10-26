import { requireUser, type CurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModuleByKey, type ModuleKey } from "@/lib/modules";

/** Call before service-role work. Recheck the active authenticated identity; never trust form scope. */
export async function assertCohortAccess(session: CurrentUser, cohortId: string) {
  const active = await requireUser();
  if (!cohortId || active.id !== session.id || active.role !== session.role) throw new Error("Cohort access denied.");
  const client = await createClient();
  const { data: cohort, error } = await client.from("cohorts").select("id").eq("id", cohortId).maybeSingle();
  if (error || !cohort) throw new Error("Cohort access denied.");
  if (active.role === "admin") return;
  const { data: member, error: memberError } = await client.from("cohort_members").select("id")
    .eq("cohort_id", cohortId).eq("user_id", active.id).maybeSingle();
  if (memberError || !member) throw new Error("Cohort access denied.");
}

export async function assertCohortRecord(session: CurrentUser, table: string, id: string, cohortId?: string) {
  const client = await createClient();
  const { data, error } = await client.from(table).select("*").eq("id", id).maybeSingle();
  if (error || !data || !data.cohort_id || (cohortId && data.cohort_id !== cohortId)) {
    throw new Error("Record does not belong to this cohort.");
  }
  await assertCohortAccess(session, String(data.cohort_id));
  return data as Record<string, unknown>;
}

export async function assertLinkedRecord(session: CurrentUser, cohortId: string, moduleKey: string, id: string) {
  const moduleConfig = getModuleByKey(moduleKey as ModuleKey);
  if (!moduleConfig || !id) throw new Error("Linked record is invalid.");
  return assertCohortRecord(session, moduleConfig.table, id, cohortId);
}

/** Linked profiles may be active admins or active members of the target cohort. */
export async function assertCohortProfile(cohortId: string, profileId: string) {
  if (!profileId) return;
  const client = createAdminClient();
  const { data: profile, error } = await client.from("profiles").select("role, is_active").eq("id", profileId).maybeSingle();
  if (error || !profile?.is_active) throw new Error("Choose an active cohort teammate.");
  if (profile.role === "admin") return;
  const { data, error: memberError } = await client.from("cohort_members").select("id")
    .eq("cohort_id", cohortId).eq("user_id", profileId).maybeSingle();
  if (memberError || !data) throw new Error("Teammate does not belong to this cohort.");
}

export async function assertRecordLinks(session: CurrentUser, cohortId: string, payload: Record<string, unknown>) {
  for (const key of ["silent_student_ids", "stuck_student_ids"]) {
    if (!(key in payload)) continue;
    if (!Array.isArray(payload[key])) throw new Error("Participant selection is invalid.");
    for (const entry of payload[key] as unknown[]) {
      const id = typeof entry === "string" ? entry : entry && typeof entry === "object" ? String((entry as {id?: unknown}).id ?? "") : "";
      if (!id) throw new Error("Participant selection is invalid.");
      await assertCohortRecord(session, "participants", id, cohortId);
    }
  }
  if (payload.support_assigned_id) await assertCohortProfile(cohortId, String(payload.support_assigned_id));
}
