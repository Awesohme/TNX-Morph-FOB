import { ModuleDataPage } from "@/components/modules/module-data-page";

export default async function PartnershipsPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort } = await searchParams;
  return <ModuleDataPage moduleKey="partnerships" requestedCohortId={cohort} />;
}
