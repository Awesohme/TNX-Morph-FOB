import { ModuleDataPage } from "@/components/modules/module-data-page";
import { SyncAlumniButton } from "@/components/modules/sync-alumni-button";
import { getScopedCohort } from "@/lib/cohorts";

export default async function AlumniPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { cohortId } = await getScopedCohort(params.cohort);
  return (
    <div className="space-y-4">
      {cohortId ? (
        <div className="flex justify-end">
          <SyncAlumniButton cohortId={cohortId} />
        </div>
      ) : null}
      <ModuleDataPage moduleKey="alumni" requestedCohortId={params.cohort} filterValues={params} />
    </div>
  );
}
