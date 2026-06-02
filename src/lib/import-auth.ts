import type { AppRole } from "@/lib/auth";
import type { ImportDatasetKey } from "@/lib/import-config";

const datasetWriteRoles: Record<string, AppRole[]> = {
  participants: ["admin", "facilitator", "community_manager"],
  reviews: ["admin", "facilitator"],
  ops: ["admin", "facilitator"],
  sessions: ["admin", "facilitator"],
  community: ["admin", "facilitator", "community_manager"],
  alumni: ["admin", "facilitator"],
};

export function getImportRoles(datasetKey: ImportDatasetKey | string): AppRole[] {
  return datasetWriteRoles[datasetKey] ?? ["admin"];
}
