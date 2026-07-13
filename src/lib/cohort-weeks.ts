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

// Plan rows can be edited independently, so their persisted sort_order may not match the
// programme sequence. Every selector should still present familiar Week 1, Week 2… ordering.
export function compareWeekLabels(left: string, right: string) {
  const leftMatch = /^week\s*(\d+)$/i.exec(left);
  const rightMatch = /^week\s*(\d+)$/i.exec(right);
  if (leftMatch && rightMatch) return Number(leftMatch[1]) - Number(rightMatch[1]);
  if (leftMatch) return -1;
  if (rightMatch) return 1;
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

export function sortWeekLabels(labels: Array<string | null | undefined>) {
  return Array.from(new Set(labels.map(clean).filter(Boolean))).sort(compareWeekLabels);
}

export function cohortWeekLabels(planRows: CohortWeekRow[] | null | undefined, weekCount?: number | null) {
  const labels = sortWeekLabels((planRows ?? []).map((row) => row.week_label));

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

export function cohortWeekThemeTitle(
  week: string,
  planRows: CohortWeekRow[] | null | undefined,
) {
  const normalizedWeek = clean(week).toLowerCase();
  if (!normalizedWeek) return "";
  const match = (planRows ?? []).find((row) => clean(row.week_label).toLowerCase() === normalizedWeek);
  return clean(match?.theme) || clean(match?.week_label) || clean(week);
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

  return sortWeekLabels(rows.map((row) => row.value)).map((week) => {
    const row = rows.find((item) => item.value === week)!;
    return {
      value: row.value,
      title: row.title,
      label: row.title && row.title !== row.value ? `${row.value} - ${row.title}` : row.value,
    };
  });
}
