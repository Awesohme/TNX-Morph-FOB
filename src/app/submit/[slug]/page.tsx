import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubmissionForm } from "@/components/submissions/submission-form";

export const dynamic = "force-dynamic";

const WEEK_OPTIONS = [
  "Week 1 - Product Development Mindset, Ideation & Validation",
  "Week 2 - Validating an Idea",
  "Week 3 - UI/UX Design & Visual Interface Rules",
  "Week 4 - Tools, No-Code/AI Building & Capstone",
  "Week 5 - Demo Week",
];

export default async function PublicSubmitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: cohort } = await supabase
    .from("cohorts")
    .select("id, name, submissions_open")
    .eq("slug", slug)
    .maybeSingle();

  const participants = cohort
    ? (
        await supabase
          .from("participants")
          .select("id, full_name")
          .eq("cohort_id", cohort.id)
          .order("full_name", { ascending: true })
      ).data ?? []
    : [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbfbfd] px-5 pb-20">
      {/* TNX brand hero — dark navy with the logo, matching jointnx.org/morphcamp */}
      <div className="relative -mx-5 bg-[#070614] px-5 pb-24 pt-12 text-center sm:pb-28 sm:pt-16">
        <Image src="/tnx-logo.png" alt="TNX Solve" width={148} height={28} className="mx-auto h-7 w-auto" priority />
        <p className="mt-9 text-[12px] font-medium uppercase tracking-[0.32em] text-[#04A0FF]">Morph by TNX</p>
        <h1 className="mt-3 text-[2.4rem] font-semibold leading-[1.05] tracking-tight text-white sm:text-[2.7rem]">
          Weekly task submission
        </h1>
      </div>

      <div className="relative mx-auto -mt-16 max-w-xl">
          {!cohort ? (
            <CenteredCard title="Link not found" body="Please check the link your team shared with you." />
          ) : !cohort.submissions_open ? (
            <CenteredCard
              title="Submissions are closed"
              body={`The submission window for ${cohort.name} is closed right now. Reach out to your community manager if you think this is a mistake.`}
            />
          ) : (
            <SubmissionForm
              cohortSlug={slug}
              cohortName={cohort.name}
              participants={participants.map((participant) => ({
                id: participant.id,
                name: participant.full_name ?? "Unnamed participant",
              }))}
              weekOptions={WEEK_OPTIONS}
            />
          )}
      </div>
    </main>
  );
}

function CenteredCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[28px] border border-slate-200/70 bg-white p-10 text-center shadow-[0_1px_40px_-12px_rgba(15,23,42,0.12)]">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="mx-auto mt-3 max-w-sm text-[15px] leading-7 text-slate-500">{body}</p>
    </div>
  );
}
