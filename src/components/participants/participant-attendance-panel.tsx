import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type AttendanceRow = {
  week: string;
  signed_in_at: string | null;
  signed_out_at: string | null;
};

function timeLabel(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Per-participant attendance: every plan week, with exact sign-in / sign-out times. Weeks
 * with no record show as "Absent" so the full picture (e.g. 3 of 6) reads at a glance.
 */
export function ParticipantAttendancePanel({ weeks, rows }: { weeks: string[]; rows: AttendanceRow[] }) {
  const byWeek = new Map(rows.map((r) => [r.week, r]));
  const attendedCount = rows.filter((r) => r.signed_in_at).length;

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Attendance</p>
          <p className="mt-1 text-sm text-muted-foreground">Sign-in and sign-out times per week.</p>
        </div>
        <Badge tone="blue">{attendedCount}/{weeks.length || "—"} attended</Badge>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            <tr>
              <th className="px-4 py-2.5">Week</th>
              <th className="px-4 py-2.5">Signed in</th>
              <th className="px-4 py-2.5">Signed out</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {weeks.map((week) => {
              const r = byWeek.get(week);
              const present = Boolean(r?.signed_in_at);
              return (
                <tr key={week}>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{week}</td>
                  {present ? (
                    <>
                      <td className="px-4 py-2.5 text-slate-700">{timeLabel(r?.signed_in_at ?? null)}</td>
                      <td className="px-4 py-2.5 text-slate-700">{timeLabel(r?.signed_out_at ?? null)}</td>
                    </>
                  ) : (
                    <td className="px-4 py-2.5 text-slate-400" colSpan={2}>Absent</td>
                  )}
                </tr>
              );
            })}
            {!weeks.length ? (
              <tr>
                <td className="px-4 py-6 text-center text-muted-foreground" colSpan={3}>No weeks defined for this cohort yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
