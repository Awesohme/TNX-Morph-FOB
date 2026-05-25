import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function trimmedEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function safeErrorMessage(error: unknown) {
  if (isMissingRelationError(error)) {
    return "Run the workflow migration to enable tasks, comments, and activity history.";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export function isMissingRelationError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: string; message?: string };
  return candidate.code === "42P01" || candidate.message?.toLowerCase().includes("does not exist") || false;
}
