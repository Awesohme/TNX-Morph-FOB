import Link from "next/link";
import { ArrowUpRight, Layers3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { CreateCohortModal } from "@/components/cohorts/create-cohort-modal";

async function countForCohort(table: string, cohortId: string) {
  const supabase = await createClient();
  const { count } = await supabase.from(table).select("*", { head: true, count: "exact" }).eq("cohort_id", cohortId);
  return count ?? 0;
}

async function countSubmittedActivities(cohortId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("assignment_reviews")
    .select("*", { head: true, count: "exact" })
    .eq("cohort_id", cohortId)
    .eq("submitted", true);
  return count ?? 0;
}

export default async function CohortsPage() {
  const supabase = await createClient();
  const [{ data: cohorts, error }, { data: profiles }] = await Promise.all([
    supabase
      .from("cohorts")
      .select("id, slug, name, description, starts_on, ends_on, status")
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("is_active", true)
      .order("full_name", { ascending: true }),
  ]);

  const cohortCards = await Promise.all(
    (cohorts ?? []).map(async (cohort) => ({
      ...cohort,
      participants: await countForCohort("participants", cohort.id),
      submittedActivities: await countSubmittedActivities(cohort.id),
      tasks: await countForCohort("tasks", cohort.id),
      cmReports: await countForCohort("cm_reports", cohort.id),
      resources: await countForCohort("resources", cohort.id).catch(() => 0),
    })),
  );

  return (
    <div className="space-y-6">
      <section className="app-panel p-6 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Cohort control</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Cohorts</h1>
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

      <div className="flex justify-end">
        <CreateCohortModal
          profiles={(profiles ?? []).map((profile) => ({
            id: profile.id,
            label: profile.full_name || profile.email || "Unknown user",
            role: profile.role,
          }))}
        />
      </div>

      {error ? (
        <Card>
          <p className="text-sm text-rose-700">{error.message}</p>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cohortCards.map((cohort) => (
          <Link key={cohort.id} href={`/cohorts/${cohort.id}`}>
            <Card className="h-full transition hover:border-slate-300 hover:bg-slate-50">
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
                  <p className="text-muted-foreground">Submitted activities</p>
                  <p className="mt-1 text-2xl font-semibold">{cohort.submittedActivities}</p>
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
