import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getImportDataset, type ImportMode, type ImportValue } from "@/lib/import-config";
import { getImportRoles } from "@/lib/import-auth";
import {
  findExistingRecord,
  findParticipantDuplicate,
  loadParticipantCandidates,
  upsertParticipantApplicationProfile,
  validateImportRow,
  type ImportRowAction,
} from "@/lib/import-server";
import { requireRequestRole } from "@/lib/request-auth";

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

async function ensureCohort(
  supabase: ReturnType<typeof createAdminClient>,
  actorId: string,
  cohortId: string,
) {
  const { data, error } = await supabase.from("cohorts").select("id").eq("id", cohortId).maybeSingle();
  if (error || !data) throw error ?? new Error("Selected cohort not found.");
  await supabase.from("cohorts").update({ updated_by: actorId }).eq("id", cohortId);
  return data.id as string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      moduleKey?: string;
      mode?: ImportMode;
      cohortId?: string;
      rows?: Array<Record<string, ImportValue>>;
      rowActions?: Array<{ rowIndex: number; action: ImportRowAction; existingId?: string | null }>;
    };

    const dataset = getImportDataset(body.moduleKey ?? "");
    if (!dataset) {
      return NextResponse.json({ ok: false, message: "Unknown import dataset." }, { status: 400 });
    }

    const auth = await requireRequestRole(...getImportRoles(dataset.key));
    if ("error" in auth) return auth.error;

    const mode: ImportMode = body.mode === "upsert" ? "upsert" : "append";
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!body.cohortId) {
      return NextResponse.json({ ok: false, message: "A target cohort is required." }, { status: 400 });
    }
    if (!rows.length) {
      return NextResponse.json({ ok: false, message: "No rows were submitted." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const cohortId = await ensureCohort(supabase, auth.user.id, body.cohortId);

    const result = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      rejected: 0,
      errors: [] as Array<{ rowNumber: number; issues: string[] }>,
    };

    const actionByIndex = new Map(
      (body.rowActions ?? []).map((rowAction) => [rowAction.rowIndex, rowAction]),
    );
    const participantCandidates = dataset.key === "participants"
      ? await loadParticipantCandidates(supabase, cohortId)
      : [];

    for (const [index, row] of rows.entries()) {
      const issues = validateImportRow(dataset, row);
      if (issues.length) {
        result.rejected += 1;
        result.errors.push({ rowNumber: index + 2, issues });
        continue;
      }

      const payload = dataset.transformRow(row, { cohortId, actorId: auth.user.id });

      if (dataset.key === "participants") {
        const rowAction = actionByIndex.get(index);
        const action = rowAction?.action ?? (mode === "upsert" ? "update" : "create");

        if (action === "skip") {
          result.skipped += 1;
          continue;
        }

        if (action === "update") {
          const duplicate = findParticipantDuplicate(row, participantCandidates, rowAction?.existingId);
          const existingId = duplicate?.id ?? await findExistingRecord(supabase, dataset, cohortId, row);
          if (!existingId) {
            result.rejected += 1;
            result.errors.push({ rowNumber: index + 2, issues: ["No duplicate participant was found to update."] });
            continue;
          }

          const updatePayload = { ...payload };
          delete (updatePayload as { created_by?: string }).created_by;
          const { error } = await supabase.from(dataset.table).update(updatePayload).eq("id", existingId);
          if (error) {
            result.rejected += 1;
            result.errors.push({ rowNumber: index + 2, issues: [error.message] });
            continue;
          }
          await upsertParticipantApplicationProfile(supabase, row, cohortId, existingId);
          result.updated += 1;
          continue;
        }

        const { data, error } = await supabase.from(dataset.table).insert(payload).select("id").single();
        if (error) {
          result.rejected += 1;
          result.errors.push({ rowNumber: index + 2, issues: [error.message] });
          continue;
        }
        await upsertParticipantApplicationProfile(supabase, row, cohortId, data.id as string);
        result.inserted += 1;
        continue;
      }

      if (mode === "append") {
        const { error } = await supabase.from(dataset.table).insert(payload);
        if (error) {
          result.rejected += 1;
          result.errors.push({ rowNumber: index + 2, issues: [error.message] });
          continue;
        }
        result.inserted += 1;
        continue;
      }

      const existingId = await findExistingRecord(supabase, dataset, cohortId, row);
      if (existingId) {
        const updatePayload = { ...payload };
        delete (updatePayload as { created_by?: string }).created_by;
        const { error } = await supabase.from(dataset.table).update(updatePayload).eq("id", existingId);
        if (error) {
          result.rejected += 1;
          result.errors.push({ rowNumber: index + 2, issues: [error.message] });
          continue;
        }
        result.updated += 1;
      } else {
        const { error } = await supabase.from(dataset.table).insert(payload);
        if (error) {
          result.rejected += 1;
          result.errors.push({ rowNumber: index + 2, issues: [error.message] });
          continue;
        }
        result.inserted += 1;
      }
    }

    await writeAudit(supabase, auth.user.id, "import_dataset", {
      dataset: dataset.key,
      mode,
      cohortId,
      ...result,
    });

    return NextResponse.json({
      ok: true,
      message: `Import complete. ${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped, ${result.rejected} rejected.`,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Import failed.",
      },
      { status: 500 },
    );
  }
}
