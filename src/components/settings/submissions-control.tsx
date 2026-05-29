"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toggleSubmissionsOpenAction } from "@/lib/actions/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type CohortSubmission = {
  id: string;
  name: string;
  slug: string;
  submissions_open: boolean;
};

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
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-950">{cohort.name}</p>
                <Badge tone={cohort.submissions_open ? "green" : "amber"}>{cohort.submissions_open ? "Open" : "Closed"}</Badge>
              </div>
              <SubmissionLink slug={cohort.slug} />
            </div>
            <form action={toggleSubmissionsOpenAction}>
              <input type="hidden" name="cohortId" value={cohort.id} />
              <input type="hidden" name="open" value={cohort.submissions_open ? "false" : "true"} />
              <Button type="submit" variant={cohort.submissions_open ? "outline" : "default"} size="sm">
                {cohort.submissions_open ? "Close submissions" : "Open submissions"}
              </Button>
            </form>
          </div>
        ))}
      </div>
    </Card>
  );
}
