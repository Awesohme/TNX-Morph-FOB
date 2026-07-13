import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { NotificationPageItem } from "@/components/notifications/notification-page-item";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = notifications ?? [];
  const hasUnread = rows.some((n) => !n.read_at);

  return (
    <div className="space-y-6">
      <section className="app-panel p-6 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Inbox</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Notifications</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Mentions, task assignments, and announcements land here.
            </p>
          </div>
          {hasUnread ? <MarkAllReadButton /> : null}
        </div>
      </section>

      <div className="space-y-3">
        {rows.length ? (
          rows.map((notification) => <NotificationPageItem key={notification.id} notification={notification} />)
        ) : (
          <Card>
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
