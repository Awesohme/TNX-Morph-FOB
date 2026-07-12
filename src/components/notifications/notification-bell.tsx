"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, Check, Loader2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/notifications";
import { NOTIFICATIONS_UPDATED_EVENT } from "@/lib/notification-state";
import { cn } from "@/lib/utils";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
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

export function NotificationBell({
  className,
  placement = "right",
}: {
  className?: string;
  placement?: "left" | "right";
}) {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"unread" | "all">("unread");
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data as NotificationRow[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    function onNotificationsUpdated() {
      void load();
    }
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onNotificationsUpdated);
    return () => window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onNotificationsUpdated);
  }, [load]);

  useEffect(() => {
    if (open) void load();
  }, [load, open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const unreadCount = items.filter((i) => !i.read_at).length;
  const shown = tab === "unread" ? items.filter((i) => !i.read_at) : items;

  function markRead(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read_at: new Date().toISOString() } : i)));
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      await markNotificationReadAction(fd);
      window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
    });
  }

  function markAll() {
    setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })));
    startTransition(async () => {
      await markAllNotificationsReadAction();
      window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
    });
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative grid size-9 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl",
            placement === "left" ? "left-0" : "right-0",
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-950">Notifications</p>
            {unreadCount > 0 ? (
              <button type="button" disabled={isPending} onClick={markAll} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60">
                {isPending ? <Loader2 className="size-3 animate-spin" /> : null}
                {isPending ? "Marking…" : "Mark all read"}
              </button>
            ) : null}
          </div>
          <div className="flex gap-1 border-b border-slate-100 px-2 py-2">
            {(["unread", "all"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-medium capitalize transition",
                  tab === t ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-800",
                )}
              >
                {t}
                {t === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
              </button>
            ))}
          </div>

          <div className="max-h-96 overflow-auto">
            {shown.length ? (
              shown.map((n) => {
                const inner = (
                  <div className={cn("flex gap-2 px-4 py-3 transition hover:bg-slate-50", !n.read_at && "bg-blue-50/40")}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{n.title}</p>
                      {n.body ? <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body}</p> : null}
                      <p className="mt-1 text-[11px] text-slate-400">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read_at ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={(e) => {
                          e.preventDefault();
                          markRead(n.id);
                        }}
                        aria-label="Mark read"
                        className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-wait disabled:opacity-60"
                      >
                        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                      </button>
                    ) : null}
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => { markRead(n.id); setOpen(false); }} className="block">
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })
            ) : (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                {tab === "unread" ? "You're all caught up." : "No notifications yet."}
              </p>
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-2.5 text-center text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            View all
          </Link>
        </div>
      ) : null}
    </div>
  );
}
