type ParticipantIdentity = { id: string; full_name?: string | null };
type LegacyReview = { id: string; participant_name?: string | null };

export function normalizeReviewName(value: string | null | undefined) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Adopt an imported legacy review only when both participant and review are unique. */
export function unambiguousLegacyReview(
  participantId: string,
  name: string,
  participants: ParticipantIdentity[],
  reviews: LegacyReview[],
) {
  const key = normalizeReviewName(name);
  if (!key) return null;
  const matchingParticipants = participants.filter((p) => normalizeReviewName(p.full_name) === key);
  if (matchingParticipants.length !== 1 || matchingParticipants[0].id !== participantId) return null;
  const matchingReviews = reviews.filter((r) => normalizeReviewName(r.participant_name) === key);
  return matchingReviews.length === 1 ? matchingReviews[0] : null;
}

/** A replacement worksheet must return to review; assignment ownership stays intact. */
export const freshSubmissionReviewState = {
  review_status: "Not Reviewed",
  feedback_sent: false,
  resubmission_needed: false,
  final_status: null,
  quality_score: null,
  feedback_summary: null,
} as const;
