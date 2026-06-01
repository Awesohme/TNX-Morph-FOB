import { modules } from "@/lib/modules";

export const editableFieldsByTable = Object.fromEntries(
  modules.map((moduleItem) => [
    moduleItem.table,
    moduleItem.fields.filter((field) => field.editable !== false).map((field) => field.key),
  ]),
) satisfies Record<string, string[]>;

export const cmWritableTables = new Set(["participants", "assignment_reviews", "cm_reports"]);
export const numericFields = new Set(
  modules.flatMap((moduleItem) => moduleItem.fields.filter((field) => field.type === "number").map((field) => field.key)),
);
export const booleanFields = new Set(
  modules.flatMap((moduleItem) => moduleItem.fields.filter((field) => field.type === "boolean").map((field) => field.key)),
);
export const dateFields = new Set(
  modules.flatMap((moduleItem) => moduleItem.fields.filter((field) => field.type === "date").map((field) => field.key)),
);
export const jsonFields = new Set(
  modules.flatMap((moduleItem) => moduleItem.fields.filter((field) => field.type === "json").map((field) => field.key)),
);

export const operationalTables = [
  "participants",
  "assignment_reviews",
  "weekly_ops_tasks",
  "session_readiness",
  "recruitment_channels",
  "cm_reports",
  "partnerships",
  "alumni",
];
