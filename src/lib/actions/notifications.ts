"use server";

import { revalidatePath } from "next/cache";
import { requireRole, getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { canSendPush, sendPushNotification, type PushSubscriptionRow } from "@/lib/push";
import type { AnnouncementState } from "@/lib/notification-state";
import { safeErrorMessage } from "@/lib/utils";

export type NotificationType = "mention" | "task_assigned" | "announcement" | "attendance";

/**
 * Core fan-out: insert an in-app notification per recipient and (best-effort) fire a web
 * push to each recipient's active subscriptions. Safe to call from other server actions —
 * uses the admin client so it bypasses RLS, and never throws on push failures.
 */
export async function notifyUsers(
  supabase: ReturnType<typeof createAdminClient>,
  {
    userIds,
    type,
    title,
    body,
    link,
    cohortId,
    createdBy,
  }: {
    userIds: string[];
    type: NotificationType;
    title: string;
    body?: string | null;
    link?: string | null;
    cohortId?: string | null;
    createdBy?: string | null;
  },
) {
  const recipients = Array.from(new Set(userIds.filter(Boolean)));
  if (!recipients.length) return;

  const rows = recipients.map((userId) => ({
    user_id: userId,
    cohort_id: cohortId ?? null,
    type,
    title,
    body: body ?? null,
    link: link ?? null,
    created_by: createdBy ?? null,
  }));
  const { error } = await supabase.from("notifications").insert(rows);
  if (error) throw error;

  // Best-effort web push — don't let delivery issues break the originating action.
  if (!canSendPush()) return;
  try {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, user_id")
      .in("user_id", recipients)
      .eq("is_active", true);
    await Promise.all(
      (subs ?? []).map((sub) =>
        sendPushNotification(sub as PushSubscriptionRow, {
          title,
          body: body ?? "",
          url: link ?? "/notifications",
        }).catch(() => undefined),
      ),
    );
  } catch {
    // ignore push errors
  }
}

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createAdminClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const supabase = createAdminClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  revalidatePath("/notifications");
}

/**
 * Admin announcement blast to community managers. If a cohortId is given, only CMs attached
 * to that cohort are targeted; otherwise all CM-role profiles.
 */
export async function sendAnnouncementAction(
  _prev: AnnouncementState,
  formData: FormData,
): Promise<AnnouncementState> {
  const session = await requireRole("admin");
  try {
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const cohortId = String(formData.get("cohortId") ?? "").trim() || null;
    if (!title) return { ok: false, message: "Give the announcement a title." };

    const supabase = createAdminClient();
    let userIds: string[] = [];
    if (cohortId) {
      const { data: members } = await supabase
        .from("cohort_members")
        .select("user_id, profiles:user_id(role)")
        .eq("cohort_id", cohortId);
      userIds = (members ?? [])
        .filter((m) => {
          const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          return profile?.role === "community_manager";
        })
        .map((m) => m.user_id);
    } else {
      const { data: cms } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "community_manager")
        .eq("is_active", true);
      userIds = (cms ?? []).map((c) => c.id);
    }

    if (!userIds.length) return { ok: false, message: "No community managers to notify." };

    await notifyUsers(supabase, {
      userIds,
      type: "announcement",
      title,
      body,
      link: "/notifications",
      cohortId,
      createdBy: session.id,
    });

    revalidatePath("/notifications");
    return { ok: true, message: `Announcement sent to ${userIds.length} community manager${userIds.length === 1 ? "" : "s"}.` };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error) };
  }
}
