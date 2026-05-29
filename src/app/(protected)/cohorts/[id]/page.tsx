import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { saveCohortAction } from "@/lib/actions/ops";
import { createClient } from "@/lib/supabase/server";
import { withCohortParam } from "@/lib/cohorts";

async function countForCohort(table: string, cohortId: string) {
  const supabase = await createClient();
  const { count } = await supabase.from(table).select("*", { head: true, count: "exact" }).eq("cohort_id", cohortId);
  return count ?? 0;
}

export default async function CohortDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: cohort, error }, { data: planItems }, { data: memberships }, { data: resources }] = await Promise.all([
    supabase.from("cohorts").select("*").eq("id", id).maybeSingle(),
    supabase.from("cohort_plan_items").select("*").eq("cohort_id", id).order("sort_order", { ascending: true }),
    supabase
      .from("cohort_members")
      .select("id, role, profiles:user_id(full_name, email)")
      .eq("cohort_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("resources").select("id").eq("cohort_id", id),
  ]);

  if (error || !cohort) {
    throw new Error(error?.message ?? "Cohort not found.");
  }

  const [participants, reviews, tasks, cmReports] = await Promise.all([
    countForCohort("participants", id),
    countForCohort("assignment_reviews", id),
    countForCohort("tasks", id),
    countForCohort("cm_reports", id),
  ]);

  const workloadLinks = [
    { label: "Participants", href: withCohortParam("/participants", id), value: participants },
    { label: "Reviews", href: withCohortParam("/reviews", id), value: reviews },
    { label: "Tasks", href: withCohortParam("/tasks", id), value: tasks },
    { label: "CM reports", href: withCohortParam("/community", id), value: cmReports },
    { label: "Resources", href: withCohortParam("/resources", id), value: resources?.length ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur md:p-8">
        <Link href="/cohorts" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-slate-950">
          <ArrowLeft className="size-4" />
          Back to cohorts
        </Link>
        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Cohort workspace</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">{cohort.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{cohort.description || "No cohort description yet."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={cohort.status === "active" ? "green" : cohort.status === "planning" ? "amber" : "blue"}>{cohort.status}</Badge>
            <Badge>{cohort.slug}</Badge>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Edit cohort</CardTitle>
          <CardDescription>Keep metadata current so the rest of the app can scope work cleanly.</CardDescription>
        </CardHeader>
        <form action={saveCohortAction} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="cohortId" value={cohort.id} />
          <input name="name" defaultValue={cohort.name} placeholder="Cohort name" className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none" />
          <input name="slug" defaultValue={cohort.slug} placeholder="cohort-slug" className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none" />
          <input name="starts_on" type="date" defaultValue={cohort.starts_on ?? ""} className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none" />
          <input name="ends_on" type="date" defaultValue={cohort.ends_on ?? ""} className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none" />
          <select name="status" defaultValue={cohort.status} className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none">
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          <input name="description" defaultValue={cohort.description ?? ""} placeholder="Description" className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none" />
          <button type="submit" className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white md:col-span-2 md:justify-self-end">
            Save changes
          </button>
        </form>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {workloadLinks.map((item) => (
          <Link key={item.label} href={item.href}>
            <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-glow">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight">{item.value}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                Open
                <ArrowUpRight className="size-4" />
              </div>
            </Card>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Cohort plan</CardTitle>
            <CardDescription>The workbook-inspired week plan now lives inside the app.</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {(planItems ?? []).map((item) => (
              <div key={item.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="blue">{item.week_label}</Badge>
                  {item.session_type ? <Badge>{item.session_type}</Badge> : null}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-950">{item.theme || "Untitled week"}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.live_session_focus || "No session focus yet."}</p>
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="font-semibold text-slate-950">Student output</p>
                    <p className="text-muted-foreground">{item.student_output || "—"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">Async task</p>
                    <p className="text-muted-foreground">{item.async_task || "—"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">Owner / Support</p>
                    <p className="text-muted-foreground">{item.owner_label || "—"} / {item.support_label || "—"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">Risk / Mitigation</p>
                    <p className="text-muted-foreground">{item.risk || "—"} / {item.mitigation || "—"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cohort team</CardTitle>
            <CardDescription>Everyone currently assigned to this cohort.</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {(memberships ?? []).length ? (
              memberships?.map((membership) => {
                const profile = Array.isArray(membership.profiles) ? membership.profiles[0] : membership.profiles;
                return (
                  <div key={membership.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                    <p className="font-semibold text-slate-950">{profile?.full_name || profile?.email || "Unknown user"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{profile?.email || "No email available"}</p>
                    <Badge className="mt-3">{membership.role.replace("_", " ")}</Badge>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No team members assigned yet.</p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
