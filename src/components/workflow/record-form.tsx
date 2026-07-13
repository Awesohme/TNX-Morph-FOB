"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import type { ModuleField } from "@/lib/modules";
import type { RecordActionState } from "@/lib/actions/records";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectMenu } from "@/components/ui/select-menu";
import { useModalShell } from "@/components/ui/modal-shell";
import { RequiredLabel } from "@/components/ui/required-indicator";
import type { SerializableModuleConfig } from "@/lib/workflow";
import { cn } from "@/lib/utils";

type FormOption = { value: string; label: string };

const WEEKDAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

function WeekdayAccordion({ field, value }: { field: ModuleField; value: unknown }) {
  const initial: Record<string, boolean> = typeof value === "object" && value ? (value as Record<string, boolean>) : {};
  const [days, setDays] = useState<Record<string, boolean>>(initial);
  const [open, setOpen] = useState(false);
  const checkedCount = Object.values(days).filter(Boolean).length;

  function toggle(key: string) {
    setDays((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-1">
      <input type="hidden" name={field.key} value={JSON.stringify(days)} />
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 w-full items-center justify-between rounded-[1.25rem] border border-slate-200 bg-white px-4 text-sm text-slate-700 transition hover:bg-slate-50"
      >
        <span>{checkedCount > 0 ? `${checkedCount} day${checkedCount > 1 ? "s" : ""} posted` : "No days posted yet"}</span>
        <ChevronDown className={cn("size-4 text-slate-400 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-4">
          {WEEKDAYS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(days[key])}
                onChange={() => toggle(key)}
                className="size-4 rounded border-slate-300"
              />
              {label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistField({ field, value }: { field: ModuleField; value: unknown }) {
  const items = field.checklistItems ?? [];
  const stored: Record<string, string> = typeof value === "object" && value ? (value as Record<string, string>) : {};
  const [checks, setChecks] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((item) => [item.key, String(stored[item.key] ?? "").toLowerCase() === "yes"])),
  );

  const doneCount = items.filter((item) => checks[item.key]).length;
  const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  // Persist as the "Yes"/"No" JSON shape the readiness score is computed from.
  const payload = JSON.stringify(Object.fromEntries(items.map((item) => [item.key, checks[item.key] ? "Yes" : "No"])));

  return (
    <div className="space-y-2">
      <input type="hidden" name={field.key} value={payload} />
      <div className="flex items-center justify-between rounded-t-2xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm">
        <span className="text-slate-600">{doneCount} of {items.length} ready</span>
        <span className="font-semibold text-slate-900">{percent}%</span>
      </div>
      <div className="-mt-2 grid gap-2 rounded-b-2xl border border-t-0 border-slate-200 bg-white p-3 sm:grid-cols-2">
        {items.map((item) => (
          <label key={item.key} className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(checks[item.key])}
              onChange={() => setChecks((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
              className="size-4 rounded border-slate-300 text-slate-950"
            />
            {item.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function ParticipantMultiselect({
  field,
  value,
  participants,
}: {
  field: ModuleField;
  value: unknown;
  participants: Array<{ id: string; name: string }>;
}) {
  // value is a jsonb array of {id, name} objects OR just ids
  const initial: Array<{ id: string; name: string }> = (() => {
    if (!Array.isArray(value)) return [];
    return value.map((v) => {
      if (typeof v === "object" && v && "id" in v) return v as { id: string; name: string };
      const p = participants.find((p) => p.id === v);
      return p ? { id: p.id, name: p.name } : { id: String(v), name: String(v) };
    });
  })();
  const [selected, setSelected] = useState<Array<{ id: string; name: string }>>(initial);
  const [query, setQuery] = useState("");

  const filtered = participants.filter(
    (p) => !selected.find((s) => s.id === p.id) && p.name.toLowerCase().includes(query.toLowerCase()),
  );

  function add(p: { id: string; name: string }) {
    setSelected((prev) => [...prev, p]);
    setQuery("");
  }

  function remove(id: string) {
    setSelected((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={field.key} value={JSON.stringify(selected)} />
      {/* Pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">
              {s.name}
              <button type="button" onClick={() => remove(s.id)} className="ml-0.5 text-slate-300 hover:text-white" aria-label={`Remove ${s.name}`}>
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {/* Search input */}
      {participants.length > 0 ? (
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search participants…`}
            className="h-10"
          />
          {query && filtered.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
              {filtered.slice(0, 12).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => add(p)}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No participants loaded for this cohort.</p>
      )}
    </div>
  );
}

function renderInput(
  field: ModuleField,
  value: unknown,
  participants: Array<{ id: string; name: string }>,
  fieldOptions: Record<string, FormOption[]>,
) {
  const dynamicOptions = fieldOptions[field.key];

  switch (field.type) {
    case "weekday_accordion":
      return <WeekdayAccordion field={field} value={value} />;
    case "checklist":
      return <ChecklistField field={field} value={value} />;
    case "participant_multiselect":
      return <ParticipantMultiselect field={field} value={value} participants={participants} />;
    case "textarea":
      return <Textarea name={field.key} defaultValue={String(value ?? "")} placeholder={field.placeholder ?? field.label} rows={4} />;
    case "select":
      return (
        <SelectMenu
          name={field.key}
          defaultValue={String(value ?? "")}
          placeholder={`Select ${field.label.toLowerCase()}`}
          buttonClassName="h-11"
          options={dynamicOptions ?? (field.options ?? []).map((option) => ({ value: option, label: option }))}
        />
      );
    case "boolean":
      return (
        <label className="flex h-12 items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 text-sm">
          <input
            type="checkbox"
            name={field.key}
            defaultChecked={Boolean(value)}
            className="size-4 rounded border-slate-300 text-slate-950"
          />
          <span>{field.label}</span>
        </label>
      );
    case "number":
      return <Input name={field.key} type="number" defaultValue={value === null || value === undefined ? "" : String(value)} placeholder={field.placeholder ?? field.label} />;
    case "date":
      return <Input name={field.key} type="date" defaultValue={String(value ?? "")} />;
    case "time":
      return <Input name={field.key} type="time" defaultValue={String(value ?? "")} />;
    default:
      return <Input name={field.key} defaultValue={String(value ?? "")} placeholder={field.placeholder ?? field.label} />;
  }
}

export function RecordForm({
  moduleConfig,
  action,
  stateAction,
  values,
  cohortId,
  recordId,
  submitLabel,
  className,
  participants = [],
  fieldOptions = {},
}: {
  moduleConfig: SerializableModuleConfig;
  action?: (formData: FormData) => Promise<void>;
  stateAction?: (prevState: RecordActionState, formData: FormData) => Promise<RecordActionState>;
  values?: Record<string, unknown>;
  cohortId?: string;
  recordId?: string;
  submitLabel: string;
  className?: string;
  participants?: Array<{ id: string; name: string }>;
  fieldOptions?: Record<string, FormOption[]>;
}) {
  const router = useRouter();
  const modal = useModalShell();
  const [state, formAction, isPending] = useActionState(stateAction ?? passthroughRecordStateAction, {
    ok: false,
    message: "",
  });
  const isRedirecting = Boolean(state.ok && state.redirectTo);
  // Only render editable fields — non-editable (e.g. cm) are hidden from the form
  const editableFields = moduleConfig.fields.filter((f) => f.editable !== false);
  const submitAction = stateAction ? formAction : action;

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      // A newly deployed Next build can invalidate the route chunks held by the current
      // PWA shell. A client-side push then briefly trips the error boundary even though the
      // server action has already saved the record. Use a document navigation after writes so
      // the detail page always boots with the current build's assets.
      window.location.assign(state.redirectTo);
    }
  }, [state.ok, state.redirectTo]);

  if (!submitAction) {
    throw new Error("Record form is missing a submit action.");
  }

  return (
    <form action={submitAction} className={cn("space-y-6", className)}>
      <input type="hidden" name="moduleKey" value={moduleConfig.key} />
      {cohortId ? <input type="hidden" name="cohortId" value={cohortId} /> : null}
      {recordId ? <input type="hidden" name="recordId" value={recordId} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {editableFields.map((field) => (
          <label
            key={field.key}
            className={cn(
              "space-y-2 text-sm font-medium text-slate-700",
              (field.type === "textarea" || field.type === "weekday_accordion" || field.type === "participant_multiselect" || field.type === "checklist" || field.type === "boolean") && "md:col-span-2",
            )}
          >
            {field.type === "boolean" ? null : (
              field.required ? <RequiredLabel>{field.label}</RequiredLabel> : <span>{field.label}</span>
            )}
            {renderInput(field, values?.[field.key], participants, fieldOptions)}
          </label>
        ))}
      </div>

      {stateAction && state.message ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700",
          )}
          role="status"
        >
          {state.message}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => (modal ? modal.close() : router.back())}>
          Cancel
        </Button>
        <Button disabled={isPending || isRedirecting}>{isPending ? "Saving..." : isRedirecting ? "Opening..." : submitLabel}</Button>
      </div>
    </form>
  );
}

async function passthroughRecordStateAction(): Promise<RecordActionState> {
  return { ok: false, message: "" };
}
