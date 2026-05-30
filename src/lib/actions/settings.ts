"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole, requireUser } from "@/lib/auth";
import { getPublicEnv } from "@/lib/env";
import { runGoogleSheetSync } from "@/lib/sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeErrorMessage } from "@/lib/utils";

export type CreateCommunityManagerState = {
  ok: boolean;
  message: string;
  credentials?: {
    fullName: string;
    role: string;
    email: string;
    password: string;
    loginUrl: string;
  };
};

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function temporaryPassword() {
  const seed = randomBytes(8).toString("hex");
  return `Morph-${seed.slice(0, 4)}!${seed.slice(4, 10)}9`;
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

export async function createCommunityManagerAccountAction(
  _previousState: CreateCommunityManagerState,
  formData: FormData,
): Promise<CreateCommunityManagerState> {
  const session = await requireRole("admin");

  try {
    const supabase = createAdminClient();
    const fullName = text(formData.get("fullName"));
    const email = text(formData.get("email")).toLowerCase();
    const cohortId = text(formData.get("cohortId"));
    const role = text(formData.get("role")) || "community_manager";
    if (!fullName || !email || !cohortId) {
      throw new Error("Name, email, and cohort are required.");
    }

    const password = temporaryPassword();
    const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (authError || !authResult.user) throw authError ?? new Error("Could not create the community manager account.");

    const profilePayload = {
      id: authResult.user.id,
      email,
      full_name: fullName,
      role,
      is_active: true,
      must_change_password: true,
      temp_password_issued_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await supabase.from("profiles").upsert(profilePayload);
    await supabase.from("cohort_members").upsert({
      cohort_id: cohortId,
      user_id: authResult.user.id,
      role,
    });

    await writeAudit(supabase, session.id, "create_community_manager_account", {
      createdUserId: authResult.user.id,
      email,
      cohortId,
      role,
    });

    revalidatePath("/settings");
    revalidatePath("/community");
    revalidatePath("/cohorts");

    return {
      ok: true,
      message: "Community manager account created.",
      credentials: {
        fullName,
        role,
        email,
        password,
        loginUrl: `${getPublicEnv().appUrl}/auth/login`,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: safeErrorMessage(error),
    };
  }
}

export async function saveGoogleSheetConfigAction(formData: FormData) {
  const session = await requireRole("admin");
  try {
    const supabase = createAdminClient();
    const cohortId = text(formData.get("cohortId"));
    const datasetKey = text(formData.get("datasetKey"));
    const spreadsheetId = text(formData.get("spreadsheetId"));
    const sheetName = text(formData.get("sheetName"));
    const enabled = formData.has("enabled");
    if (!cohortId || !datasetKey || !spreadsheetId || !sheetName) {
      throw new Error("Cohort, dataset, spreadsheet ID, and sheet name are required.");
    }

    const { error } = await supabase.from("google_sheet_sync_configs").upsert({
      cohort_id: cohortId,
      dataset_key: datasetKey,
      spreadsheet_id: spreadsheetId,
      sheet_name: sheetName,
      enabled,
      updated_by: session.id,
      created_by: session.id,
    });
    if (error) throw error;

    await writeAudit(supabase, session.id, "save_google_sheet_sync_config", {
      cohortId,
      datasetKey,
      spreadsheetId,
      sheetName,
      enabled,
    });

    revalidatePath("/settings");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function runGoogleSheetSyncNowAction(formData: FormData) {
  const session = await requireRole("admin", "facilitator");
  try {
    const cohortId = text(formData.get("cohortId")) || null;
    const datasetKey = text(formData.get("datasetKey")) || null;
    await runGoogleSheetSync({ cohortId, datasetKey, initiatedBy: session.id });
    revalidatePath("/settings");
    revalidatePath("/participants");
    revalidatePath("/reviews");
    revalidatePath("/ops");
    revalidatePath("/sessions");
    revalidatePath("/community");
    revalidatePath("/dashboard");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

export async function clearTemporaryPasswordStateAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      must_change_password: false,
      temp_password_issued_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) throw error;

  revalidatePath("/auth/complete-setup");
  revalidatePath("/dashboard");
}

// Toggle the public worksheet submission window for a cohort. Used from Settings → Tools.
export async function toggleSubmissionsOpenAction(formData: FormData) {
  const session = await requireRole("admin", "facilitator");
  try {
    const supabase = createAdminClient();
    const cohortId = text(formData.get("cohortId"));
    const open = formData.get("open") === "true";
    if (!cohortId) throw new Error("Cohort is required.");

    const { error } = await supabase.from("cohorts").update({ submissions_open: open }).eq("id", cohortId);
    if (error) throw error;

    await writeAudit(supabase, session.id, "toggle_submissions_open", { cohortId, open });
    revalidatePath("/settings");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}

// Save the current user's task-reminder slot preferences.
export async function saveReminderPrefsAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("user_reminder_prefs").upsert({
      user_id: user.id,
      remind_1d: formData.has("remind_1d"),
      remind_3h: formData.has("remind_3h"),
      remind_at_due: formData.has("remind_at_due"),
      remind_overdue: formData.has("remind_overdue"),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    revalidatePath("/settings");
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}
