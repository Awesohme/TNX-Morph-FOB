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
import { SubmitButton } from "@/components/ui/submit-button";

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string; week?: string; cm?: string }>;
}) {
  const { cohort: requestedCohortId, week: weekParam = "all", cm: cmParam = "all" } = await searchParams;
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

  function communityPath(params: { week?: string; cm?: string }) {
    const query = new URLSearchParams();
    if (cohortId) query.set("cohort", cohortId);
    if (params.week && params.week !== "all") query.set("week", params.week);
    if (params.cm && params.cm !== "all") query.set("cm", params.cm);
    const next = query.toString();
    return next ? `/community?${next}` : "/community";
  }

  // Week chips for filtering reports (mirrors the Activities/Ops week filters).
  const allWeeks = Array.from(new Set((reports ?? []).map((r) => String(r.week || "Unscheduled")))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  const scopedReports = weekParam === "all" ? reports ?? [] : (reports ?? []).filter((r) => String(r.week || "Unscheduled") === weekParam);

  // Match a report's free-text `cm` to a manager's label tolerantly — a case/space difference
  // (e.g. profile name later edited) shouldn't detach a report from its card.
  const normName = (s: unknown) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const scopedManagers = cmParam === "all"
    ? communityManagers
    : communityManagers.filter((manager) => manager.id === cmParam || normName(manager.label) === normName(cmParam));

  const rows = scopedManagers.flatMap((manager) => {
    const managerReports = scopedReports.filter((r) => normName(r.cm) === normName(manager.label));
    const assignedTasks = (tasks ?? []).filter(
      (t) => t.assigned_to === manager.id || (!t.assigned_to && t.assigned_label === manager.label),
    );
    const openTasks = assignedTasks.filter((t) => !["Done", "Closed"].includes(String(t.status))).length;
    const overdueTasks = assignedTasks.filter(
      (t) => t.due_at && new Date(t.due_at).getTime() < Date.now() && !["Done", "Closed"].includes(String(t.status)),
    ).length;
    return managerReports.map((report) => ({
      manager,
      report,
      openTasks,
      overdueTasks,
      reportDone: Boolean(report.weekly_report_sent) || report.status === "Done",
    }));
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
            href={communityPath({ week: "all", cm: cmParam })}
            className={`inline-flex items-center rounded-xl border px-3 py-2 text-xs font-medium transition ${
              weekParam === "all" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            All weeks
          </Link>
          {allWeeks.map((weekLabel) => (
            <Link
              key={weekLabel}
              href={communityPath({ week: weekLabel, cm: cmParam })}
              className={`inline-flex items-center rounded-xl border px-3 py-2 text-xs font-medium transition ${
                weekParam === weekLabel ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {weekLabel}
            </Link>
          ))}
        </div>
      ) : null}

      {communityManagers.length ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href={communityPath({ week: weekParam, cm: "all" })}
            className={`inline-flex items-center rounded-xl border px-3 py-2 text-xs font-medium transition ${
              cmParam === "all" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            All community managers
          </Link>
          {communityManagers.map((manager) => (
            <Link
              key={manager.id}
              href={communityPath({ week: weekParam, cm: manager.id })}
              className={`inline-flex items-center rounded-xl border px-3 py-2 text-xs font-medium transition ${
                cmParam === manager.id ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {manager.label}
            </Link>
          ))}
        </div>
      ) : null}

      {rows.length ? (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">CM</th>
                  <th className="px-5 py-3 font-semibold">Week</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Silent</th>
                  <th className="px-5 py-3 font-semibold">Stuck</th>
                  <th className="px-5 py-3 font-semibold">Escalations</th>
                  <th className="px-5 py-3 font-semibold">Open tasks</th>
                  <th className="px-5 py-3 font-semibold">Updated</th>
                  <th className="px-5 py-3 font-semibold">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ manager, report, openTasks, overdueTasks, reportDone }) => {
                  const recordHref = `/records/community/${report.id}?cohort=${cohortId}${weekParam !== "all" ? `&week=${encodeURIComponent(weekParam)}` : ""}${cmParam !== "all" ? `&cm=${encodeURIComponent(cmParam)}` : ""}`;
                  return (
                  <tr key={report.id} className="group bg-white transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <Link href={recordHref} className="block">
                        <div className="font-medium text-slate-900">{manager.label}</div>
                        {overdueTasks > 0 ? <div className="mt-1 text-xs text-rose-600">{overdueTasks} overdue</div> : null}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-slate-700"><Link href={recordHref} className="block">{String(report.week || "Unscheduled")}</Link></td>
                    <td className="px-5 py-4"><Link href={recordHref} className="block"><Badge tone={reportDone ? "green" : "amber"}>{reportDone ? "Sent" : "Pending"}</Badge></Link></td>
                    <td className="px-5 py-4 text-slate-700"><Link href={recordHref} className="block">{Number(report.silent_students ?? 0)}</Link></td>
                    <td className="px-5 py-4 text-slate-700"><Link href={recordHref} className="block">{Number(report.stuck_students ?? 0)}</Link></td>
                    <td className="px-5 py-4 text-slate-700"><Link href={recordHref} className="block">{Number(report.escalations_raised ?? 0)}</Link></td>
                    <td className="px-5 py-4 text-slate-700"><Link href={recordHref} className="block">{openTasks}</Link></td>
                    <td className="px-5 py-4 text-slate-700"><Link href={recordHref} className="block">{report.updated_at ? new Date(report.updated_at).toLocaleDateString() : "—"}</Link></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={recordHref}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Open
                          <ArrowUpRight className="size-3.5" />
                        </Link>
                        {!isCm ? (
                          <form action={createCommunityReminderAction} className="inline-flex">
                            <input type="hidden" name="cohortId" value={cohortId ?? ""} />
                            <input type="hidden" name="cmLabel" value={manager.label} />
                            <input type="hidden" name="assignedTo" value={manager.id} />
                            <input type="hidden" name="sourceRecordId" value={report.id} />
                            <input type="hidden" name="returnTo" value={communityPath({ week: weekParam, cm: cmParam })} />
                            <SubmitButton pendingLabel="Sending…" size="sm">
                              <BellRing className="size-3.5" />
                              Remind
                            </SubmitButton>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : communityManagers.length ? (
        <Card className="p-6">
          <p className="font-semibold text-slate-950">No reports match this filter</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Team members are assigned to this cohort, but there are no CM report rows for the selected week or community manager filter yet.
          </p>
        </Card>
      ) : (
        <Card className="p-6">
            <p className="font-semibold text-slate-950">No community managers assigned</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a community manager account from Settings, assign the cohort, then share the temporary password.
            </p>
            <Link href="/settings" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-950">
              Open team access <ArrowUpRight className="size-4" />
            </Link>
        </Card>
      )}

    </div>
  );
}
