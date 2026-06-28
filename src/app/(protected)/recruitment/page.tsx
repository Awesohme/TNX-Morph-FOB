import { ModuleDataPage } from "@/components/modules/module-data-page";

export default async function RecruitmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return <ModuleDataPage moduleKey="recruitment" requestedCohortId={params.cohort} filterValues={params} />;
}
