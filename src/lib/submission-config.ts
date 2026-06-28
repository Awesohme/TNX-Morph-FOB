export type SubmissionWindow = {
  submissions_open?: boolean | null;
  submissions_opens_at?: string | null;
  submissions_closes_at?: string | null;
};

/**
 * Submissions are open when the master toggle is on AND now is within any set window bounds.
 * Unset opens_at/closes_at mean that side of the window is unbounded.
 */
export function isSubmissionsOpen(cohort: SubmissionWindow | null | undefined, now: Date = new Date()): boolean {
  if (!cohort?.submissions_open) return false;
  const ms = now.getTime();
  if (cohort.submissions_opens_at && ms < new Date(cohort.submissions_opens_at).getTime()) return false;
  if (cohort.submissions_closes_at && ms > new Date(cohort.submissions_closes_at).getTime()) return false;
  return true;
}
