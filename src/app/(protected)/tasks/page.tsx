import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TasksWorkspace } from "@/components/workflow/tasks-workspace";
import { getCurrentUser } from "@/lib/auth";
import { getScopedCohort } from "@/lib/cohorts";
import { type WorkflowTaskRow } from "@/lib/workflow";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: requestedCohortId } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();
  const { cohorts, cohortId } = await getScopedCohort(requestedCohortId);
  const [{ data: tasks, error }, { data: profiles }] = await Promise.all([
    cohortId
      ? supabase.from("tasks").select("*").eq("cohort_id", cohortId).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase.from("profiles").select("id, full_name, email").eq("is_active", true).order("full_name", { ascending: true }),
  ]);

  const assignees = (profiles ?? []).map((profile) => ({
    id: profile.id,
    label: profile.full_name || profile.email || "Unknown user",
  }));

  if (error) {
    return (
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur md:p-8">
          <Badge tone="blue">Queue workspace</Badge>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">Operational task queue</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Run the workflow migration before using the task queue. The current environment has not loaded the workflow tables yet.
          </p>
        </section>
        <Card>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </Card>
      </div>
    );
  }

  return (
    <TasksWorkspace
      tasks={(tasks ?? []) as WorkflowTaskRow[]}
      cohorts={cohorts.map((cohort) => ({ id: cohort.id, name: cohort.name, status: cohort.status }))}
      activeCohortId={cohortId}
      currentUserId={user?.id ?? null}
      assignees={assignees}
    />
  );
}
