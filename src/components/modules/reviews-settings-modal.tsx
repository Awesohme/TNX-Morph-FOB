"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Check, Copy, ExternalLink, Send, ToggleLeft, ToggleRight } from "lucide-react";
import { setSubmissionActiveWeekAction, setSubmissionWindowAction, toggleSubmissionsOpenAction } from "@/lib/actions/ops";
import { isSubmissionsOpen } from "@/lib/submission-config";
import { toLocalDatetimeInput } from "@/lib/datetime-local";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { SelectMenu } from "@/components/ui/select-menu";
import { useToast } from "@/components/ui/toast";

export function ReviewsSettingsModal({
  cohortId,
  cohortSlug,
  submissionsOpen,
  submissionsOpensAt,
  submissionsClosesAt,
  activeWeek,
  activeLabel,
  publicBaseUrl,
  weeks,
}: {
  cohortId: string;
  cohortSlug: string;
  submissionsOpen: boolean;
  submissionsOpensAt: string | null;
  submissionsClosesAt: string | null;
  activeWeek: string | null;
  activeLabel: string | null;
  publicBaseUrl: string;
  weeks: Array<{ week: string; assignment: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(submissionsOpen);
  const [useSchedule, setUseSchedule] = useState(Boolean(submissionsOpensAt || submissionsClosesAt));
  const [selectedWeek, setSelectedWeek] = useState(activeWeek ?? "");
  const [selectedLabel, setSelectedLabel] = useState(activeLabel ?? "");
  const [copied, setCopied] = useState(false);
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
    if (next && !selectedWeek) {
      toast("Choose the active submission week before opening submissions.", "error");
      return;
    }
    setIsOpen(next);
    const fd = new FormData();
    fd.set("cohortId", cohortId);
    fd.set("submissionsOpen", String(next));
    if (next) {
      fd.set("submissionWeek", selectedWeek);
      fd.set("submissionLabel", selectedLabel);
    }
    startTransition(async () => {
      try {
        await toggleSubmissionsOpenAction(fd);
        if (!next) {
          setSelectedWeek("");
          setSelectedLabel("");
        }
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

  function saveActiveSubmission(formData: FormData) {
    formData.set("cohortId", cohortId);
    startTransition(async () => {
      try {
        await setSubmissionActiveWeekAction(formData);
        setSelectedWeek(String(formData.get("submissionWeek") ?? ""));
        setSelectedLabel(String(formData.get("submissionLabel") ?? ""));
        toast("Active submission week saved.");
      } catch {
        toast("Could not save the active submission week.", "error");
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
        description="Manage the public submission page, active submission week, and student-facing label."
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

            <form action={saveActiveSubmission} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Active submission week</p>
              <p className="text-xs text-muted-foreground">Students submit for one active week only. Choose the canonical week here, and optionally rename what students see.</p>
              <SelectMenu
                name="submissionWeek"
                value={selectedWeek}
                onChange={setSelectedWeek}
                placeholder="Select the active submission week"
                buttonClassName="h-11"
                menuClassName="max-h-48"
                options={weeks.map((w) => ({ value: w.week, label: w.week }))}
              />
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                <span>Student-facing submission label</span>
                <input
                  name="submissionLabel"
                  value={selectedLabel}
                  onChange={(e) => setSelectedLabel(e.target.value)}
                  placeholder={selectedWeek ? weeks.find((w) => w.week === selectedWeek)?.assignment || selectedWeek : "Optional label shown to students"}
                  className="app-input h-11"
                />
              </label>
              <div className="flex justify-end">
                <Button loading={isPending}>Save active submission</Button>
              </div>
            </form>

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
        </div>
      </ModalShell>
    </>
  );
}
