"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toggleSubmissionsOpenAction } from "@/lib/actions/settings";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useToast } from "@/components/ui/toast";

type CohortSubmission = {
  id: string;
  name: string;
  slug: string;
  submissions_open: boolean;
};

function SubmissionToggle({ cohort }: { cohort: CohortSubmission }) {
  const [open, setOpen] = useState(cohort.submissions_open);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function flip(next: boolean) {
    setOpen(next); // optimistic
    const fd = new FormData();
    fd.set("cohortId", cohort.id);
    fd.set("open", next ? "true" : "false");
    startTransition(async () => {
      try {
        await toggleSubmissionsOpenAction(fd);
        toast(next ? "Submissions opened." : "Submissions closed.");
      } catch {
        setOpen(!next); // revert
        toast("Could not update submissions.", "error");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Badge tone={open ? "green" : "amber"}>{open ? "Open" : "Closed"}</Badge>
      <ToggleSwitch checked={open} onChange={flip} disabled={isPending} ariaLabel="Toggle submissions" />
    </div>
  );
}

function SubmissionLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/submit/${slug}` : `/submit/${slug}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="truncate rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700">/submit/{slug}</code>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        }}
        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy link"}
      </button>
      <a
        href={`/submit/${slug}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
      >
        <ExternalLink className="size-3.5" />
        Preview
      </a>
    </div>
  );
}

export function SubmissionsControl({ cohorts }: { cohorts: CohortSubmission[] }) {
  return (
    <Card className="space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-950">Student submissions</p>
        <p className="text-sm text-muted-foreground">
          Open or close the public worksheet submission page per cohort, and share the link with students.
        </p>
      </div>
      <div className="space-y-3">
        {cohorts.map((cohort) => (
          <div key={cohort.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-950">{cohort.name}</p>
              <SubmissionLink slug={cohort.slug} />
            </div>
            <SubmissionToggle cohort={cohort} />
          </div>
        ))}
      </div>
    </Card>
  );
}
