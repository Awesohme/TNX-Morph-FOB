import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function formatWhen(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// Submissions store notes as "Challenge faced: …\nSupport needed: …". Split it back out.
function parseNotes(notes: unknown) {
  const text = String(notes ?? "");
  const challenge = text.match(/Challenge faced:\s*([\s\S]*?)(?:\nSupport needed:|$)/i)?.[1]?.trim() || "";
  const support = text.match(/Support needed:\s*([\s\S]*)$/i)?.[1]?.trim() || "";
  const supportRequested = /^yes/i.test(support);
  // If notes weren't written by the public form, fall back to showing the raw text.
  const raw = !challenge && !support ? text.trim() : "";
  return { challenge, support, supportRequested, raw };
}

type ReviewRecord = {
  participant_name?: unknown;
  week?: unknown;
  assignment?: unknown;
  submitted?: unknown;
  submitted_at?: unknown;
  submission_link?: unknown;
  review_status?: unknown;
  notes?: unknown;
};

export function ReviewSubmission({ record, fileUrl }: { record: ReviewRecord; fileUrl?: string | null }) {
  const submitted = Boolean(record.submitted);
  const { challenge, support, supportRequested, raw } = parseNotes(record.notes);
  const submissionLink = record.submission_link ? String(record.submission_link) : "";

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Submission</p>
        <Badge tone={submitted ? "green" : "amber"}>{submitted ? "Submitted" : "Not submitted"}</Badge>
        <Badge tone="blue">{String(record.review_status ?? "Not Reviewed")}</Badge>
        {supportRequested ? <Badge tone="red">Support requested</Badge> : null}
      </div>

      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <Detail label="Participant" value={String(record.participant_name || "—")} />
        <Detail label="Week" value={String(record.week || "—")} />
        <Detail label="Assignment" value={String(record.assignment || "Weekly assignment")} />
        <Detail label="Submitted at" value={formatWhen(record.submitted_at)} />
      </div>

      {challenge || support || raw ? (
        <dl className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-sm">
          {challenge ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Challenge faced</dt>
              <dd className="mt-0.5 text-slate-700">{challenge}</dd>
            </div>
          ) : null}
          {support ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Support needed</dt>
              <dd className={`mt-0.5 ${supportRequested ? "font-medium text-rose-700" : "text-slate-700"}`}>{support}</dd>
            </div>
          ) : null}
          {raw ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Notes</dt>
              <dd className="mt-0.5 whitespace-pre-line text-slate-700">{raw}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <div className="flex flex-wrap gap-4">
        {fileUrl ? (
          <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex text-sm font-medium text-slate-700 underline underline-offset-2">
            Open uploaded worksheet
          </a>
        ) : null}
        {submissionLink ? (
          <a href={submissionLink} target="_blank" rel="noreferrer" className="inline-flex text-sm font-medium text-slate-700 underline underline-offset-2">
            Open submission link
          </a>
        ) : null}
        {!fileUrl && !submissionLink ? (
          <p className="text-sm text-muted-foreground">{submitted ? "No file or link attached to this submission." : "Nothing submitted yet."}</p>
        ) : null}
      </div>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p>
      <p className="mt-0.5 text-slate-800">{value}</p>
    </div>
  );
}
