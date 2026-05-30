"use client";

import { useState } from "react";
import { History, ListChecks } from "lucide-react";
import { formatDateLabel, formatFieldValue } from "@/lib/workflow";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";

type ActivityRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
};

function actorLabel(profile?: { full_name: string | null; email: string | null } | null) {
  return profile?.full_name || profile?.email || "System";
}

// Collapse consecutive identical events so re-evaluations don't flood the trail.
function dedupe(activity: ActivityRow[]) {
  const out: Array<ActivityRow & { repeatCount: number }> = [];
  for (const e of activity) {
    const prev = out[out.length - 1];
    if (prev && prev.title === e.title && (prev.description ?? "") === (e.description ?? "")) {
      prev.repeatCount += 1;
      continue;
    }
    out.push({ ...e, repeatCount: 1 });
  }
  return out;
}

export function ActivityDrawer({ activity }: { activity: ActivityRow[] }) {
  const [open, setOpen] = useState(false);
  const collapsed = dedupe(activity);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <History className="size-4" />
        Activity {activity.length ? `(${collapsed.length})` : ""}
      </Button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Activity">
        <div className="space-y-4">
          {collapsed.length ? (
            collapsed.map((event) => (
              <div key={event.id} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mt-1 grid size-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                  <ListChecks className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{actorLabel(event.profiles)}</span>
                    <span>•</span>
                    <span>{formatDateLabel(event.created_at)}</span>
                    {event.repeatCount > 1 ? (
                      <>
                        <span>•</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">×{event.repeatCount}</span>
                      </>
                    ) : null}
                  </div>
                  <p className="mt-2 font-medium text-slate-900">{event.title}</p>
                  {event.description ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{formatFieldValue(event.description)}</p>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-muted-foreground">
              Activity will appear here as records are updated, tasks are created, and comments are added.
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
}
