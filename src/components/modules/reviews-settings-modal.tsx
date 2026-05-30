"use client";

import { useState, useTransition } from "react";
import { Settings2 } from "lucide-react";
import { setWeekAssignmentLabelAction } from "@/lib/actions/records";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { useToast } from "@/components/ui/toast";

/**
 * Reviews configuration: per-week assignment labels. Saving applies the label to every
 * review row in that cohort + week.
 */
export function ReviewsSettingsModal({
  cohortId,
  weeks,
}: {
  cohortId: string;
  weeks: Array<{ week: string; assignment: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>(
    Object.fromEntries(weeks.map((w) => [w.week, w.assignment])),
  );
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function save(week: string) {
    const fd = new FormData();
    fd.set("cohortId", cohortId);
    fd.set("week", week);
    fd.set("label", labels[week] ?? "");
    startTransition(async () => {
      try {
        await setWeekAssignmentLabelAction(fd);
        toast(`Saved assignment label for ${week}.`);
      } catch {
        toast("Could not save label.", "error");
      }
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings2 className="size-4" />
        Settings
      </Button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="Review settings"
        description="Set the assignment label shown for each week. Applies to every participant's row that week."
      >
        <div className="space-y-3">
          {weeks.length ? (
            weeks.map((w) => (
              <div key={w.week} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm font-medium text-slate-700">{w.week}</span>
                <input
                  aria-label={`Assignment label for ${w.week}`}
                  value={labels[w.week] ?? ""}
                  onChange={(e) => setLabels((prev) => ({ ...prev, [w.week]: e.target.value }))}
                  placeholder="Assignment label"
                  className="app-input h-10 flex-1"
                />
                <Button type="button" size="sm" disabled={isPending} onClick={() => save(w.week)}>
                  Save
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No weeks with review rows yet.</p>
          )}
        </div>
      </ModalShell>
    </>
  );
}
