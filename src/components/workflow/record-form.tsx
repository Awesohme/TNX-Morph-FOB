import type { ModuleField } from "@/lib/modules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SerializableModuleConfig } from "@/lib/workflow";
import { cn } from "@/lib/utils";

function renderInput(field: ModuleField, value: unknown) {
  switch (field.type) {
    case "textarea":
      return <Textarea name={field.key} defaultValue={String(value ?? "")} placeholder={field.placeholder ?? field.label} rows={4} />;
    case "select":
      return (
        <select
          name={field.key}
          defaultValue={String(value ?? "")}
          className="app-select h-11"
        >
          <option value="">Select {field.label.toLowerCase()}</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
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
    default:
      return <Input name={field.key} defaultValue={String(value ?? "")} placeholder={field.placeholder ?? field.label} />;
  }
}

export function RecordForm({
  moduleConfig,
  action,
  values,
  cohortId,
  recordId,
  submitLabel,
  className,
}: {
  moduleConfig: SerializableModuleConfig;
  action: (formData: FormData) => Promise<void>;
  values?: Record<string, unknown>;
  cohortId?: string;
  recordId?: string;
  submitLabel: string;
  className?: string;
}) {
  return (
    <form action={action} className={cn("space-y-6", className)}>
      <input type="hidden" name="moduleKey" value={moduleConfig.key} />
      {cohortId ? <input type="hidden" name="cohortId" value={cohortId} /> : null}
      {recordId ? <input type="hidden" name="recordId" value={recordId} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {moduleConfig.fields.map((field) => (
          <label
            key={field.key}
            className={cn(
              "space-y-2 text-sm font-medium text-slate-700",
              field.type === "textarea" && "md:col-span-2",
            )}
          >
            {field.type === "boolean" ? null : (
              <span>
                {field.label}
                {field.required ? <span className="ml-1 text-rose-600">*</span> : null}
              </span>
            )}
            {renderInput(field, values?.[field.key])}
          </label>
        ))}
      </div>

      <div className="flex items-center justify-end">
        <Button>{submitLabel}</Button>
      </div>
    </form>
  );
}
