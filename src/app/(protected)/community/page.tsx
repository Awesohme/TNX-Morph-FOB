import Link from "next/link";
import { ArrowUpRight, BellRing, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CohortSwitcher } from "@/components/cohort-switcher";
import { CmGuide } from "@/components/guides/cm-guide";
import { createCommunityReminderAction } from "@/lib/actions/ops";
import { getScopedCohort, withCohortParam } from "@/lib/cohorts";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string; week?: string }>;
}) {
  const { cohort: requestedCohortId, week: weekParam = "all" } = await searchParams;
  const { cohorts, cohort, cohortId } = await getScopedCohort(requestedCohortId);
  const supabase = await createClient();
  const user = await getCurrentUser();
  const isCm = user?.role === "community_manager";

  const [{ data: memberships }, { data: reports }, { data: tasks }] = await Promise.all([
    cohortId
      ? supabase
          .from("cohort_members")
          .select("user_id, role, profiles:user_id(full_name, email)")
          .eq("cohort_id", cohortId)
      : Promise.resolve({ data: [] }),
    cohortId
      ? supabase.from("cm_reports").select("*").eq("cohort_id", cohortId).order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    cohortId
      ? supabase.from("tasks").select("*").eq("cohort_id", cohortId).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const communityManagers = (memberships ?? [])
    .filter((m) => m.role === "community_manager")
    .filter((m) => !isCm || m.user_id === user?.id)
    .map((m) => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return { id: m.user_id, label: profile?.full_name || profile?.email || "Unknown user" };
    });

  // Week chips for filtering reports (mirrors the Activities/Ops week filters).
  const allWeeks = Array.from(new Set((reports ?? []).map((r) => String(r.week || "Unscheduled")))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  const scopedReports = weekParam === "all" ? reports ?? [] : (reports ?? []).filter((r) => String(r.week || "Unscheduled") === weekParam);

  // Match a report's free-text `cm` to a manager's label tolerantly — a case/space difference
  // (e.g. profile name later edited) shouldn't detach a report from its card.
  const normName = (s: unknown) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const cards = communityManagers.map((manager) => {
    const managerReports = scopedReports.filter((r) => normName(r.cm) === normName(manager.label));
    const latestReport = managerReports[0] ?? null;
    const reportByWeek = new Map<string, (typeof managerReports)[number]>();
    for (const r of managerReports) {
      const wk = String(r.week || "Unscheduled");
      if (!reportByWeek.has(wk)) reportByWeek.set(wk, r);
    }
    const weeklyReports = Array.from(reportByWeek.values()).sort((a, b) =>
      String(a.week || "").localeCompare(String(b.week || ""), undefined, { numeric: true }),
    );
    const assignedTasks = (tasks ?? []).filter(
      (t) => t.assigned_to === manager.id || (!t.assigned_to && t.assigned_label === manager.label),
    );
    const openTasks = assignedTasks.filter((t) => !["Done", "Closed"].includes(String(t.status))).length;
    const overdueTasks = assignedTasks.filter(
      (t) => t.due_at && new Date(t.due_at).getTime() < Date.now() && !["Done", "Closed"].includes(String(t.status)),
    ).length;
    // A report counts as done when the CM ticked "Weekly report sent" (Status is no longer
    // part of the CM form). Fall back to the legacy status flag for older records.
    const reportDone = latestReport ? Boolean(latestReport.weekly_report_sent) || latestReport.status === "Done" : false;
    return { manager, latestReport, weeklyReports, openTasks, overdueTasks, reportDone };
  });

  return (
    <div className="space-y-6">
      <section className="app-panel p-6 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">CM oversight</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Reports</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Track weekly reports, silent and stuck learner counts, escalations, and follow-up workload for each community manager.
            </p>
            <div className="mt-4">
              <CohortSwitcher cohorts={cohorts.map((c) => ({ id: c.id, name: c.name }))} activeCohortId={cohortId} basePath="/community" />
            </div>
          </div>
          {cohort && isCm ? (
            <Link
              href={withCohortParam("/records/community/new", cohortId)}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Plus className="size-4" />
              Create report
            </Link>
          ) : null}
        </div>
      </section>

      <CmGuide />

      {allWeeks.length ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href={withCohortParam("/community", cohortId)}
            className={`inline-flex items-center rounded-xl border px-3 py-2 text-xs font-medium transition ${
              weekParam === "all" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            All weeks
          </Link>
          {allWeeks.map((weekLabel) => (
            <Link
              key={weekLabel}
              href={withCohortParam(`/community?week=${encodeURIComponent(weekLabel)}`, cohortId)}
              className={`inline-flex items-center rounded-xl border px-3 py-2 text-xs font-medium transition ${
                weekParam === weekLabel ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {weekLabel}
            </Link>
          ))}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ manager, latestReport, weeklyReports, openTasks, overdueTasks, reportDone }) => (
          <Card key={manager.id} className="flex flex-col gap-0 p-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="font-semibold text-slate-950">{manager.label}</p>
                <p className="text-xs text-muted-foreground">Community manager</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={reportDone ? "green" : "amber"} className="text-xs">
                  {reportDone ? "Report done" : "Report pending"}
                </Badge>
                {overdueTasks > 0 && <Badge tone="red" className="text-xs">{overdueTasks} overdue</Badge>}
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-b border-slate-100">
              {[
                { label: "Open tasks", value: openTasks },
                { label: "Escalations", value: Number(latestReport?.escalations_raised ?? 0) },
                { label: "Silent students", value: Number(latestReport?.silent_students ?? 0) },
                { label: "Stuck students", value: Number(latestReport?.stuck_students ?? 0) },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-400">{label}</p>
                  <p className="mt-0.5 text-lg font-semibold text-slate-950">{value}</p>
                </div>
              ))}
            </div>

            {/* Weekly reports list */}
            <div className="flex-1 space-y-2 px-5 py-4">
              {weeklyReports.length ? (
                <>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Weekly reports</p>
                  {weeklyReports.map((report) => (
                    <Link
                      key={report.id}
                      href={`/records/community/${report.id}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 text-sm transition hover:bg-slate-100"
                    >
                      <span className="font-medium text-slate-800 truncate">{report.week || "No week label"}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge tone={report.weekly_report_sent || report.status === "Done" ? "green" : "amber"} className="text-xs">
                          {report.weekly_report_sent || report.status === "Done" ? "Sent" : "Pending"}
                        </Badge>
                        <ArrowUpRight className="size-3.5 text-slate-400" />
                      </div>
                    </Link>
                  ))}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center text-sm text-muted-foreground">
                  No report submitted yet for this cohort.
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">
              {latestReport ? (
                <Link
                  href={`/records/community/${latestReport.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Open latest
                  <ArrowUpRight className="size-3.5" />
                </Link>
              ) : null}

              {/* Only admins/facilitators can remind a CM — CMs shouldn't remind themselves */}
              {!isCm ? (
                <form action={createCommunityReminderAction} className="inline-flex">
                  <input type="hidden" name="cohortId" value={cohortId ?? ""} />
                  <input type="hidden" name="cmLabel" value={manager.label} />
                  <input type="hidden" name="assignedTo" value={manager.id} />
                  <input type="hidden" name="sourceRecordId" value={latestReport?.id ?? ""} />
                  <input type="hidden" name="returnTo" value={withCohortParam("/community", cohortId)} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
                  >
                    <BellRing className="size-3.5" />
                    Remind CM
                  </button>
                </form>
              ) : null}
            </div>
          </Card>
        ))}

        {!cards.length ? (
          <Card className="md:col-span-2 xl:col-span-4 p-6">
            <p className="font-semibold text-slate-950">No community managers assigned</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a community manager account from Settings, assign the cohort, then share the temporary password.
            </p>
            <Link href="/settings" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-950">
              Open team access <ArrowUpRight className="size-4" />
            </Link>
          </Card>
        ) : null}
      </section>

    </div>
  );
}
