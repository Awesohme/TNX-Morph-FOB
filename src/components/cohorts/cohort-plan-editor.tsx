"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { savePlanItemAction, deletePlanItemAction } from "@/lib/actions/cohort-plan";
import { initialPlanItemState } from "@/lib/actions/cohort-plan-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { Textarea } from "@/components/ui/textarea";
import { ModalShell } from "@/components/ui/modal-shell";
import { DestructiveActionModal } from "@/components/ui/destructive-action-modal";
import { RequiredLabel } from "@/components/ui/required-indicator";
import { useToast } from "@/components/ui/toast";
import { compareWeekLabels, generateWeekLabels, sortWeekLabels } from "@/lib/cohort-weeks";

export type PlanItem = {
  id: string;
  week_label: string;
  sort_order: number;
  theme: string | null;
  session_type: string | null;
  live_session_focus: string | null;
  student_output: string | null;
  async_task: string | null;
  owner_label: string | null;
  support_label: string | null;
  success_metric: string | null;
  risk: string | null;
  mitigation: string | null;
};

const EMPTY: Partial<PlanItem> = { week_label: "", sort_order: 0 };
const SESSION_TYPE_OPTIONS = ["Setup", "Live session", "Workshop", "Office hours", "Demo", "Async"];
const OWNER_OPTIONS = ["Admin", "CM Lead", "CMs", "Facilitators", "Session Lead"];

function Field({ label, name, defaultValue, textarea }: { label: string; name: string; defaultValue?: string | null; textarea?: boolean }) {
  return (
    <label className="space-y-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {textarea ? (
        <Textarea name={name} defaultValue={defaultValue ?? ""} rows={2} />
      ) : (
        <Input name={name} defaultValue={defaultValue ?? ""} />
      )}
    </label>
  );
}

export function CohortPlanEditor({ cohortId, items, weekCount }: { cohortId: string; items: PlanItem[]; weekCount: number | null }) {
  const [editing, setEditing] = useState<Partial<PlanItem> | null>(null);
  const [weekLabel, setWeekLabel] = useState("");
  const [sessionType, setSessionType] = useState("");
  const [ownerLabel, setOwnerLabel] = useState("");
  const [supportLabel, setSupportLabel] = useState("");
  const [state, action, isPending] = useActionState(savePlanItemAction, initialPlanItemState);
  const { toast } = useToast();

  useEffect(() => {
    if (!state.message) return;
    toast(state.message, state.ok ? "success" : "error");
    if (state.ok) setEditing(null);
  }, [state, toast]);

  useEffect(() => {
    if (!editing) return;
    setWeekLabel(editing.week_label ?? "");
    setSessionType(editing.session_type ?? "");
    setOwnerLabel(editing.owner_label ?? "");
    setSupportLabel(editing.support_label ?? "");
  }, [editing]);

  const nextSort = items.length ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
  const orderedItems = [...items].sort((left, right) =>
    compareWeekLabels(left.week_label, right.week_label) || left.sort_order - right.sort_order,
  );
  // Week 0 is the onboarding week. The remaining choices follow the cohort's
  // configured length, rather than a fixed programme-wide Week 0–6 list.
  const weekOptions = sortWeekLabels(["Week 0", ...generateWeekLabels(weekCount), ...items.map((item) => item.week_label)]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">The workbook-inspired week plan now lives inside the app.</p>
        <Button type="button" size="sm" onClick={() => setEditing({ ...EMPTY, sort_order: nextSort })}>
          <Plus className="size-4" />
          Add week
        </Button>
      </div>

      {orderedItems.map((item) => (
        <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="blue">{item.week_label}</Badge>
              {item.session_type ? <Badge>{item.session_type}</Badge> : null}
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setEditing(item)} aria-label={`Edit ${item.week_label}`} className="text-slate-400 transition hover:text-slate-700">
                <Pencil className="size-4" />
              </button>
              <DestructiveActionModal
                title={`Delete ${item.week_label}?`}
                description="This permanently removes this week from the cohort plan. This cannot be undone."
                action={deletePlanItemAction}
                confirmLabel="Delete week"
                pendingLabel="Deleting week…"
                trigger={<button type="button" aria-label={`Remove ${item.week_label}`} className="text-slate-400 transition hover:text-rose-600">
                  <Trash2 className="size-4" />
                </button>}
              >
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="cohortId" value={cohortId} />
              </DestructiveActionModal>
            </div>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-slate-950">{item.theme || "Untitled week"}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.live_session_focus || "No session focus yet."}</p>
          <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
            <div>
              <p className="font-semibold text-slate-950">Student output</p>
              <p className="text-muted-foreground">{item.student_output || "—"}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-950">Async task</p>
              <p className="text-muted-foreground">{item.async_task || "—"}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-950">Owner / Support</p>
              <p className="text-muted-foreground">{item.owner_label || "—"} / {item.support_label || "—"}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-950">Risk / Mitigation</p>
              <p className="text-muted-foreground">{item.risk || "—"} / {item.mitigation || "—"}</p>
            </div>
          </div>
        </div>
      ))}

      {!items.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-muted-foreground">
          No weeks yet. Use &ldquo;Add week&rdquo; to build the cohort plan.
        </div>
      ) : null}

      <ModalShell
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Edit ${editing.week_label}` : "Add week"}
        description="Define the week's theme, outputs, ownership, and risks."
      >
        {editing ? (
          <form action={action} className="space-y-3">
            <input type="hidden" name="cohortId" value={cohortId} />
            {editing.id ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                <RequiredLabel>Week label</RequiredLabel>
                <SelectMenu
                  name="week_label"
                  value={weekLabel}
                  onChange={setWeekLabel}
                  placeholder="Select week"
                  options={weekOptions.map((option) => ({ value: option, label: option }))}
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                <span>Session type</span>
                <SelectMenu
                  name="session_type"
                  value={sessionType}
                  onChange={setSessionType}
                  placeholder="Select session type"
                  options={SESSION_TYPE_OPTIONS.map((option) => ({ value: option, label: option }))}
                />
              </label>
            </div>
            <input type="hidden" name="sort_order" value={String(editing.sort_order ?? 0)} />
            <Field label="Theme" name="theme" defaultValue={editing.theme} />
            <Field label="Live session focus" name="live_session_focus" defaultValue={editing.live_session_focus} textarea />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Student output" name="student_output" defaultValue={editing.student_output} textarea />
              <Field label="Async task" name="async_task" defaultValue={editing.async_task} textarea />
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                <span>Owner</span>
                <SelectMenu
                  name="owner_label"
                  value={ownerLabel}
                  onChange={setOwnerLabel}
                  placeholder="Select owner"
                  options={OWNER_OPTIONS.map((option) => ({ value: option, label: option }))}
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                <span>Support</span>
                <SelectMenu
                  name="support_label"
                  value={supportLabel}
                  onChange={setSupportLabel}
                  placeholder="Select support"
                  options={OWNER_OPTIONS.map((option) => ({ value: option, label: option }))}
                />
              </label>
              <Field label="Risk" name="risk" defaultValue={editing.risk} textarea />
              <Field label="Mitigation" name="mitigation" defaultValue={editing.mitigation} textarea />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button loading={isPending}>{editing.id ? "Save week" : "Add week"}</Button>
            </div>
          </form>
        ) : null}
      </ModalShell>
    </div>
  );
}
