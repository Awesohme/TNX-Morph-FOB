/** Client-safe cohort selection over the caller's accessible cohorts only. */
export type SelectableCohort = {
  id: string;
  status?: string;
  starts_on?: string | null;
  ends_on?: string | null;
  created_at?: string | null;
};

function newestFirst(a: SelectableCohort, b: SelectableCohort) {
  return (b.starts_on ?? "").localeCompare(a.starts_on ?? "") ||
    (b.created_at ?? "").localeCompare(a.created_at ?? "") || a.id.localeCompare(b.id);
}

/** Operational calendar date, shared by server and browser regardless of host timezone. */
export function cohortToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function resolveCohort<T extends SelectableCohort>(
  cohorts: readonly T[],
  requestedCohortId?: string | null,
  // Compare date-only database values directly, without parsing them in local time.
  today = cohortToday(),
): T | null {
  const requested = cohorts.find((cohort) => cohort.id === requestedCohortId);
  if (requested) return requested;
  const ordered = [...cohorts].sort(newestFirst);
  const started = (cohort: T) => !cohort.starts_on || cohort.starts_on <= today;
  const currentlyEligible = (cohort: T) =>
    (cohort.status === "active" || (cohort.status === "planning" && Boolean(cohort.starts_on))) &&
    started(cohort) && (!cohort.ends_on || cohort.ends_on >= today);
  return ordered.find(currentlyEligible) ??
    ordered.find((cohort) => cohort.status === "active" && started(cohort)) ??
    ordered.find(started) ?? ordered[0] ?? null;
}

/** Preserve workspace filters while clearing pagination for the newly selected cohort. */
export function cohortSwitchHref(basePath: string, search: string, cohortId: string) {
  const [pathname, baseSearch = ""] = basePath.split("?");
  const params = new URLSearchParams(search);
  new URLSearchParams(baseSearch).forEach((value, key) => params.set(key, value));
  params.set("cohort", cohortId);
  params.delete("page");
  params.delete("cursor");
  return `${pathname}?${params.toString()}`;
}
