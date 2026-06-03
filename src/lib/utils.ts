import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function trimmedEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

const GENERIC_ERROR = "Something went wrong. Please try again.";

/**
 * Turns raw errors (Postgres codes, Supabase/RLS messages, framework internals) into plain,
 * non-technical language for end users. Falls back to the original message only when it already
 * reads like a sentence we wrote; anything that looks like a raw technical string is replaced
 * with a friendly generic so DB internals never reach the UI.
 */
export function safeErrorMessage(error: unknown) {
  if (isMissingRelationError(error)) {
    return "This feature isn't set up yet. Please contact an admin.";
  }

  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const code = (error && typeof error === "object" ? (error as { code?: string }).code : "") ?? "";
  const lower = raw.toLowerCase();

  // Permission / auth.
  if (lower.includes("row-level security") || lower.includes("permission denied") || lower.includes("forbidden") || lower.includes("not authorized") || code === "42501") {
    return "You don't have permission to do that. If you think you should, ask an admin to check your access.";
  }
  // Session / redirect internals (e.g. NEXT_REDIRECT thrown by requireRole).
  if (raw.includes("NEXT_REDIRECT") || lower.includes("not authenticated") || lower.includes("jwt") || lower.includes("session")) {
    return "Your session may have expired. Please refresh the page and sign in again.";
  }
  // Duplicate / already exists.
  if (lower.includes("duplicate key") || lower.includes("already exists") || code === "23505") {
    return "That already exists. Please use a different value.";
  }
  // Missing required value.
  if (lower.includes("violates not-null") || lower.includes("null value in column") || code === "23502") {
    return "Something required is missing. Please fill in all the fields and try again.";
  }
  // Bad reference (foreign key).
  if (lower.includes("foreign key") || code === "23503") {
    return "That action references something that no longer exists. Please refresh and try again.";
  }
  // Network / connectivity.
  if (lower.includes("fetch failed") || lower.includes("network") || lower.includes("timeout") || lower.includes("econnrefused")) {
    return "We couldn't reach the server. Check your connection and try again.";
  }

  // Only surface the original text if it reads like a human sentence we authored, not a raw
  // technical dump (no codes, brackets, SQL/JSON fragments) and a sensible length.
  const looksHuman = raw && raw.length <= 140 && /^[A-Z]/.test(raw) && !/[{}[\]<>]|::|\bnull\b|\berror:/i.test(raw);
  return looksHuman ? raw : GENERIC_ERROR;
}

export function isMissingRelationError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: string; message?: string };
  return candidate.code === "42P01" || candidate.message?.toLowerCase().includes("does not exist") || false;
}
