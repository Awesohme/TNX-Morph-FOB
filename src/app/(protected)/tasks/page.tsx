import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TasksWorkspace } from "@/components/workflow/tasks-workspace";
import { type WorkflowTaskRow } from "@/lib/workflow";

export default async function TasksPage() {
  const supabase = await createClient();
  const [{ data: tasks, error }, { data: cohorts }] = await Promise.all([
    supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("cohorts").select("id, name, status").order("created_at", { ascending: true }),
  ]);

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

  return <TasksWorkspace tasks={(tasks ?? []) as WorkflowTaskRow[]} cohorts={cohorts ?? []} />;
}
