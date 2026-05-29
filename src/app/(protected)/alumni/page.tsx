import { ModuleDataPage } from "@/components/modules/module-data-page";

export default async function AlumniPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort } = await searchParams;
  return <ModuleDataPage moduleKey="alumni" requestedCohortId={cohort} />;
}
