import Link from "next/link";
import { ArrowUpRight, Layers3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { saveCohortAction } from "@/lib/actions/ops";
import { createClient } from "@/lib/supabase/server";

async function countForCohort(table: string, cohortId: string) {
  const supabase = await createClient();
  const { count } = await supabase.from(table).select("*", { head: true, count: "exact" }).eq("cohort_id", cohortId);
  return count ?? 0;
}

export default async function CohortsPage() {
  const supabase = await createClient();
  const { data: cohorts, error } = await supabase
    .from("cohorts")
    .select("id, slug, name, description, starts_on, ends_on, status")
    .order("created_at", { ascending: true });

  const cohortCards = await Promise.all(
    (cohorts ?? []).map(async (cohort) => ({
      ...cohort,
      participants: await countForCohort("participants", cohort.id),
      reviews: await countForCohort("assignment_reviews", cohort.id),
      tasks: await countForCohort("tasks", cohort.id),
      cmReports: await countForCohort("cm_reports", cohort.id),
      resources: await countForCohort("resources", cohort.id).catch(() => 0),
    })),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Cohort control</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Cohorts</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Manage cohort metadata, check workload at a glance, and open each cohort as its own operating surface.
            </p>
          </div>
          <Badge tone="blue">
            <Layers3 className="mr-1 size-3" />
            {cohortCards.length} cohort{cohortCards.length === 1 ? "" : "s"}
          </Badge>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Create cohort</CardTitle>
          <CardDescription>Add a new cohort without touching the old workbook flow.</CardDescription>
        </CardHeader>
        <form action={saveCohortAction} className="grid gap-3 md:grid-cols-2">
          <input name="name" placeholder="Cohort name" className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none" />
          <input name="slug" placeholder="cohort-slug" className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none" />
          <input name="starts_on" type="date" className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none" />
          <input name="ends_on" type="date" className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none" />
          <select name="status" defaultValue="planning" className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none">
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          <input name="description" placeholder="Description" className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none" />
          <button type="submit" className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white md:col-span-2 md:justify-self-end">
            Save cohort
          </button>
        </form>
      </Card>

      {error ? (
        <Card>
          <p className="text-sm text-rose-700">{error.message}</p>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cohortCards.map((cohort) => (
          <Link key={cohort.id} href={`/cohorts/${cohort.id}`}>
            <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-glow">
              <CardHeader>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge tone={cohort.status === "active" ? "green" : cohort.status === "planning" ? "amber" : "blue"}>{cohort.status}</Badge>
                  <Badge>{cohort.slug}</Badge>
                </div>
                <CardTitle className="flex items-center justify-between gap-4">
                  <span>{cohort.name}</span>
                  <ArrowUpRight className="size-4 text-muted-foreground" />
                </CardTitle>
                <CardDescription>{cohort.description || "No description yet."}</CardDescription>
              </CardHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Participants</p>
                  <p className="mt-1 text-2xl font-semibold">{cohort.participants}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reviews</p>
                  <p className="mt-1 text-2xl font-semibold">{cohort.reviews}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tasks</p>
                  <p className="mt-1 text-2xl font-semibold">{cohort.tasks}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Resources</p>
                  <p className="mt-1 text-2xl font-semibold">{cohort.resources}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
