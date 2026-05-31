import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CohortSwitcher } from "@/components/cohort-switcher";
import { ReviewActionsMenu } from "@/components/modules/review-actions-menu";
import { ReviewsSettingsModal } from "@/components/modules/reviews-settings-modal";
import { getScopedCohort, withCohortParam } from "@/lib/cohorts";
import { createClient } from "@/lib/supabase/server";
import { createSignedStorageUrl } from "@/lib/storage";
import { formatDateLabel } from "@/lib/workflow";

const viewConfigs = [
  { key: "all", label: "All" },
  { key: "submitted", label: "Submitted" },
  { key: "missing", label: "Missing" },
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

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string; view?: string; week?: string }>;
}) {
  const { cohort: requestedCohortId, view = "all", week: weekParam } = await searchParams;
  const { cohorts, cohort, cohortId } = await getScopedCohort(requestedCohortId);
  const supabase = await createClient();

  const [{ data: reviews, error }, { data: cohortMeta }] = await Promise.all([
    cohortId
      ? supabase.from("assignment_reviews").select("*").eq("cohort_id", cohortId).order("week", { ascending: true }).order("participant_name", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    cohortId
      ? supabase.from("cohorts").select("submissions_open, slug").eq("id", cohortId).maybeSingle()
      : Promise.resolve({ data: null }),
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

  const allWeeks = Array.from(new Set((reviews ?? []).map((review) => String(review.week || "Unscheduled"))));

  // Default the week filter to the cohort's current week (computed from starts_on) so the
  // team lands on the week they're actively reviewing. Falls back to "all".
  function currentWeekLabel(): string {
    if (!cohort?.starts_on) return "all";
    const start = new Date(cohort.starts_on).getTime();
    if (Number.isNaN(start)) return "all";
    const weekNum = Math.floor((Date.now() - start) / (7 * 24 * 60 * 60 * 1000)) + 1;
    const candidate = `Week ${weekNum}`;
    return allWeeks.includes(candidate) ? candidate : "all";
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
        return !review.submitted;
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
  const weekLabelMap = new Map<string, string>();
  for (const review of reviews ?? []) {
    const wk = String(review.week || "Unscheduled");
    if (!weekLabelMap.has(wk)) weekLabelMap.set(wk, String(review.assignment ?? ""));
  }
  const weekAssignments = Array.from(weekLabelMap.entries()).map(([week, assignment]) => ({ week, assignment }));

  const groups = filtered.reduce<Record<string, typeof filtered>>((acc, review) => {
    const weekKey = String(review.week || "Unscheduled");
    acc[weekKey] = acc[weekKey] ?? [];
    acc[weekKey].push(review);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <section className="app-panel p-6 md:p-7">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Review workspace</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Weekly assignment reviews</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Track each participant by week, see who has submitted, and move reviews from first look through feedback and resubmission.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CohortSwitcher cohorts={cohorts.map((item) => ({ id: item.id, name: item.name }))} activeCohortId={cohortId} basePath="/reviews" />
            {cohortId && cohort ? (
              <ReviewsSettingsModal
                cohortId={cohortId}
                cohortSlug={cohortMeta?.slug ?? cohort.slug}
                submissionsOpen={cohortMeta?.submissions_open ?? false}
                publicBaseUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}
                weeks={weekAssignments}
              />
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href={withCohortParam("/reviews", cohortId)}
          className={`inline-flex items-center rounded-xl border px-3 py-2 text-xs font-medium transition ${
            week === "all" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          All weeks
        </Link>
        {allWeeks.map((weekLabel) => (
          <Link
            key={weekLabel}
            href={withCohortParam(`/reviews?week=${encodeURIComponent(weekLabel)}&view=${view}`, cohortId)}
            className={`inline-flex items-center rounded-xl border px-3 py-2 text-xs font-medium transition ${
              week === weekLabel ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {weekLabel}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {viewConfigs.map((item) => (
          <Link
            key={item.key}
            href={withCohortParam(`/reviews?week=${encodeURIComponent(week)}&view=${item.key}`, cohortId)}
            className={`inline-flex items-center rounded-xl border px-3 py-2 text-xs font-medium transition ${
              view === item.key ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {error ? (
        <Card>
          <p className="text-sm text-rose-700">{error.message}</p>
        </Card>
      ) : null}

      <div className="space-y-6">
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
                        <p className="mt-2 text-sm text-muted-foreground">{review.assignment || "Weekly assignment"}</p>
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
                        submitted={Boolean(review.submitted)}
                        reviewStatus={String(review.review_status ?? "Not Reviewed")}
                        reviewer={String(review.reviewer ?? "")}
                        finalStatus={String(review.final_status ?? "")}
                        reviewerOptions={reviewerOptions}
                        recordHref={`/records/reviews/${review.id}`}
                        returnTo={withCohortParam(`/reviews?week=${encodeURIComponent(week)}&view=${view}`, cohortId)}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}

        {!filtered.length && !error ? (
          <Card>
            <p className="text-sm text-muted-foreground">No participant review rows match this view right now.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
