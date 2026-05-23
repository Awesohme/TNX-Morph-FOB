import {
  BadgeCheck,
  BarChart3,
  ClipboardCheck,
  FileSpreadsheet,
  GalleryVerticalEnd,
  Handshake,
  HeartPulse,
  Megaphone,
  MessageCircle,
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
  | "content"
  | "partnerships"
  | "alumni";

export type ModuleConfig = {
  key: ModuleKey;
  title: string;
  route: string;
  table: string;
  sheetName: string;
  description: string;
  icon: typeof Users;
  columns: string[];
  accent: string;
};

export const navigationItems = [
  { title: "Dashboard", route: "/dashboard", icon: BarChart3 },
  { title: "Participants", route: "/participants", icon: Users },
  { title: "Reviews", route: "/reviews", icon: ClipboardCheck },
  { title: "Ops", route: "/ops", icon: Sparkles },
  { title: "Sessions", route: "/sessions", icon: BadgeCheck },
  { title: "Recruitment", route: "/recruitment", icon: Megaphone },
  { title: "Community", route: "/community", icon: MessageCircle },
  { title: "Content", route: "/content", icon: GalleryVerticalEnd },
  { title: "Partnerships", route: "/partnerships", icon: Handshake },
  { title: "Alumni", route: "/alumni", icon: HeartPulse },
  { title: "Settings", route: "/settings", icon: Settings2 },
  { title: "Import", route: "/admin/import", icon: FileSpreadsheet },
];

export const modules: ModuleConfig[] = [
  {
    key: "participants",
    title: "Participant Health",
    route: "/participants",
    table: "participants",
    sheetName: "Participant Health",
    description: "Retention, risk, certification, ownership, and weekly attendance signals.",
    icon: Users,
    columns: ["full_name", "email", "risk", "mvp_status", "demo_status", "cm_owner", "next_action"],
    accent: "from-emerald-500 to-teal-400",
  },
  {
    key: "reviews",
    title: "Assignment Reviews",
    route: "/reviews",
    table: "assignment_reviews",
    sheetName: "Assignment Review Queue",
    description: "Submission tracking, reviewer ownership, feedback loops, and resubmissions.",
    icon: ClipboardCheck,
    columns: ["week", "assignment", "participant_name", "reviewer", "review_status", "quality_score"],
    accent: "from-blue-500 to-cyan-400",
  },
  {
    key: "ops",
    title: "Weekly Ops",
    route: "/ops",
    table: "weekly_ops_tasks",
    sheetName: "Weekly Ops Plan",
    description: "Day-by-day programme delivery tasks, channels, due times, and evidence links.",
    icon: Sparkles,
    columns: ["week", "day", "action", "owner", "status", "priority"],
    accent: "from-amber-500 to-orange-400",
  },
  {
    key: "sessions",
    title: "Session Readiness",
    route: "/sessions",
    table: "session_readiness",
    sheetName: "Session Readiness",
    description: "Pre-session readiness checks for slides, activities, briefs, reminders, and recordings.",
    icon: BadgeCheck,
    columns: ["week", "session_date", "session_lead", "topic", "readiness_score", "support_assigned"],
    accent: "from-sky-500 to-indigo-400",
  },
  {
    key: "recruitment",
    title: "Recruitment Funnel",
    route: "/recruitment",
    table: "recruitment_channels",
    sheetName: "Recruitment Funnel",
    description: "Channel targets, registrations, onboarding movement, activity, and graduates.",
    icon: Megaphone,
    columns: ["channel", "target_registrations", "registrations", "accepted", "attended_week_1", "graduated"],
    accent: "from-rose-500 to-pink-400",
  },
  {
    key: "community",
    title: "CM Tracker",
    route: "/community",
    table: "cm_reports",
    sheetName: "CM Tracker",
    description: "Community manager reports, silent students, stuck students, escalations, and next actions.",
    icon: MessageCircle,
    columns: ["week", "cm", "silent_students", "stuck_students", "escalations_raised", "status"],
    accent: "from-lime-500 to-green-400",
  },
  {
    key: "content",
    title: "Content Pipeline",
    route: "/content",
    table: "content_items",
    sheetName: "Content Pipeline",
    description: "Proof capture, permissions, captions, posting status, and campaign assets.",
    icon: GalleryVerticalEnd,
    columns: ["week", "content_type", "student_product", "owner", "status", "priority"],
    accent: "from-fuchsia-500 to-rose-400",
  },
  {
    key: "partnerships",
    title: "Partnerships",
    route: "/partnerships",
    table: "partnerships",
    sheetName: "Partnerships & Incentives",
    description: "Credits, mentors, grants, incentives, ownership, and follow-up status.",
    icon: Handshake,
    columns: ["partner_platform", "incentive_requested", "status", "owner", "next_follow_up", "priority"],
    accent: "from-violet-500 to-purple-400",
  },
  {
    key: "alumni",
    title: "Alumni",
    route: "/alumni",
    table: "alumni",
    sheetName: "Alumni Tracker",
    description: "Certificates, badges, groups, online posts, support needs, and follow-up dates.",
    icon: HeartPulse,
    columns: ["name", "email", "product", "certificate_issued", "badge_issued", "next_step"],
    accent: "from-slate-600 to-slate-400",
  },
];

export function getModuleByRoute(route: string) {
  return modules.find((moduleItem) => moduleItem.route === route);
}

export function humanizeColumn(column: string) {
  return column.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
