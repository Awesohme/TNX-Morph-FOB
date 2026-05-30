import { Bot, CalendarClock, BellRing, MousePointerClick } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const eventRules = [
  { when: "Session readiness drops below 100%", task: "Finish session prep", owner: "Session Lead" },
  { when: "A review is set to “Not Reviewed”", task: "Review the submission", owner: "Reviewer" },
  { when: "A review needs resubmission", task: "Chase the learner", owner: "CM Owner" },
  { when: "A participant’s Risk = Red", task: "Reach out to the student", owner: "CM Owner" },
];

export function AutomationGuide() {
  return (
    <details className="group app-panel p-5">
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
              <Bot className="size-5" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-950">How automation works</p>
              <p className="mt-1 text-sm text-slate-500">How tasks get created and assigned automatically.</p>
            </div>
          </div>
          <Badge tone="blue">Guide</Badge>
        </div>
      </summary>

      <div className="mt-5 space-y-6 border-t border-slate-100 pt-5">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <MousePointerClick className="size-4 text-slate-700" />
            <p className="text-sm font-semibold text-slate-950">1. Event rules: fire when you edit a record</p>
          </div>
          <div className="grid gap-2">
            {eventRules.map((rule) => (
              <div key={rule.task} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <span className="text-slate-700">{rule.when}</span>
                <span className="text-slate-400">→</span>
                <span className="font-medium text-slate-950">{rule.task}</span>
                <Badge tone="amber">{rule.owner}</Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Labels are <strong>roles, not people</strong>: tasks show under that role in My Tasks and Dashboard → Workload by owner. Assign a real person and they get push reminders. Matching open tasks are never duplicated.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-slate-700" />
            <p className="text-sm font-semibold text-slate-950">2. Weekly cadence: runs daily on a schedule</p>
          </div>
          <p className="text-sm text-slate-700">
            A daily job creates the recurring weekly-ops tasks (Friday reminder, Saturday session, upload, Monday recap, midweek check-in, deadline, weekly report) for each programme week. Due dates come from the <strong>cohort start date</strong>; only tasks due within ~2 weeks are created at a time, so the list isn’t flooded.
          </p>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <BellRing className="size-4 text-slate-700" />
            <p className="text-sm font-semibold text-slate-950">Reminders</p>
          </div>
          <p className="text-sm text-slate-700">
            Tasks with <strong>both</strong> an assigned person and a due date trigger web-push reminders once a day. Role-only tasks stay visible in the app but don’t push until assigned.
          </p>
        </section>
      </div>
    </details>
  );
}
