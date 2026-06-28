"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { cohortSeedCatalog, seedCohortDefaults, type SeedGroupKey, type SeedSelection } from "@/lib/cohort-bootstrap";
import { modules } from "@/lib/modules";
import { splitParticipantName, withParticipantNameFields } from "@/lib/participants";
import { operationalTables } from "@/lib/record-config";
import { safeErrorMessage } from "@/lib/utils";

type ActionResult<T = unknown> = {
  ok: boolean;
  message: string;
  data?: T;
};

type WorkbookRows = Array<Array<string | number | boolean | Date | null>>;

function asText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function asBool(value: unknown) {
  const text = asText(value).toLowerCase();
  return text === "yes" || text === "true" || text === "1";
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asNullableDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }
  const text = asText(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString().slice(0, 10);
}

function getCell(row: WorkbookRows[number], index: number) {
  return row[index] ?? "";
}

function dataRows(rows: WorkbookRows) {
  return rows.slice(4);
}

function readinessScore(checklist: Record<string, string>) {
  const values = Object.values(checklist);
  if (!values.length) return 0;
  return values.filter((value) => value.toLowerCase() === "yes").length / values.length;
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

async function clearCohortData(supabase: ReturnType<typeof createAdminClient>, cohortId: string) {
  for (const table of operationalTables) {
    const { error } = await supabase.from(table).delete().eq("cohort_id", cohortId);
    if (error) throw error;
  }
}

function buildImportPayloads(rowsBySheet: Record<string, WorkbookRows>, cohortId: string, actorId: string) {
  const actorFields = { cohort_id: cohortId, created_by: actorId, updated_by: actorId };
  const participants = dataRows(rowsBySheet["Participant Health"] ?? [])
    .filter((row) => asText(getCell(row, 1)) || asText(getCell(row, 2)) || asText(getCell(row, 3)))
    .map((row) => {
      const fullName = asText(getCell(row, 1));
      const splitName = splitParticipantName(fullName);
      return withParticipantNameFields({
        ...actorFields,
        external_id: asText(getCell(row, 0)),
        first_name: splitName.firstName,
        last_name: splitName.lastName,
        full_name: fullName,
        email: asText(getCell(row, 2)),
        whatsapp: asText(getCell(row, 3)),
        source: asText(getCell(row, 4)),
        accepted: asBool(getCell(row, 5)),
        onboarding_complete: asBool(getCell(row, 6)),
        attendance: {
          week_1: asText(getCell(row, 7)),
          week_2: asText(getCell(row, 9)),
          week_3: asText(getCell(row, 11)),
          week_4: asText(getCell(row, 13)),
          week_5: asText(getCell(row, 15)),
          week_6: asText(getCell(row, 17)),
        },
        submissions: {
          week_1: asText(getCell(row, 8)),
          week_2: asText(getCell(row, 10)),
          week_3: asText(getCell(row, 12)),
          week_4: asText(getCell(row, 14)),
          week_5: asText(getCell(row, 16)),
          week_6: asText(getCell(row, 18)),
        },
        mvp_status: asText(getCell(row, 19)) || "Not Started",
        demo_status: asText(getCell(row, 20)) || "Not Presented",
        risk: asText(getCell(row, 21)) || "Green",
        cm_owner: asText(getCell(row, 22)),
        last_contact: asNullableDate(getCell(row, 23)),
        next_action: asText(getCell(row, 24)),
        cert_eligible: asBool(getCell(row, 25)),
        badge_issued: asBool(getCell(row, 26)),
        alumni_joined: asBool(getCell(row, 27)),
        notes: asText(getCell(row, 28)),
      });
    });

  const assignment_reviews = dataRows(rowsBySheet["Assignment Review Queue"] ?? [])
    .filter((row) => asText(getCell(row, 0)) || asText(getCell(row, 1)) || asText(getCell(row, 2)))
    .map((row) => ({
      ...actorFields,
      week: asText(getCell(row, 0)),
      assignment: asText(getCell(row, 1)),
      participant_name: asText(getCell(row, 2)),
      submission_link: asText(getCell(row, 3)),
      submitted: asBool(getCell(row, 4)),
      reviewer: asText(getCell(row, 5)),
      review_status: asText(getCell(row, 6)) || "Not Reviewed",
      feedback_sent: asBool(getCell(row, 7)),
      resubmission_needed: asBool(getCell(row, 8)),
      final_status: asText(getCell(row, 9)),
      quality_score: asNumber(getCell(row, 10)) || null,
      feedback_summary: asText(getCell(row, 11)),
      deadline: asNullableDate(getCell(row, 12)),
      review_due: asNullableDate(getCell(row, 13)),
      notes: asText(getCell(row, 14)),
    }));

  const weekly_ops_tasks = dataRows(rowsBySheet["Weekly Ops Plan"] ?? [])
    .filter((row) => asText(getCell(row, 2)))
    .map((row) => ({
      ...actorFields,
      week: asText(getCell(row, 0)),
      day: asText(getCell(row, 1)),
      action: asText(getCell(row, 2)),
      owner: asText(getCell(row, 3)),
      support: asText(getCell(row, 4)),
      channel: asText(getCell(row, 5)),
      due_time: asText(getCell(row, 6)),
      status: asText(getCell(row, 7)) || "Not Started",
      evidence_link: asText(getCell(row, 8)),
      notes: asText(getCell(row, 9)),
      priority: asText(getCell(row, 10)) || "Medium",
    }));

  const session_readiness = dataRows(rowsBySheet["Session Readiness"] ?? [])
    .filter((row) => asText(getCell(row, 0)) || asText(getCell(row, 3)))
    .map((row) => {
      const checklist = {
        slides_ready: asText(getCell(row, 4)) || "No",
        activity_ready: asText(getCell(row, 5)) || "No",
        assignment_brief_ready: asText(getCell(row, 6)) || "No",
        recording_plan: asText(getCell(row, 7)) || "No",
        email_reminder_sent: asText(getCell(row, 8)) || "No",
        whatsapp_reminder_sent: asText(getCell(row, 9)) || "No",
      };
      return {
        ...actorFields,
        week: asText(getCell(row, 0)),
        session_date: asNullableDate(getCell(row, 1)),
        session_lead: asText(getCell(row, 2)),
        topic: asText(getCell(row, 3)),
        checklist,
        support_assigned: asText(getCell(row, 10)),
        readiness_score: readinessScore(checklist),
      };
    });

  const recruitment_channels = dataRows(rowsBySheet["Recruitment Funnel"] ?? [])
    .filter((row) => asText(getCell(row, 0)))
    .map((row) => ({
      ...actorFields,
      channel: asText(getCell(row, 0)),
      target_audience: asText(getCell(row, 1)),
      target_registrations: asNumber(getCell(row, 2)),
      registrations: asNumber(getCell(row, 3)),
      accepted: asNumber(getCell(row, 4)),
      joined_whatsapp: asNumber(getCell(row, 5)),
      joined_classroom: asNumber(getCell(row, 6)),
      attended_week_1: asNumber(getCell(row, 7)),
      active_by_week_3: asNumber(getCell(row, 8)),
      graduated: asNumber(getCell(row, 9)),
      notes: asText(getCell(row, 12)),
    }));

  const cm_reports = dataRows(rowsBySheet["CM Tracker"] ?? [])
    .filter((row) => asText(getCell(row, 0)) || asText(getCell(row, 1)))
    .map((row) => ({
      ...actorFields,
      week: asText(getCell(row, 0)),
      cm: asText(getCell(row, 1)),
      prompts_posted: asBool(getCell(row, 2)),
      attendance_updated: asBool(getCell(row, 3)),
      submissions_updated: asBool(getCell(row, 4)),
      silent_students: asNumber(getCell(row, 5)),
      stuck_students: asNumber(getCell(row, 6)),
      escalations_raised: asNumber(getCell(row, 7)),
      weekly_report_sent: asBool(getCell(row, 8)),
      energy_level: asText(getCell(row, 9)),
      key_concerns: asText(getCell(row, 10)),
      next_actions: asText(getCell(row, 11)),
      status: asText(getCell(row, 12)) || "Not Started",
    }));

  const content_items = dataRows(rowsBySheet["Content Pipeline"] ?? [])
    .filter((row) => asText(getCell(row, 1)) || asText(getCell(row, 3)))
    .map((row) => ({
      ...actorFields,
      week: asText(getCell(row, 0)),
      content_type: asText(getCell(row, 1)),
      student_product: asText(getCell(row, 2)),
      asset_needed: asText(getCell(row, 3)),
      permission_granted: asBool(getCell(row, 4)),
      owner: asText(getCell(row, 5)),
      due_date: asNullableDate(getCell(row, 6)),
      status: asText(getCell(row, 7)) || "Not Started",
      caption_drafted: asBool(getCell(row, 8)),
      posted: asBool(getCell(row, 9)),
      reposted: asBool(getCell(row, 10)),
      link: asText(getCell(row, 11)),
      notes: asText(getCell(row, 12)),
      priority: asText(getCell(row, 13)) || "Medium",
    }));

  const partnerships = dataRows(rowsBySheet["Partnerships & Incentives"] ?? [])
    .filter((row) => asText(getCell(row, 0)))
    .map((row) => ({
      ...actorFields,
      partner_platform: asText(getCell(row, 0)),
      contact: asText(getCell(row, 1)),
      incentive_requested: asText(getCell(row, 2)),
      target_beneficiaries: asText(getCell(row, 3)),
      status: asText(getCell(row, 4)) || "Not Started",
      owner: asText(getCell(row, 5)),
      last_contact: asNullableDate(getCell(row, 6)),
      next_follow_up: asNullableDate(getCell(row, 7)),
      value: asText(getCell(row, 8)),
      evidence_link: asText(getCell(row, 9)),
      notes: asText(getCell(row, 10)),
      priority: asText(getCell(row, 11)) || "Medium",
    }));

  const alumni = dataRows(rowsBySheet["Alumni Tracker"] ?? [])
    .filter((row) => asText(getCell(row, 0)) || asText(getCell(row, 1)) || asText(getCell(row, 3)))
    .map((row) => ({
      ...actorFields,
      name: asText(getCell(row, 0)),
      email: asText(getCell(row, 1)),
      whatsapp: asText(getCell(row, 2)),
      product: asText(getCell(row, 3)),
      mvp_link: asText(getCell(row, 4)),
      certificate_issued: asBool(getCell(row, 5)),
      badge_issued: asBool(getCell(row, 6)),
      posted_online: asBool(getCell(row, 7)),
      reposted_by_tnx: asBool(getCell(row, 8)),
      alumni_group_joined: asBool(getCell(row, 9)),
      next_step: asText(getCell(row, 10)),
      support_needed: asText(getCell(row, 11)),
      follow_up_date: asNullableDate(getCell(row, 12)),
      notes: asText(getCell(row, 13)),
    }));

  return {
    participants,
    assignment_reviews,
    weekly_ops_tasks,
    session_readiness,
    recruitment_channels,
    cm_reports,
    content_items,
    partnerships,
    alumni,
  };
}

export async function resetTestDataAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireRole("admin");
  try {
    const confirmation = asText(formData.get("confirmation"));
    if (confirmation !== "RESET_TEST_DATA") {
      return { ok: false, message: "Type RESET_TEST_DATA to confirm." };
    }

    const supabase = createAdminClient();
    let deleted = 0;
    for (const table of operationalTables) {
      const { count, error } = await supabase
        .from(table)
        .delete({ count: "exact" })
        .eq("is_test_data", true);
      if (error) throw error;
      deleted += count ?? 0;
    }
    await writeAudit(supabase, session.id, "reset_test_data", { deleted });
    revalidatePath("/");
    return { ok: true, message: `Reset complete. Removed ${deleted} test rows.` };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error) };
  }
}

// Tables wiped by a full nuke, ordered children → parents so FK constraints don't block.
// Deliberately NOT touched: profiles, cohort_members, push_subscriptions, user_reminder_prefs
// (accounts/team + per-user prefs), config_options, message_templates,
// google_sheet_sync_configs, workflow_rules (configuration), audit_logs (keep the trail).
const NUKE_TABLES = [
  "comments",
  "attachments",
  "record_resources",
  "activity_events",
  "workflow_runs",
  "reminder_deliveries",
  "notifications",
  "tasks",
  "escalations",
  "attendance",
  "assignment_reviews",
  "session_readiness",
  "weekly_ops_tasks",
  "cm_reports",
  "recruitment_channels",
  "partnerships",
  "alumni",
  "content_items",
  "resources",
  "application_profiles",
  "cohort_plan_items",
  "participants",
  "google_sheet_sync_runs",
  "cohorts",
];

/**
 * Full reset — deletes ALL operational + cohort data so the app starts fresh. Keeps only
 * accounts/team, configuration, and the audit log. Guarded by a typed confirmation phrase.
 * Admin-only, irreversible.
 */
export async function nukeAllDataAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireRole("admin");
  try {
    const confirmation = asText(formData.get("confirmation"));
    if (confirmation !== "NUKE EVERYTHING") {
      return { ok: false, message: 'Type "NUKE EVERYTHING" exactly to confirm.' };
    }

    const supabase = createAdminClient();
    let deleted = 0;
    const failures: string[] = [];
    for (const table of NUKE_TABLES) {
      // Delete-all guard: match every row (id is not null) so PostgREST performs the delete.
      const { count, error } = await supabase.from(table).delete({ count: "exact" }).not("id", "is", null);
      if (error) {
        failures.push(`${table}: ${error.message}`);
        continue;
      }
      deleted += count ?? 0;
    }
    await writeAudit(supabase, session.id, "nuke_all_data", { deleted, failures });
    revalidatePath("/");
    if (failures.length) {
      return { ok: false, message: `Removed ${deleted} rows, but some tables failed: ${failures.join("; ")}` };
    }
    return { ok: true, message: `Done. Removed ${deleted} rows across ${NUKE_TABLES.length} tables. The app is fresh — accounts and config kept.` };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error) };
  }
}

export async function seedSelectedCohortDataAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireRole("admin");
  try {
    const cohortId = asText(formData.get("cohortId"));
    const selectedIds = formData.getAll("seedItems").map(asText).filter(Boolean);
    if (!cohortId) return { ok: false, message: "Choose a cohort before adding seed data." };
    if (!selectedIds.length) return { ok: false, message: "Choose at least one seed item to add." };

    const knownItems = new Map(
      (Object.entries(cohortSeedCatalog) as Array<[SeedGroupKey, typeof cohortSeedCatalog[SeedGroupKey]]>)
        .flatMap(([group, items]) => items.map((item) => [item.id, group] as const)),
    );
    const selection: SeedSelection = {};
    for (const id of selectedIds) {
      const group = knownItems.get(id);
      if (!group) return { ok: false, message: "One selected seed item is no longer available. Refresh and try again." };
      selection[group] = [...(selection[group] ?? []), id];
    }

    const supabase = createAdminClient();
    const { data: cohort, error: cohortError } = await supabase.from("cohorts").select("id, name").eq("id", cohortId).maybeSingle();
    if (cohortError) throw cohortError;
    if (!cohort) return { ok: false, message: "That cohort no longer exists. Refresh and choose another cohort." };

    const inserted = await seedCohortDefaults(supabase, cohortId, session.id, selection);
    await writeAudit(supabase, session.id, "seed_selected_cohort_data", {
      cohortId,
      selected: selectedIds,
      inserted,
    });

    revalidatePath("/admin/export");
    revalidatePath("/cohorts");
    revalidatePath(`/cohorts/${cohortId}`);
    const insertedTotal = Object.values(inserted).reduce((sum, count) => sum + count, 0);
    return {
      ok: true,
      message: insertedTotal
        ? `Seeded ${insertedTotal} item${insertedTotal === 1 ? "" : "s"} into ${cohort.name}.`
        : `No new seed rows were added to ${cohort.name}; the selected items already exist.`,
      data: inserted,
    };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error) };
  }
}

export async function importWorkbookAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireRole("admin");
  try {
    const cohortId = asText(formData.get("cohortId"));
    const restoreMode = asText(formData.get("restoreMode"));
    const confirmation = asText(formData.get("confirmation"));
    if (confirmation !== "IMPORT_MORPH_OPS") {
      return { ok: false, message: "Type IMPORT_MORPH_OPS to confirm import." };
    }
    if (!cohortId) {
      return { ok: false, message: "Choose a cohort before restoring the workbook." };
    }
    if (!["replace", "append"].includes(restoreMode)) {
      return { ok: false, message: "Choose whether to replace cohort data or append to it." };
    }

    const readExcel = await import("read-excel-file/node");
    const suppliedFile = formData.get("workbook");
    if (!(suppliedFile instanceof File) || suppliedFile.size === 0) {
      return {
        ok: false,
        message: "Upload the legacy workbook file to continue.",
      };
    }
    const buffer = Buffer.from(await suppliedFile.arrayBuffer());

    const workbookSheets = await readExcel.default(buffer);
    const sheetNames = workbookSheets.map((sheet) => sheet.sheet);
    const rowsBySheet: Record<string, WorkbookRows> = {};
    for (const sheet of workbookSheets) {
      rowsBySheet[sheet.sheet] = sheet.data as unknown as WorkbookRows;
    }

    const supabase = createAdminClient();
    const { data: cohort, error: cohortError } = await supabase.from("cohorts").select("id, name").eq("id", cohortId).maybeSingle();
    if (cohortError) throw cohortError;
    if (!cohort) {
      return { ok: false, message: "That cohort no longer exists. Refresh and choose another cohort." };
    }
    if (restoreMode === "replace") {
      await clearCohortData(supabase, cohortId);
    }

    const payloads = buildImportPayloads(rowsBySheet, cohortId, session.id);
    const counts: Record<string, number> = {};
    for (const [table, rows] of Object.entries(payloads)) {
      counts[table] = rows.length;
      if (rows.length) {
        const { error } = await supabase.from(table).insert(rows as Array<Record<string, unknown>>);
        if (error) throw error;
      }
    }

    await writeAudit(supabase, session.id, "import_workbook", {
      cohortId,
      restoreMode,
      workbookSheets: sheetNames,
      counts,
    });
    revalidatePath("/");
    revalidatePath("/admin/export");
    revalidatePath("/cohorts");
    revalidatePath(`/cohorts/${cohortId}`);
    return {
      ok: true,
      message:
        restoreMode === "replace"
          ? `Workbook restored into ${cohort.name}. Existing operational rows for that cohort were replaced.`
          : `Workbook restored into ${cohort.name}. Rows were appended without clearing existing cohort data.`,
      data: counts,
    };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error) };
  }
}

export async function exportDataAction(_prevState?: ActionResult, _formData?: FormData): Promise<ActionResult> {
  const session = await requireRole("admin");
  try {
    const supabase = createAdminClient();
    const exported: Record<string, unknown> = {};
    for (const moduleItem of modules) {
      const { data, error } = await supabase
        .from(moduleItem.table)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      exported[moduleItem.table] = data;
    }
    await writeAudit(supabase, session.id, "export_data", {
      tables: modules.map((moduleItem) => moduleItem.table),
    });
    return {
      ok: true,
      message: "Export generated. Save this JSON as a backup if needed.",
      data: exported,
    };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error) };
  }
}
