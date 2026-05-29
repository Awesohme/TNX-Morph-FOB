import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock3, Flame, Gauge, ListTodo, TriangleAlert, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CohortSwitcher } from "@/components/cohort-switcher";
import { getScopedCohort, withCohortParam } from "@/lib/cohorts";
import { createClient } from "@/lib/supabase/server";

async function countRows(table: string, cohortId: string, filter?: { column: string; value: string | boolean }) {
  const supabase = await createClient();
  let query = supabase.from(table).select("*", { count: "exact", head: true }).eq("cohort_id", cohortId);
  if (filter) query = query.eq(filter.column, filter.value);
  const { count } = await query;
  return count ?? 0;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: requestedCohortId } = await searchParams;
  const { cohorts, cohort, cohortId } = await getScopedCohort(requestedCohortId);

  if (!cohort || !cohortId) {
    return (
      <div className="space-y-6">
        <section className="app-panel p-6 md:p-8">
          <Badge tone="amber">No cohort selected</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Create a cohort to begin</h1>
        </section>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: tasks }, { data: cmReports }, { data: reviews }, { data: participants }] = await Promise.all([
    supabase.from("tasks").select("id, title, status, priority, due_at, source_record_type, source_record_id").eq("cohort_id", cohortId).order("created_at", { ascending: false }),
    supabase.from("cm_reports").select("id, cm, week, status, escalations_raised, updated_at").eq("cohort_id", cohortId).order("updated_at", { ascending: false }),
    supabase.from("assignment_reviews").select("id, assignment, review_status, review_due, participant_name").eq("cohort_id", cohortId).order("review_due", { ascending: true }),
    supabase.from("participants").select("id, full_name, risk, next_action").eq("cohort_id", cohortId).order("updated_at", { ascending: false }),
  ]);

  const [participantCount, redRisk, blockedTasks, sessionBacklog, resourceCount] = await Promise.all([
    countRows("participants", cohortId),
    countRows("participants", cohortId, { column: "risk", value: "Red" }),
    countRows("weekly_ops_tasks", cohortId, { column: "status", value: "Blocked" }),
    countRows("session_readiness", cohortId, { column: "support_assigned", value: "" }),
    countRows("resources", cohortId).catch(() => 0),
  ]);

  const taskRows = tasks ?? [];
  const reportRows = cmReports ?? [];
  const reviewRows = reviews ?? [];
  const participantRows = participants ?? [];
  const openTasks = taskRows.filter((task) => task.status === "Open").length;
  const overdueTasks = taskRows.filter((task) => task.due_at && new Date(task.due_at).getTime() < Date.now() && !["Done", "Closed"].includes(String(task.status))).length;
  const reviewBacklog = reviewRows.filter((review) => !["Feedback Sent", "Closed"].includes(String(review.review_status))).length;
  const cmEscalations = reportRows.reduce((sum, report) => sum + Number(report.escalations_raised ?? 0), 0);
  const currentWeek = reportRows[0]?.week ? String(reportRows[0].week) : "Week 1";
  const cmReportNotDone = reportRows.filter((report) => report.week === currentWeek && report.status !== "Done").length;

  const metrics = [
    { label: "Participants", value: participantCount, icon: Users, note: "Scoped to active cohort" },
    { label: "Red risk", value: redRisk, icon: Flame, note: "Participants needing intervention" },
    { label: "Open tasks", value: openTasks, icon: ListTodo, note: "Follow-up items still open" },
    { label: "Resources", value: resourceCount, icon: CheckCircle2, note: "Saved templates, links, and assets" },
  ];

  const attention = [
    ...taskRows
      .filter((task) => task.due_at && new Date(task.due_at).getTime() < Date.now() && !["Done", "Closed"].includes(task.status))
      .slice(0, 3)
      .map((task) => ({
        title: task.title,
        href: withCohortParam("/tasks", cohortId),
        label: "Overdue task",
      })),
    ...participantRows
      .filter((participant) => participant.risk === "Red")
      .slice(0, 2)
      .map((participant) => ({
        title: participant.full_name || "At-risk participant",
        href: withCohortParam("/participants", cohortId),
        label: "Red-risk participant",
      })),
    ...reviewRows
      .filter((review) => !["Feedback Sent", "Closed"].includes(String(review.review_status)))
      .slice(0, 2)
      .map((review) => ({
        title: `${review.assignment} · ${review.participant_name || "Unassigned learner"}`,
        href: withCohortParam("/reviews", cohortId),
        label: "Review backlog",
      })),
  ];

  const queues = [
    { label: "Reviews due", value: reviewBacklog, href: withCohortParam("/reviews", cohortId), icon: Gauge, note: "Pending review and resubmission work" },
    { label: "CM reports not done", value: cmReportNotDone, href: withCohortParam("/community", cohortId), icon: CheckCircle2, note: "Current week reports still incomplete" },
    { label: "Blocked ops", value: blockedTasks, href: withCohortParam("/ops", cohortId), icon: TriangleAlert, note: "Weekly delivery items currently blocked" },
    { label: "Session gaps", value: sessionBacklog, href: withCohortParam("/sessions", cohortId), icon: Clock3, note: "Sessions missing support assignment" },
    { label: "CM escalations", value: cmEscalations, href: withCohortParam("/community", cohortId), icon: Flame, note: "Escalations raised in CM reporting" },
    { label: "Overdue tasks", value: overdueTasks, href: withCohortParam("/tasks", cohortId), icon: ListTodo, note: "Tasks already past due date" },
  ];

  return (
    <div className="space-y-6">
      <section className="app-panel overflow-hidden p-6 md:p-7">
        <div className="grid gap-6 md:grid-cols-[1.15fr_0.85fr]">
          <div>
            <Badge tone="blue" className="mb-4">Operational dashboard</Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">{cohort.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Review participant risk, CM coverage, follow-ups, and blocked delivery items from one cohort-scoped control surface.
            </p>
            <div className="mt-4">
              <CohortSwitcher cohorts={cohorts.map((item) => ({ id: item.id, name: item.name }))} activeCohortId={cohortId} basePath="/dashboard" />
            </div>
          </div>
          <div className="app-panel-subtle p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Today&apos;s attention</p>
                <p className="text-xs text-slate-500">The next few things worth opening.</p>
              </div>
              <Badge>{attention.length}</Badge>
            </div>
            <div className="mt-4 space-y-2.5">
              {attention.length ? (
                attention.map((item, index) => (
                  <Link key={`${item.title}-${index}`} href={item.href} className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 transition hover:border-slate-300 hover:bg-slate-50">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                    <p className="mt-1.5 text-sm font-medium">{item.title}</p>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">No urgent items right now.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{metric.value}</p>
                <p className="mt-2 text-xs text-muted-foreground">{metric.note}</p>
              </div>
              <div className="grid size-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <metric.icon className="size-4" />
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Operational queues</h2>
          <p className="text-sm text-muted-foreground">Priority entry points for this cohort&apos;s live work.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {queues.map((queue) => (
            <Link key={queue.label} href={queue.href}>
              <Card className="h-full transition hover:border-slate-300 hover:bg-slate-50">
                <CardHeader>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="grid size-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                      <queue.icon className="size-4" />
                    </div>
                    <ArrowUpRight className="size-4 text-muted-foreground" />
                  </div>
                  <CardTitle>{queue.label}</CardTitle>
                  <CardDescription>{queue.note}</CardDescription>
                  <p className="pt-2 text-3xl font-semibold tracking-tight text-slate-950">{queue.value}</p>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
