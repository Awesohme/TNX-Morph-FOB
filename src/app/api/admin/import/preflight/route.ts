import { NextRequest, NextResponse } from "next/server";
import { getImportRoles } from "@/lib/import-auth";
import { getImportDataset, type ImportValue } from "@/lib/import-config";
import {
  findParticipantDuplicate,
  loadParticipantCandidates,
  validateImportRow,
  type ImportRowAction,
} from "@/lib/import-server";
import { requireRequestRole } from "@/lib/request-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      moduleKey?: string;
      cohortId?: string;
      rows?: Array<Record<string, ImportValue>>;
    };

    const dataset = getImportDataset(body.moduleKey ?? "");
    if (!dataset) {
      return NextResponse.json({ ok: false, message: "Unknown import dataset." }, { status: 400 });
    }

    const auth = await requireRequestRole(...getImportRoles(dataset.key));
    if ("error" in auth) return auth.error;

    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!body.cohortId) {
      return NextResponse.json({ ok: false, message: "A target cohort is required." }, { status: 400 });
    }
    if (!rows.length) {
      return NextResponse.json({ ok: false, message: "No rows were submitted." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: cohort, error: cohortError } = await supabase
      .from("cohorts")
      .select("id")
      .eq("id", body.cohortId)
      .maybeSingle();
    if (cohortError || !cohort) {
      return NextResponse.json({ ok: false, message: "Selected cohort not found." }, { status: 400 });
    }

    const participantCandidates = dataset.key === "participants"
      ? await loadParticipantCandidates(supabase, body.cohortId)
      : [];

    const rowsWithPlan = rows.map((row, index) => {
      const issues = validateImportRow(dataset, row);
      const duplicate = dataset.key === "participants"
        ? findParticipantDuplicate(row, participantCandidates)
        : null;
      const action: ImportRowAction = issues.length ? "skip" : duplicate ? "update" : "create";

      return {
        rowIndex: index,
        rowNumber: index + 2,
        action,
        duplicate,
        issues,
        row,
      };
    });

    const duplicates = rowsWithPlan.filter((row) => row.duplicate).length;
    const rejected = rowsWithPlan.filter((row) => row.issues.length).length;

    return NextResponse.json({
      ok: true,
      message: `Preview ready. ${duplicates} duplicate candidate${duplicates === 1 ? "" : "s"} found.`,
      data: {
        rows: rowsWithPlan,
        summary: {
          rows: rowsWithPlan.length,
          duplicates,
          rejected,
          create: rowsWithPlan.filter((row) => row.action === "create").length,
          update: rowsWithPlan.filter((row) => row.action === "update").length,
          skip: rowsWithPlan.filter((row) => row.action === "skip").length,
        },
      },
    });
  } catch (error) {
    console.error("[preflight]", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Import preview failed.",
      },
      { status: 500 },
    );
  }
}
