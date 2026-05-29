import { ModuleDataPage } from "@/components/modules/module-data-page";

export default async function RecruitmentPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort } = await searchParams;
  return <ModuleDataPage moduleKey="recruitment" requestedCohortId={cohort} />;
}
