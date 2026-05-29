import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

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
          rows.map((n) => {
            const inner = (
              <Card className={n.read_at ? "" : "border-blue-200 bg-blue-50/40"}>
                <div className="flex gap-3">
                  <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                    <Bell className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-950">{n.title}</p>
                    {n.body ? <p className="mt-1 text-sm leading-6 text-slate-600">{n.body}</p> : null}
                    <p className="mt-1.5 text-xs text-slate-400">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              </Card>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className="block">
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })
        ) : (
          <Card>
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
