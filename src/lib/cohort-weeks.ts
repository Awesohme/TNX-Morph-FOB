export type CohortWeekRow = {
  week_label: string | null;
  sort_order?: number | null;
  theme?: string | null;
  assignment_label?: string | null;
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

function clean(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function titleForRow(row: CohortWeekRow) {
  return clean(row.assignment_label) || clean(row.theme) || clean(row.week_label);
}

export function cohortWeekAssignmentTitle(
  week: string,
  planRows: CohortWeekRow[] | null | undefined,
) {
  const normalizedWeek = clean(week).toLowerCase();
  if (!normalizedWeek) return "";
  const match = (planRows ?? []).find((row) => clean(row.week_label).toLowerCase() === normalizedWeek);
  return match ? titleForRow(match) : clean(week);
}

export function cohortWeekOptions(planRows: CohortWeekRow[] | null | undefined, weekCount?: number | null) {
  const rows = (planRows ?? [])
    .map((row) => ({
      value: clean(row.week_label),
      title: titleForRow(row),
    }))
    .filter((row) => row.value);

  if (!rows.length) {
    return generateWeekLabels(weekCount).map((week) => ({
      value: week,
      title: week,
      label: week,
    }));
  }

  return rows.map((row) => ({
    value: row.value,
    title: row.title,
    label: row.title && row.title !== row.value ? `${row.value} - ${row.title}` : row.value,
  }));
}
