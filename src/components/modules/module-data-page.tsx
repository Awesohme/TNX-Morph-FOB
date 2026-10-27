import Link from "next/link";
import { notFound } from "next/navigation";
import { LIST_PAGE_SIZE, parseListPage, scanListRows } from "@/lib/list-pagination";
import { ListPagination } from "@/components/modules/list-pagination";
import { AlertCircle, ArrowUpRight, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CohortSwitcher } from "@/components/cohort-switcher";
import { CompactFilters, type CompactFilterDefinition } from "@/components/modules/compact-filters";
import { ModuleRecordsTable } from "@/components/workflow/module-records-table";
import { getScopedCohort, withCohortParam } from "@/lib/cohorts";
import { getCurrentUser } from "@/lib/auth";
import { getImportRoles } from "@/lib/import-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getImportDatasetSummary } from "@/lib/import-config";
import { normalizeAttendanceWeekLabel } from "@/lib/attendance";
import { sortWeekLabels } from "@/lib/cohort-weeks";
import { ImportRecordsModal } from "@/components/modules/import-records-modal";
import { AttendanceSettingsModal } from "@/components/modules/attendance-settings-modal";
import { modules, type ModuleFilter, type ModuleKey } from "@/lib/modules";
import { formatFieldValue, toSerializableModuleConfig } from "@/lib/workflow";
import { getPublicBaseUrl } from "@/lib/public-url";
import { cn } from "@/lib/utils";

// Standard owner role labels offered alongside named team members in bulk owner edits.
const OWNER_ROLE_LABELS = ["CM Lead", "CMs", "Session Lead", "Facilitators", "Admin"];

function compareFilterValue(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function matchesFilter(
  row: Record<string, unknown> & { id: string },
  filter: ModuleFilter,
  selectedValue: string,
  attendanceByParticipant: Record<string, number>,
  completedClasses: number,
) {
  if (!selectedValue) return true;
  if (filter.mode === "attendance_presence") {
    const attendanceCount = attendanceByParticipant[row.id] ?? 0;
    return selectedValue === "filled" ? attendanceCount > 0 : attendanceCount === 0;
  }
  if (filter.mode === "attendance_risk") {
    const missedClasses = Math.max(0, completedClasses - (attendanceByParticipant[row.id] ?? 0));
    if (selectedValue === "at-risk") return missedClasses >= 2;
    if (selectedValue === "watch") return missedClasses === 1;
    return missedClasses === 0;
  }
  return compareFilterValue(row[filter.key]) === selectedValue.toLowerCase();
}

function buildFilterDefinitions(
  filters: ModuleFilter[] | undefined,
  rows: Array<Record<string, unknown> & { id: string }>,
): CompactFilterDefinition[] {
  return (filters ?? [])
    .map((filter) => {
      const options = filter.source === "row-values"
        ? Array.from(new Set(rows.map((row) => String(row[filter.key] ?? "").trim()).filter(Boolean)))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            .map((value) => ({ value, label: value }))
        : (filter.options ?? []);
      return { key: filter.key, label: filter.label, options };
    })
    .filter((filter) => filter.options.length > 0);
}

export async function ModuleDataPage({
  moduleKey,
  requestedCohortId,
  filterValues = {},
}: {
  moduleKey: ModuleKey;
  requestedCohortId?: string | null;
  filterValues?: Record<string, string | undefined>;
}) {
  const moduleConfig = modules.find((item) => item.key === moduleKey);
  if (!moduleConfig) throw new Error(`Unknown module: ${moduleKey}`);

  const { cohorts, cohortId } = await getScopedCohort(requestedCohortId);
  const user = await getCurrentUser();
  const publicBaseUrl = await getPublicBaseUrl();
  // CMs view Ops and Sessions read-only (no create/import/bulk/inline edits).
  const readOnly = user?.role === "community_manager" && ["ops", "sessions"].includes(moduleKey);
  const supabase = await createClient();
  const page = parseListPage(filterValues.page);
  if (page === null) notFound();
  // Scan only fields needed for filtering and summaries. Full records are fetched for
  // the selected page after all filters (including derived attendance risk) run.
  const summaryColumns = Array.from(new Set([
    "id", moduleKey === "participants" ? "full_name" : "created_at",
    ...(moduleConfig.filters ?? []).filter((filter) => !filter.mode?.startsWith("attendance_")).map((filter) => filter.key),
    ...moduleConfig.queueViews.map((view) => view.field),
  ])).join(",");
  const { data, error } = await scanListRows<Record<string, unknown> & { id: string }>(async (from, to) => {
    let query = supabase.from(moduleConfig.table).select(summaryColumns)
      .or("is_test_data.is.null,is_test_data.eq.false")
      .order(moduleKey === "participants" ? "full_name" : "created_at", { ascending: true })
      .order("id", { ascending: true }).range(from, to);
    if (cohortId) query = query.eq("cohort_id", cohortId);
    const result = await query;
    return { data: result.data as unknown as Array<Record<string, unknown> & { id: string }> | null, error: result.error };
  });

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

  // Participants-only: attendance count per participant (X / N weeks) + the window control.
  let attendanceByParticipant: Record<string, number> = {};
  let attendanceError: { message: string } | null = null;
  let completedClasses = 0;
  let weeksTotal = 0;
  let attendanceWeekOptions: string[] = [];
  type AttendanceCohort = { slug: string; week_count: number | null; attendance_open: boolean; attendance_opens_at: string | null; attendance_closes_at: string | null; attendance_week: string | null };
  let attendanceCohort: AttendanceCohort | null = null;
  if (moduleKey === "participants" && cohortId) {
    const supabaseAdmin = createAdminClient();
    const [{ data: attendanceRows, error: attendanceLoadError }, { data: planWeeks }, { data: cohortRow }] = await Promise.all([
      scanListRows((from, to) => supabaseAdmin.from("attendance").select("participant_id, signed_in_at, signed_out_at, week").eq("cohort_id", cohortId).order("id").range(from, to)),
      supabase.from("cohort_plan_items").select("week_label, sort_order").eq("cohort_id", cohortId).order("sort_order", { ascending: true }),
      supabase.from("cohorts").select("slug, week_count, attendance_open, attendance_opens_at, attendance_closes_at, attendance_week").eq("id", cohortId).maybeSingle(),
    ]);
    attendanceError = attendanceLoadError;
    // Count a week as completed attendance only after the participant has both signed in and signed out.
    const counts: Record<string, Set<string>> = {};
    for (const r of attendanceRows ?? []) {
      if (!r.signed_in_at || !r.signed_out_at) continue;
      const pid = String(r.participant_id);
      (counts[pid] ??= new Set()).add(normalizeAttendanceWeekLabel(r.week));
    }
    attendanceByParticipant = Object.fromEntries(Object.entries(counts).map(([pid, weeks]) => [pid, weeks.size]));
    attendanceWeekOptions = sortWeekLabels((planWeeks ?? []).map((w) => normalizeAttendanceWeekLabel(w.week_label)));
    if (!attendanceWeekOptions.length) attendanceWeekOptions = ["Week 0", "Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"];
    attendanceCohort = (cohortRow as unknown as AttendanceCohort | null) ?? null;
    // The attendance fraction always uses the cohort's configured duration (for example 3/7),
    // even while its editable plan rows are still being set up.
    weeksTotal = Number(attendanceCohort?.week_count) || attendanceWeekOptions.length;
    const activeWeek = attendanceCohort?.attendance_week ? normalizeAttendanceWeekLabel(attendanceCohort.attendance_week) : "";
    const activeWeekIndex = attendanceWeekOptions.indexOf(activeWeek);
    const recordedClassWeeks = new Set((attendanceRows ?? []).map((row) => normalizeAttendanceWeekLabel(row.week)));
    // Risk only considers classes that have taken place. Recorded attendance is the strongest
    // signal; the active week is a fallback before the first attendance record exists.
    completedClasses = recordedClassWeeks.size || (activeWeekIndex >= 0 ? activeWeekIndex + 1 : 0);
  }

  const compactFilters = buildFilterDefinitions(moduleConfig.filters, allRows);
  const activeFilterValues = Object.fromEntries(
    compactFilters.map((filter) => [filter.key, String(filterValues[filter.key] ?? "").trim()]),
  );
  const returnToParams = new URLSearchParams();
  if (cohortId) returnToParams.set("cohort", cohortId);
  for (const [key, value] of Object.entries(activeFilterValues)) {
    if (value) returnToParams.set(key, value);
  }
  returnToParams.set("page", String(page));
  const returnTo = returnToParams.toString() ? `${moduleConfig.route}?${returnToParams.toString()}` : moduleConfig.route;
  const filteredRows = allRows.filter((row) =>
    (moduleConfig.filters ?? []).every((filter) => {
      const selectedValue = String(filterValues[filter.key] ?? "").trim();
      return matchesFilter(row, filter, selectedValue, attendanceByParticipant, completedClasses);
    }),
  );
  const missedClassesByParticipant = Object.fromEntries(
    filteredRows.map((row) => [row.id, Math.max(0, completedClasses - (attendanceByParticipant[row.id] ?? 0))]),
  );
  const total = filteredRows.length;
  if (page > Math.max(1, Math.ceil(total / LIST_PAGE_SIZE)) && !error && !attendanceError) notFound();
  const pageIds = filteredRows.slice((page - 1) * LIST_PAGE_SIZE, page * LIST_PAGE_SIZE).map((row) => row.id);
  let rows: Array<Record<string, unknown> & { id: string }> = [];
  let pageError: { message: string } | null = null;
  if (pageIds.length) {
    const result = await supabase.from(moduleConfig.table).select("*").in("id", pageIds);
    pageError = result.error;
    const byId = new Map((result.data ?? []).map((row) => [row.id, row]));
    rows = pageIds.flatMap((id) => byId.has(id) ? [byId.get(id)!] : []);
  }
  const Icon = moduleConfig.icon;
  const serializableModuleConfig = toSerializableModuleConfig(moduleConfig);
  const importDataset = getImportDatasetSummary(moduleKey);
  const canImportDataset = Boolean(importDataset && user?.role && getImportRoles(importDataset.key).includes(user.role));
  const queueCards = moduleConfig.queueViews.map((queueView) => {
    const isAttendanceRiskCard = moduleKey === "participants" && queueView.key === "at-risk";
    const count = filteredRows.filter((row) =>
      isAttendanceRiskCard
        ? String(row.risk ?? "") === "Red" || missedClassesByParticipant[row.id] >= 2
        : String(row[queueView.field] ?? "") === String(queueView.value),
    ).length;
    return { ...queueView, count, isAttendanceRiskCard };
  });
  const attendanceStatusCards = [
    { key: "at-risk", label: "At risk", description: "Missed 2+ completed classes", count: filteredRows.filter((row) => missedClassesByParticipant[row.id] >= 2).length, className: "border-rose-200 bg-rose-50", countClassName: "text-rose-700" },
    { key: "watch", label: "Watch", description: "Missed 1 completed class", count: filteredRows.filter((row) => missedClassesByParticipant[row.id] === 1).length, className: "border-amber-200 bg-amber-50", countClassName: "text-amber-700" },
    { key: "on-track", label: "On track", description: "Attended every completed class", count: filteredRows.filter((row) => missedClassesByParticipant[row.id] === 0).length, className: "border-emerald-200 bg-emerald-50", countClassName: "text-emerald-700" },
  ];

  return (
    <div className="space-y-6">
      <section className="app-panel overflow-hidden">
        <div className="flex flex-col gap-4 p-4 md:flex-row md:items-end md:justify-between md:gap-5 md:p-6">
          <div className="flex gap-3 md:gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700 md:size-12">
              <Icon className="size-5 md:size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Operations workspace</p>
              <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">{moduleConfig.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:mt-3">
                {moduleConfig.description}
              </p>
              <div className="mt-3 md:mt-4">
                <CohortSwitcher cohorts={cohorts.map((cohort) => ({ id: cohort.id, name: cohort.name }))} activeCohortId={cohortId} basePath={moduleConfig.route} />
              </div>
            </div>
          </div>
          {readOnly ? null : (
            <div className="grid shrink-0 grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center md:justify-end">
              {moduleKey === "participants" && attendanceCohort && cohortId ? (
                <AttendanceSettingsModal
                  key={cohortId}
                  cohortId={cohortId}
                  cohortSlug={attendanceCohort.slug}
                  publicBaseUrl={publicBaseUrl}
                  attendanceOpen={attendanceCohort.attendance_open}
                  opensAt={attendanceCohort.attendance_opens_at}
                  closesAt={attendanceCohort.attendance_closes_at}
                  activeWeek={attendanceCohort.attendance_week}
                  weekOptions={attendanceWeekOptions}
                />
              ) : null}
              {importDataset && canImportDataset ? (
                <ImportRecordsModal datasets={[importDataset]} cohorts={cohorts} initialCohortId={cohortId} label={moduleConfig.title} />
              ) : null}
              <Link
                href={cohortId ? `/records/${moduleConfig.key}/new?cohort=${cohortId}` : `/records/${moduleConfig.key}/new`}
                className={cn(buttonVariants({ variant: "default" }), "col-span-2")}
              >
                <Plus className="size-4" />
                New {moduleConfig.singularTitle.toLowerCase()}
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className={cn("grid gap-4", moduleKey === "participants" ? "md:grid-cols-3" : "md:grid-cols-2")}>
        {(moduleKey === "participants" ? attendanceStatusCards : queueCards.slice(0, 2)).map((queueCard) => (
          <Card key={queueCard.key}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{queueCard.label}</p>
                <p className={cn("mt-2 text-3xl font-semibold tracking-tight", "countClassName" in queueCard && queueCard.countClassName)}>{queueCard.count}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {"description" in queueCard
                    ? queueCard.description
                    : queueCard.isAttendanceRiskCard
                    ? "Students who have missed 2+ completed classes"
                    : <>Current records where {queueCard.field.replaceAll("_", " ")} = {formatFieldValue(queueCard.value)}</>}
                </p>
              </div>
              <ArrowUpRight className="mt-1 size-4 text-muted-foreground" />
            </div>
          </Card>
        ))}
      </section>

      {error || attendanceError || pageError ? (
        <Card className="border-rose-200 bg-rose-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-700">
              <AlertCircle className="size-5" />
              Could not load module
            </CardTitle>
            <CardDescription>{(error ?? attendanceError ?? pageError)?.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Operational records</h2>
            <p className="text-sm text-muted-foreground">Select records for bulk changes or open a record to manage tasks, notes, and history.</p>
          </div>
          <CompactFilters
            action={moduleConfig.route}
            hiddenParams={cohortId ? { cohort: cohortId } : {}}
            filters={compactFilters}
            values={activeFilterValues}
            resetHref={withCohortParam(moduleConfig.route, cohortId)}
            className="w-full md:max-w-4xl"
          />
        </div>
        {rows.length ? (
          <ModuleRecordsTable key={returnTo} moduleConfig={serializableModuleConfig} rows={rows} activeCohortId={cohortId} returnTo={returnTo} ownerOptions={ownerOptions} readOnly={readOnly} attendanceByParticipant={Object.fromEntries(rows.map((row) => [row.id, attendanceByParticipant[row.id] ?? 0]))} missedClassesByParticipant={Object.fromEntries(rows.map((row) => [row.id, missedClassesByParticipant[row.id] ?? 0]))} weeksTotal={weeksTotal} />
        ) : (
          <div className="px-5 py-12 text-center text-muted-foreground">
            No records match this cohort and filter selection.
          </div>
        )}
        <ListPagination route={moduleConfig.route} params={returnToParams} page={page} total={total} />
      </Card>
    </div>
  );
}
