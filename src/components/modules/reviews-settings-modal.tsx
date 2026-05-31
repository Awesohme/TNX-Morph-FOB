"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Pencil, Settings2, ToggleLeft, ToggleRight, X } from "lucide-react";
import { setWeekAssignmentLabelAction } from "@/lib/actions/records";
import { toggleSubmissionsOpenAction } from "@/lib/actions/ops";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { useToast } from "@/components/ui/toast";

export function ReviewsSettingsModal({
  cohortId,
  cohortSlug,
  submissionsOpen,
  publicBaseUrl,
  weeks,
}: {
  cohortId: string;
  cohortSlug: string;
  submissionsOpen: boolean;
  publicBaseUrl: string;
  weeks: Array<{ week: string; assignment: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(submissionsOpen);
  const [labels, setLabels] = useState<Record<string, string>>(
    Object.fromEntries(weeks.map((w) => [w.week, w.assignment])),
  );
  const [copied, setCopied] = useState(false);
  const [editingWeek, setEditingWeek] = useState<string | null>(null);
  const [savingWeek, setSavingWeek] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const submitLink = `${publicBaseUrl}/submit/${cohortSlug}`;

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
        <Settings2 className="size-4" />
        Settings
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
                <p className="text-xs text-muted-foreground">{isOpen ? "Participants can submit now." : "Submissions are closed."}</p>
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
                        <Button type="button" size="sm" disabled={isSaving} onClick={() => saveLabel(w.week)}>
                          {isSaving ? "Saving…" : "Save"}
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
              <p className="text-sm text-muted-foreground">No weeks with review rows yet.</p>
            )}
          </div>
        </div>
      </ModalShell>
    </>
  );
}
