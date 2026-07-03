import { createAdminClient } from "@/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

const SLUG_ALIASES: Record<string, string[]> = {
  "morph-cohort-2": ["morph-by-tnx-cohort-2"],
  "morph-by-tnx-cohort-2": ["morph-cohort-2"],
};

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase();
}

function slugCandidates(slug: string) {
  const normalized = normalizeSlug(slug);
  return Array.from(new Set([normalized, ...(SLUG_ALIASES[normalized] ?? [])].filter(Boolean)));
}

export async function resolvePublicCohort<T extends { slug?: string | null }>(
  supabase: SupabaseAdminClient,
  slug: string,
  select: string,
) {
  const candidates = slugCandidates(slug);

  if (candidates.length) {
    const { data, error } = await supabase
      .from("cohorts")
      .select(select)
      .in("slug", candidates);
    if (error) throw error;

    const rows = ((data ?? []) as unknown as T[]).filter(Boolean);
    const exactOrAlias = candidates
      .map((candidate) => rows.find((row) => normalizeSlug(String(row.slug ?? "")) === candidate))
      .find(Boolean);
    if (exactOrAlias) return exactOrAlias;
  }

  const { data: active, error: activeError } = await supabase
    .from("cohorts")
    .select(select)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeError) throw activeError;
  if (active) return active as unknown as T;

  const { data: first, error: firstError } = await supabase
    .from("cohorts")
    .select(select)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (firstError) throw firstError;
  return (first as unknown as T | null) ?? null;
}
