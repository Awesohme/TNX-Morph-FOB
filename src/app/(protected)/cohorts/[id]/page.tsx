import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { saveCohortAction } from "@/lib/actions/ops";
import { createClient } from "@/lib/supabase/server";
import { withCohortParam } from "@/lib/cohorts";
import { SaveCohortButton } from "@/components/cohorts/save-cohort-button";
import { CohortPlanEditor, type PlanItem } from "@/components/cohorts/cohort-plan-editor";
import { IconModalButton } from "@/components/ui/icon-modal-button";
import { RequiredLabel } from "@/components/ui/required-indicator";

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

  const [participants, submittedActivities, tasks, cmReports] = await Promise.all([
    countForCohort("participants", id),
    countSubmittedActivities(id),
    countForCohort("tasks", id),
    countForCohort("cm_reports", id),
  ]);

  const workloadLinks = [
    { label: "Participants", href: withCohortParam("/participants", id), value: participants },
    { label: "Submitted activities", href: withCohortParam("/activities", id), value: submittedActivities },
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
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Cohort workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{cohort.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{cohort.description || "No cohort description yet."}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={cohort.status === "active" ? "green" : cohort.status === "planning" ? "amber" : "blue"}>{cohort.status}</Badge>
            <Badge>{cohort.slug}</Badge>
            <IconModalButton
              label="Edit cohort details"
              title="Edit cohort details"
              description="Update dates, status, and metadata only when needed."
            >
              <form action={saveCohortAction} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="cohortId" value={cohort.id} />
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  <RequiredLabel>Cohort name</RequiredLabel>
                  <input name="name" required aria-required="true" defaultValue={cohort.name} className="app-input h-11" />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  <RequiredLabel>Cohort slug</RequiredLabel>
                  <input name="slug" required aria-required="true" defaultValue={cohort.slug} placeholder="cohort-slug" className="app-input h-11" />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  <span>Start date</span>
                  <input name="starts_on" type="date" defaultValue={cohort.starts_on ?? ""} className="app-input h-11" />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  <span>End date</span>
                  <input name="ends_on" type="date" defaultValue={cohort.ends_on ?? ""} className="app-input h-11" />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  <span>Status</span>
                  <select name="status" defaultValue={cohort.status} className="app-select h-11">
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  <span>Description</span>
                  <input name="description" defaultValue={cohort.description ?? ""} className="app-input h-11" />
                </label>
                <div className="flex justify-end md:col-span-2">
                  <SaveCohortButton />
                </div>
              </form>
            </IconModalButton>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {workloadLinks.map((item) => (
          <Link key={item.label} href={item.href}>
            <Card className="h-full transition hover:border-slate-300 hover:bg-slate-50">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{item.value}</p>
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
            <CardDescription>Edit each week, or add and remove weeks.</CardDescription>
          </CardHeader>
          <CohortPlanEditor cohortId={cohort.id} items={(planItems ?? []) as PlanItem[]} />
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Cohort team</CardTitle>
              <CardDescription>Everyone currently assigned to this cohort.</CardDescription>
            </div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Assign team
              <ArrowUpRight className="size-4" />
            </Link>
          </CardHeader>
          <div className="space-y-3">
            {(memberships ?? []).length ? (
              memberships?.map((membership) => {
                const profile = Array.isArray(membership.profiles) ? membership.profiles[0] : membership.profiles;
                return (
                  <div key={membership.id} className="rounded-2xl border border-slate-200 bg-white p-4">
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
