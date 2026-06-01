"use client";

import { useRef, useState } from "react";
import { updateRecordFieldAction } from "@/lib/actions/records";
import { SelectMenu } from "@/components/ui/select-menu";

const optionsByField: Record<string, string[]> = {
  risk: ["Green", "Amber", "Red"],
  mvp_status: ["Not Started", "In Progress", "Almost Done", "Completed"],
  demo_status: ["Not Presented", "Live Presented", "Recorded Submitted", "Pending Recording"],
  submitted: ["true", "false"],
  certificate_issued: ["true", "false"],
  badge_issued: ["true", "false"],
  alumni_group_joined: ["true", "false"],
  posted_online: ["true", "false"],
  reposted_by_tnx: ["true", "false"],
  review_status: ["Not Reviewed", "In Review", "Feedback Sent", "Needs Resubmission", "Closed"],
  status: ["Not Started", "In Progress", "Done", "Blocked", "Deferred"],
  priority: ["Low", "Medium", "High"],
};

// Tint the status/risk dropdown by its value so state reads at a glance.
function toneClassFor(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("red") || text.includes("blocked") || text.includes("needs") || text.includes("high")) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (text.includes("amber") || text.includes("progress") || text.includes("review") || text.includes("medium")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (text.includes("green") || text.includes("done") || text.includes("completed") || text.includes("closed") || text.includes("low")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "";
}

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
  const valueRef = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(String(value ?? ""));
  const options = optionsByField[field];
  if (!options) return <span>{String(value ?? "")}</span>;

  return (
    <form ref={formRef} action={updateRecordFieldAction} className="min-w-40">
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input ref={valueRef} type="hidden" name="value" value={current} readOnly />
      <SelectMenu
        ariaLabel={field}
        value={current}
        options={options.map((option) => ({
          value: option,
          label:
            field === "submitted"
              ? option === "true"
                ? "Submitted"
                : "Not submitted"
              : option === "true"
                ? "Yes"
                : option === "false"
                  ? "No"
                  : option,
        }))}
        onChange={(next) => {
          if (valueRef.current) valueRef.current.value = next;
          setCurrent(next);
          formRef.current?.requestSubmit();
        }}
        buttonClassName={`h-9 text-xs font-medium ${toneClassFor(current)}`}
      />
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
        aria-label={placeholder || field}
        defaultValue={String(value ?? "")}
        placeholder={placeholder}
        className="app-input h-9 text-xs"
        onBlur={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
