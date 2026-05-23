export const editableFieldsByTable: Record<string, string[]> = {
  participants: ["risk", "mvp_status", "demo_status", "cm_owner", "next_action", "notes"],
  assignment_reviews: ["review_status", "reviewer", "feedback_summary", "final_status", "notes"],
  weekly_ops_tasks: ["status", "owner", "evidence_link", "notes", "priority"],
  session_readiness: ["support_assigned", "readiness_score"],
  recruitment_channels: ["registrations", "accepted", "attended_week_1", "graduated", "notes"],
  cm_reports: ["silent_students", "stuck_students", "escalations_raised", "status", "next_actions"],
  content_items: ["status", "owner", "priority", "link", "notes"],
  partnerships: ["status", "owner", "next_follow_up", "priority", "notes"],
  alumni: ["certificate_issued", "badge_issued", "alumni_group_joined", "next_step", "notes"],
};

export const cmWritableTables = new Set(["participants", "cm_reports", "content_items"]);
export const numericFields = new Set([
  "readiness_score",
  "registrations",
  "accepted",
  "attended_week_1",
  "graduated",
  "silent_students",
  "stuck_students",
  "escalations_raised",
]);
export const booleanFields = new Set(["certificate_issued", "badge_issued", "alumni_group_joined"]);

export const operationalTables = [
  "participants",
  "assignment_reviews",
  "weekly_ops_tasks",
  "session_readiness",
  "recruitment_channels",
  "cm_reports",
  "content_items",
  "partnerships",
  "alumni",
];
