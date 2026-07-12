// Plain (non-"use server") constants/types for notification UIs, so server-action files
// only export async functions.
export type AnnouncementState = { ok: boolean; message: string };
export const initialAnnouncementState: AnnouncementState = { ok: false, message: "" };

// Notification UIs keep short-lived client-side copies of the inbox. Dispatch this after a
// read mutation so the Alerts page and every mounted bell stay in sync immediately.
export const NOTIFICATIONS_UPDATED_EVENT = "notifications-updated";
