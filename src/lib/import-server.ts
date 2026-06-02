import { buildParticipantFullName } from "@/lib/participants";
import {
  PARTICIPANT_APPLICATION_FIELD_KEYS,
  type ImportDatasetConfig,
  type ImportValue,
} from "@/lib/import-config";
import type { createAdminClient } from "@/lib/supabase/admin";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type ImportRowAction = "create" | "update" | "skip";

export type ParticipantDuplicateCandidate = {
  id: string;
  fullName: string;
  email: string;
  whatsapp: string;
  matchType: "email" | "phone" | "name";
  confidence: number;
};

type ParticipantCandidateRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  whatsapp: string | null;
};

export function text(value: ImportValue | unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizedText(value: unknown) {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function normalizedEmail(value: unknown) {
  return text(value).toLowerCase();
}

function normalizedPhone(value: unknown) {
  return text(value).replace(/\D/g, "").replace(/^2340/, "234");
}

function nullableDate(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

function distance(a: string, b: string) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, index) => index);
  const curr = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
  }

  return prev[b.length];
}

function similarity(a: string, b: string) {
  const longest = Math.max(a.length, b.length);
  if (!longest) return 0;
  return 1 - distance(a, b) / longest;
}

export function validateImportRow(dataset: ImportDatasetConfig, row: Record<string, ImportValue>) {
  const errors: string[] = [];

  for (const field of dataset.fields) {
    const value = row[field.key];
    const raw = text(value);

    if (field.required && !raw) {
      errors.push(`${field.label} is required.`);
      continue;
    }

    if (!raw) continue;

    if (field.type === "number" && Number.isNaN(Number(raw))) {
      errors.push(`${field.label} must be a number.`);
    }

    if (field.type === "date" && Number.isNaN(new Date(raw).valueOf())) {
      errors.push(`${field.label} must be a valid date.`);
    }

    if (field.type === "select" && field.options?.length && !field.options.includes(raw)) {
      errors.push(`${field.label} must be one of: ${field.options.join(", ")}.`);
    }
  }

  return errors;
}

export async function findExistingRecord(
  supabase: SupabaseAdmin,
  dataset: ImportDatasetConfig,
  cohortId: string,
  row: Record<string, ImportValue>,
) {
  for (const keys of dataset.findExistingWhere) {
    const usable = keys.every((key) => text(row[key]));
    if (!usable) continue;

    let query = supabase.from(dataset.table).select("id").eq("cohort_id", cohortId);
    for (const key of keys) {
      const value = key === "email" ? normalizedEmail(row[key]) : text(row[key]);
      query = key === "email" ? query.ilike(key, value) : query.eq(key, value);
    }
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id as string;
  }

  return null;
}

export async function loadParticipantCandidates(supabase: SupabaseAdmin, cohortId: string) {
  const { data, error } = await supabase
    .from("participants")
    .select("id, first_name, last_name, full_name, email, whatsapp")
    .eq("cohort_id", cohortId)
    .limit(10000);

  if (error) throw error;
  return (data ?? []) as ParticipantCandidateRow[];
}

function participantName(row: Record<string, ImportValue> | ParticipantCandidateRow) {
  return buildParticipantFullName(row.first_name, row.last_name) || text(row.full_name);
}

function asDuplicateCandidate(
  candidate: ParticipantCandidateRow,
  matchType: ParticipantDuplicateCandidate["matchType"],
  confidence: number,
): ParticipantDuplicateCandidate {
  return {
    id: candidate.id,
    fullName: participantName(candidate),
    email: text(candidate.email),
    whatsapp: text(candidate.whatsapp),
    matchType,
    confidence,
  };
}

export function findParticipantDuplicate(
  row: Record<string, ImportValue>,
  candidates: ParticipantCandidateRow[],
  existingId?: string | null,
) {
  if (existingId) {
    const forced = candidates.find((candidate) => candidate.id === existingId);
    if (forced) return asDuplicateCandidate(forced, "email", 100);
  }

  const email = normalizedEmail(row.email);
  if (email) {
    const match = candidates.find((candidate) => normalizedEmail(candidate.email) === email);
    if (match) return asDuplicateCandidate(match, "email", 100);
  }

  const phone = normalizedPhone(row.whatsapp);
  if (phone.length >= 7) {
    const match = candidates.find((candidate) => normalizedPhone(candidate.whatsapp) === phone);
    if (match) return asDuplicateCandidate(match, "phone", 95);
  }

  const name = normalizedText(participantName(row));
  if (!name) return null;

  let best: { candidate: ParticipantCandidateRow; score: number } | null = null;
  for (const candidate of candidates) {
    const candidateName = normalizedText(participantName(candidate));
    if (!candidateName) continue;
    const score = similarity(name, candidateName);
    if (!best || score > best.score) best = { candidate, score };
  }

  if (best && best.score >= 0.82) {
    return asDuplicateCandidate(best.candidate, "name", Math.round(best.score * 100));
  }

  return null;
}

export function hasParticipantApplicationData(row: Record<string, ImportValue>) {
  return PARTICIPANT_APPLICATION_FIELD_KEYS.some((key) => text(row[key]));
}

export function buildParticipantApplicationProfile(
  row: Record<string, ImportValue>,
  cohortId: string,
  participantId: string | null,
) {
  const email = normalizedEmail(row.email);
  if (!email || !hasParticipantApplicationData(row)) return null;

  return {
    cohort_id: cohortId,
    participant_id: participantId,
    decision: "Accepted",
    first_name: text(row.first_name) || null,
    last_name: text(row.last_name) || null,
    email,
    phone: text(row.whatsapp) || null,
    gender: text(row.gender) || null,
    age_range: text(row.age_range) || null,
    institution: text(row.institution) || null,
    level_of_study: text(row.level_of_study) || null,
    background: text(row.background) || null,
    built_product_before: text(row.built_product_before) || null,
    bootcamp_interest: text(row.bootcamp_interest) || null,
    has_idea: text(row.has_idea) || null,
    idea_description: text(row.idea_description) || null,
    beneficiary: text(row.beneficiary) || null,
    skills_hoping_to_gain: text(row.skills_hoping_to_gain) || null,
    giving_back_importance: text(row.giving_back_importance) || null,
    contribution_interest: text(row.contribution_interest) || null,
    interested_community_lead: text(row.interested_community_lead) || null,
    community_lead_reason: text(row.community_lead_reason) || null,
    prior_experience: text(row.prior_experience) || null,
    prior_experience_detail: text(row.prior_experience_detail) || null,
    community_strengths: text(row.community_strengths) || null,
    scholarship_code: text(row.scholarship_code) || null,
    can_commit: text(row.can_commit) || null,
    anything_else: text(row.anything_else) || null,
    heard_about_us: text(row.heard_about_us) || null,
    has_laptop: text(row.has_laptop) || null,
    has_internet: text(row.has_internet) || null,
    good_fit_reason: text(row.good_fit_reason) || null,
    submitted_at: nullableDate(row.submitted_at),
  };
}

export async function upsertParticipantApplicationProfile(
  supabase: SupabaseAdmin,
  row: Record<string, ImportValue>,
  cohortId: string,
  participantId: string,
) {
  const payload = buildParticipantApplicationProfile(row, cohortId, participantId);
  if (!payload) return null;

  const { error } = await supabase
    .from("application_profiles")
    .upsert(payload, { onConflict: "email" });
  if (error) throw error;
  return payload;
}
