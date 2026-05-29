import { createClient } from "@/lib/supabase/server";

export type CohortSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  starts_on: string | null;
  ends_on: string | null;
};

export async function listAccessibleCohorts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cohorts")
    .select("id, slug, name, description, status, starts_on, ends_on")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CohortSummary[];
}

export async function getScopedCohort(requestedCohortId?: string | null) {
  const cohorts = await listAccessibleCohorts();
  const cohort =
    cohorts.find((item) => item.id === requestedCohortId) ??
    cohorts.find((item) => item.status === "active") ??
    cohorts[0] ??
    null;

  return {
    cohorts,
    cohort,
    cohortId: cohort?.id ?? null,
  };
}

export function withCohortParam(path: string, cohortId?: string | null) {
  if (!cohortId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}cohort=${cohortId}`;
}

export function currentWeekLabel(date = new Date()) {
  const month = date.getUTCMonth();
  if (month === 0 && date.getUTCDate() === 1) return "Week 1";
  return `Week ${Math.max(1, Math.ceil(date.getUTCDate() / 7))}`;
}
