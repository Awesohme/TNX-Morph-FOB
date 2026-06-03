import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CohortSwitcher } from "@/components/cohort-switcher";
import { getScopedCohort } from "@/lib/cohorts";
import { createClient } from "@/lib/supabase/server";
import { CreateResourceModal } from "@/components/resources/create-resource-modal";
import { DeleteResourceButton } from "@/components/resources/delete-resource-button";
import { createSignedStorageUrl } from "@/lib/storage";

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string; view?: string }>;
}) {
  const { cohort: requestedCohortId, view } = await searchParams;
  const { cohorts, cohort, cohortId } = await getScopedCohort(requestedCohortId);
  const supabase = await createClient();
  const showArchived = view === "archived";

  // Show this cohort's resources plus any "all cohorts" resources (cohort_id is null).
  // Default view hides Archived; the archived view shows only Archived.
  const baseQuery = cohortId
    ? supabase.from("resources").select("*").or(`cohort_id.eq.${cohortId},cohort_id.is.null`)
    : supabase.from("resources").select("*").is("cohort_id", null);
  const { data: resources, error } = await (showArchived
    ? baseQuery.eq("status", "Archived")
    : baseQuery.neq("status", "Archived")
  ).order("created_at", { ascending: false });
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
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-sm font-medium">
            <a
              href={cohortId ? `/resources?cohort=${cohortId}` : "/resources"}
              className={`rounded-full px-4 py-1.5 transition ${showArchived ? "text-slate-500 hover:text-slate-900" : "bg-white text-slate-950 shadow-sm"}`}
            >
              Active
            </a>
            <a
              href={cohortId ? `/resources?cohort=${cohortId}&view=archived` : "/resources?view=archived"}
              className={`rounded-full px-4 py-1.5 transition ${showArchived ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              Archived
            </a>
          </div>
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
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <Badge tone="blue">{resource.resource_type}</Badge>
                {resource.resolved_file_url && resource.resource_type !== "File" ? <Badge tone="neutral">File</Badge> : null}
                {resource.url && resource.resource_type !== "Link" ? <Badge tone="neutral">Link</Badge> : null}
                <Badge tone={resource.status === "Active" ? "green" : resource.status === "Draft" ? "amber" : "neutral"}>{resource.status}</Badge>
                {resource.week_label ? <Badge>{resource.week_label}</Badge> : null}
                {!resource.cohort_id ? <Badge tone="blue">All cohorts</Badge> : null}
              </div>
              <div className="flex items-center gap-1">
                <CreateResourceModal
                  cohortId={cohortId ?? ""}
                  resource={{
                    id: resource.id,
                    title: resource.title,
                    resource_type: resource.resource_type,
                    week_label: resource.week_label,
                    owner_label: resource.owner_label,
                    url: resource.url,
                    file_url: resource.file_url,
                    notes: resource.notes,
                    status: resource.status,
                    cohort_id: resource.cohort_id,
                  }}
                />
                <DeleteResourceButton resourceId={resource.id} title={resource.title} />
              </div>
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
            <p className="text-sm text-muted-foreground">{showArchived ? "No archived resources." : "No resources saved for this cohort yet."}</p>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
