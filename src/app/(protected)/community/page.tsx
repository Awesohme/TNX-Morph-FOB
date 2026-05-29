import Link from "next/link";
import { ArrowUpRight, BellRing, MessageCircleWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CohortSwitcher } from "@/components/cohort-switcher";
import { createCommunityReminderAction } from "@/lib/actions/ops";
import { getScopedCohort, withCohortParam } from "@/lib/cohorts";
import { createClient } from "@/lib/supabase/server";

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: requestedCohortId } = await searchParams;
  const { cohorts, cohort, cohortId } = await getScopedCohort(requestedCohortId);
  const supabase = await createClient();

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
    .filter((membership) => membership.role === "community_manager")
    .map((membership) => {
      const profile = Array.isArray(membership.profiles) ? membership.profiles[0] : membership.profiles;
      return {
        id: membership.user_id,
        label: profile?.full_name || profile?.email || "Unknown user",
      };
    });

  const cards = communityManagers.map((manager) => {
    const managerReports = (reports ?? []).filter((report) => report.cm === manager.label);
    const latestReport = managerReports[0] ?? null;
    const assignedTasks = (tasks ?? []).filter(
      (task) => task.assigned_to === manager.id || (!task.assigned_to && task.assigned_label === manager.label),
    );
    const overdueTasks = assignedTasks.filter(
      (task) => task.due_at && new Date(task.due_at).getTime() < Date.now() && !["Done", "Closed"].includes(String(task.status)),
    );
    return {
      manager,
      latestReport,
      openTasks: assignedTasks.filter((task) => !["Done", "Closed"].includes(String(task.status))).length,
      overdueTasks: overdueTasks.length,
      reportDone: latestReport ? latestReport.status === "Done" : false,
    };
  });

  return (
    <div className="space-y-6">
      <section className="app-panel p-6 md:p-7">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">CM oversight</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Community managers</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Track weekly reports, silent and stuck learner counts, escalations, and follow-up workload for each community manager.
            </p>
          </div>
          <CohortSwitcher cohorts={cohorts.map((item) => ({ id: item.id, name: item.name }))} activeCohortId={cohortId} basePath="/community" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.manager.id} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{card.manager.label}</h2>
                <p className="text-sm text-muted-foreground">Community manager</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={card.reportDone ? "green" : "amber"}>{card.reportDone ? "Report done" : "Report pending"}</Badge>
                {card.overdueTasks ? <Badge tone="red">{card.overdueTasks} overdue</Badge> : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Open tasks</p>
                <p className="mt-1 text-2xl font-semibold">{card.openTasks}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Escalations</p>
                <p className="mt-1 text-2xl font-semibold">{Number(card.latestReport?.escalations_raised ?? 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Silent students</p>
                <p className="mt-1 text-2xl font-semibold">{Number(card.latestReport?.silent_students ?? 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Stuck students</p>
                <p className="mt-1 text-2xl font-semibold">{Number(card.latestReport?.stuck_students ?? 0)}</p>
              </div>
            </div>

            {card.latestReport ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm">
                <p className="font-semibold text-slate-950">Latest report</p>
                <p className="mt-1 text-muted-foreground">{card.latestReport.week || "No week label"} · updated {new Date(card.latestReport.updated_at).toLocaleDateString()}</p>
                <p className="mt-3 text-muted-foreground">{card.latestReport.next_actions || card.latestReport.key_concerns || "No notes recorded yet."}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-muted-foreground">
                No CM report yet for this manager in the selected cohort.
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {card.latestReport ? (
                <Link
                  href={`/records/community/${card.latestReport.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Open latest report
                  <ArrowUpRight className="size-4" />
                </Link>
              ) : null}
              <form action={createCommunityReminderAction} className="inline-flex">
                <input type="hidden" name="cohortId" value={cohortId ?? ""} />
                <input type="hidden" name="cmLabel" value={card.manager.label} />
                <input type="hidden" name="assignedTo" value={card.manager.id} />
                <input type="hidden" name="sourceRecordId" value={card.latestReport?.id ?? ""} />
                <input type="hidden" name="returnTo" value={withCohortParam("/community", cohortId)} />
                <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white">
                  <BellRing className="size-4" />
                  Remind CM
                </button>
              </form>
            </div>
          </Card>
        ))}

        {!cards.length ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardHeader>
              <CardTitle>No community managers assigned</CardTitle>
              <CardDescription>
                Community managers are added manually for now. Ask them to sign in once, then activate them and assign the cohort from Settings.
              </CardDescription>
            </CardHeader>
            <Link href="/settings" className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-950">
              Open team access
              <ArrowUpRight className="size-4" />
            </Link>
          </Card>
        ) : null}
      </section>

      {cohort ? (
        <Card>
          <CardHeader>
            <CardTitle>Open the full report tracker</CardTitle>
            <CardDescription>Use the record workspace when you need the full CM report table or detailed edit forms.</CardDescription>
          </CardHeader>
          <Link href={withCohortParam("/records/community/new", cohortId)} className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <MessageCircleWarning className="size-4" />
            Create CM report
          </Link>
        </Card>
      ) : null}
    </div>
  );
}
