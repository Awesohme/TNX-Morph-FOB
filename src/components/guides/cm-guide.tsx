import { BookOpen, CalendarDays, Flag, Megaphone, Smartphone, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const weeklyRhythm = [
  { day: "Midweek (Wed)", action: "Check in with the cohort, update each participant’s attendance + submission, flag who’s gone silent or stuck." },
  { day: "Deadline day (Thu)", action: "Confirm submissions are logged on Participants and Reviews." },
  { day: "End of week (Fri)", action: "Fill in your Community row: prompts, attendance/submissions updated, silent + stuck counts, escalations, energy, concerns, next actions. Mark Status = Done." },
];

export function CmGuide() {
  return (
    <details className="group app-panel p-5">
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
              <BookOpen className="size-5" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-950">Community Manager guide</p>
              <p className="mt-1 text-sm text-slate-500">How to use the control room day to day.</p>
            </div>
          </div>
          <Badge tone="blue">Guide</Badge>
        </div>
      </summary>

      <div className="mt-5 space-y-6 border-t border-slate-100 pt-5">
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Smartphone className="size-4 text-slate-700" />
            <p className="text-sm font-semibold text-slate-950">First time in</p>
          </div>
          <ul className="ml-1 space-y-1 text-sm text-slate-700">
            <li>• Sign in with your temporary password, then set your own when asked (just once).</li>
            <li>• Add the app to your phone home screen and <strong>allow notifications</strong> so reminders reach you.</li>
          </ul>
        </section>

        <section className="grid gap-2 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="font-medium text-slate-950">You can see</p>
            <p className="mt-1 text-slate-600">Everything — all pages are open to you.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="font-medium text-slate-950">You can edit</p>
            <p className="mt-1 text-slate-600">Participants and Community (CM Tracker).</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="font-medium text-slate-950">You action</p>
            <p className="mt-1 text-slate-600">My Tasks — items tagged to your role.</p>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-slate-700" />
            <p className="text-sm font-semibold text-slate-950">Your daily 5 minutes</p>
          </div>
          <ul className="ml-1 space-y-1 text-sm text-slate-700">
            <li>1. Open <strong>My Tasks</strong> — clear anything overdue or comment why it’s blocked.</li>
            <li>2. Check <strong>Dashboard → Workload by owner</strong> — clear your role’s overdue.</li>
            <li>3. Glance at <strong>Today’s attention</strong> for red-risk students or review backlog.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-slate-700" />
            <p className="text-sm font-semibold text-slate-950">Your weekly rhythm</p>
          </div>
          <div className="grid gap-2">
            {weeklyRhythm.map((item) => (
              <div key={item.day} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <Badge tone="amber">{item.day}</Badge>
                <p className="mt-2 text-slate-700">{item.action}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-2 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <div className="flex items-center gap-2">
              <Flag className="size-4 text-rose-600" />
              <p className="font-medium text-slate-950">Flagging at-risk students</p>
            </div>
            <p className="mt-1 text-slate-600">On Participants, set Risk = Red (or Amber) and add a Next action. Setting Red auto-creates an outreach task — flagging is how you trigger help.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <div className="flex items-center gap-2">
              <Megaphone className="size-4 text-slate-700" />
              <p className="font-medium text-slate-950">Raising an escalation</p>
            </div>
            <p className="mt-1 text-slate-600">Bump “Escalations raised” on your weekly Community row and note it in Key concerns. It surfaces to the core team — the right way to pull in leads.</p>
          </div>
        </section>

        <p className="text-xs text-slate-500">One source of truth: the app, not a side sheet. Update the same day — stale data hides risk.</p>
      </div>
    </details>
  );
}
