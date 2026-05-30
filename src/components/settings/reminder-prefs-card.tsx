"use client";

import { useState, useTransition } from "react";
import { saveReminderPrefsAction } from "@/lib/actions/settings";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type Prefs = { remind_1d: boolean; remind_3h: boolean; remind_at_due: boolean; remind_overdue: boolean };

const SLOTS: Array<{ key: keyof Prefs; label: string; hint: string }> = [
  { key: "remind_1d", label: "1 day before due", hint: "A heads-up the day before." },
  { key: "remind_3h", label: "3 hours before due", hint: "A nudge a few hours out." },
  { key: "remind_at_due", label: "At due time", hint: "When the task is due." },
  { key: "remind_overdue", label: "When overdue", hint: "If it slips past due." },
];

export function ReminderPrefsCard({ prefs }: { prefs: Prefs }) {
  const [local, setLocal] = useState<Prefs>(prefs);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Cap the three "before due" presets at 3 active (overdue is separate).
  const beforeCount = [local.remind_1d, local.remind_3h, local.remind_at_due].filter(Boolean).length;

  function save() {
    const fd = new FormData();
    (Object.keys(local) as Array<keyof Prefs>).forEach((k) => {
      if (local[k]) fd.set(k, "on");
    });
    startTransition(async () => {
      try {
        await saveReminderPrefsAction(fd);
        toast("Reminder preferences saved.");
      } catch {
        toast("Could not save preferences.", "error");
      }
    });
  }

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-950">Task reminders</p>
        <p className="text-sm text-muted-foreground">Choose when you get reminded about due tasks (up to 3 timing slots + overdue).</p>
      </div>
      <div className="space-y-2">
        {SLOTS.map((slot) => {
          const checked = local[slot.key];
          const isBeforeSlot = slot.key !== "remind_overdue";
          const disabled = isBeforeSlot && !checked && beforeCount >= 3;
          return (
            <label
              key={slot.key}
              className={`flex items-start gap-3 rounded-xl border border-slate-200 p-3 ${disabled ? "opacity-50" : "cursor-pointer hover:bg-slate-50"}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => setLocal((p) => ({ ...p, [slot.key]: e.target.checked }))}
                className="mt-0.5 size-4"
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">{slot.label}</span>
                <span className="block text-xs text-slate-500">{slot.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={save} disabled={isPending}>
          {isPending ? "Saving…" : "Save reminders"}
        </Button>
      </div>
    </Card>
  );
}
