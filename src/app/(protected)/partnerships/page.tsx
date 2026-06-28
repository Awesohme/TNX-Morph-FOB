import { ModuleDataPage } from "@/components/modules/module-data-page";

export default async function PartnershipsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return <ModuleDataPage moduleKey="partnerships" requestedCohortId={params.cohort} filterValues={params} />;
}
