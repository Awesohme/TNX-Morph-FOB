import { AlertTriangle } from "lucide-react";
import { updateEscalationStatusAction } from "@/lib/actions/escalations";
import { ESCALATION_STATUSES } from "@/lib/escalation-config";
import { Card } from "@/components/ui/card";
import { RaiseEscalationForm } from "@/components/escalations/raise-escalation-form";
import { SubmitButton } from "@/components/ui/submit-button";

type EscalationRow = {
  id: string;
  category: string;
  severity: string;
  notes: string | null;
  status: string;
  created_at: string;
};

const severityColors: Record<string, string> = {
  Low: "bg-amber-50 text-amber-700 border-amber-200",
  Medium: "bg-orange-50 text-orange-700 border-orange-200",
  High: "bg-rose-50 text-rose-700 border-rose-200",
};

const statusColors: Record<string, string> = {
  "Pending review": "bg-amber-50 text-amber-700",
  "Under review": "bg-blue-50 text-blue-700",
  Closed: "bg-emerald-50 text-emerald-700",
};

export function ParticipantEscalationsPanel({
  escalations,
  cohortId,
  participantId,
  participantName,
  returnTo,
}: {
  escalations: EscalationRow[];
  cohortId: string;
  participantId: string;
  participantName: string;
  returnTo: string;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Safeguarding</p>
          <h2 className="text-xl font-semibold">Escalations</h2>
        </div>
        <RaiseEscalationForm
          cohortId={cohortId}
          participantId={participantId}
          participantName={participantName}
          returnTo={returnTo}
        />
      </div>

      {escalations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm text-muted-foreground">
          No safeguarding concerns recorded for this participant.
        </div>
      ) : (
        <div className="space-y-3">
          {escalations.map((esc) => (
            <div key={esc.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-rose-500" />
                  <p className="text-sm font-medium text-slate-900">{esc.category}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${severityColors[esc.severity] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                    {esc.severity}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[esc.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {esc.status}
                  </span>
                </div>
              </div>

              {esc.notes ? (
                <p className="text-sm leading-6 text-slate-600 whitespace-pre-wrap">{esc.notes}</p>
              ) : null}

              <form action={updateEscalationStatusAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="escalationId" value={esc.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <select
                  name="status"
                  defaultValue={esc.status}
                  aria-label="Update escalation status"
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none"
                >
                  {ESCALATION_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <SubmitButton pendingLabel="Updating…" size="sm" variant="outline">
                  Update status
                </SubmitButton>
                <span className="text-xs text-muted-foreground">
                  {new Date(esc.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </form>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
