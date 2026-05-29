import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CohortSwitcher } from "@/components/cohort-switcher";
import { getScopedCohort } from "@/lib/cohorts";
import { createClient } from "@/lib/supabase/server";
import { CreateResourceModal } from "@/components/resources/create-resource-modal";
import { createSignedStorageUrl } from "@/lib/storage";

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: requestedCohortId } = await searchParams;
  const { cohorts, cohort, cohortId } = await getScopedCohort(requestedCohortId);
  const supabase = await createClient();

  const { data: resources, error } = cohortId
    ? await supabase.from("resources").select("*").eq("cohort_id", cohortId).order("created_at", { ascending: false })
    : { data: [], error: null };
  const resolvedResources = await Promise.all(
    (resources ?? []).map(async (resource) => ({
      ...resource,
      resolved_file_url:
        (await createSignedStorageUrl(resource.storage_bucket, resource.storage_path)) ??
        resource.file_url,
    })),
  );

  return (
    <div className="space-y-6">
      <section className="app-panel p-6 md:p-7">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Resource library</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Resources</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Save reusable links, templates, recordings, and proof assets here, then attach them to records when they matter.
            </p>
          </div>
          <CohortSwitcher cohorts={cohorts} activeCohortId={cohortId} basePath="/resources" />
        </div>
      </section>

      {cohort ? (
        <div className="flex justify-end">
          <CreateResourceModal cohortId={cohort.id} />
        </div>
      ) : (
        <Card>
          <p className="text-sm text-muted-foreground">Create a cohort before adding resources.</p>
        </Card>
      )}

      {error ? (
        <Card>
          <p className="text-sm text-rose-700">{error.message}</p>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {resolvedResources.map((resource) => (
          <Card key={resource.id} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">{resource.resource_type}</Badge>
              {resource.resolved_file_url ? <Badge tone="neutral">File</Badge> : null}
              {resource.url ? <Badge tone="neutral">Link</Badge> : null}
              <Badge tone={resource.status === "Active" ? "green" : resource.status === "Draft" ? "amber" : "neutral"}>{resource.status}</Badge>
              {resource.week_label ? <Badge>{resource.week_label}</Badge> : null}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">{resource.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{resource.notes || "No notes yet."}</p>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Owner: {resource.owner_label || "Unassigned"}</p>
              {resource.url ? <a href={resource.url} className="block text-slate-700 underline underline-offset-2">Open URL</a> : null}
              {resource.resolved_file_url ? <a href={resource.resolved_file_url} className="block text-slate-700 underline underline-offset-2">Open file</a> : null}
            </div>
          </Card>
        ))}
        {!resolvedResources.length && !error ? (
          <Card>
            <p className="text-sm text-muted-foreground">No resources saved for this cohort yet.</p>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
