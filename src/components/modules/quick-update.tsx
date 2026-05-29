"use client";

import { useRef } from "react";
import { updateRecordFieldAction } from "@/lib/actions/records";

const optionsByField: Record<string, string[]> = {
  risk: ["Green", "Amber", "Red"],
  mvp_status: ["Not Started", "In Progress", "Almost Done", "Completed"],
  demo_status: ["Not Presented", "Live Presented", "Recorded Submitted", "Pending Recording"],
  review_status: ["Not Reviewed", "In Review", "Feedback Sent", "Needs Resubmission", "Closed"],
  status: ["Not Started", "In Progress", "Done", "Blocked", "Deferred"],
  priority: ["Low", "Medium", "High"],
};

export function QuickUpdate({
  table,
  id,
  field,
  value,
  returnTo,
}: {
  table: string;
  id: string;
  field: string;
  value: unknown;
  returnTo: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const options = optionsByField[field];
  if (!options) return <span>{String(value ?? "")}</span>;

  return (
    <form ref={formRef} action={updateRecordFieldAction} className="min-w-40">
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <select
        name="value"
        defaultValue={String(value ?? "")}
        className="app-select h-9 text-xs"
        onChange={() => formRef.current?.requestSubmit()}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </form>
  );
}

export function InlineFieldUpdate({
  table,
  id,
  field,
  value,
  returnTo,
  placeholder,
}: {
  table: string;
  id: string;
  field: string;
  value: unknown;
  returnTo: string;
  placeholder?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={updateRecordFieldAction} className="min-w-40">
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input
        name="value"
        defaultValue={String(value ?? "")}
        placeholder={placeholder}
        className="app-input h-9 text-xs"
        onBlur={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
