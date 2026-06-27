"use client";

import { useActionState } from "react";
import { useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { createEscalationAction } from "@/lib/actions/escalations";
import { initialEscalationState, ESCALATION_CATEGORIES, ESCALATION_SEVERITIES } from "@/lib/escalation-config";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SelectMenu } from "@/components/ui/select-menu";
import { ModalShell } from "@/components/ui/modal-shell";
import { RequiredLabel } from "@/components/ui/required-indicator";

export function RaiseEscalationForm({
  cohortId,
  participantId,
  participantName,
  returnTo,
}: {
  cohortId: string;
  participantId?: string;
  participantName?: string;
  returnTo: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState(createEscalationAction, initialEscalationState);

  if (state.ok && open) setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
      >
        <AlertTriangle className="size-4" />
        Raise safeguarding issue
      </button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="Raise a safeguarding concern"
        description="Record what you observed or were told, as factually as possible. This is confidential and goes to the Designated Safeguarding Lead."
      >
        {state.ok ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Check className="size-6" strokeWidth={2.5} />
            </div>
            <p className="font-semibold text-slate-900">Escalation recorded</p>
            <p className="text-sm text-muted-foreground">The safeguarding concern has been logged and will be reviewed.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Close</Button>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <input type="hidden" name="cohortId" value={cohortId} />
            <input type="hidden" name="participantId" value={participantId ?? ""} />
            <input type="hidden" name="participantName" value={participantName ?? ""} />
            <input type="hidden" name="returnTo" value={returnTo} />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700"><RequiredLabel>Category</RequiredLabel></label>
              <SelectMenu
                name="category"
                defaultValue=""
                placeholder="Select the type of concern"
                buttonClassName="h-11"
                options={ESCALATION_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Severity</label>
              <SelectMenu
                name="severity"
                defaultValue="Medium"
                buttonClassName="h-11"
                options={ESCALATION_SEVERITIES.map((s) => ({ value: s, label: s }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Notes — what did you observe or hear?</label>
              <Textarea
                name="notes"
                placeholder="Record what was said or observed, as factually as possible. Do not investigate or promise confidentiality."
                rows={5}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Evidence <span className="text-xs font-normal text-muted-foreground">(optional — screenshot, recording, etc.)</span></label>
              <input
                type="file"
                name="evidence"
                aria-label="Evidence file"
                className="block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 text-sm text-slate-500 file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-1.5 file:text-xs file:font-medium file:text-white"
              />
            </div>

            {state.message && !state.ok ? (
              <p className="text-sm text-rose-600">{state.message}</p>
            ) : null}

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button disabled={isPending} className="bg-rose-600 hover:bg-rose-700">
                {isPending ? "Submitting…" : "Submit concern"}
              </Button>
            </div>
          </form>
        )}
      </ModalShell>
    </>
  );
}
