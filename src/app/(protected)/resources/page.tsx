import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CohortSwitcher } from "@/components/cohort-switcher";
import { saveResourceAction } from "@/lib/actions/ops";
import { getScopedCohort } from "@/lib/cohorts";
import { resourceStatusOptions, resourceTypeOptions } from "@/lib/ops-constants";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur md:p-8">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resource library</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Resources</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Save reusable links, templates, recordings, and proof assets here, then attach them to records when they matter.
            </p>
          </div>
          <CohortSwitcher cohorts={cohorts} activeCohortId={cohortId} basePath="/resources" />
        </div>
      </section>

      {cohort ? (
        <Card>
          <CardHeader>
            <CardTitle>Add resource</CardTitle>
            <CardDescription>Everything here is cohort-scoped and searchable later.</CardDescription>
          </CardHeader>
          <form action={saveResourceAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="cohortId" value={cohort.id} />
            <input name="title" placeholder="Resource title" className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none" />
            <select name="resourceType" defaultValue="Link" className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none">
              {resourceTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input name="weekLabel" placeholder="Week label" className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none" />
            <input name="ownerLabel" placeholder="Owner" className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none" />
            <input name="url" placeholder="URL" className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none" />
            <input name="fileUrl" placeholder="File URL" className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none" />
            <select name="status" defaultValue="Active" className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none">
              {resourceStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input name="notes" placeholder="Notes" className="h-11 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm outline-none md:col-span-2" />
            <button type="submit" className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white md:col-span-2 md:justify-self-end">
              Save resource
            </button>
          </form>
        </Card>
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
        {(resources ?? []).map((resource) => (
          <Card key={resource.id} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">{resource.resource_type}</Badge>
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
              {resource.file_url ? <a href={resource.file_url} className="block text-slate-700 underline underline-offset-2">Open file</a> : null}
            </div>
          </Card>
        ))}
        {!resources?.length && !error ? (
          <Card>
            <p className="text-sm text-muted-foreground">No resources saved for this cohort yet.</p>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
