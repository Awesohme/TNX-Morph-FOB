"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { markNotificationReadAction } from "@/lib/actions/notifications";
import { NOTIFICATIONS_UPDATED_EVENT } from "@/lib/notification-state";

type NotificationPageItemProps = {
  notification: { id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationPageItem({ notification: n }: NotificationPageItemProps) {
  const [, startTransition] = useTransition();

  function markRead() {
    if (n.read_at) return;
    const formData = new FormData();
    formData.set("id", n.id);
    startTransition(async () => {
      await markNotificationReadAction(formData);
      window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
    });
  }

  const content = (
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

  return n.link ? <Link href={n.link} onClick={markRead} className="block">{content}</Link> : <div>{content}</div>;
}
