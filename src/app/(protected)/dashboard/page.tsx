import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Flame, Gauge, Users } from "lucide-react";
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
  const [
    participants,
    accepted,
    redRisk,
    mvpCompleted,
    reviewBacklog,
    blockedTasks,
    contentPending,
    alumniCount,
  ] = await Promise.all([
    countRows("participants"),
    countRows("participants", { column: "accepted", value: true }),
    countRows("participants", { column: "risk", value: "Red" }),
    countRows("participants", { column: "mvp_status", value: "Completed" }),
    countRows("assignment_reviews", { column: "review_status", value: "Not Reviewed" }),
    countRows("weekly_ops_tasks", { column: "status", value: "Blocked" }),
    countRows("content_items", { column: "status", value: "Not Started" }),
    countRows("alumni"),
  ]);

  const metrics = [
    { label: "Participants", value: participants, icon: Users, note: `${accepted} accepted` },
    { label: "MVP Completed", value: mvpCompleted, icon: CheckCircle2, note: "Participants with completed MVP status" },
    { label: "Red Risk", value: redRisk, icon: Flame, note: "Participants flagged as high risk" },
    { label: "Review Backlog", value: reviewBacklog, icon: Gauge, note: "Assignments awaiting review" },
  ];

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 text-white shadow-glow">
        <div className="grid gap-8 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8">
          <div>
            <Badge className="mb-5 bg-white/10 text-white">Operations overview</Badge>
            <h1 className="font-display text-4xl font-semibold tracking-tight md:text-6xl">
              Cohort operations dashboard
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/68">
              Monitor participant activity, delivery readiness, review backlog, content work, and alumni follow-up from a single control surface.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/8 p-5">
            <p className="text-sm text-white/55">Operational summary</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-white p-4 text-slate-950">
                <p className="text-3xl font-semibold">{blockedTasks}</p>
                <p className="text-xs text-slate-500">Blocked tasks</p>
              </div>
              <div className="rounded-3xl bg-white p-4 text-slate-950">
                <p className="text-3xl font-semibold">{contentPending}</p>
                <p className="text-xs text-slate-500">Content pending</p>
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
