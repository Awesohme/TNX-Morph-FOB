import Link from "next/link";
import { AlertCircle, ArrowUpRight, Database, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CohortSwitcher } from "@/components/cohort-switcher";
import { ModuleRecordsTable } from "@/components/workflow/module-records-table";
import { getScopedCohort, withCohortParam } from "@/lib/cohorts";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getImportDatasetSummary } from "@/lib/import-config";
import { ImportRecordsModal } from "@/components/modules/import-records-modal";
import { modules, type ModuleKey } from "@/lib/modules";
import { formatFieldValue, toSerializableModuleConfig } from "@/lib/workflow";
import { cn } from "@/lib/utils";

// Standard owner role labels offered alongside named team members in bulk owner edits.
const OWNER_ROLE_LABELS = ["CM Lead", "CMs", "Session Lead", "Facilitators", "Admin"];

export async function ModuleDataPage({
  moduleKey,
  requestedCohortId,
  enableWeekFilter = false,
  activeWeek,
}: {
  moduleKey: ModuleKey;
  requestedCohortId?: string | null;
  enableWeekFilter?: boolean;
  activeWeek?: string;
}) {
  const moduleConfig = modules.find((item) => item.key === moduleKey);
  if (!moduleConfig) throw new Error(`Unknown module: ${moduleKey}`);

  const { cohorts, cohortId } = await getScopedCohort(requestedCohortId);
  const user = await getCurrentUser();
  // CMs view Ops and Sessions read-only (no create/import/bulk/inline edits).
  const readOnly = user?.role === "community_manager" && ["ops", "sessions"].includes(moduleKey);
  const supabase = await createClient();
  const query = supabase
    .from(moduleConfig.table)
    .select("*")
    .or("is_test_data.is.null,is_test_data.eq.false")
    .order("created_at", { ascending: true })
    .limit(100);
  const { data, error } = cohortId ? await query.eq("cohort_id", cohortId) : await query;

  // Owner dropdown options = standard role labels + active team members (for bulk owner edits).
  const { data: ownerProfiles } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("is_active", true)
    .order("full_name", { ascending: true });
  const memberNames = (ownerProfiles ?? [])
    .map((p) => p.full_name || p.email)
    .filter((n): n is string => Boolean(n));
  const ownerOptions = Array.from(new Set([...OWNER_ROLE_LABELS, ...memberNames]));

  const allRows = (data ?? []) as Array<Record<string, unknown> & { id: string }>;
  // Optional week filter (used by Ops, mirrors the Reviews page week pills).
  const week = activeWeek ?? "all";
  const weekOptions = enableWeekFilter
    ? Array.from(new Set(allRows.map((row) => String(row.week || "Unscheduled"))))
    : [];
  const rows =
    enableWeekFilter && week !== "all"
      ? allRows.filter((row) => String(row.week || "Unscheduled") === week)
      : allRows;
  const Icon = moduleConfig.icon;
  const serializableModuleConfig = toSerializableModuleConfig(moduleConfig);
  const importDataset = getImportDatasetSummary(moduleKey);
  const queueCards = moduleConfig.queueViews.map((queueView) => {
    const count = rows.filter((row) => String(row[queueView.field] ?? "") === String(queueView.value)).length;
    return { ...queueView, count };
  });

  return (
    <div className="space-y-6">
      <section className="app-panel overflow-hidden">
        <div className="flex flex-col gap-5 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="flex gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700">
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Operations workspace</p>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{moduleConfig.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {moduleConfig.description} Create records, assign ownership, manage follow-ups, and audit activity from the same workspace.
              </p>
              <div className="mt-4">
                <CohortSwitcher cohorts={cohorts.map((cohort) => ({ id: cohort.id, name: cohort.name }))} activeCohortId={cohortId} basePath={moduleConfig.route} />
              </div>
            </div>
          </div>
          {readOnly ? null : (
            <div className="flex flex-wrap items-center gap-3">
              {importDataset ? (
                <ImportRecordsModal datasets={[importDataset]} cohorts={cohorts} label={moduleConfig.title} />
              ) : null}
              <Link href={cohortId ? `/records/${moduleConfig.key}/new?cohort=${cohortId}` : `/records/${moduleConfig.key}/new`} className={cn(buttonVariants({ variant: "default" }))}>
                <Plus className="size-4" />
                New {moduleConfig.singularTitle.toLowerCase()}
              </Link>
            </div>
          )}
        </div>
      </section>

      {enableWeekFilter && weekOptions.length ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href={withCohortParam(moduleConfig.route, cohortId)}
            className={cn(
              "inline-flex items-center rounded-xl border px-3 py-2 text-xs font-medium transition",
              week === "all" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            All weeks
          </Link>
          {weekOptions.map((weekLabel) => (
            <Link
              key={weekLabel}
              href={withCohortParam(`${moduleConfig.route}?week=${encodeURIComponent(weekLabel)}`, cohortId)}
              className={cn(
                "inline-flex items-center rounded-xl border px-3 py-2 text-xs font-medium transition",
                week === weekLabel ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {weekLabel}
            </Link>
          ))}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Records in workspace</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{rows.length}</p>
            </div>
            <Badge tone="blue">
              <Database className="mr-1 size-3" />
              {moduleConfig.table}
            </Badge>
          </div>
        </Card>
        {queueCards.slice(0, 2).map((queueCard) => (
          <Card key={queueCard.key}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{queueCard.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">{queueCard.count}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Current records where {queueCard.field.replaceAll("_", " ")} = {formatFieldValue(queueCard.value)}
                </p>
              </div>
              <ArrowUpRight className="mt-1 size-4 text-muted-foreground" />
            </div>
          </Card>
        ))}
      </section>

      {error ? (
        <Card className="border-rose-200 bg-rose-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-700">
              <AlertCircle className="size-5" />
              Could not load module
            </CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div>
            <h2 className="text-xl font-semibold">Operational records</h2>
            <p className="text-sm text-muted-foreground">Select records for bulk changes or open a record to manage tasks, notes, and history.</p>
          </div>
          <Badge tone="blue">
            <Database className="mr-1 size-3" />
            {moduleConfig.table}
          </Badge>
        </div>
        {rows.length ? (
          <ModuleRecordsTable moduleConfig={serializableModuleConfig} rows={rows} activeCohortId={cohortId} ownerOptions={ownerOptions} readOnly={readOnly} />
        ) : (
          <div className="px-5 py-12 text-center text-muted-foreground">
            No records yet. Use Admin Import to load a dataset template or create the first record manually.
          </div>
        )}
      </Card>
    </div>
  );
}
