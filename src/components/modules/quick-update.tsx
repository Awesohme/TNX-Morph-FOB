import { updateRecordFieldAction } from "@/lib/actions/records";
import { Button } from "@/components/ui/button";

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
  const options = optionsByField[field];
  if (!options) return <span>{String(value ?? "")}</span>;

  return (
    <form action={updateRecordFieldAction} className="flex min-w-44 items-center gap-2">
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <select
        name="value"
        defaultValue={String(value ?? "")}
        className="h-9 flex-1 rounded-full border bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-slate-950/10"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <Button size="sm" variant="outline" className="h-9 px-3 text-xs">
        Save
      </Button>
    </form>
  );
}
