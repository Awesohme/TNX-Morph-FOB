import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CohortSwitcher } from "@/components/cohort-switcher";
import { CompactFilters } from "@/components/modules/compact-filters";
import { ReviewActionsMenu } from "@/components/modules/review-actions-menu";
import { ReviewsSettingsModal } from "@/components/modules/reviews-settings-modal";
import { getScopedCohort, withCohortParam } from "@/lib/cohorts";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { createSignedStorageUrl } from "@/lib/storage";
import { getPublicBaseUrl } from "@/lib/public-url";
import { cohortWeekAssignmentTitle, cohortWeekOptions, generateWeekLabels } from "@/lib/cohort-weeks";
import { formatDateLabel } from "@/lib/workflow";

const viewConfigs = [
  { key: "all", label: "All" },
  { key: "submitted", label: "Submitted" },
  { key: "missing", label: "Missing" },
  { key: "support-needed", label: "Support needed" },
  { key: "needs-review", label: "Needs review" },
  { key: "resubmission", label: "Needs resubmission" },
  { key: "closed", label: "Closed" },
  { key: "overdue", label: "Overdue" },
] as const;

function badgeTone(review: { submitted: boolean; review_status: string }) {
  if (!review.submitted) return "amber";
  if (review.review_status === "Needs Resubmission") return "red";
  if (review.review_status === "Feedback Sent" || review.review_status === "Closed") return "green";
  return "blue";
}

// Submissions store notes as "Challenge faced: …\nSupport needed: …". Split it back out so
// the review card can show each part and flag when the participant asked for support.
function parseSubmissionNotes(notes: unknown) {
  const text = String(notes ?? "");
  const challengeMatch = text.match(/Challenge faced:\s*([\s\S]*?)(?:\nSupport needed:|$)/i);
  const supportMatch = text.match(/Support needed:\s*([\s\S]*)$/i);
  const challenge = challengeMatch?.[1]?.trim() || "";
  const support = supportMatch?.[1]?.trim() || "";
  const supportRequested = /^yes/i.test(support);
  return { challenge, support, supportRequested };
}

function normalizeParticipantName(value: unknown) {
  return String(value ?? "").trim().replaceAll(/\s+/g, " ").toLowerCase();
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string; view?: string; week?: string }>;
}) {
  const { cohort: requestedCohortId, view = "all", week: weekParam } = await searchParams;
  const { cohorts, cohort, cohortId } = await getScopedCohort(requestedCohortId);
  const supabase = await createClient();
  const user = await getCurrentUser();
  const publicBaseUrl = await getPublicBaseUrl();
  const canGrade = user?.role === "admin" || user?.role === "facilitator" || user?.role === "community_manager";

  const [{ data: reviews, error }, { data: cohortMeta }, { data: planRows }, { data: participants }] = await Promise.all([
    cohortId
      ? supabase.from("assignment_reviews").select("*").eq("cohort_id", cohortId).order("week", { ascending: true }).order("participant_name", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    cohortId
      ? supabase.from("cohorts").select("submissions_open, submissions_opens_at, submissions_closes_at, submission_week, submission_label, slug, week_count").eq("id", cohortId).maybeSingle()
      : Promise.resolve({ data: null }),
    cohortId
      ? supabase.from("cohort_plan_items").select("week_label, sort_order, theme, assignment_label").eq("cohort_id", cohortId).order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] }),
    cohortId
      ? supabase.from("participants").select("id, full_name").eq("cohort_id", cohortId).or("is_test_data.is.null,is_test_data.eq.false").order("full_name", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  // Active staff names power the reviewer dropdown in the per-review Update menu.
  const { data: staff } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("is_active", true)
    .order("full_name", { ascending: true });
  const reviewerOptions = (staff ?? [])
    .map((s) => s.full_name || s.email)
    .filter((name): name is string => Boolean(name));

  const configuredWeeks = generateWeekLabels(cohortMeta?.week_count);
  const plannedWeekOptions = cohortWeekOptions(planRows, cohortMeta?.week_count);
  const plannedWeekByValue = new Map(plannedWeekOptions.map((option) => [option.value, option]));
  const weekOptions = [
    ...configuredWeeks.map((weekLabel) => plannedWeekByValue.get(weekLabel) ?? { value: weekLabel, label: weekLabel }),
    ...plannedWeekOptions.filter((option) => !configuredWeeks.includes(option.value)),
    ...Array.from(new Set((reviews ?? [])
      .map((review) => String(review.week || "Unscheduled"))
      .filter((weekLabel) => !configuredWeeks.includes(weekLabel) && !plannedWeekByValue.has(weekLabel))))
      .map((weekLabel) => ({ value: weekLabel, label: weekLabel })),
  ];
  const selectableWeeks = new Set(weekOptions.map((option) => option.value));

  // Default the week filter to the cohort's current week (computed from starts_on) so the
  // team lands on the week they're actively reviewing. If the cohort has not started yet,
  // use the submission week (or Week 1) instead of silently showing all-time totals.
  function currentWeekLabel(): string {
    const configuredSubmissionWeek = String(cohortMeta?.submission_week ?? "").trim();
    if (configuredSubmissionWeek && selectableWeeks.has(configuredSubmissionWeek)) return configuredSubmissionWeek;

    if (cohort?.starts_on) {
      const start = new Date(cohort.starts_on).getTime();
      if (!Number.isNaN(start)) {
        const weekNum = Math.floor((Date.now() - start) / (7 * 24 * 60 * 60 * 1000)) + 1;
        const candidate = `Week ${weekNum}`;
        if (selectableWeeks.has(candidate)) return candidate;
      }
    }

    return weekOptions[0]?.value ?? "all";
  }
  const week = weekParam ?? currentWeekLabel();
  const filtered = (reviews ?? []).filter((review) => {
    const overdue = review.review_due && new Date(review.review_due).getTime() < Date.now() && !["Feedback Sent", "Closed"].includes(String(review.review_status));
    // Hide unmatched placeholder rows (seeded, no participant + nothing submitted). A row with
    // no name but a submission is kept — it's a real submission that needs manual matching.
    if (!String(review.participant_name ?? "").trim() && !review.submitted) return false;
    if (week !== "all" && String(review.week || "Unscheduled") !== week) return false;
    switch (view) {
      case "submitted":
        return Boolean(review.submitted);
      case "missing":
        return false;
      case "support-needed":
        return parseSubmissionNotes(review.notes).supportRequested;
      case "needs-review":
        return review.submitted && ["Not Reviewed", "In Review"].includes(String(review.review_status));
      case "resubmission":
        return review.review_status === "Needs Resubmission";
      case "closed":
        return review.review_status === "Closed";
      case "overdue":
        return overdue;
      case "all":
      default:
        return true;
    }
  });

  // Signed URLs for worksheets uploaded via the public submission page.
  const signedFileEntries = await Promise.all(
    filtered
      .filter((review) => review.submission_bucket && review.submission_path)
      .map(async (review) => [
        review.id,
        await createSignedStorageUrl(String(review.submission_bucket), String(review.submission_path)),
      ] as const),
  );
  const signedFileById = Object.fromEntries(signedFileEntries) as Record<string, string | null>;

  // One assignment label per week (for the Reviews settings modal).
  const weekAssignments = cohortWeekOptions(planRows, cohortMeta?.week_count).map(({ value, title }) => ({
    week: value,
    assignment: title,
  }));
  const activityFilters = [
    {
      key: "week",
      label: "Week",
      options: weekOptions,
    },
    {
      key: "view",
      label: "Status",
      options: viewConfigs.filter((item) => item.key !== "all").map((item) => ({ value: item.key, label: item.label })),
    },
  ];

  const groups = filtered.reduce<Record<string, typeof filtered>>((acc, review) => {
    const weekKey = String(review.week || "Unscheduled");
    acc[weekKey] = acc[weekKey] ?? [];
    acc[weekKey].push(review);
    return acc;
  }, {});
  const scopedReviews = (reviews ?? []).filter((review) =>
    String(review.participant_name ?? "").trim() && (week === "all" || String(review.week || "Unscheduled") === week),
  );
  const submittedParticipantNames = new Set(
    scopedReviews.filter((review) => review.submitted).map((review) => normalizeParticipantName(review.participant_name)),
  );
  const missingParticipants = (participants ?? []).filter((participant) =>
    normalizeParticipantName(participant.full_name) && !submittedParticipantNames.has(normalizeParticipantName(participant.full_name)),
  );
  const activitySummaryCards = [
    { key: "submitted", label: "Submitted", description: "Participants who submitted", count: scopedReviews.filter((review) => review.submitted).length, className: "border-blue-200 bg-blue-50", countClassName: "text-blue-700" },
    { key: "missing", label: "Not submitted", description: "Participants still missing work", count: missingParticipants.length, className: "border-slate-200 bg-slate-50", countClassName: "text-slate-700" },
    { key: "support-needed", label: "Support needed", description: "Participants who asked for help", count: scopedReviews.filter((review) => parseSubmissionNotes(review.notes).supportRequested).length, className: "border-rose-200 bg-rose-50", countClassName: "text-rose-700" },
  ];

  return (
    <div className="space-y-6">
      <section className="app-panel p-6 md:p-7">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Activity workspace</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Weekly activities</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Track each participant by week, see who has submitted, and move activities from first look through feedback and resubmission.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CohortSwitcher cohorts={cohorts.map((item) => ({ id: item.id, name: item.name }))} activeCohortId={cohortId} basePath="/activities" />
            {cohortId && cohort ? (
              <ReviewsSettingsModal
                cohortId={cohortId}
                cohortSlug={cohortMeta?.slug ?? cohort.slug}
                submissionsOpen={cohortMeta?.submissions_open ?? false}
                submissionsOpensAt={cohortMeta?.submissions_opens_at ?? null}
                submissionsClosesAt={cohortMeta?.submissions_closes_at ?? null}
                activeWeek={cohortMeta?.submission_week ?? null}
                activeLabel={cohortMeta?.submission_label ?? null}
                publicBaseUrl={publicBaseUrl}
                weeks={weekAssignments}
              />
            ) : null}
          </div>
        </div>
      </section>

      <CompactFilters
        action="/activities"
        hiddenParams={cohortId ? { cohort: cohortId } : {}}
        filters={activityFilters}
        values={{
          week: week === "all" ? "" : week,
          view: view === "all" ? "" : view,
        }}
        resetHref={withCohortParam("/activities", cohortId)}
      />

      <section className="grid gap-4 md:grid-cols-3">
        {activitySummaryCards.map((card) => (
          <Link
            key={card.key}
            href={withCohortParam(`/activities?week=${encodeURIComponent(week)}&view=${card.key}`, cohortId)}
            className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card.className}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-600">{card.label}</p>
                <p className={`mt-2 text-3xl font-semibold tracking-tight ${card.countClassName}`}>{card.count}</p>
                <p className="mt-2 text-xs text-slate-500">{card.description}</p>
              </div>
              <ArrowUpRight className="mt-1 size-4 text-slate-500" aria-hidden />
            </div>
          </Link>
        ))}
      </section>

      {error ? (
        <Card>
          <p className="text-sm text-rose-700">{error.message}</p>
        </Card>
      ) : null}

      {view === "missing" ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Not submitted</h2>
              <p className="text-sm text-muted-foreground">{missingParticipants.length} participants without a submission for {week === "all" ? "this cohort" : week}.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {missingParticipants.map((participant) => (
              <Link
                key={participant.id}
                href={withCohortParam(`/records/participants/${participant.id}`, cohortId)}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div>
                  <p className="font-semibold text-slate-900">{participant.full_name || "Unnamed participant"}</p>
                  <p className="mt-1 text-sm text-slate-500">No submission recorded</p>
                </div>
                <ArrowUpRight className="size-4 text-slate-500" aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {view !== "missing" ? <div className="space-y-6">
        {!error && Object.keys(groups).length === 0 ? (
          <Card>
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-slate-700">Awaiting submissions</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                {week === "all"
                  ? "No participants have submitted for this cohort yet. Submissions will appear here as they come in."
                  : `No submissions for ${week} yet.`}
              </p>
            </div>
          </Card>
        ) : null}
        {Object.entries(groups).map(([weekLabel, weekRows]) => (
          <section key={weekLabel} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{weekLabel}</h2>
                <p className="text-sm text-muted-foreground">{weekRows.length} submission{weekRows.length === 1 ? "" : "s"}</p>
              </div>
              <Badge tone="blue">{weekRows.filter((row) => row.submitted).length} submitted</Badge>
            </div>

            <div className="space-y-3">
              {weekRows.map((review) => {
                const overdue = review.review_due && new Date(review.review_due).getTime() < Date.now() && !["Feedback Sent", "Closed"].includes(String(review.review_status));
                const submission = parseSubmissionNotes(review.notes);
                return (
                  <Card key={review.id} className="space-y-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={badgeTone(review)}>{review.submitted ? "Submitted" : "Not submitted"}</Badge>
                          <Badge tone={review.review_status === "Needs Resubmission" ? "red" : review.review_status === "Closed" ? "green" : "blue"}>
                            {review.review_status}
                          </Badge>
                          {overdue ? <Badge tone="red">Overdue</Badge> : null}
                          {submission.supportRequested ? <Badge tone="red">Support requested</Badge> : null}
                        </div>
                        {review.participant_name ? (
                          <h3 className="mt-3 text-lg font-semibold text-slate-950">{review.participant_name}</h3>
                        ) : (
                          <h3 className="mt-3 text-lg font-semibold italic text-slate-400">Submitted — awaiting participant match</h3>
                        )}
                        <p className="mt-2 text-sm text-muted-foreground">
                          {cohortWeekAssignmentTitle(String(review.week || ""), planRows) || review.assignment || "Weekly assignment"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>Submitted: {review.submitted_at ? formatDateLabel(review.submitted_at) : review.submitted ? "Yes" : "No"}</span>
                          <span>Review due: {formatDateLabel(review.review_due)}</span>
                          <span>Deadline: {formatDateLabel(review.deadline)}</span>
                        </div>
                        {submission.challenge || submission.support ? (
                          <dl className="mt-3 space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-sm">
                            {submission.challenge ? (
                              <div>
                                <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Challenge faced</dt>
                                <dd className="mt-0.5 text-slate-700">{submission.challenge}</dd>
                              </div>
                            ) : null}
                            {submission.support ? (
                              <div>
                                <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Support needed</dt>
                                <dd className={`mt-0.5 ${submission.supportRequested ? "font-medium text-rose-700" : "text-slate-700"}`}>{submission.support}</dd>
                              </div>
                            ) : null}
                          </dl>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-4">
                          {review.submission_link ? (
                            <a href={String(review.submission_link)} className="inline-flex text-sm font-medium text-slate-700 underline underline-offset-2">
                              Open submission
                            </a>
                          ) : null}
                          {signedFileById[review.id] ? (
                            <a href={signedFileById[review.id] ?? "#"} target="_blank" rel="noreferrer" className="inline-flex text-sm font-medium text-slate-700 underline underline-offset-2">
                              Open uploaded worksheet
                            </a>
                          ) : null}
                        </div>
                      </div>
                      <ReviewActionsMenu
                        id={review.id}
                        reviewStatus={String(review.review_status ?? "Not Reviewed")}
                        reviewer={String(review.reviewer ?? "")}
                        finalStatus={String(review.final_status ?? "")}
                        reviewerOptions={reviewerOptions}
                        recordHref={`/records/reviews/${review.id}`}
                        returnTo={withCohortParam(`/activities?week=${encodeURIComponent(week)}&view=${view}`, cohortId)}
                        canGrade={canGrade}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div> : null}
    </div>
  );
}
