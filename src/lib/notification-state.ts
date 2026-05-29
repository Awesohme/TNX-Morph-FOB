// Plain (non-"use server") constants/types for notification UIs, so server-action files
// only export async functions.
export type AnnouncementState = { ok: boolean; message: string };
export const initialAnnouncementState: AnnouncementState = { ok: false, message: "" };
