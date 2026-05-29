import { ModuleDataPage } from "@/components/modules/module-data-page";

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort } = await searchParams;
  return <ModuleDataPage moduleKey="content" requestedCohortId={cohort} />;
}
