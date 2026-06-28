import { ModuleDataPage } from "@/components/modules/module-data-page";

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return <ModuleDataPage moduleKey="ops" requestedCohortId={params.cohort} filterValues={params} />;
}
