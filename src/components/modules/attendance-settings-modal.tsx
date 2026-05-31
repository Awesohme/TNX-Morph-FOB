"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Check, Copy, ExternalLink, ToggleLeft, ToggleRight } from "lucide-react";
import { toggleAttendanceOpenAction, setAttendanceWindowAction } from "@/lib/actions/ops";
import { isAttendanceOpen } from "@/lib/attendance-config";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { useToast } from "@/components/ui/toast";

// "2026-06-12T09:00" for a datetime-local input, from an ISO string (local time).
function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AttendanceSettingsModal({
  cohortId,
  cohortSlug,
  publicBaseUrl,
  attendanceOpen,
  opensAt,
  closesAt,
}: {
  cohortId: string;
  cohortSlug: string;
  publicBaseUrl: string;
  attendanceOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [isOn, setIsOn] = useState(attendanceOpen);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const link = `${publicBaseUrl}/attendance/${cohortSlug}`;
  const liveNow = isAttendanceOpen({ attendance_open: isOn, attendance_opens_at: opensAt, attendance_closes_at: closesAt });

  function toggle() {
    const next = !isOn;
    setIsOn(next);
    const fd = new FormData();
    fd.set("cohortId", cohortId);
    fd.set("attendanceOpen", String(next));
    startTransition(async () => {
      try {
        await toggleAttendanceOpenAction(fd);
        toast(`Attendance ${next ? "opened" : "closed"}.`);
      } catch {
        setIsOn(!next);
        toast("Could not update attendance status.", "error");
      }
    });
  }

  function saveWindow(formData: FormData) {
    formData.set("cohortId", cohortId);
    startTransition(async () => {
      try {
        await setAttendanceWindowAction(formData);
        toast("Attendance window saved.");
      } catch {
        toast("Could not save the window.", "error");
      }
    });
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
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">Accept attendance</p>
              <p className="text-xs text-muted-foreground">{liveNow ? "Open now — participants can sign in." : "Closed right now."}</p>
            </div>
            <button type="button" onClick={toggle} disabled={isPending} aria-pressed={isOn} className="shrink-0 text-slate-500 transition hover:text-slate-900 disabled:opacity-50">
              {isOn ? <ToggleRight className="size-8 text-emerald-600" /> : <ToggleLeft className="size-8" />}
            </button>
          </div>

          <form action={saveWindow} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Optional schedule</p>
            <p className="text-xs text-muted-foreground">Leave blank to keep it open whenever the toggle is on. Set times to auto-limit the window.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                <span>Opens at</span>
                <input type="datetime-local" name="attendanceOpensAt" defaultValue={toLocalInput(opensAt)} className="app-input h-11" />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                <span>Closes at</span>
                <input type="datetime-local" name="attendanceClosesAt" defaultValue={toLocalInput(closesAt)} className="app-input h-11" />
              </label>
            </div>
            <div className="flex justify-end">
              <Button loading={isPending}>Save schedule</Button>
            </div>
          </form>

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
        </div>
      </ModalShell>
    </>
  );
}
