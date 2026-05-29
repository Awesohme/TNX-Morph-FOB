import { createAdminClient } from "@/lib/supabase/admin";
import { canSendPush, sendPushNotification } from "@/lib/push";

export async function dispatchDueReminders(supabase = createAdminClient()) {
  if (!canSendPush()) {
    return { sent: 0, failed: 0, skipped: 0, configured: false };
  }

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, cohort_id, title, due_at, assigned_to, status")
    .not("assigned_to", "is", null)
    .in("status", ["Open", "In Progress", "Blocked"]);

  if (error) throw error;

  const now = Date.now();
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const task of tasks ?? []) {
    if (!task.assigned_to || !task.due_at) {
      skipped += 1;
      continue;
    }

    const dueAt = new Date(task.due_at).getTime();
    const deliveryKind = dueAt < now ? "overdue" : dueAt <= now + 24 * 60 * 60 * 1000 ? "due_soon" : null;
    if (!deliveryKind) {
      skipped += 1;
      continue;
    }

    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);

    const { data: existingDelivery } = await supabase
      .from("reminder_deliveries")
      .select("id")
      .eq("task_id", task.id)
      .eq("user_id", task.assigned_to)
      .eq("delivery_kind", deliveryKind)
      .eq("status", "sent")
      .gte("sent_at", dayStart.toISOString())
      .maybeSingle();

    if (existingDelivery) {
      skipped += 1;
      continue;
    }

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", task.assigned_to)
      .eq("is_active", true);

    if (!subscriptions?.length) {
      skipped += 1;
      continue;
    }

    for (const subscription of subscriptions) {
      try {
        await sendPushNotification(subscription, {
          title: deliveryKind === "overdue" ? "Overdue Morph Ops task" : "Morph Ops task due soon",
          body: task.title,
          url: "/tasks",
          taskId: task.id,
        });
        await supabase.from("reminder_deliveries").insert({
          cohort_id: task.cohort_id,
          task_id: task.id,
          user_id: task.assigned_to,
          subscription_id: subscription.id,
          delivery_kind: deliveryKind,
          status: "sent",
          metadata: { source: "dispatcher" },
        });
        sent += 1;
      } catch (error) {
        const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number(error.statusCode) : null;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").update({ is_active: false }).eq("id", subscription.id);
        }
        await supabase.from("reminder_deliveries").insert({
          cohort_id: task.cohort_id,
          task_id: task.id,
          user_id: task.assigned_to,
          subscription_id: subscription.id,
          delivery_kind: deliveryKind,
          status: "failed",
          error_message: error instanceof Error ? error.message : "Push send failed.",
          metadata: { source: "dispatcher" },
        });
        failed += 1;
      }
    }
  }

  return { sent, failed, skipped, configured: true };
}
