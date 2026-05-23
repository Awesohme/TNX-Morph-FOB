"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { modules } from "@/lib/modules";
import { booleanFields, cmWritableTables, editableFieldsByTable, numericFields } from "@/lib/record-config";
import { safeErrorMessage } from "@/lib/utils";

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function coerceValue(field: string, value: string) {
  if (numericFields.has(field)) return Number(value || 0);
  if (booleanFields.has(field)) return value === "true" || value.toLowerCase() === "yes";
  return value;
}

export async function updateRecordFieldAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin", "facilitator", "community_manager");
  try {
    const table = text(formData.get("table"));
    const id = text(formData.get("id"));
    const field = text(formData.get("field"));
    const value = text(formData.get("value"));
    const returnTo = text(formData.get("returnTo")) || "/";

    const moduleConfig = modules.find((item) => item.table === table);
    const allowedFields = editableFieldsByTable[table] ?? [];
    if (!moduleConfig || !id || !allowedFields.includes(field)) {
      throw new Error("This field cannot be updated from the UI.");
    }

    if (session.role === "community_manager" && !cmWritableTables.has(table)) {
      throw new Error("Community managers cannot update this module.");
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from(table)
      .update({ [field]: coerceValue(field, value), updated_by: session.id })
      .eq("id", id);
    if (error) throw error;

    await supabase.from("audit_logs").insert({
      actor_id: session.id,
      action: "update_record_field",
      entity_table: table,
      entity_id: id,
      metadata: { field, value },
    });

    revalidatePath(returnTo);
  } catch (error) {
    throw new Error(safeErrorMessage(error));
  }
}
