import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getImportDataset, type ImportDatasetConfig, type ImportMode, type ImportValue } from "@/lib/import-config";
import { requireRequestRole } from "@/lib/request-auth";

function text(value: ImportValue) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
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

function validateRow(dataset: ImportDatasetConfig, row: Record<string, ImportValue>) {
  const errors: string[] = [];

  for (const field of dataset.fields) {
    const value = row[field.key];
    const raw = text(value);

    if (field.required && !raw) {
      errors.push(`${field.label} is required.`);
      continue;
    }

    if (!raw) continue;

    if (field.type === "number" && Number.isNaN(Number(raw))) {
      errors.push(`${field.label} must be a number.`);
    }

    if (field.type === "date" && Number.isNaN(new Date(raw).valueOf())) {
      errors.push(`${field.label} must be a valid date.`);
    }

    if (field.type === "select" && field.options?.length && !field.options.includes(raw)) {
      errors.push(`${field.label} must be one of: ${field.options.join(", ")}.`);
    }
  }

  return errors;
}

async function findExistingRecord(
  supabase: ReturnType<typeof createAdminClient>,
  dataset: ImportDatasetConfig,
  cohortId: string,
  row: Record<string, ImportValue>,
) {
  for (const keys of dataset.findExistingWhere) {
    const usable = keys.every((key) => text(row[key]));
    if (!usable) continue;

    let query = supabase.from(dataset.table).select("id").eq("cohort_id", cohortId);
    for (const key of keys) {
      query = query.eq(key, text(row[key]));
    }
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id as string;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const auth = await requireRequestRole("admin");
  if ("error" in auth) return auth.error;

  try {
    const body = (await request.json()) as {
      moduleKey?: string;
      mode?: ImportMode;
      cohortId?: string;
      rows?: Array<Record<string, ImportValue>>;
    };

    const dataset = getImportDataset(body.moduleKey ?? "");
    if (!dataset) {
      return NextResponse.json({ ok: false, message: "Unknown import dataset." }, { status: 400 });
    }

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
      rejected: 0,
      errors: [] as Array<{ rowNumber: number; issues: string[] }>,
    };

    for (const [index, row] of rows.entries()) {
      const issues = validateRow(dataset, row);
      if (issues.length) {
        result.rejected += 1;
        result.errors.push({ rowNumber: index + 2, issues });
        continue;
      }

      const payload = dataset.transformRow(row, { cohortId, actorId: auth.user.id });

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
      message: `Import complete. ${result.inserted} inserted, ${result.updated} updated, ${result.rejected} rejected.`,
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
