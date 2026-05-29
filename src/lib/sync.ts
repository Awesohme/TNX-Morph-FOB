import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";
import { appendSheetRows, columnNumberToLetter, getSheetValues, hashSheetRow, updateSheetRange } from "@/lib/google-sheets";
import { getImportDataset, type ImportDatasetConfig, type ImportValue } from "@/lib/import-config";

const SYNC_DATASET_KEYS = ["participants", "reviews", "ops", "sessions", "community"] as const;
const DATASET_TABLES: Record<(typeof SYNC_DATASET_KEYS)[number], string> = {
  participants: "participants",
  reviews: "assignment_reviews",
  ops: "weekly_ops_tasks",
  sessions: "session_readiness",
  community: "cm_reports",
};

type SyncDatasetKey = (typeof SYNC_DATASET_KEYS)[number];
type SyncConfigRow = {
  id: string;
  cohort_id: string;
  dataset_key: SyncDatasetKey;
  spreadsheet_id: string;
  sheet_name: string;
  enabled: boolean;
  header_row: number;
};

type SyncOutcome = {
  configured: boolean;
  runs: Array<{ datasetKey: string; cohortId: string; rowsPulled: number; rowsPushed: number }>;
};

function isSyncDatasetKey(value: string): value is SyncDatasetKey {
  return SYNC_DATASET_KEYS.includes(value as SyncDatasetKey);
}

function hasGoogleSheetsConfig() {
  const env = getServerEnv();
  return Boolean(env.googleServiceAccountEmail && env.googleServiceAccountPrivateKey);
}

function toCellValue(value: ImportValue) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

function rowsEqualByFields(record: Record<string, unknown>, payload: Record<string, unknown>, fields: string[]) {
  return fields.every((field) => String(record[field] ?? "") === String(payload[field] ?? ""));
}

function getDatasetOrThrow(datasetKey: SyncDatasetKey) {
  const dataset = getImportDataset(datasetKey);
  if (!dataset) throw new Error(`Sync dataset not found: ${datasetKey}`);
  return dataset as ImportDatasetConfig;
}

function serializeDatasetRow(dataset: ImportDatasetConfig, record: Record<string, unknown>) {
  const values = dataset.serializeRecord?.(record);
  if (!values) throw new Error(`Dataset ${dataset.key} cannot be written back to Sheets yet.`);
  return values;
}

async function ensureSheetHeader(spreadsheetId: string, sheetName: string, headerRow: number, headers: string[]) {
  const range = `${sheetName}!A${headerRow}:${columnNumberToLetter(headers.length)}${headerRow}`;
  await updateSheetRange(spreadsheetId, range, [headers]);
}

function mapSheetRows(headers: string[], values: string[][], headerRow: number) {
  return values.slice(headerRow).map((row, index) => {
    const rowObject = headers.reduce<Record<string, string>>((acc, header, headerIndex) => {
      acc[header] = row[headerIndex] ?? "";
      return acc;
    }, {});
    return {
      rowNumber: headerRow + index + 1,
      data: rowObject,
    };
  });
}

async function syncDatasetConfig(
  supabase: ReturnType<typeof createAdminClient>,
  config: SyncConfigRow,
  initiatedBy: string | null,
) {
  const dataset = getDatasetOrThrow(config.dataset_key);
  const table = DATASET_TABLES[config.dataset_key];
  const headerKeys = [...dataset.fields.map((field) => field.key), "app_record_id"];
  const runInsert = await supabase
    .from("google_sheet_sync_runs")
    .insert({
      cohort_id: config.cohort_id,
      dataset_key: config.dataset_key,
      direction: "full",
      status: "running",
      initiated_by: initiatedBy,
    })
    .select("id")
    .single();
  const runId = runInsert.data?.id ?? null;

  try {
    const sheet = await getSheetValues(config.spreadsheet_id, config.sheet_name);
    const values = sheet.values ?? [];
    const headerIndex = Math.max(0, config.header_row - 1);
    const headers = values[headerIndex] ?? [];
    let usableHeaders = (headers.length ? headers : headerKeys).map((header) => header.trim()).filter(Boolean);
    if (!usableHeaders.length || !headerKeys.every((header) => usableHeaders.includes(header))) {
      usableHeaders = [...usableHeaders.filter((header) => header !== "app_record_id"), ...headerKeys].filter(
        (header, index, self) => self.indexOf(header) === index,
      );
      await ensureSheetHeader(config.spreadsheet_id, config.sheet_name, config.header_row, usableHeaders);
    }

    const mappedRows = mapSheetRows(usableHeaders, values.length ? values : [usableHeaders], headerIndex);
    const { data: dbRowsRaw } = await supabase.from(table).select("*").eq("cohort_id", config.cohort_id);
    const dbRows = (dbRowsRaw ?? []) as Array<Record<string, unknown> & { id: string }>;

    let rowsPulled = 0;
    for (const row of mappedRows) {
      const relevantFields = dataset.fields.reduce<Record<string, ImportValue>>((acc, field) => {
        acc[field.key] = row.data[field.key] ?? "";
        return acc;
      }, {});
      const isBlank = Object.values(relevantFields).every((value) => String(value ?? "").trim() === "");
      if (isBlank) continue;

      const transformed = dataset.transformRow(relevantFields, { cohortId: config.cohort_id, actorId: initiatedBy });
      const rowHash = hashSheetRow(relevantFields);
      const appRecordId = row.data.app_record_id?.trim();
      const existing =
        dbRows.find((candidate) => candidate.id === appRecordId) ??
        dbRows.find((candidate) => dataset.findExistingWhere.some((group) => rowsEqualByFields(candidate, transformed, group)));

      if (existing) {
        if (String(existing.google_sheet_row_hash ?? "") !== rowHash) {
          await supabase
            .from(table)
            .update({
              ...transformed,
              google_sheet_row_key: appRecordId || `sheet-${row.rowNumber}`,
              google_sheet_row_hash: rowHash,
              google_sheet_last_synced_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          rowsPulled += 1;
        }
      } else {
        const insertPayload = {
          ...transformed,
          google_sheet_row_key: appRecordId || `sheet-${row.rowNumber}`,
          google_sheet_row_hash: rowHash,
          google_sheet_last_synced_at: new Date().toISOString(),
        };
        const { data: inserted } = await supabase.from(table).insert(insertPayload).select("id").single();
        if (inserted?.id) {
          dbRows.push({ id: inserted.id, ...insertPayload });
          rowsPulled += 1;
        }
      }
    }

    const latestRowsResult = await supabase.from(table).select("*").eq("cohort_id", config.cohort_id).order("created_at", { ascending: true });
    const latestRows = (latestRowsResult.data ?? []) as Array<Record<string, unknown> & { id: string }>;
    const refreshedSheet = await getSheetValues(config.spreadsheet_id, config.sheet_name);
    const refreshedValues = refreshedSheet.values ?? [];
    const refreshedHeaders = (refreshedValues[headerIndex] ?? usableHeaders).map((header) => header.trim()).filter(Boolean);
    if (!refreshedValues[headerIndex]?.length) {
      await ensureSheetHeader(config.spreadsheet_id, config.sheet_name, config.header_row, usableHeaders);
    }
    const sheetRows = mapSheetRows(refreshedHeaders, refreshedValues.length ? refreshedValues : [headerKeys], headerIndex);
    const rowNumberByRecordId = new Map<string, number>();
    for (const row of sheetRows) {
      const appRecordId = row.data.app_record_id?.trim();
      if (appRecordId) rowNumberByRecordId.set(appRecordId, row.rowNumber);
    }

    let rowsPushed = 0;
    const appendRows: Array<Array<string | number | boolean | null>> = [];
    for (const record of latestRows) {
      const serialized = serializeDatasetRow(dataset, record);
      const rowPayload = {
        ...serialized,
        app_record_id: record.id,
      };
      const rowValues = usableHeaders.map((header) => toCellValue(rowPayload[header as keyof typeof rowPayload] ?? ""));
      const rowHash = hashSheetRow(rowPayload);
      const existingRowNumber = rowNumberByRecordId.get(record.id);
      if (existingRowNumber) {
        const range = `${config.sheet_name}!A${existingRowNumber}:${columnNumberToLetter(usableHeaders.length)}${existingRowNumber}`;
        await updateSheetRange(config.spreadsheet_id, range, [rowValues]);
        rowsPushed += 1;
      } else {
        appendRows.push(rowValues);
        rowsPushed += 1;
      }

      await supabase
        .from(table)
        .update({
          google_sheet_row_key: record.id,
          google_sheet_row_hash: rowHash,
          google_sheet_last_synced_at: new Date().toISOString(),
        })
        .eq("id", record.id);
    }

    if (appendRows.length) {
      await appendSheetRows(config.spreadsheet_id, config.sheet_name, appendRows);
    }

    if (runId) {
      await supabase
        .from("google_sheet_sync_runs")
        .update({
          status: "completed",
          rows_pulled: rowsPulled,
          rows_pushed: rowsPushed,
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
    return { datasetKey: config.dataset_key, cohortId: config.cohort_id, rowsPulled, rowsPushed };
  } catch (error) {
    if (runId) {
      await supabase
        .from("google_sheet_sync_runs")
        .update({
          status: "failed",
          message: error instanceof Error ? error.message : "Sync failed.",
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
    throw error;
  }
}

export async function runGoogleSheetSync({
  cohortId,
  datasetKey,
  initiatedBy = null,
}: {
  cohortId?: string | null;
  datasetKey?: string | null;
  initiatedBy?: string | null;
} = {}): Promise<SyncOutcome> {
  if (!hasGoogleSheetsConfig()) {
    return { configured: false, runs: [] };
  }

  const supabase = createAdminClient();
  let query = supabase.from("google_sheet_sync_configs").select("*").eq("enabled", true);
  if (cohortId) query = query.eq("cohort_id", cohortId);
  if (datasetKey && isSyncDatasetKey(datasetKey)) query = query.eq("dataset_key", datasetKey);
  const { data: configs, error } = await query.order("dataset_key", { ascending: true });
  if (error) throw error;

  const runs = [];
  for (const config of ((configs ?? []) as SyncConfigRow[])) {
    runs.push(await syncDatasetConfig(supabase, config, initiatedBy));
  }

  return { configured: true, runs };
}

export async function pushRecordToGoogleSheet({
  table,
  recordId,
  cohortId,
  initiatedBy = null,
}: {
  table: string;
  recordId: string;
  cohortId: string;
  initiatedBy?: string | null;
}) {
  const datasetKey = (Object.entries(DATASET_TABLES).find(([, candidateTable]) => candidateTable === table)?.[0] ?? null) as SyncDatasetKey | null;
  if (!datasetKey || !hasGoogleSheetsConfig()) return;

  const supabase = createAdminClient();
  const { data: config } = await supabase
    .from("google_sheet_sync_configs")
    .select("*")
    .eq("cohort_id", cohortId)
    .eq("dataset_key", datasetKey)
    .eq("enabled", true)
    .maybeSingle();
  if (!config) return;

  await syncDatasetConfig(supabase, config as SyncConfigRow, initiatedBy);
}
