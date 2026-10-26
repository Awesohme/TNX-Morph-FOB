"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Check, Copy, ExternalLink, Send, ToggleLeft, ToggleRight } from "lucide-react";
import { setSubmissionActiveWeekAction, setSubmissionWindowAction, toggleSubmissionsOpenAction } from "@/lib/actions/ops";
import { isSubmissionsOpen } from "@/lib/submission-config";
import { datetimeLocalToIso, toLocalDatetimeInput } from "@/lib/datetime-local";
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
  const [savedWindow, setSavedWindow] = useState({ opensAt: submissionsOpensAt, closesAt: submissionsClosesAt });
  const [draftOpensAt, setDraftOpensAt] = useState(toLocalDatetimeInput(submissionsOpensAt));
  const [draftClosesAt, setDraftClosesAt] = useState(toLocalDatetimeInput(submissionsClosesAt));
  const [selectedWeek, setSelectedWeek] = useState(activeWeek ?? "");
  const [selectedLabel, setSelectedLabel] = useState(activeLabel ?? "");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const submitLink = `${publicBaseUrl}/submit/${cohortSlug}`;
  const liveNow = isSubmissionsOpen({
    submissions_open: isOpen,
    submissions_opens_at: savedWindow.opensAt,
    submissions_closes_at: savedWindow.closesAt,
  });
  const statusText = !isOpen
    ? "Submissions are closed. Turn acceptance on to allow submissions."
    : liveNow
      ? "Participants can submit now."
      : savedWindow.opensAt && new Date(savedWindow.opensAt).getTime() > Date.now()
        ? `Scheduled to open ${new Date(savedWindow.opensAt).toLocaleString()}. Save a different schedule or turn it off to accept submissions now.`
        : "The submission deadline has passed. Save a later closing time or turn the schedule off to accept submissions now.";

  function showError(message: string) { setError(message); toast(message, "error"); }

  function toggleSubmissions() {
    setError("");
    const next = !isOpen;
    if (next && !selectedWeek) {
      showError("Choose the active submission week before opening submissions.");
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
        const result = await toggleSubmissionsOpenAction(fd);
        if (!result.ok) throw new Error(result.message);
        toast(result.message);
      } catch (error) {
        setIsOpen(!next);
        showError(error instanceof Error ? error.message : "Could not update submissions status.");
      }
    });
  }

  function persistWindow(formData: FormData, clearSchedule = false) {
    setError("");
    formData.set("cohortId", cohortId);
    const timezoneOffsetMinutes = new Date().getTimezoneOffset();
    formData.set("timezoneOffsetMinutes", String(timezoneOffsetMinutes));
    if (clearSchedule) {
      formData.set("submissionsOpensAt", "");
      formData.set("submissionsClosesAt", "");
    }
    startTransition(async () => {
      try {
        const result = await setSubmissionWindowAction(formData);
        if (!result.ok) throw new Error(result.message);
        const opensAt = datetimeLocalToIso(String(formData.get("submissionsOpensAt") ?? ""), timezoneOffsetMinutes);
        const closesAt = datetimeLocalToIso(String(formData.get("submissionsClosesAt") ?? ""), timezoneOffsetMinutes);
        setSavedWindow({ opensAt, closesAt });
        toast(result.message);
      } catch (error) {
        if (clearSchedule) setUseSchedule(true);
        showError(error instanceof Error ? error.message : "Could not save the submission window.");
      }
    });
  }

  function saveWindow(formData: FormData) {
    persistWindow(formData);
  }

  function toggleSchedule() {
    if (!useSchedule) {
      setUseSchedule(true);
      return;
    }
    setUseSchedule(false);
    persistWindow(new FormData(), true);
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
    setError("");
    formData.set("cohortId", cohortId);
    startTransition(async () => {
      try {
        const result = await setSubmissionActiveWeekAction(formData);
        if (!result.ok) throw new Error(result.message);
        setSelectedWeek(String(formData.get("submissionWeek") ?? ""));
        setSelectedLabel(String(formData.get("submissionLabel") ?? ""));
        toast(result.message);
      } catch (error) {
        showError(error instanceof Error ? error.message : "Could not save the active submission week.");
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
          {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
          {/* Submission page tool */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Submission page</p>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Accept submissions</p>
                <p className="text-xs text-muted-foreground" role="status">{statusText}</p>
              </div>
              <button
                type="button"
                onClick={toggleSubmissions}
                disabled={isPending}
                aria-pressed={isOpen}
                aria-label="Accept submissions"
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
                  <p className="text-xs text-muted-foreground">Save times to apply a schedule. Turning this off removes the saved schedule immediately.</p>
                </div>
                <button
                  type="button"
                  onClick={toggleSchedule}
                  disabled={isPending}
                  aria-pressed={useSchedule}
                  aria-label="Use submission schedule"
                  className="shrink-0 text-slate-500 transition hover:text-slate-900 disabled:opacity-50"
                >
                  {useSchedule ? <ToggleRight className="size-8 text-emerald-600" /> : <ToggleLeft className="size-8" />}
                </button>
              </div>
              {useSchedule ? (
                <>
                  <p className="text-xs text-muted-foreground">Changes apply when you save. Leave either time blank for no limit on that side of the window.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      <span>Opens at</span>
                      <input type="datetime-local" name="submissionsOpensAt" value={draftOpensAt} onChange={(event) => setDraftOpensAt(event.target.value)} disabled={isPending} className="app-input h-11" />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      <span>Closes at</span>
                      <input type="datetime-local" name="submissionsClosesAt" value={draftClosesAt} onChange={(event) => setDraftClosesAt(event.target.value)} disabled={isPending} className="app-input h-11" />
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
                <p className="text-xs text-muted-foreground">Submissions follow the acceptance toggle. Enable and save a schedule to set time limits.</p>
              )}
            </form>
          </div>
        </div>
      </ModalShell>
    </>
  );
}
