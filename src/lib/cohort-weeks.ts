export type CohortWeekRow = {
  week_label: string | null;
  sort_order?: number | null;
};

export function generateWeekLabels(weekCount: number | null | undefined) {
  const count = Math.max(1, Math.min(52, Number(weekCount || 6)));
  return Array.from({ length: count }, (_, index) => `Week ${index + 1}`);
}

export function cohortWeekLabels(planRows: CohortWeekRow[] | null | undefined, weekCount?: number | null) {
  const labels = Array.from(
    new Set(
      (planRows ?? [])
        .map((row) => String(row.week_label ?? "").trim())
        .filter(Boolean),
    ),
  );

  return labels.length ? labels : generateWeekLabels(weekCount);
}
