import Image from "next/image";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { submitWorksheetAction } from "@/lib/actions/submissions";
import { initialSubmissionState } from "@/lib/actions/submission-state";
import { getParticipantDisplayName } from "@/lib/participants";
import { isSubmissionsOpen } from "@/lib/submission-config";
import { resolvePublicCohort } from "@/lib/public-cohorts";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RequiredLabel } from "@/components/ui/required-indicator";

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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
  const { slug } = await params;
  const { submitted, error } = await searchParams;
  const supabase = createAdminClient();

  type SubmitCohort = {
    id: string;
    slug: string;
    name: string;
    submissions_open?: boolean | null;
    submissions_opens_at?: string | null;
    submissions_closes_at?: string | null;
  };
  let cohort: SubmitCohort | null = null;
  let participants: Array<{ id: string; full_name: string | null }> = [];
  let loadError = false;

  try {
    cohort = await resolvePublicCohort<SubmitCohort>(
      supabase,
      slug,
      "id, slug, name",
    );

    if (cohort) {
      let windowConfig: {
        submissions_open?: boolean | null;
        submissions_opens_at?: string | null;
        submissions_closes_at?: string | null;
      } | null = null;
      try {
        const { data } = await supabase
          .from("cohorts")
          .select("submissions_open, submissions_opens_at, submissions_closes_at")
          .eq("id", cohort.id)
          .maybeSingle();
        windowConfig = data;
      } catch {
        windowConfig = null;
      }
      cohort = {
        ...cohort,
        submissions_open: windowConfig?.submissions_open ?? true,
        submissions_opens_at: windowConfig?.submissions_opens_at ?? null,
        submissions_closes_at: windowConfig?.submissions_closes_at ?? null,
      };
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

  async function submitPublicWorksheet(formData: FormData) {
    "use server";

    const result = await submitWorksheetAction(initialSubmissionState, formData);
    const returnSlug = String(formData.get("cohortSlug") ?? slug);

    if (result.ok) {
      redirect(`/submit/${returnSlug}?submitted=1`);
    }

    redirect(`/submit/${returnSlug}?error=${encodeURIComponent(result.message || "Could not submit. Please try again.")}`);
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
          ) : submitted === "1" ? (
            <CenteredCard
              title="Submission received"
              body="Thank you for submitting this week's task. If you asked for support, the team will follow up."
            />
          ) : (
            <ServerSubmissionForm
              action={submitPublicWorksheet}
              cohortSlug={cohort.slug}
              cohortName={cohort.name}
              participants={participants.map((participant) => ({
                id: participant.id,
                name: getParticipantDisplayName(participant),
              }))}
              weekOptions={WEEK_OPTIONS}
              error={error}
            />
          )}
      </div>
    </main>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between text-[13px] font-medium text-slate-700">
        {optional ? <span>{label}</span> : <RequiredLabel>{label}</RequiredLabel>}
        {optional ? <span className="text-[12px] font-normal text-slate-400">Optional</span> : null}
      </div>
      {children}
    </div>
  );
}

function ServerSubmissionForm({
  action,
  cohortSlug,
  cohortName,
  participants,
  weekOptions,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  cohortSlug: string;
  cohortName: string;
  participants: Array<{ id: string; name: string }>;
  weekOptions: string[];
  error?: string;
}) {
  return (
    <form
      action={action}
      className="space-y-7 rounded-[28px] border border-slate-200/70 bg-white p-7 shadow-[0_1px_40px_-12px_rgba(15,23,42,0.12)] sm:p-9"
    >
      <input type="hidden" name="cohortSlug" value={cohortSlug} />

      <Field label="Your name">
        <select name="participantId" required className="app-input h-12 rounded-2xl text-[15px]" defaultValue="">
          <option value="" disabled>Select your name</option>
          {participants.map((participant) => (
            <option key={participant.id} value={participant.id}>{participant.name}</option>
          ))}
        </select>
        <p className="text-[12px] leading-5 text-slate-400">
          Submitting for {cohortName}. Can&apos;t find your name? Contact your community manager.
        </p>
      </Field>

      <Field label="Week of submission">
        <select name="week" required className="app-input h-12 rounded-2xl text-[15px]" defaultValue="">
          <option value="" disabled>Select the week</option>
          {weekOptions.map((week) => (
            <option key={week} value={week}>{week}</option>
          ))}
        </select>
      </Field>

      <Field label="Task worksheet" optional>
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3.5 text-[14px] text-slate-500 transition hover:border-slate-400 hover:bg-slate-50">
          <input name="worksheet" type="file" aria-label="Task worksheet file" className="block w-full text-[13px] file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-medium file:text-white" />
        </label>
      </Field>

      <Field label="What challenge did you face this week?" optional>
        <Textarea name="challenge" rows={3} placeholder="Tell us what slowed you down..." className="rounded-2xl text-[15px]" />
      </Field>

      <Field label="Do you need support from the team?">
        <select name="supportNeeded" required className="app-input h-12 rounded-2xl text-[15px]" defaultValue="">
          <option value="" disabled>Select an option</option>
          <option value="No, I'm progressing well">No, I&apos;m progressing well</option>
          <option value="Yes, I need clarification">Yes, I need clarification</option>
          <option value="Yes, I'm stuck and need help">Yes, I&apos;m stuck and need help</option>
        </select>
      </Field>

      {error ? <p className="text-[13px] text-rose-600">{error.slice(0, 220)}</p> : null}

      <Button className="h-12 w-full rounded-2xl bg-[#0067FF] text-[15px] hover:bg-[#005EE9]">
        Submit weekly task
      </Button>
    </form>
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
