"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Check, Copy, ExternalLink, Pencil, Send, ToggleLeft, ToggleRight, X } from "lucide-react";
import { setWeekAssignmentLabelAction } from "@/lib/actions/records";
import { setSubmissionWindowAction, toggleSubmissionsOpenAction } from "@/lib/actions/ops";
import { isSubmissionsOpen } from "@/lib/submission-config";
import { toLocalDatetimeInput } from "@/lib/datetime-local";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { useToast } from "@/components/ui/toast";

export function ReviewsSettingsModal({
  cohortId,
  cohortSlug,
  submissionsOpen,
  submissionsOpensAt,
  submissionsClosesAt,
  publicBaseUrl,
  weeks,
}: {
  cohortId: string;
  cohortSlug: string;
  submissionsOpen: boolean;
  submissionsOpensAt: string | null;
  submissionsClosesAt: string | null;
  publicBaseUrl: string;
  weeks: Array<{ week: string; assignment: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(submissionsOpen);
  const [useSchedule, setUseSchedule] = useState(Boolean(submissionsOpensAt || submissionsClosesAt));
  const [labels, setLabels] = useState<Record<string, string>>(
    Object.fromEntries(weeks.map((w) => [w.week, w.assignment])),
  );
  const [copied, setCopied] = useState(false);
  const [editingWeek, setEditingWeek] = useState<string | null>(null);
  const [savingWeek, setSavingWeek] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const submitLink = `${publicBaseUrl}/submit/${cohortSlug}`;
  const liveNow = isSubmissionsOpen({
    submissions_open: isOpen,
    submissions_opens_at: submissionsOpensAt,
    submissions_closes_at: submissionsClosesAt,
  });

  function toggleSubmissions() {
    const next = !isOpen;
    setIsOpen(next);
    const fd = new FormData();
    fd.set("cohortId", cohortId);
    fd.set("submissionsOpen", String(next));
    startTransition(async () => {
      try {
        await toggleSubmissionsOpenAction(fd);
        toast(`Submissions ${next ? "opened" : "closed"}.`);
      } catch {
        setIsOpen(!next);
        toast("Could not update submissions status.", "error");
      }
    });
  }

  function saveWindow(formData: FormData) {
    formData.set("cohortId", cohortId);
    formData.set("timezoneOffsetMinutes", String(new Date().getTimezoneOffset()));
    if (!useSchedule) {
      formData.set("submissionsOpensAt", "");
      formData.set("submissionsClosesAt", "");
    }
    startTransition(async () => {
      try {
        await setSubmissionWindowAction(formData);
        toast("Submission window saved.");
      } catch {
        toast("Could not save the submission window.", "error");
      }
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(submitLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Could not copy link.", "error");
    }
  }

  function startEdit(week: string) {
    setEditingWeek(week);
  }

  function cancelEdit(week: string, original: string) {
    setLabels((prev) => ({ ...prev, [week]: original }));
    setEditingWeek(null);
  }

  function saveLabel(week: string) {
    const fd = new FormData();
    fd.set("cohortId", cohortId);
    fd.set("week", week);
    fd.set("label", labels[week] ?? "");
    setSavingWeek(week);
    startTransition(async () => {
      try {
        await setWeekAssignmentLabelAction(fd);
        toast(`Saved label for ${week}.`);
        setEditingWeek(null);
      } catch {
        toast("Could not save label.", "error");
      } finally {
        setSavingWeek(null);
      }
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Send className="size-4" />
        Submissions
      </Button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="Review & submission settings"
        description="Manage the public submission page and per-week assignment labels."
      >
        <div className="space-y-6">
          {/* Submission page tool */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Submission page</p>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Accept submissions</p>
                <p className="text-xs text-muted-foreground">{liveNow ? "Participants can submit now." : "Submissions are closed."}</p>
              </div>
              <button
                type="button"
                onClick={toggleSubmissions}
                disabled={isPending}
                aria-pressed={isOpen}
                className="shrink-0 text-slate-500 transition hover:text-slate-900 disabled:opacity-50"
              >
                {isOpen ? (
                  <ToggleRight className="size-8 text-emerald-600" />
                ) : (
                  <ToggleLeft className="size-8" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <a
                href={submitLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-xs text-slate-600 hover:text-slate-900"
              >
                {submitLink}
              </a>
              <button type="button" onClick={copyLink} className="shrink-0 text-slate-400 hover:text-slate-700" aria-label="Copy submission link">
                {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              </button>
              <a href={submitLink} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-400 hover:text-slate-700" aria-label="Open submission page">
                <ExternalLink className="size-4" />
              </a>
            </div>

            <form action={saveWindow} className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">Use schedule</p>
                  <p className="text-xs text-muted-foreground">Set open and close times for submissions.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUseSchedule((current) => !current)}
                  disabled={isPending}
                  aria-pressed={useSchedule}
                  className="shrink-0 text-slate-500 transition hover:text-slate-900 disabled:opacity-50"
                >
                  {useSchedule ? <ToggleRight className="size-8 text-emerald-600" /> : <ToggleLeft className="size-8" />}
                </button>
              </div>
              {useSchedule ? (
                <>
                  <p className="text-xs text-muted-foreground">Leave blank to keep it open whenever the toggle is on. Set times to auto-limit the window.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      <span>Opens at</span>
                      <input type="datetime-local" name="submissionsOpensAt" defaultValue={toLocalDatetimeInput(submissionsOpensAt)} className="app-input h-11" />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      <span>Closes at</span>
                      <input type="datetime-local" name="submissionsClosesAt" defaultValue={toLocalDatetimeInput(submissionsClosesAt)} className="app-input h-11" />
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <Button loading={isPending}>
                      <CalendarClock className="size-4" />
                      Save schedule
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Submissions follow the main toggle only until you enable a schedule.</p>
              )}
            </form>
          </div>

          {/* Assignment labels */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Assignment labels per week</p>
            {weeks.length ? (
              weeks.map((w) => {
                const isEditing = editingWeek === w.week;
                const isSaving = savingWeek === w.week;
                return (
                  <div key={w.week} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-sm font-medium text-slate-700">{w.week}</span>
                    {isEditing ? (
                      <>
                        <input
                          aria-label={`Assignment label for ${w.week}`}
                          value={labels[w.week] ?? ""}
                          onChange={(e) => setLabels((prev) => ({ ...prev, [w.week]: e.target.value }))}
                          placeholder="Assignment label"
                          autoFocus
                          className="app-input h-10 flex-1"
                        />
                        <Button type="button" size="sm" loading={isSaving} onClick={() => saveLabel(w.week)}>
                          Save
                        </Button>
                        <button
                          type="button"
                          onClick={() => cancelEdit(w.week, w.assignment)}
                          disabled={isSaving}
                          aria-label={`Cancel editing ${w.week}`}
                          className="shrink-0 text-slate-400 transition hover:text-slate-700 disabled:opacity-50"
                        >
                          <X className="size-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 truncate text-sm text-slate-600">
                          {labels[w.week] || <span className="text-slate-400">No label set</span>}
                        </span>
                        <button
                          type="button"
                          onClick={() => startEdit(w.week)}
                          aria-label={`Edit assignment label for ${w.week}`}
                          className="shrink-0 text-slate-400 transition hover:text-slate-700"
                        >
                          <Pencil className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No cohort weeks yet. Save the cohort week count or add weeks in the cohort plan first.</p>
            )}
          </div>
        </div>
      </ModalShell>
    </>
  );
}
