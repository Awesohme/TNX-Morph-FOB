import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { cohortWeekThemeTitle } from "@/lib/cohort-weeks";
import { getParticipantDisplayName } from "@/lib/participants";
import { isSubmissionsOpen } from "@/lib/submission-config";
import { resolvePublicCohort } from "@/lib/public-cohorts";
import { SubmissionForm } from "@/components/submissions/submission-form";

export const dynamic = "force-dynamic";

export default async function PublicSubmitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createAdminClient();

  type SubmitCohort = {
    id: string;
    slug: string;
    name: string;
    week_count?: number | null;
    submission_week?: string | null;
    submission_label?: string | null;
    submissions_open?: boolean | null;
    submissions_opens_at?: string | null;
    submissions_closes_at?: string | null;
  };
  let cohort: SubmitCohort | null = null;
  let participants: Array<{ id: string; full_name: string | null }> = [];
  let activeWeekLabel = "";
  let loadError = false;

  try {
    cohort = await resolvePublicCohort<SubmitCohort>(
      supabase,
      slug,
      "id, slug, name, week_count, submission_week, submission_label",
    );

    if (cohort) {
      const [{ data: windowConfig }, { data: planRows }] = await Promise.all([
        supabase
          .from("cohorts")
          .select("submissions_open, submissions_opens_at, submissions_closes_at, submission_week, submission_label")
          .eq("id", cohort.id)
          .maybeSingle(),
        supabase
          .from("cohort_plan_items")
          .select("week_label, sort_order, theme, assignment_label")
          .eq("cohort_id", cohort.id)
          .order("sort_order", { ascending: true }),
      ]);
      cohort = {
        ...cohort,
        // A failed settings lookup must never expose a submission form by default.
        submissions_open: windowConfig?.submissions_open ?? false,
        submissions_opens_at: windowConfig?.submissions_opens_at ?? null,
        submissions_closes_at: windowConfig?.submissions_closes_at ?? null,
        submission_week: windowConfig?.submission_week ?? cohort.submission_week ?? null,
        submission_label: windowConfig?.submission_label ?? cohort.submission_label ?? null,
      };
      activeWeekLabel = String(cohort.submission_label ?? "").trim()
        || cohortWeekThemeTitle(String(cohort.submission_week ?? ""), planRows);
    }

    participants = cohort
      ? ((await supabase
          .from("participants")
          .select("id, full_name")
          .eq("cohort_id", cohort.id)
          .order("full_name", { ascending: true })).data ?? []) as Array<{ id: string; full_name: string | null }>
      : [];
  } catch {
    loadError = true;
  }

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
          {loadError ? (
            <CenteredCard
              title="Submissions are unavailable"
              body="The submission link is active, but the form could not load right now. Please try again shortly or contact your community manager."
            />
          ) : !cohort ? (
            <CenteredCard title="Link not found" body="Please check the link your team shared with you." />
          ) : !isSubmissionsOpen(cohort) ? (
            <CenteredCard
              title="Submissions are closed"
              body={`The submission window for ${cohort.name} is closed right now. Reach out to your community manager if you think this is a mistake.`}
            />
          ) : !String(cohort.submission_week ?? "").trim() ? (
            <CenteredCard
              title="Submission week not set"
              body={`The submission page for ${cohort.name} is open, but the team has not chosen which week is due yet.`}
            />
          ) : (
            <SubmissionForm
              cohortSlug={cohort.slug}
              cohortName={cohort.name}
              participants={participants.map((participant) => ({
                id: participant.id,
                name: getParticipantDisplayName(participant),
              }))}
              activeWeekLabel={activeWeekLabel || String(cohort.submission_week ?? "")}
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
