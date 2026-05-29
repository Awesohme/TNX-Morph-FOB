import { modules, type ModuleKey } from "@/lib/modules";

export type ImportDatasetKey = ModuleKey | "content";

export type ImportValue = string | number | boolean | null;

export type ImportFieldConfig = {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "date" | "select";
  required?: boolean;
  example: string;
  alternateMatches?: string[];
  options?: string[];
  helpText?: string;
};

export type ImportMode = "append" | "upsert";

export type ImportDatasetSummary = {
  key: ImportDatasetKey;
  title: string;
  description: string;
  table: string;
  modeDescription: string;
  uniqueRuleDescription: string;
  fields: ImportFieldConfig[];
};

export type ImportTransformContext = {
  cohortId: string;
  actorId: string | null;
};

export type ImportDatasetConfig = ImportDatasetSummary & {
  findExistingWhere: string[][];
  transformRow: (row: Record<string, ImportValue>, context: ImportTransformContext) => Record<string, unknown>;
  serializeRecord?: (record: Record<string, unknown>) => Record<string, ImportValue>;
};

function text(value: ImportValue) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function bool(value: ImportValue) {
  const normalized = text(value).toLowerCase();
  return normalized === "yes" || normalized === "true" || normalized === "1";
}

function num(value: ImportValue) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableDate(value: ImportValue) {
  const raw = text(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString().slice(0, 10);
}

function actorFields(context: ImportTransformContext) {
  return {
    cohort_id: context.cohortId,
    created_by: context.actorId,
    updated_by: context.actorId,
  };
}

function readinessScore(checklist: Record<string, string>) {
  const values = Object.values(checklist);
  if (!values.length) return 0;
  return values.filter((value) => value.toLowerCase() === "yes").length / values.length;
}

function stringRecord(value: unknown) {
  return (value as Record<string, unknown> | undefined) ?? {};
}

export const importDatasets: ImportDatasetConfig[] = [
  {
    key: "participants",
    title: "Participants",
    description: "Bulk import participant records, ownership, risk, and weekly attendance/submission status.",
    table: "participants",
    modeDescription: "Append adds new participants. Upsert matches by external ID first, then email.",
    uniqueRuleDescription: "Match order: external_id, then email.",
    findExistingWhere: [["external_id"], ["email"]],
    fields: [
      { key: "external_id", label: "External ID", type: "string", example: "MORPH-001", alternateMatches: ["id", "participant id"] },
      { key: "full_name", label: "Full name", type: "string", required: true, example: "Ada Okafor", alternateMatches: ["name"] },
      { key: "email", label: "Email", type: "string", example: "ada@example.com" },
      { key: "whatsapp", label: "WhatsApp", type: "string", example: "+2348000000000", alternateMatches: ["phone"] },
      { key: "source", label: "Source", type: "string", example: "Instagram" },
      { key: "accepted", label: "Accepted", type: "boolean", example: "Yes" },
      { key: "onboarding_complete", label: "Onboarding complete", type: "boolean", example: "No" },
      { key: "week_1_attendance", label: "Week 1 attendance", type: "string", example: "Present" },
      { key: "week_1_submission", label: "Week 1 submission", type: "string", example: "Submitted" },
      { key: "week_2_attendance", label: "Week 2 attendance", type: "string", example: "Present" },
      { key: "week_2_submission", label: "Week 2 submission", type: "string", example: "Submitted" },
      { key: "week_3_attendance", label: "Week 3 attendance", type: "string", example: "Absent" },
      { key: "week_3_submission", label: "Week 3 submission", type: "string", example: "Pending" },
      { key: "week_4_attendance", label: "Week 4 attendance", type: "string", example: "Present" },
      { key: "week_4_submission", label: "Week 4 submission", type: "string", example: "Submitted" },
      { key: "week_5_attendance", label: "Week 5 attendance", type: "string", example: "Present" },
      { key: "week_5_submission", label: "Week 5 submission", type: "string", example: "Submitted" },
      { key: "week_6_attendance", label: "Week 6 attendance", type: "string", example: "Present" },
      { key: "week_6_submission", label: "Week 6 submission", type: "string", example: "Submitted" },
      { key: "mvp_status", label: "MVP status", type: "select", example: "In Progress", options: ["Not Started", "In Progress", "Almost Done", "Completed"] },
      { key: "demo_status", label: "Demo status", type: "select", example: "Not Presented", options: ["Not Presented", "Live Presented", "Recorded Submitted", "Pending Recording"] },
      { key: "risk", label: "Risk", type: "select", example: "Green", options: ["Green", "Amber", "Red"] },
      { key: "cm_owner", label: "CM owner", type: "string", example: "Olamide" },
      { key: "last_contact", label: "Last contact", type: "date", example: "2026-05-25" },
      { key: "next_action", label: "Next action", type: "string", example: "Send reminder before session" },
      { key: "cert_eligible", label: "Certificate eligible", type: "boolean", example: "No" },
      { key: "badge_issued", label: "Badge issued", type: "boolean", example: "No" },
      { key: "alumni_joined", label: "Alumni joined", type: "boolean", example: "No" },
      { key: "notes", label: "Notes", type: "string", example: "Needs closer follow-up on MVP" },
    ],
    transformRow: (row, context) => ({
      ...actorFields(context),
      external_id: text(row.external_id),
      full_name: text(row.full_name),
      email: text(row.email),
      whatsapp: text(row.whatsapp),
      source: text(row.source),
      accepted: bool(row.accepted),
      onboarding_complete: bool(row.onboarding_complete),
      attendance: {
        week_1: text(row.week_1_attendance),
        week_2: text(row.week_2_attendance),
        week_3: text(row.week_3_attendance),
        week_4: text(row.week_4_attendance),
        week_5: text(row.week_5_attendance),
        week_6: text(row.week_6_attendance),
      },
      submissions: {
        week_1: text(row.week_1_submission),
        week_2: text(row.week_2_submission),
        week_3: text(row.week_3_submission),
        week_4: text(row.week_4_submission),
        week_5: text(row.week_5_submission),
        week_6: text(row.week_6_submission),
      },
      mvp_status: text(row.mvp_status) || "Not Started",
      demo_status: text(row.demo_status) || "Not Presented",
      risk: text(row.risk) || "Green",
      cm_owner: text(row.cm_owner),
      last_contact: nullableDate(row.last_contact),
      next_action: text(row.next_action),
      cert_eligible: bool(row.cert_eligible),
      badge_issued: bool(row.badge_issued),
      alumni_joined: bool(row.alumni_joined),
      notes: text(row.notes),
    }),
    serializeRecord: (record) => {
      const attendance = stringRecord(record.attendance);
      const submissions = stringRecord(record.submissions);
      return {
        external_id: String(record.external_id ?? ""),
        full_name: String(record.full_name ?? ""),
        email: String(record.email ?? ""),
        whatsapp: String(record.whatsapp ?? ""),
        source: String(record.source ?? ""),
        accepted: Boolean(record.accepted),
        onboarding_complete: Boolean(record.onboarding_complete),
        week_1_attendance: String(attendance.week_1 ?? ""),
        week_1_submission: String(submissions.week_1 ?? ""),
        week_2_attendance: String(attendance.week_2 ?? ""),
        week_2_submission: String(submissions.week_2 ?? ""),
        week_3_attendance: String(attendance.week_3 ?? ""),
        week_3_submission: String(submissions.week_3 ?? ""),
        week_4_attendance: String(attendance.week_4 ?? ""),
        week_4_submission: String(submissions.week_4 ?? ""),
        week_5_attendance: String(attendance.week_5 ?? ""),
        week_5_submission: String(submissions.week_5 ?? ""),
        week_6_attendance: String(attendance.week_6 ?? ""),
        week_6_submission: String(submissions.week_6 ?? ""),
        mvp_status: String(record.mvp_status ?? ""),
        demo_status: String(record.demo_status ?? ""),
        risk: String(record.risk ?? ""),
        cm_owner: String(record.cm_owner ?? ""),
        last_contact: String(record.last_contact ?? ""),
        next_action: String(record.next_action ?? ""),
        cert_eligible: Boolean(record.cert_eligible),
        badge_issued: Boolean(record.badge_issued),
        alumni_joined: Boolean(record.alumni_joined),
        notes: String(record.notes ?? ""),
      };
    },
  },
  {
    key: "reviews",
    title: "Assignment reviews",
    description: "Import review queue rows with reviewer ownership, deadlines, and feedback status.",
    table: "assignment_reviews",
    modeDescription: "Append adds rows. Upsert matches by week + participant.",
    uniqueRuleDescription: "Match keys: week + participant_name.",
    findExistingWhere: [["week", "participant_name"]],
    fields: [
      { key: "week", label: "Week", type: "string", required: true, example: "Week 2" },
      { key: "assignment", label: "Assignment label", type: "string", example: "Landing page brief" },
      { key: "participant_name", label: "Participant", type: "string", required: true, example: "Ada Okafor", alternateMatches: ["name"] },
      { key: "submission_link", label: "Submission link", type: "string", example: "https://example.com/submission" },
      { key: "submitted", label: "Submitted", type: "boolean", example: "Yes" },
      { key: "submitted_at", label: "Submitted at", type: "date", example: "2026-05-25" },
      { key: "reviewer", label: "Reviewer", type: "string", example: "Sam" },
      { key: "review_status", label: "Review status", type: "select", example: "Not Reviewed", options: ["Not Reviewed", "In Review", "Feedback Sent", "Needs Resubmission", "Closed"] },
      { key: "feedback_sent", label: "Feedback sent", type: "boolean", example: "No" },
      { key: "resubmission_needed", label: "Resubmission needed", type: "boolean", example: "No" },
      { key: "final_status", label: "Final status", type: "string", example: "Pass" },
      { key: "quality_score", label: "Quality score", type: "number", example: "4" },
      { key: "feedback_summary", label: "Feedback summary", type: "string", example: "Solid structure, improve hierarchy" },
      { key: "deadline", label: "Deadline", type: "date", example: "2026-05-25" },
      { key: "review_due", label: "Review due", type: "date", example: "2026-05-27" },
      { key: "notes", label: "Notes", type: "string", example: "Resubmission expected next week" },
    ],
    transformRow: (row, context) => ({
      ...actorFields(context),
      week: text(row.week),
      assignment: text(row.assignment),
      participant_name: text(row.participant_name),
      submission_link: text(row.submission_link),
      submitted: bool(row.submitted),
      submitted_at: nullableDate(row.submitted_at),
      reviewer: text(row.reviewer),
      review_status: text(row.review_status) || "Not Reviewed",
      feedback_sent: bool(row.feedback_sent),
      resubmission_needed: bool(row.resubmission_needed),
      final_status: text(row.final_status),
      quality_score: text(row.quality_score) ? num(row.quality_score) : null,
      feedback_summary: text(row.feedback_summary),
      deadline: nullableDate(row.deadline),
      review_due: nullableDate(row.review_due),
      notes: text(row.notes),
    }),
    serializeRecord: (record) => ({
      week: String(record.week ?? ""),
      assignment: String(record.assignment ?? ""),
      participant_name: String(record.participant_name ?? ""),
      submission_link: String(record.submission_link ?? ""),
      submitted: Boolean(record.submitted),
      submitted_at: String(record.submitted_at ?? ""),
      reviewer: String(record.reviewer ?? ""),
      review_status: String(record.review_status ?? ""),
      feedback_sent: Boolean(record.feedback_sent),
      resubmission_needed: Boolean(record.resubmission_needed),
      final_status: String(record.final_status ?? ""),
      quality_score: record.quality_score === null || record.quality_score === undefined ? null : String(record.quality_score),
      feedback_summary: String(record.feedback_summary ?? ""),
      deadline: String(record.deadline ?? ""),
      review_due: String(record.review_due ?? ""),
      notes: String(record.notes ?? ""),
    }),
  },
  {
    key: "ops",
    title: "Weekly ops tasks",
    description: "Import delivery tasks, ownership, status, due time, and evidence links.",
    table: "weekly_ops_tasks",
    modeDescription: "Append adds rows. Upsert matches by week + day + action.",
    uniqueRuleDescription: "Match keys: week + day + action.",
    findExistingWhere: [["week", "day", "action"]],
    fields: [
      { key: "week", label: "Week", type: "string", required: true, example: "Week 3" },
      { key: "day", label: "Day", type: "string", example: "Tuesday" },
      { key: "action", label: "Action", type: "string", required: true, example: "Post reminder in WhatsApp group" },
      { key: "owner", label: "Owner", type: "string", example: "Olamide" },
      { key: "support", label: "Support", type: "string", example: "Sam" },
      { key: "channel", label: "Channel", type: "string", example: "WhatsApp" },
      { key: "due_time", label: "Due time", type: "string", example: "09:00" },
      { key: "status", label: "Status", type: "select", example: "Not Started", options: ["Not Started", "In Progress", "Done", "Blocked", "Deferred"] },
      { key: "evidence_link", label: "Evidence link", type: "string", example: "https://example.com/proof" },
      { key: "notes", label: "Notes", type: "string", example: "Do before cohort call" },
      { key: "priority", label: "Priority", type: "select", example: "Medium", options: ["Low", "Medium", "High"] },
    ],
    transformRow: (row, context) => ({
      ...actorFields(context),
      week: text(row.week),
      day: text(row.day),
      action: text(row.action),
      owner: text(row.owner),
      support: text(row.support),
      channel: text(row.channel),
      due_time: text(row.due_time),
      status: text(row.status) || "Not Started",
      evidence_link: text(row.evidence_link),
      notes: text(row.notes),
      priority: text(row.priority) || "Medium",
    }),
    serializeRecord: (record) => ({
      week: String(record.week ?? ""),
      day: String(record.day ?? ""),
      action: String(record.action ?? ""),
      owner: String(record.owner ?? ""),
      support: String(record.support ?? ""),
      channel: String(record.channel ?? ""),
      due_time: String(record.due_time ?? ""),
      status: String(record.status ?? ""),
      evidence_link: String(record.evidence_link ?? ""),
      notes: String(record.notes ?? ""),
      priority: String(record.priority ?? ""),
    }),
  },
  {
    key: "sessions",
    title: "Session readiness",
    description: "Import readiness checklists, leads, reminders, and support assignments for sessions.",
    table: "session_readiness",
    modeDescription: "Append adds rows. Upsert matches by week + session_date + topic.",
    uniqueRuleDescription: "Match keys: week + session_date + topic.",
    findExistingWhere: [["week", "session_date", "topic"]],
    fields: [
      { key: "week", label: "Week", type: "string", required: true, example: "Week 4" },
      { key: "session_date", label: "Session date", type: "date", example: "2026-06-01" },
      { key: "session_lead", label: "Session lead", type: "string", example: "Tolu" },
      { key: "topic", label: "Topic", type: "string", required: true, example: "Pitch storytelling" },
      { key: "slides_ready", label: "Slides ready", type: "boolean", example: "Yes" },
      { key: "activity_ready", label: "Activity ready", type: "boolean", example: "Yes" },
      { key: "assignment_brief_ready", label: "Assignment brief ready", type: "boolean", example: "Yes" },
      { key: "recording_plan", label: "Recording plan", type: "boolean", example: "No" },
      { key: "email_reminder_sent", label: "Email reminder sent", type: "boolean", example: "No" },
      { key: "whatsapp_reminder_sent", label: "WhatsApp reminder sent", type: "boolean", example: "Yes" },
      { key: "support_assigned", label: "Support assigned", type: "string", example: "Sam" },
    ],
    transformRow: (row, context) => {
      const checklist = {
        slides_ready: bool(row.slides_ready) ? "Yes" : "No",
        activity_ready: bool(row.activity_ready) ? "Yes" : "No",
        assignment_brief_ready: bool(row.assignment_brief_ready) ? "Yes" : "No",
        recording_plan: bool(row.recording_plan) ? "Yes" : "No",
        email_reminder_sent: bool(row.email_reminder_sent) ? "Yes" : "No",
        whatsapp_reminder_sent: bool(row.whatsapp_reminder_sent) ? "Yes" : "No",
      };
      return {
        ...actorFields(context),
        week: text(row.week),
        session_date: nullableDate(row.session_date),
        session_lead: text(row.session_lead),
        topic: text(row.topic),
        checklist,
        support_assigned: text(row.support_assigned),
        readiness_score: readinessScore(checklist),
      };
    },
    serializeRecord: (record) => {
      const checklist = stringRecord(record.checklist);
      return {
        week: String(record.week ?? ""),
        session_date: String(record.session_date ?? ""),
        session_lead: String(record.session_lead ?? ""),
        topic: String(record.topic ?? ""),
        slides_ready: String(checklist.slides_ready ?? ""),
        activity_ready: String(checklist.activity_ready ?? ""),
        assignment_brief_ready: String(checklist.assignment_brief_ready ?? ""),
        recording_plan: String(checklist.recording_plan ?? ""),
        email_reminder_sent: String(checklist.email_reminder_sent ?? ""),
        whatsapp_reminder_sent: String(checklist.whatsapp_reminder_sent ?? ""),
        support_assigned: String(record.support_assigned ?? ""),
      };
    },
  },
  {
    key: "recruitment",
    title: "Recruitment funnel",
    description: "Import channel performance and conversion figures across the recruitment funnel.",
    table: "recruitment_channels",
    modeDescription: "Append adds rows. Upsert matches by channel.",
    uniqueRuleDescription: "Match key: channel.",
    findExistingWhere: [["channel"]],
    fields: [
      { key: "channel", label: "Channel", type: "string", required: true, example: "Instagram" },
      { key: "target_audience", label: "Target audience", type: "string", example: "Design founders" },
      { key: "target_registrations", label: "Target registrations", type: "number", example: "100" },
      { key: "registrations", label: "Registrations", type: "number", example: "72" },
      { key: "accepted", label: "Accepted", type: "number", example: "48" },
      { key: "joined_whatsapp", label: "Joined WhatsApp", type: "number", example: "40" },
      { key: "joined_classroom", label: "Joined classroom", type: "number", example: "36" },
      { key: "attended_week_1", label: "Attended week 1", type: "number", example: "31" },
      { key: "active_by_week_3", label: "Active by week 3", type: "number", example: "24" },
      { key: "graduated", label: "Graduated", type: "number", example: "17" },
      { key: "notes", label: "Notes", type: "string", example: "High-quality referrals this cycle" },
    ],
    transformRow: (row, context) => ({
      ...actorFields(context),
      channel: text(row.channel),
      target_audience: text(row.target_audience),
      target_registrations: num(row.target_registrations),
      registrations: num(row.registrations),
      accepted: num(row.accepted),
      joined_whatsapp: num(row.joined_whatsapp),
      joined_classroom: num(row.joined_classroom),
      attended_week_1: num(row.attended_week_1),
      active_by_week_3: num(row.active_by_week_3),
      graduated: num(row.graduated),
      notes: text(row.notes),
    }),
  },
  {
    key: "community",
    title: "Community reports",
    description: "Import weekly community manager updates, escalations, and student health metrics.",
    table: "cm_reports",
    modeDescription: "Append adds rows. Upsert matches by week + cm.",
    uniqueRuleDescription: "Match keys: week + cm.",
    findExistingWhere: [["week", "cm"]],
    fields: [
      { key: "week", label: "Week", type: "string", required: true, example: "Week 5" },
      { key: "cm", label: "Community manager", type: "string", required: true, example: "Olamide" },
      { key: "prompts_posted", label: "Prompts posted", type: "boolean", example: "Yes" },
      { key: "attendance_updated", label: "Attendance updated", type: "boolean", example: "Yes" },
      { key: "submissions_updated", label: "Submissions updated", type: "boolean", example: "No" },
      { key: "silent_students", label: "Silent students", type: "number", example: "3" },
      { key: "stuck_students", label: "Stuck students", type: "number", example: "2" },
      { key: "escalations_raised", label: "Escalations raised", type: "number", example: "1" },
      { key: "weekly_report_sent", label: "Weekly report sent", type: "boolean", example: "Yes" },
      { key: "energy_level", label: "Energy level", type: "string", example: "High" },
      { key: "key_concerns", label: "Key concerns", type: "string", example: "Late submissions in week 5" },
      { key: "next_actions", label: "Next actions", type: "string", example: "Call silent students before Thursday" },
      { key: "status", label: "Status", type: "select", example: "In Progress", options: ["Not Started", "In Progress", "Done", "Blocked", "Deferred"] },
    ],
    transformRow: (row, context) => ({
      ...actorFields(context),
      week: text(row.week),
      cm: text(row.cm),
      prompts_posted: bool(row.prompts_posted),
      attendance_updated: bool(row.attendance_updated),
      submissions_updated: bool(row.submissions_updated),
      silent_students: num(row.silent_students),
      stuck_students: num(row.stuck_students),
      escalations_raised: num(row.escalations_raised),
      weekly_report_sent: bool(row.weekly_report_sent),
      energy_level: text(row.energy_level),
      key_concerns: text(row.key_concerns),
      next_actions: text(row.next_actions),
      status: text(row.status) || "Not Started",
    }),
    serializeRecord: (record) => ({
      week: String(record.week ?? ""),
      cm: String(record.cm ?? ""),
      prompts_posted: Boolean(record.prompts_posted),
      attendance_updated: Boolean(record.attendance_updated),
      submissions_updated: Boolean(record.submissions_updated),
      silent_students: record.silent_students === null || record.silent_students === undefined ? null : String(record.silent_students),
      stuck_students: record.stuck_students === null || record.stuck_students === undefined ? null : String(record.stuck_students),
      escalations_raised: record.escalations_raised === null || record.escalations_raised === undefined ? null : String(record.escalations_raised),
      weekly_report_sent: Boolean(record.weekly_report_sent),
      energy_level: String(record.energy_level ?? ""),
      key_concerns: String(record.key_concerns ?? ""),
      next_actions: String(record.next_actions ?? ""),
      status: String(record.status ?? ""),
    }),
  },
  {
    key: "content",
    title: "Content pipeline",
    description: "Import content opportunities, posting workflow, ownership, and status.",
    table: "content_items",
    modeDescription: "Append adds rows. Upsert matches by week + content_type + student_product.",
    uniqueRuleDescription: "Match keys: week + content_type + student_product.",
    findExistingWhere: [["week", "content_type", "student_product"]],
    fields: [
      { key: "week", label: "Week", type: "string", example: "Week 2" },
      { key: "content_type", label: "Content type", type: "string", required: true, example: "Student spotlight" },
      { key: "student_product", label: "Student or product", type: "string", example: "Ada - Finmate MVP" },
      { key: "asset_needed", label: "Asset needed", type: "string", example: "Portrait photo + screenshot" },
      { key: "permission_granted", label: "Permission granted", type: "boolean", example: "Yes" },
      { key: "owner", label: "Owner", type: "string", example: "Mary" },
      { key: "due_date", label: "Due date", type: "date", example: "2026-06-05" },
      { key: "status", label: "Status", type: "select", example: "Not Started", options: ["Not Started", "In Progress", "Done", "Blocked", "Deferred"] },
      { key: "caption_drafted", label: "Caption drafted", type: "boolean", example: "No" },
      { key: "posted", label: "Posted", type: "boolean", example: "No" },
      { key: "reposted", label: "Reposted", type: "boolean", example: "No" },
      { key: "link", label: "Link", type: "string", example: "https://instagram.com/p/example" },
      { key: "notes", label: "Notes", type: "string", example: "Waiting for permission form" },
      { key: "priority", label: "Priority", type: "select", example: "Medium", options: ["Low", "Medium", "High"] },
    ],
    transformRow: (row, context) => ({
      ...actorFields(context),
      week: text(row.week),
      content_type: text(row.content_type),
      student_product: text(row.student_product),
      asset_needed: text(row.asset_needed),
      permission_granted: bool(row.permission_granted),
      owner: text(row.owner),
      due_date: nullableDate(row.due_date),
      status: text(row.status) || "Not Started",
      caption_drafted: bool(row.caption_drafted),
      posted: bool(row.posted),
      reposted: bool(row.reposted),
      link: text(row.link),
      notes: text(row.notes),
      priority: text(row.priority) || "Medium",
    }),
  },
  {
    key: "partnerships",
    title: "Partnerships",
    description: "Import outreach pipelines, contacts, incentive requests, and follow-up plans.",
    table: "partnerships",
    modeDescription: "Append adds rows. Upsert matches by partner or platform.",
    uniqueRuleDescription: "Match key: partner_platform.",
    findExistingWhere: [["partner_platform"]],
    fields: [
      { key: "partner_platform", label: "Partner or platform", type: "string", required: true, example: "Flutterwave" },
      { key: "contact", label: "Contact", type: "string", example: "Jane Doe" },
      { key: "incentive_requested", label: "Incentive requested", type: "string", example: "Startup credits" },
      { key: "target_beneficiaries", label: "Target beneficiaries", type: "string", example: "Top 10 graduating teams" },
      { key: "status", label: "Status", type: "select", example: "In Progress", options: ["Not Started", "In Progress", "Done", "Blocked", "Deferred"] },
      { key: "owner", label: "Owner", type: "string", example: "Sam" },
      { key: "last_contact", label: "Last contact", type: "date", example: "2026-05-15" },
      { key: "next_follow_up", label: "Next follow-up", type: "date", example: "2026-05-30" },
      { key: "value", label: "Value", type: "string", example: "10 credits per team" },
      { key: "evidence_link", label: "Evidence link", type: "string", example: "https://docs.google.com/..." },
      { key: "notes", label: "Notes", type: "string", example: "Waiting on legal confirmation" },
      { key: "priority", label: "Priority", type: "select", example: "High", options: ["Low", "Medium", "High"] },
    ],
    transformRow: (row, context) => ({
      ...actorFields(context),
      partner_platform: text(row.partner_platform),
      contact: text(row.contact),
      incentive_requested: text(row.incentive_requested),
      target_beneficiaries: text(row.target_beneficiaries),
      status: text(row.status) || "Not Started",
      owner: text(row.owner),
      last_contact: nullableDate(row.last_contact),
      next_follow_up: nullableDate(row.next_follow_up),
      value: text(row.value),
      evidence_link: text(row.evidence_link),
      notes: text(row.notes),
      priority: text(row.priority) || "Medium",
    }),
  },
  {
    key: "alumni",
    title: "Alumni",
    description: "Import post-cohort follow-up, certificate status, group joins, and support needs.",
    table: "alumni",
    modeDescription: "Append adds rows. Upsert matches by email first, then name.",
    uniqueRuleDescription: "Match order: email, then name.",
    findExistingWhere: [["email"], ["name"]],
    fields: [
      { key: "name", label: "Name", type: "string", required: true, example: "Ada Okafor" },
      { key: "email", label: "Email", type: "string", example: "ada@example.com" },
      { key: "whatsapp", label: "WhatsApp", type: "string", example: "+2348000000000" },
      { key: "product", label: "Product", type: "string", example: "Finmate" },
      { key: "mvp_link", label: "MVP link", type: "string", example: "https://finmate.app" },
      { key: "certificate_issued", label: "Certificate issued", type: "boolean", example: "No" },
      { key: "badge_issued", label: "Badge issued", type: "boolean", example: "No" },
      { key: "posted_online", label: "Posted online", type: "boolean", example: "Yes" },
      { key: "reposted_by_tnx", label: "Reposted by TNX", type: "boolean", example: "No" },
      { key: "alumni_group_joined", label: "Alumni group joined", type: "boolean", example: "Yes" },
      { key: "next_step", label: "Next step", type: "string", example: "Invite to alumni spotlight" },
      { key: "support_needed", label: "Support needed", type: "string", example: "Pitch deck feedback" },
      { key: "follow_up_date", label: "Follow-up date", type: "date", example: "2026-06-10" },
      { key: "notes", label: "Notes", type: "string", example: "Interested in demo day recap" },
    ],
    transformRow: (row, context) => ({
      ...actorFields(context),
      name: text(row.name),
      email: text(row.email),
      whatsapp: text(row.whatsapp),
      product: text(row.product),
      mvp_link: text(row.mvp_link),
      certificate_issued: bool(row.certificate_issued),
      badge_issued: bool(row.badge_issued),
      posted_online: bool(row.posted_online),
      reposted_by_tnx: bool(row.reposted_by_tnx),
      alumni_group_joined: bool(row.alumni_group_joined),
      next_step: text(row.next_step),
      support_needed: text(row.support_needed),
      follow_up_date: nullableDate(row.follow_up_date),
      notes: text(row.notes),
    }),
  },
];

export function getImportDataset(key: string) {
  return importDatasets.find((dataset) => dataset.key === key);
}

export function getImportDatasetSummaries(): ImportDatasetSummary[] {
  const hiddenKeys = new Set<ImportDatasetKey>(["content", "recruitment", "partnerships"]);
  return importDatasets
    .filter((dataset) => !hiddenKeys.has(dataset.key))
    .map(({ transformRow: _transformRow, findExistingWhere: _findExistingWhere, serializeRecord: _serializeRecord, ...summary }) => summary);
}

export function getModuleForImportDataset(key: ImportDatasetKey) {
  return modules.find((moduleItem) => moduleItem.key === key);
}

// Single-dataset summary for per-page import (used by ModuleDataPage). Returns the summary
// even for datasets hidden from the central admin import grid.
export function getImportDatasetSummary(key: ImportDatasetKey): ImportDatasetSummary | null {
  const dataset = importDatasets.find((item) => item.key === key);
  if (!dataset) return null;
  const { transformRow: _transformRow, findExistingWhere: _findExistingWhere, serializeRecord: _serializeRecord, ...summary } = dataset;
  return summary;
}
