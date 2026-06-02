import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export type AttendanceRow = {
  week: string;
  signed_in_at: string | null;
  signed_out_at: string | null;
  topic_baseline?: string | null;
  knowledge_before_rating?: number | null;
  session_takeaway?: string | null;
  session_summary?: string | null;
  next_step?: string | null;
  knowledge_after_rating?: number | null;
  feedback?: string | null;
};

function timeLabel(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function statusTone(row?: AttendanceRow) {
  if (row?.signed_in_at && row?.signed_out_at) return "green" as const;
  if (row?.signed_in_at || row?.signed_out_at) return "amber" as const;
  return "neutral" as const;
}

function statusLabel(row?: AttendanceRow) {
  if (row?.signed_in_at && row?.signed_out_at) return "Completed";
  if (row?.signed_in_at || row?.signed_out_at) return "In progress";
  return "Absent";
}

function ratingLabel(value?: number | null) {
  return value ? `${value}/5` : "—";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-slate-700">{value}</p>
    </div>
  );
}

function LongInfo({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

export function ParticipantAttendancePanel({ weeks, rows }: { weeks: string[]; rows: AttendanceRow[] }) {
  const byWeek = new Map(rows.map((r) => [r.week, r]));
  const attendedCount = rows.filter((r) => r.signed_in_at && r.signed_out_at).length;

  return (
    <details className="group">
      <summary className="list-none">
        <Card className="overflow-hidden p-0">
          <div className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Attendance</h3>
              <p className="mt-1 text-sm text-muted-foreground">Pre-session baseline, sign-in and sign-out, plus the participant&apos;s session reflection.</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone="blue">{attendedCount}/{weeks.length || "—"} attended</Badge>
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 group-open:hidden">Show</span>
              <span className="hidden text-xs font-medium uppercase tracking-[0.12em] text-slate-400 group-open:inline">Hide</span>
            </div>
          </div>
        </Card>
      </summary>

      <Card className="-mt-3 overflow-hidden border-t-0 pt-4">
        <div className="grid gap-3 border-t border-slate-100 px-5 py-5">
          {weeks.map((week) => {
            const row = byWeek.get(week);
            return (
              <div key={week} className="rounded-[24px] border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{week}</h3>
                    <p className="text-sm text-slate-500">Participant-level attendance and reflection for this session week.</p>
                  </div>
                  <Badge tone={statusTone(row)}>{statusLabel(row)}</Badge>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Info label="Signed in" value={timeLabel(row?.signed_in_at ?? null)} />
                  <Info label="Signed out" value={timeLabel(row?.signed_out_at ?? null)} />
                  <Info label="Knowledge before" value={ratingLabel(row?.knowledge_before_rating)} />
                  <Info label="Knowledge after" value={ratingLabel(row?.knowledge_after_rating)} />
                </div>

                <div className="mt-4 grid gap-3">
                  <LongInfo label="What they knew before class" value={row?.topic_baseline} />
                  <LongInfo label="What they got from the session" value={row?.session_takeaway} />
                  <LongInfo label="Session summary" value={row?.session_summary} />
                  <LongInfo label="Next step" value={row?.next_step} />
                  <LongInfo label="Feedback" value={row?.feedback} />
                </div>
              </div>
            );
          })}

          {!weeks.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm text-muted-foreground">
              No weeks defined for this cohort yet.
            </div>
          ) : null}
        </div>
      </Card>
    </details>
  );
}
