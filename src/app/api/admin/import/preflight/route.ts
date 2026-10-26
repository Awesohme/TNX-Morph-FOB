import { NextRequest, NextResponse } from "next/server";
import { getImportRoles } from "@/lib/import-auth";
import { getImportDataset, type ImportValue } from "@/lib/import-config";
import {
  findParticipantDuplicate,
  loadParticipantCandidates,
  loadCohortImportRows,
  resolveReviewImportIdentity,
  validateImportRow,
  type ImportRowAction,
} from "@/lib/import-server";
import { requireRequestRole } from "@/lib/request-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertCohortAccess } from "@/lib/cohort-access";

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
    await assertCohortAccess(auth.user, body.cohortId);
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
    const reviewCandidates = dataset.key === "reviews" ? await Promise.all([
      loadCohortImportRows(supabase, "participants", body.cohortId),
      loadCohortImportRows(supabase, "assignment_reviews", body.cohortId),
    ]) : null;

    const rowsWithPlan = rows.map((row, index) => {
      const issues = validateImportRow(dataset, row);
      if (dataset.key === "reviews" && !issues.length) {
        try {
          resolveReviewImportIdentity(row, reviewCandidates![0], reviewCandidates![1]);
        } catch (error) {
          issues.push(error instanceof Error ? error.message : "Review identity could not be resolved.");
        }
      }
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
