import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CohortSwitcher } from "@/components/cohort-switcher";
import { InlineFieldUpdate, QuickUpdate } from "@/components/modules/quick-update";
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

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string; view?: string; week?: string }>;
}) {
  const { cohort: requestedCohortId, view = "all", week = "all" } = await searchParams;
  const { cohorts, cohortId } = await getScopedCohort(requestedCohortId);
  const supabase = await createClient();

  const { data: reviews, error } = cohortId
    ? await supabase.from("assignment_reviews").select("*").eq("cohort_id", cohortId).order("week", { ascending: true }).order("participant_name", { ascending: true })
    : { data: [], error: null };

  const allWeeks = Array.from(new Set((reviews ?? []).map((review) => String(review.week || "Unscheduled"))));
  const filtered = (reviews ?? []).filter((review) => {
    const overdue = review.review_due && new Date(review.review_due).getTime() < Date.now() && !["Feedback Sent", "Closed"].includes(String(review.review_status));
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
          <CohortSwitcher cohorts={cohorts.map((item) => ({ id: item.id, name: item.name }))} activeCohortId={cohortId} basePath="/reviews" />
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
        {Object.entries(groups).map(([weekLabel, weekRows]) => (
          <section key={weekLabel} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{weekLabel}</h2>
                <p className="text-sm text-muted-foreground">{weekRows.length} participant review rows</p>
              </div>
              <Badge tone="blue">{weekRows.filter((row) => row.submitted).length} submitted</Badge>
            </div>

            <div className="space-y-3">
              {weekRows.map((review) => {
                const overdue = review.review_due && new Date(review.review_due).getTime() < Date.now() && !["Feedback Sent", "Closed"].includes(String(review.review_status));
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
                        </div>
                        {review.participant_name ? (
                          <h3 className="mt-3 text-lg font-semibold text-slate-950">{review.participant_name}</h3>
                        ) : (
                          <h3 className="mt-3 text-lg font-semibold italic text-slate-400">Awaiting participant match</h3>
                        )}
                        <p className="mt-2 text-sm text-muted-foreground">{review.assignment || "Weekly assignment"}</p>
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>Submitted: {review.submitted_at ? formatDateLabel(review.submitted_at) : review.submitted ? "Yes" : "No"}</span>
                          <span>Review due: {formatDateLabel(review.review_due)}</span>
                          <span>Deadline: {formatDateLabel(review.deadline)}</span>
                        </div>
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
                      <Link
                        href={`/records/reviews/${review.id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Open record
                        <ArrowUpRight className="size-4" />
                      </Link>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <QuickUpdate table="assignment_reviews" id={review.id} field="submitted" value={review.submitted ? "true" : "false"} returnTo={withCohortParam(`/reviews?week=${encodeURIComponent(week)}&view=${view}`, cohortId)} />
                      <QuickUpdate table="assignment_reviews" id={review.id} field="review_status" value={review.review_status} returnTo={withCohortParam(`/reviews?week=${encodeURIComponent(week)}&view=${view}`, cohortId)} />
                      <InlineFieldUpdate
                        table="assignment_reviews"
                        id={review.id}
                        field="reviewer"
                        value={review.reviewer}
                        returnTo={withCohortParam(`/reviews?week=${encodeURIComponent(week)}&view=${view}`, cohortId)}
                        placeholder="Reviewer"
                      />
                      <InlineFieldUpdate
                        table="assignment_reviews"
                        id={review.id}
                        field="final_status"
                        value={review.final_status}
                        returnTo={withCohortParam(`/reviews?week=${encodeURIComponent(week)}&view=${view}`, cohortId)}
                        placeholder="Final outcome"
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
