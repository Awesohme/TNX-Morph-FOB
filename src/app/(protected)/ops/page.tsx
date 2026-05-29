import { ModuleDataPage } from "@/components/modules/module-data-page";

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort } = await searchParams;
  return <ModuleDataPage moduleKey="ops" requestedCohortId={cohort} />;
}
