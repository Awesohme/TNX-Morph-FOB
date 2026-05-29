import { ModuleDataPage } from "@/components/modules/module-data-page";

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort } = await searchParams;
  return <ModuleDataPage moduleKey="participants" requestedCohortId={cohort} />;
}
