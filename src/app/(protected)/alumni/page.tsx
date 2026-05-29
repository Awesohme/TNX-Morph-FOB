import { ModuleDataPage } from "@/components/modules/module-data-page";
import { SyncAlumniButton } from "@/components/modules/sync-alumni-button";
import { getScopedCohort } from "@/lib/cohorts";

export default async function AlumniPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort } = await searchParams;
  const { cohortId } = await getScopedCohort(cohort);
  return (
    <div className="space-y-4">
      {cohortId ? (
        <div className="flex justify-end">
          <SyncAlumniButton cohortId={cohortId} />
        </div>
      ) : null}
      <ModuleDataPage moduleKey="alumni" requestedCohortId={cohort} />
    </div>
  );
}
