import { ModuleDataPage } from "@/components/modules/module-data-page";

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string; week?: string }>;
}) {
  const { cohort, week } = await searchParams;
  return <ModuleDataPage moduleKey="ops" requestedCohortId={cohort} enableWeekFilter activeWeek={week} />;
}
