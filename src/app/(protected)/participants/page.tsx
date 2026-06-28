import { ModuleDataPage } from "@/components/modules/module-data-page";

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return <ModuleDataPage moduleKey="participants" requestedCohortId={params.cohort} filterValues={params} />;
}
