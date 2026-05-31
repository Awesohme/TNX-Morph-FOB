"use client";

import { useState } from "react";
import { ChevronDown, Megaphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AnnouncementSummary = {
  title: string;
  body: string;
  target: string;
  createdLabel: string;
  recipients: number;
  names: string[];
};

/**
 * Click-to-expand announcement card. Collapsed shows title, target, recipient count, time.
 * Expanded reveals the full body and the list of recipient names ("Reached: …").
 */
export function AnnouncementCard({ announcement }: { announcement: AnnouncementSummary }) {
  const [open, setOpen] = useState(false);
  const a = announcement;

  return (
    <Card className="space-y-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-start justify-between gap-3 text-left">
        <div className="flex min-w-0 items-center gap-2">
          <Megaphone className="size-4 shrink-0 text-slate-500" />
          <h2 className="truncate text-lg font-semibold text-slate-950">{a.title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-muted-foreground">{a.createdLabel}</span>
          <ChevronDown className={cn("size-4 text-slate-400 transition", open && "rotate-180")} />
        </div>
      </button>

      <div className="flex flex-wrap gap-2">
        <Badge tone="blue">{a.target}</Badge>
        <Badge tone="neutral">
          {a.recipients} recipient{a.recipients === 1 ? "" : "s"}
        </Badge>
      </div>

      {open ? (
        <div className="space-y-3 border-t border-slate-100 pt-3">
          {a.body ? <p className="text-sm leading-6 text-slate-600">{a.body}</p> : <p className="text-sm text-muted-foreground">No message body.</p>}
          {a.names.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Reached</p>
              <p className="mt-1 text-sm text-slate-700">{a.names.join(", ")}</p>
            </div>
          ) : null}
        </div>
      ) : a.body ? (
        <p className="line-clamp-1 text-sm text-slate-500">{a.body}</p>
      ) : null}
    </Card>
  );
}
