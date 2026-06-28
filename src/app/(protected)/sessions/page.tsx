import { ModuleDataPage } from "@/components/modules/module-data-page";

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return <ModuleDataPage moduleKey="sessions" requestedCohortId={params.cohort} filterValues={params} />;
}
