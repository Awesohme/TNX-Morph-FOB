import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock3, Flame, Gauge, ListTodo, TriangleAlert, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { modules } from "@/lib/modules";

async function countRows(table: string, filter?: { column: string; value: string | boolean }) {
  const supabase = await createClient();
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) query = query.eq(filter.column, filter.value);
  const { count } = await query;
  return count ?? 0;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const [{ data: tasks }, participants, redRisk, reviewBacklog, blockedTasks, sessionBacklog, openContent, alumniCount] = await Promise.all([
    supabase.from("tasks").select("id, status, priority, due_at, assigned_label").order("created_at", { ascending: false }),
    countRows("participants"),
    countRows("participants", { column: "risk", value: "Red" }),
    countRows("assignment_reviews", { column: "review_status", value: "Not Reviewed" }),
    countRows("weekly_ops_tasks", { column: "status", value: "Blocked" }),
    countRows("session_readiness", { column: "support_assigned", value: "" }),
    countRows("content_items", { column: "status", value: "Not Started" }),
    countRows("alumni"),
  ]);

  const taskRows = tasks ?? [];
  const openTasks = taskRows.filter((task) => task.status === "Open").length;
  const inProgressTasks = taskRows.filter((task) => task.status === "In Progress").length;
  const overdueTasks = taskRows.filter((task) => task.due_at && new Date(task.due_at).getTime() < Date.now() && !["Done", "Closed"].includes(String(task.status))).length;

  const metrics = [
    { label: "Participants", value: participants, icon: Users, note: "All participant records" },
    { label: "Open tasks", value: openTasks, icon: ListTodo, note: "Follow-up items not yet started" },
    { label: "Review backlog", value: reviewBacklog, icon: Gauge, note: "Assignment reviews awaiting action" },
    { label: "Red risk", value: redRisk, icon: Flame, note: "Participants marked as high risk" },
  ];

  const queues = [
    { label: "My tasks", value: taskRows.filter((task) => task.assigned_label).length, href: "/tasks", icon: CheckCircle2, note: "Assigned operational tasks" },
    { label: "Needs review", value: reviewBacklog, href: "/reviews", icon: Gauge, note: "Unreviewed submissions" },
    { label: "Overdue", value: overdueTasks, href: "/tasks", icon: Clock3, note: "Tasks past their due date" },
    { label: "Ready for outreach", value: openContent, href: "/content", icon: ArrowUpRight, note: "Content items still awaiting execution" },
    { label: "Blocked ops", value: blockedTasks, href: "/ops", icon: TriangleAlert, note: "Weekly tasks currently blocked" },
    { label: "Session gaps", value: sessionBacklog, href: "/sessions", icon: CheckCircle2, note: "Session records missing support assignment" },
  ];

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 text-white shadow-glow">
        <div className="grid gap-8 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8">
          <div>
            <Badge className="mb-5 bg-white/10 text-white">Operational dashboard</Badge>
            <h1 className="font-display text-4xl font-semibold tracking-tight md:text-6xl">Cohort control dashboard</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/68">
              Review workload, participant risk, blocked delivery items, and follow-up volume from a single operational surface.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/8 p-5">
            <p className="text-sm text-white/55">Queue summary</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-white p-4 text-slate-950">
                <p className="text-3xl font-semibold">{inProgressTasks}</p>
                <p className="text-xs text-slate-500">In progress</p>
              </div>
              <div className="rounded-3xl bg-white p-4 text-slate-950">
                <p className="text-3xl font-semibold">{blockedTasks}</p>
                <p className="text-xs text-slate-500">Blocked ops</p>
              </div>
              <div className="col-span-2 rounded-3xl bg-teal-300 p-4 text-slate-950">
                <p className="text-3xl font-semibold">{alumniCount}</p>
                <p className="text-xs font-medium">Alumni records</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight">{metric.value}</p>
                <p className="mt-2 text-xs text-muted-foreground">{metric.note}</p>
              </div>
              <div className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-white">
                <metric.icon className="size-5" />
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">Operational queues</h2>
            <p className="text-sm text-muted-foreground">Priority entry points for the current cohort workload.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {queues.map((queue) => (
            <Link key={queue.label} href={queue.href}>
              <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-glow">
                <CardHeader>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-white">
                      <queue.icon className="size-5" />
                    </div>
                    <ArrowUpRight className="size-4 text-muted-foreground" />
                  </div>
                  <CardTitle>{queue.label}</CardTitle>
                  <CardDescription>{queue.note}</CardDescription>
                  <p className="pt-2 text-4xl font-semibold tracking-tight text-slate-950">{queue.value}</p>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {modules.map((moduleItem) => (
          <Link key={moduleItem.key} href={moduleItem.route}>
            <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-glow">
              <CardHeader>
                <div className={`mb-4 grid size-11 place-items-center rounded-2xl bg-gradient-to-br ${moduleItem.accent} text-white`}>
                  <moduleItem.icon className="size-5" />
                </div>
                <CardTitle className="flex items-center justify-between">
                  {moduleItem.title}
                  <ArrowUpRight className="size-4 text-muted-foreground" />
                </CardTitle>
                <CardDescription>{moduleItem.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
