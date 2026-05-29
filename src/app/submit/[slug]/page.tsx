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
    <main className="relative min-h-screen overflow-hidden bg-[#fbfbfd] px-5 py-16 sm:py-24">
      {/* soft ambient wash — keeps the page calm and focused */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-slate-100/80 to-transparent" />

      <div className="relative mx-auto max-w-xl">
        <header className="text-center">
          <p className="text-[13px] font-medium uppercase tracking-[0.32em] text-slate-400">Morph by TNX</p>
          <h1 className="mt-4 text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-slate-900">
            Weekly task submission
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-slate-500">
            Share this week&apos;s work. A few thoughtful details help your team track progress and step
            in exactly where you need support.
          </p>
        </header>

        <div className="mt-12">
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
