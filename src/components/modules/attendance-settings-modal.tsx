"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Check, Copy, ExternalLink, ToggleLeft, ToggleRight } from "lucide-react";
import { toggleAttendanceOpenAction, setAttendanceWindowAction, setAttendanceWeekAction } from "@/lib/actions/ops";
import { isAttendanceOpen } from "@/lib/attendance-config";
import { datetimeLocalToIso, toLocalDatetimeInput } from "@/lib/datetime-local";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { SelectMenu } from "@/components/ui/select-menu";
import { useToast } from "@/components/ui/toast";

export function AttendanceSettingsModal({
  cohortId,
  cohortSlug,
  publicBaseUrl,
  attendanceOpen,
  opensAt,
  closesAt,
  activeWeek,
  weekOptions,
}: {
  cohortId: string;
  cohortSlug: string;
  publicBaseUrl: string;
  attendanceOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
  activeWeek: string | null;
  weekOptions: string[];
}) {
  const [open, setOpen] = useState(false);
  const [isOn, setIsOn] = useState(attendanceOpen);
  const [useSchedule, setUseSchedule] = useState(Boolean(opensAt || closesAt));
  const [savedWindow, setSavedWindow] = useState({ opensAt, closesAt });
  const [draftOpensAt, setDraftOpensAt] = useState(toLocalDatetimeInput(opensAt));
  const [draftClosesAt, setDraftClosesAt] = useState(toLocalDatetimeInput(closesAt));
  const [selectedWeek, setSelectedWeek] = useState(activeWeek ?? "");
  const [savedWeek, setSavedWeek] = useState(activeWeek ?? "");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function saveWeek(formData: FormData) {
    formData.set("cohortId", cohortId);
    setError("");
    startTransition(async () => {
      try {
        const result = await setAttendanceWeekAction(formData);
        if (!result.ok) { setSelectedWeek(savedWeek); showError(result.message); return; }
        setSavedWeek(String(formData.get("attendanceWeek") ?? ""));
        toast(result.message);
      } catch { setSelectedWeek(savedWeek); showError("Could not save the active week."); }
    });
  }

  const link = `${publicBaseUrl}/attendance/${cohortSlug}`;
  const liveNow = isAttendanceOpen({ attendance_open: isOn, attendance_opens_at: savedWindow.opensAt, attendance_closes_at: savedWindow.closesAt });

  function showError(message: string) {
    setError(message);
    toast(message, "error");
  }

  function toggle() {
    const next = !isOn;
    setError("");
    setIsOn(next);
    const fd = new FormData();
    fd.set("cohortId", cohortId);
    fd.set("attendanceOpen", String(next));
    startTransition(async () => {
      try {
        const result = await toggleAttendanceOpenAction(fd);
        if (!result.ok) { setIsOn(!next); showError(result.message || "Could not update attendance status."); return; }
        toast(result.message);
      } catch { setIsOn(!next); showError("Could not update attendance status."); }
    });
  }

  function persistWindow(formData: FormData, clearSchedule = false) {
    setError("");
    const offset = new Date().getTimezoneOffset();
    formData.set("cohortId", cohortId);
    formData.set("timezoneOffsetMinutes", String(offset));
    if (clearSchedule) {
      formData.set("attendanceOpensAt", "");
      formData.set("attendanceClosesAt", "");
    }
    startTransition(async () => {
      try {
        const result = await setAttendanceWindowAction(formData);
        if (!result.ok) {
          if (clearSchedule) setUseSchedule(true);
          showError(result.message);
          return;
        }
        setSavedWindow({
          opensAt: datetimeLocalToIso(String(formData.get("attendanceOpensAt") ?? ""), offset),
          closesAt: datetimeLocalToIso(String(formData.get("attendanceClosesAt") ?? ""), offset),
        });
        if (clearSchedule) { setDraftOpensAt(""); setDraftClosesAt(""); }
        toast(result.message);
      } catch {
        if (clearSchedule) setUseSchedule(true);
        showError("Could not save the window.");
      }
    });
  }

  function saveWindow(formData: FormData) { persistWindow(formData); }

  function toggleSchedule() {
    if (!useSchedule) { setUseSchedule(true); return; }
    setUseSchedule(false);
    persistWindow(new FormData(), true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Could not copy link.", "error");
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CalendarClock className="size-4" />
        Attendance
      </Button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="Attendance settings"
        description="Open or close the public attendance page, optionally on a schedule, and share the link."
      >
        <div className="space-y-6">
          {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">Accept attendance</p>
              <p className="text-xs text-muted-foreground">{liveNow ? "Open now — participants can sign in." : "Closed right now."}</p>
            </div>
            <button type="button" onClick={toggle} disabled={isPending} aria-label="Accept attendance" aria-pressed={isOn} className="shrink-0 text-slate-500 transition hover:text-slate-900 disabled:opacity-50">
              {isOn ? <ToggleRight className="size-8 text-emerald-600" /> : <ToggleLeft className="size-8" />}
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <a href={link} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-xs text-slate-600 hover:text-slate-900">
              {link}
            </a>
            <button type="button" onClick={copyLink} className="shrink-0 text-slate-400 hover:text-slate-700" aria-label="Copy attendance link">
              {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
            </button>
            <a href={link} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-400 hover:text-slate-700" aria-label="Open attendance page">
              <ExternalLink className="size-4" />
            </a>
          </div>

          <form action={saveWeek} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Active session week</p>
            <p className="text-xs text-muted-foreground">Participants sign in/out for this week. Set it before each class — no week choice on their end.</p>
            <SelectMenu
              name="attendanceWeek"
              value={selectedWeek}
              onChange={setSelectedWeek}
              disabled={isPending}
              placeholder="Select the active week"
              buttonClassName="h-11"
              menuClassName="max-h-48"
              options={[{ value: "", label: "No active session" }, ...weekOptions.map((w) => ({ value: w, label: w }))]}
            />
            <div className="flex justify-end">
              <Button loading={isPending}>Save active week</Button>
            </div>
          </form>

          <form action={saveWindow} className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Use schedule</p>
                <p className="text-xs text-muted-foreground">Set open and close times for attendance.</p>
              </div>
              <button
                type="button"
                onClick={toggleSchedule}
                aria-label="Use attendance schedule"
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
                    <input type="datetime-local" name="attendanceOpensAt" value={draftOpensAt} onChange={(event) => setDraftOpensAt(event.target.value)} disabled={isPending} className="app-input h-11" />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-slate-700">
                    <span>Closes at</span>
                    <input type="datetime-local" name="attendanceClosesAt" value={draftClosesAt} onChange={(event) => setDraftClosesAt(event.target.value)} disabled={isPending} className="app-input h-11" />
                  </label>
                </div>
                <div className="flex justify-end">
                  <Button loading={isPending}>Save schedule</Button>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Attendance follows the main toggle only until you enable a schedule.</p>
            )}
          </form>
        </div>
      </ModalShell>
    </>
  );
}
