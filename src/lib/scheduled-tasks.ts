import { createAdminClient } from "@/lib/supabase/admin";

// Weekly operations cadence (from the workbook's Weekly Ops Plan). Each week of
// the programme has the same 7 recurring actions, anchored to that week's
// Saturday live session. Offsets are days relative to the Saturday (0 = Sat).
// Owners are role LABELS, not people — they land in /tasks under the role until
// a profile is mapped, so unowned work is visible instead of defaulting to one person.
type CadenceItem = {
  key: string;
  title: string;
  description: string;
  dayOffset: number; // days from the week's Saturday session
  hourUtc: number; // due time, UTC
  ownerLabel: string;
  priority: "Low" | "Medium" | "High";
};

const WEEKLY_CADENCE: CadenceItem[] = [
  { key: "reminder", title: "Send session reminder + confirm readiness", description: "Email + WhatsApp reminder for the live session; confirm everything is ready.", dayOffset: -1, hourUtc: 17, ownerLabel: "Iyanu", priority: "High" },
  { key: "run", title: "Run live session and record", description: "Deliver the live session and capture the recording.", dayOffset: 0, hourUtc: 14, ownerLabel: "Session Lead", priority: "High" },
  { key: "upload", title: "Upload recording + materials", description: "Post recording and materials to Classroom + email.", dayOffset: 0, hourUtc: 18, ownerLabel: "CM Lead", priority: "High" },
  { key: "recap", title: "Send weekly recap + assignment brief", description: "Send the recap, recording, assignment, and deadline via email + WhatsApp.", dayOffset: 2, hourUtc: 9, ownerLabel: "CM Lead", priority: "High" },
  { key: "checkin", title: "Midweek check-in + identify stuck students", description: "Check in on the cohort and flag silent/stuck students.", dayOffset: 4, hourUtc: 11, ownerLabel: "CM Owner", priority: "Medium" },
  { key: "deadline", title: "Submission deadline + update tracker", description: "Close the submission window and update the participant + review trackers.", dayOffset: 5, hourUtc: 20, ownerLabel: "CM Owner", priority: "High" },
  { key: "report", title: "Review queue update + weekly report", description: "Update the review queue and send the weekly report to the core team.", dayOffset: 6, hourUtc: 17, ownerLabel: "CM Owner", priority: "High" },
];

const PROGRAMME_WEEKS = 7; // Week 0 (onboarding) through Week 6.
const HORIZON_DAYS = 14; // Only materialise tasks due within this many days, so /tasks isn't flooded up front.

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

// Week 0's Saturday session = first Saturday on/after starts_on.
function firstSaturday(startsOn: Date) {
  const day = startsOn.getUTCDay(); // 0 Sun .. 6 Sat
  const offset = (6 - day + 7) % 7;
  return addDays(startsOn, offset);
}

export async function generateScheduledTasks(supabase = createAdminClient()) {
  const { data: cohorts, error } = await supabase
    .from("cohorts")
    .select("id, starts_on, status")
    .not("starts_on", "is", null)
    .in("status", ["planning", "active"]);

  if (error) throw error;

  const now = new Date();
  const horizon = addDays(now, HORIZON_DAYS);
  let created = 0;
  let skipped = 0;

  for (const cohort of cohorts ?? []) {
    if (!cohort.starts_on) continue;
    const week0Saturday = firstSaturday(new Date(`${cohort.starts_on}T00:00:00Z`));

    for (let week = 0; week < PROGRAMME_WEEKS; week += 1) {
      const weekSaturday = addDays(week0Saturday, week * 7);

      for (const item of WEEKLY_CADENCE) {
        const dueAt = addDays(weekSaturday, item.dayOffset);
        dueAt.setUTCHours(item.hourUtc, 0, 0, 0);

        // Only materialise tasks within the rolling horizon, and skip ones already past.
        if (dueAt > horizon || dueAt < now) {
          skipped += 1;
          continue;
        }

        // Idempotency: one task per (cohort, week, cadence key), keyed via metadata.
        const scheduleKey = `${week}:${item.key}`;
        const { data: existing } = await supabase
          .from("tasks")
          .select("id")
          .eq("cohort_id", cohort.id)
          .eq("source_record_type", "schedule")
          .contains("metadata", { schedule_key: scheduleKey })
          .limit(1)
          .maybeSingle();

        if (existing) {
          skipped += 1;
          continue;
        }

        const { error: insertError } = await supabase.from("tasks").insert({
          cohort_id: cohort.id,
          source_record_type: "schedule",
          task_type: "weekly_ops",
          title: `Week ${week}: ${item.title}`,
          description: item.description,
          status: "Open",
          priority: item.priority,
          due_at: dueAt.toISOString(),
          assigned_label: item.ownerLabel,
          metadata: { schedule_key: scheduleKey, week, cadence: item.key },
        });
        if (insertError) throw insertError;
        created += 1;
      }
    }
  }

  return { created, skipped };
}
