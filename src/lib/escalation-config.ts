export type EscalationState = { ok: boolean; message: string };
export const initialEscalationState: EscalationState = { ok: false, message: "" };

export const ESCALATION_CATEGORIES = [
  "Sudden withdrawal from participation or communication",
  "Expressions of distress, self-harm, or suicidal ideation",
  "Disclosure of abuse, neglect, or exploitation",
  "Bullying or harassment between participants",
  "Inappropriate adult behaviour toward a participant",
  "Sharing of inappropriate content",
] as const;

export const ESCALATION_SEVERITIES = ["Low", "Medium", "High"] as const;
export const ESCALATION_STATUSES = ["Pending review", "Under review", "Closed"] as const;
