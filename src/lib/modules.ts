import {
  BadgeCheck,
  BarChart3,
  Bot,
  ClipboardCheck,
  Handshake,
  HeartPulse,
  Layers3,
  Megaphone,
  MessageCircle,
  FolderOpen,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";

export type ModuleKey =
  | "participants"
  | "reviews"
  | "ops"
  | "sessions"
  | "recruitment"
  | "community"
  | "partnerships"
  | "alumni";

export type FieldType = "text" | "textarea" | "select" | "number" | "boolean" | "date" | "json" | "weekday_accordion" | "participant_multiselect" | "checklist";

export const COHORT_WEEK_OPTIONS = ["Week 0", "Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"];

export type ModuleField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  editable?: boolean;
  options?: string[];
  placeholder?: string;
  // For type: "checklist" — the individual Yes/No items stored under the JSON column `key`.
  checklistItems?: Array<{ key: string; label: string }>;
};

export type ModuleQueue = {
  key: string;
  label: string;
  field: string;
  value: string | boolean | number;
};

export type ModuleConfig = {
  key: ModuleKey;
  title: string;
  singularTitle: string;
  route: string;
  table: string;
  sheetName: string;
  description: string;
  icon: typeof Users;
  columns: string[];
  accent: string;
  defaultSortField?: string;
  fields: ModuleField[];
  queueViews: ModuleQueue[];
  bulkEditableFields: string[];
};

export const navigationItems = [
  { title: "Dashboard", route: "/dashboard", icon: BarChart3 },
  { title: "My Tasks", route: "/tasks", icon: Bot },
  { title: "Participants", route: "/participants", icon: Users },
  { title: "Activities", route: "/activities", icon: ClipboardCheck },
  { title: "Cohorts", route: "/cohorts", icon: Layers3 },
  { title: "Ops", route: "/ops", icon: Sparkles },
  { title: "Sessions", route: "/sessions", icon: BadgeCheck },
  { title: "Community", route: "/community", icon: MessageCircle },
  { title: "Announcements", route: "/announcements", icon: Megaphone },
  { title: "Resources", route: "/resources", icon: FolderOpen },
  { title: "Alumni", route: "/alumni", icon: HeartPulse },
  { title: "Settings", route: "/settings", icon: Settings2 },
];

export const modules: ModuleConfig[] = [
  {
    key: "participants",
    title: "Participant Health",
    singularTitle: "Participant",
    route: "/participants",
    table: "participants",
    sheetName: "Participant Health",
    description: "Retention, risk, certification, ownership, and weekly attendance signals.",
    icon: Users,
    columns: ["full_name", "email", "attendance", "risk", "mvp_status", "demo_status", "cm_owner", "next_action"],
    accent: "from-emerald-500 to-teal-400",
    defaultSortField: "updated_at",
    bulkEditableFields: ["risk", "mvp_status", "demo_status", "cm_owner"],
    queueViews: [
      { key: "at-risk", label: "At risk", field: "risk", value: "Red" },
      { key: "pending-mvp", label: "MVP pending", field: "mvp_status", value: "Not Started" },
    ],
    fields: [
      { key: "full_name", label: "Full name", type: "text", required: true, editable: true },
      { key: "email", label: "Email", type: "text", editable: true },
      { key: "whatsapp", label: "WhatsApp", type: "text", editable: true },
      { key: "source", label: "Source", type: "text", editable: true },
      { key: "accepted", label: "Accepted", type: "boolean", editable: true },
      { key: "onboarding_complete", label: "Onboarding complete", type: "boolean", editable: true },
      { key: "risk", label: "Risk", type: "select", editable: true, options: ["Green", "Amber", "Red"] },
      { key: "mvp_status", label: "MVP status", type: "select", editable: true, options: ["Not Started", "In Progress", "Almost Done", "Completed"] },
      { key: "demo_status", label: "Demo status", type: "select", editable: true, options: ["Not Presented", "Live Presented", "Recorded Submitted", "Pending Recording"] },
      { key: "cm_owner", label: "CM owner", type: "text", editable: true },
      { key: "last_contact", label: "Last contact", type: "date", editable: true },
      { key: "next_action", label: "Next action", type: "textarea", editable: true },
      { key: "notes", label: "Notes", type: "textarea", editable: true },
    ],
  },
  {
    key: "reviews",
    title: "Activities",
    singularTitle: "Activity",
    route: "/activities",
    table: "assignment_reviews",
    sheetName: "Assignment Review Queue",
    description: "Submission tracking, reviewer ownership, feedback loops, and resubmissions.",
    icon: ClipboardCheck,
    columns: ["week", "participant_name", "submitted", "reviewer", "review_status", "quality_score"],
    accent: "from-blue-500 to-cyan-400",
    defaultSortField: "review_due",
    bulkEditableFields: ["submitted", "review_status", "reviewer", "final_status"],
    queueViews: [
      { key: "needs-review", label: "Needs review", field: "review_status", value: "Not Reviewed" },
      { key: "resubmission", label: "Needs resubmission", field: "review_status", value: "Needs Resubmission" },
    ],
    fields: [
      { key: "week", label: "Week", type: "text", editable: true, required: true },
      { key: "assignment", label: "Assignment label", type: "text", editable: true },
      { key: "participant_name", label: "Participant", type: "text", editable: true, required: true },
      { key: "submission_link", label: "Submission link", type: "text", editable: true },
      { key: "submitted", label: "Submitted", type: "boolean", editable: true },
      { key: "submitted_at", label: "Submitted at", type: "date", editable: true },
      { key: "reviewer", label: "Reviewer", type: "text", editable: true },
      { key: "review_status", label: "Review status", type: "select", editable: true, options: ["Not Reviewed", "In Review", "Feedback Sent", "Needs Resubmission", "Closed"] },
      { key: "feedback_sent", label: "Feedback sent", type: "boolean", editable: true },
      { key: "resubmission_needed", label: "Resubmission needed", type: "boolean", editable: true },
      { key: "final_status", label: "Final status", type: "text", editable: true },
      { key: "quality_score", label: "Quality score", type: "number", editable: true },
      { key: "feedback_summary", label: "Feedback summary", type: "textarea", editable: true },
      { key: "deadline", label: "Deadline", type: "date", editable: true },
      { key: "review_due", label: "Review due", type: "date", editable: true },
      { key: "notes", label: "Notes", type: "textarea", editable: true },
    ],
  },
  {
    key: "ops",
    title: "Weekly Ops",
    singularTitle: "Ops task",
    route: "/ops",
    table: "weekly_ops_tasks",
    sheetName: "Weekly Ops Plan",
    description: "Day-by-day programme delivery tasks, channels, due times, and evidence links.",
    icon: Sparkles,
    columns: ["week", "day", "action", "owner", "status", "priority"],
    accent: "from-amber-500 to-orange-400",
    defaultSortField: "updated_at",
    bulkEditableFields: ["status", "owner", "priority"],
    queueViews: [
      { key: "blocked", label: "Blocked", field: "status", value: "Blocked" },
      { key: "in-progress", label: "In progress", field: "status", value: "In Progress" },
    ],
    fields: [
      { key: "week", label: "Week", type: "text", editable: true, required: true },
      { key: "day", label: "Day", type: "select", editable: true, options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
      { key: "action", label: "Action", type: "textarea", editable: true, required: true },
      { key: "owner", label: "Owner", type: "select", editable: true, options: ["CM Lead", "CMs", "Facilitator", "Admin", "All Staff"] },
      { key: "support", label: "Support", type: "text", editable: true },
      { key: "channel", label: "Channel", type: "select", editable: true, options: ["WhatsApp", "Email", "Email + WhatsApp", "Google Classroom", "Live session", "Other"] },
      { key: "due_time", label: "Due time", type: "text", editable: true },
      { key: "status", label: "Status", type: "select", editable: true, options: ["Not Started", "In Progress", "Done", "Blocked", "Deferred"] },
      { key: "evidence_link", label: "Evidence link", type: "text", editable: true },
      { key: "priority", label: "Priority", type: "select", editable: true, options: ["Low", "Medium", "High"] },
      { key: "notes", label: "Notes", type: "textarea", editable: true },
    ],
  },
  {
    key: "sessions",
    title: "Session Readiness",
    singularTitle: "Session",
    route: "/sessions",
    table: "session_readiness",
    sheetName: "Session Readiness",
    description: "Pre-session readiness checks for slides, activities, briefs, reminders, and recordings.",
    icon: BadgeCheck,
    columns: ["week", "session_date", "session_lead", "topic", "readiness_score", "support_assigned"],
    accent: "from-sky-500 to-indigo-400",
    defaultSortField: "session_date",
    bulkEditableFields: ["support_assigned"],
    queueViews: [
      { key: "incomplete", label: "Incomplete", field: "readiness_score", value: 0 },
    ],
    fields: [
      { key: "week", label: "Week", type: "text", editable: true, required: true },
      { key: "session_date", label: "Session date", type: "date", editable: true },
      { key: "session_lead", label: "Session lead", type: "text", editable: true },
      { key: "topic", label: "Topic", type: "textarea", editable: true },
      { key: "support_assigned", label: "Support assigned", type: "text", editable: true },
      {
        key: "checklist",
        label: "Readiness checklist",
        type: "checklist",
        editable: true,
        checklistItems: [
          { key: "slides_ready", label: "Slides ready" },
          { key: "activity_ready", label: "Activity ready" },
          { key: "assignment_brief_ready", label: "Assignment brief ready" },
          { key: "recording_plan", label: "Recording plan" },
          { key: "email_reminder_sent", label: "Email reminder sent" },
          { key: "whatsapp_reminder_sent", label: "WhatsApp reminder sent" },
        ],
      },
    ],
  },
  {
    key: "recruitment",
    title: "Recruitment Funnel",
    singularTitle: "Recruitment channel",
    route: "/recruitment",
    table: "recruitment_channels",
    sheetName: "Recruitment Funnel",
    description: "Channel targets, registrations, onboarding movement, activity, and graduates.",
    icon: Megaphone,
    columns: ["channel", "target_registrations", "registrations", "accepted", "attended_week_1", "graduated"],
    accent: "from-rose-500 to-pink-400",
    defaultSortField: "updated_at",
    bulkEditableFields: ["registrations", "accepted", "graduated"],
    queueViews: [
      { key: "low-conversion", label: "Low conversion", field: "graduated", value: 0 },
    ],
    fields: [
      { key: "channel", label: "Channel", type: "text", editable: true, required: true },
      { key: "target_audience", label: "Target audience", type: "text", editable: true },
      { key: "target_registrations", label: "Target registrations", type: "number", editable: true },
      { key: "registrations", label: "Registrations", type: "number", editable: true },
      { key: "accepted", label: "Accepted", type: "number", editable: true },
      { key: "joined_whatsapp", label: "Joined WhatsApp", type: "number", editable: true },
      { key: "joined_classroom", label: "Joined classroom", type: "number", editable: true },
      { key: "attended_week_1", label: "Attended week 1", type: "number", editable: true },
      { key: "active_by_week_3", label: "Active by week 3", type: "number", editable: true },
      { key: "graduated", label: "Graduated", type: "number", editable: true },
      { key: "notes", label: "Notes", type: "textarea", editable: true },
    ],
  },
  {
    key: "community",
    title: "CM Tracker",
    singularTitle: "CM report",
    route: "/community",
    table: "cm_reports",
    sheetName: "CM Tracker",
    description: "Community manager reports, silent students, stuck students, escalations, and next actions.",
    icon: MessageCircle,
    columns: ["week", "cm", "silent_students", "stuck_students", "escalations_raised", "status"],
    accent: "from-lime-500 to-green-400",
    defaultSortField: "updated_at",
    bulkEditableFields: ["status", "cm"],
    queueViews: [
      { key: "escalated", label: "Escalated", field: "escalations_raised", value: 1 },
    ],
    fields: [
      { key: "week", label: "Week", type: "select", editable: true, required: true, options: COHORT_WEEK_OPTIONS },
      // cm is derived from the signed-in user on create; hidden from the form but kept in DB
      { key: "cm", label: "Community manager", type: "text", editable: false },
      { key: "prompts_posted_days", label: "Prompts posted", type: "weekday_accordion", editable: true },
      { key: "silent_student_ids", label: "Silent students", type: "participant_multiselect", editable: true },
      { key: "stuck_student_ids", label: "Stuck students", type: "participant_multiselect", editable: true },
      { key: "weekly_report_sent", label: "Weekly report sent", type: "boolean", editable: true },
      { key: "energy_level", label: "Energy level", type: "select", editable: true, options: ["Low", "Medium", "High"] },
      { key: "key_concerns", label: "Key concerns", type: "textarea", editable: true },
      { key: "next_actions", label: "Next actions", type: "textarea", editable: true },
      // Status is derived from whether the report is filled — hidden from the CM form but
      // kept on the record so the community page's "Report done" badge still works.
      { key: "status", label: "Status", type: "select", editable: false, options: ["Not Started", "In Progress", "Done", "Blocked", "Deferred"] },
    ],
  },
  {
    key: "partnerships",
    title: "Partnerships",
    singularTitle: "Partnership",
    route: "/partnerships",
    table: "partnerships",
    sheetName: "Partnerships & Incentives",
    description: "Credits, mentors, grants, incentives, ownership, and follow-up status.",
    icon: Handshake,
    columns: ["partner_platform", "incentive_requested", "status", "owner", "next_follow_up", "priority"],
    accent: "from-violet-500 to-purple-400",
    defaultSortField: "next_follow_up",
    bulkEditableFields: ["status", "owner", "priority"],
    queueViews: [
      { key: "follow-up", label: "Needs follow-up", field: "status", value: "In Progress" },
    ],
    fields: [
      { key: "partner_platform", label: "Partner or platform", type: "text", editable: true, required: true },
      { key: "contact", label: "Contact", type: "text", editable: true },
      { key: "incentive_requested", label: "Incentive requested", type: "textarea", editable: true },
      { key: "target_beneficiaries", label: "Target beneficiaries", type: "text", editable: true },
      { key: "status", label: "Status", type: "select", editable: true, options: ["Not Started", "In Progress", "Done", "Blocked", "Deferred"] },
      { key: "owner", label: "Owner", type: "text", editable: true },
      { key: "last_contact", label: "Last contact", type: "date", editable: true },
      { key: "next_follow_up", label: "Next follow-up", type: "date", editable: true },
      { key: "value", label: "Value", type: "text", editable: true },
      { key: "evidence_link", label: "Evidence link", type: "text", editable: true },
      { key: "notes", label: "Notes", type: "textarea", editable: true },
      { key: "priority", label: "Priority", type: "select", editable: true, options: ["Low", "Medium", "High"] },
    ],
  },
  {
    key: "alumni",
    title: "Alumni",
    singularTitle: "Alumni record",
    route: "/alumni",
    table: "alumni",
    sheetName: "Alumni Tracker",
    description: "Certificates, badges, groups, online posts, support needs, and follow-up dates.",
    icon: HeartPulse,
    columns: ["name", "email", "product", "certificate_issued", "badge_issued", "next_step"],
    accent: "from-slate-600 to-slate-400",
    defaultSortField: "follow_up_date",
    bulkEditableFields: ["certificate_issued", "badge_issued", "alumni_group_joined"],
    queueViews: [
      { key: "needs-certificate", label: "Needs certificate", field: "certificate_issued", value: false },
    ],
    fields: [
      { key: "name", label: "Name", type: "text", editable: true, required: true },
      { key: "email", label: "Email", type: "text", editable: true },
      { key: "whatsapp", label: "WhatsApp", type: "text", editable: true },
      { key: "product", label: "Product", type: "text", editable: true },
      { key: "mvp_link", label: "MVP link", type: "text", editable: true },
      { key: "certificate_issued", label: "Certificate issued", type: "boolean", editable: true },
      { key: "badge_issued", label: "Badge issued", type: "boolean", editable: true },
      { key: "posted_online", label: "Posted online", type: "boolean", editable: true },
      { key: "reposted_by_tnx", label: "Reposted by TNX", type: "boolean", editable: true },
      { key: "alumni_group_joined", label: "Joined alumni group", type: "boolean", editable: true },
      { key: "next_step", label: "Next step", type: "textarea", editable: true },
      { key: "support_needed", label: "Support needed", type: "textarea", editable: true },
      { key: "follow_up_date", label: "Follow-up date", type: "date", editable: true },
      { key: "notes", label: "Notes", type: "textarea", editable: true },
    ],
  },
];

export function getModuleByRoute(route: string) {
  return modules.find((moduleItem) => moduleItem.route === route);
}

export function getModuleByKey(moduleKey: string) {
  return modules.find((moduleItem) => moduleItem.key === moduleKey);
}

export function getModuleByTable(table: string) {
  return modules.find((moduleItem) => moduleItem.table === table);
}

export function humanizeColumn(column: string) {
  return column.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
