import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CohortSwitcher } from "@/components/cohort-switcher";
import { InlineFieldUpdate, QuickUpdate } from "@/components/modules/quick-update";
import { getScopedCohort, withCohortParam } from "@/lib/cohorts";
import { createClient } from "@/lib/supabase/server";
import { formatDateLabel } from "@/lib/workflow";

const viewConfigs = [
  { key: "all", label: "All" },
  { key: "not-reviewed", label: "Not Reviewed" },
  { key: "in-review", label: "In Review" },
  { key: "feedback-sent", label: "Feedback Sent" },
  { key: "resubmission", label: "Needs Resubmission" },
  { key: "closed", label: "Closed" },
  { key: "overdue", label: "Overdue" },
] as const;

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string; view?: string }>;
}) {
  const { cohort: requestedCohortId, view = "all" } = await searchParams;
  const { cohorts, cohortId } = await getScopedCohort(requestedCohortId);
  const supabase = await createClient();

  const { data: reviews, error } = cohortId
    ? await supabase.from("assignment_reviews").select("*").eq("cohort_id", cohortId).order("review_due", { ascending: true })
    : { data: [], error: null };

  const filtered = (reviews ?? []).filter((review) => {
    const overdue = review.review_due && new Date(review.review_due).getTime() < Date.now() && !["Feedback Sent", "Closed"].includes(String(review.review_status));
    switch (view) {
      case "not-reviewed":
        return review.review_status === "Not Reviewed";
      case "in-review":
        return review.review_status === "In Review";
      case "feedback-sent":
        return review.review_status === "Feedback Sent";
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

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur md:p-8">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Review workspace</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Assignment reviews</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Review submissions, assign reviewers, and keep resubmission loops moving without leaving the queue.
            </p>
          </div>
          <CohortSwitcher cohorts={cohorts.map((item) => ({ id: item.id, name: item.name }))} activeCohortId={cohortId} basePath="/reviews" />
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {viewConfigs.map((item) => (
          <Link
            key={item.key}
            href={`/reviews?cohort=${cohortId ?? ""}&view=${item.key}`}
            className={`inline-flex items-center rounded-full border px-3 py-2 text-xs font-semibold transition ${
              view === item.key ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"
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

      <div className="space-y-4">
        {filtered.map((review) => {
          const overdue = review.review_due && new Date(review.review_due).getTime() < Date.now() && !["Feedback Sent", "Closed"].includes(String(review.review_status));
          return (
            <Card key={review.id} className="space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={review.review_status === "Needs Resubmission" ? "red" : review.review_status === "Feedback Sent" ? "green" : "amber"}>
                      {review.review_status}
                    </Badge>
                    {overdue ? <Badge tone="red">Overdue</Badge> : null}
                    {review.week ? <Badge>{review.week}</Badge> : null}
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-slate-950">{review.assignment}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{review.participant_name || "No participant assigned yet."}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>Review due: {formatDateLabel(review.review_due)}</span>
                    <span>Deadline: {formatDateLabel(review.deadline)}</span>
                    {review.quality_score ? <span>Quality score: {review.quality_score}/5</span> : null}
                  </div>
                </div>
                <Link
                  href={`/records/reviews/${review.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Open record
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <QuickUpdate table="assignment_reviews" id={review.id} field="review_status" value={review.review_status} returnTo={withCohortParam(`/reviews?view=${view}`, cohortId)} />
                <InlineFieldUpdate
                  table="assignment_reviews"
                  id={review.id}
                  field="reviewer"
                  value={review.reviewer}
                  returnTo={withCohortParam(`/reviews?view=${view}`, cohortId)}
                  placeholder="Reviewer"
                />
                <InlineFieldUpdate
                  table="assignment_reviews"
                  id={review.id}
                  field="final_status"
                  value={review.final_status}
                  returnTo={withCohortParam(`/reviews?view=${view}`, cohortId)}
                  placeholder="Final status"
                />
              </div>
            </Card>
          );
        })}

        {!filtered.length && !error ? (
          <Card>
            <p className="text-sm text-muted-foreground">No reviews match this queue view right now.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
