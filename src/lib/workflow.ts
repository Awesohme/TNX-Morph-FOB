import { getModuleByKey, getModuleByTable, humanizeColumn, type ModuleConfig, type ModuleField, type ModuleKey } from "@/lib/modules";
import { buildParticipantFullName } from "@/lib/participants";
import { booleanFields, dateFields, jsonFields, numericFields } from "@/lib/record-config";

export type SourceRecordType = ModuleKey;
export type SerializableModuleConfig = Omit<ModuleConfig, "icon">;

export type WorkflowTaskRow = {
  id: string;
  cohort_id: string;
  source_record_type: SourceRecordType | null;
  source_record_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_at: string | null;
  assigned_to: string | null;
  assigned_label: string | null;
  created_at: string;
};

export function getModuleByParam(moduleParam: string): ModuleConfig {
  const moduleConfig = getModuleByKey(moduleParam);
  if (!moduleConfig) {
    throw new Error(`Unknown module: ${moduleParam}`);
  }
  return moduleConfig;
}

export function getModuleField(moduleConfig: ModuleConfig, fieldKey: string): ModuleField | undefined {
  return moduleConfig.fields.find((field) => field.key === fieldKey);
}

export function toSerializableModuleConfig(moduleConfig: ModuleConfig): SerializableModuleConfig {
  const { icon: _icon, ...serializable } = moduleConfig;
  return serializable;
}

export function coerceFieldValue(field: ModuleField | undefined, rawValue: string) {
  if (!field) return rawValue;

  if (numericFields.has(field.key)) {
    const value = rawValue.trim();
    return value ? Number(value) : 0;
  }

  if (booleanFields.has(field.key)) {
    const normalized = rawValue.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "on";
  }

  if (jsonFields.has(field.key)) {
    const value = rawValue.trim();
    return value ? JSON.parse(value) : {};
  }

  if (dateFields.has(field.key)) {
    return rawValue.trim() || null;
  }

  if (field.type === "time" || field.key.endsWith("_id")) {
    return rawValue.trim() || null;
  }

  return rawValue.trim();
}

export function emptyValueForField(field: ModuleField) {
  if (field.type === "boolean") return false;
  if (field.type === "number") return 0;
  if (field.type === "json") return {};
  return "";
}

export function formatFieldValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (value > 0 && value <= 1) return `${Math.round(value * 100)}%`;
    return value.toLocaleString();
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Hoisted so we don't allocate a formatter on every date render (tables, reviews, tasks…).
const dateLabelFormatter = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export function formatDateLabel(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateLabelFormatter.format(date);
}

export function taskTone(status: string, priority: string) {
  const normalizedStatus = status.toLowerCase();
  const normalizedPriority = priority.toLowerCase();
  if (normalizedStatus.includes("overdue") || normalizedPriority === "high") return "red";
  if (normalizedStatus.includes("progress") || normalizedStatus.includes("review")) return "amber";
  if (normalizedStatus.includes("done") || normalizedStatus.includes("closed")) return "green";
  return "blue";
}

export function defaultRecordTitle(moduleKey: ModuleKey, record: Record<string, unknown>) {
  if (moduleKey === "participants") {
    return buildParticipantFullName(record.first_name, record.last_name) || String(record.full_name ?? "Participant");
  }

  const moduleConfig = getModuleByKey(moduleKey);
  if (!moduleConfig) return "Record";

  const primaryField = moduleConfig.fields.find((field) => ["full_name", "first_name", "name", "action", "assignment", "channel", "partner_platform", "topic"].includes(field.key));
  return String(record[primaryField?.key ?? moduleConfig.columns[0]] ?? moduleConfig.singularTitle);
}

export function activityDescription(table: string, field: string, value: unknown) {
  const moduleConfig = getModuleByTable(table);
  const prefix = moduleConfig?.singularTitle ?? humanizeColumn(table);
  return `${prefix} ${humanizeColumn(field).toLowerCase()} updated to ${formatFieldValue(value)}.`;
}
