"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, Bot, ClipboardCheck, LogOut, Menu, ShieldCheck } from "lucide-react";
import { UserMenu } from "@/components/user-menu";
import type { CurrentUser } from "@/lib/auth";
import { navigationItems } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { NotificationPrompt } from "@/components/notification-prompt";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ToastProvider } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

// Explicit mobile bottom-nav primary items (Notifications replaces Community here; Community
// lives in the More menu). Routes here are excluded from the More overflow.
const mobilePrimary = [
  { title: "Dashboard", route: "/dashboard", icon: BarChart3 },
  { title: "Tasks", route: "/tasks", icon: Bot },
  { title: "Reviews", route: "/activities", icon: ClipboardCheck },
  { title: "Alerts", route: "/notifications", icon: Bell },
];

// Community managers get a focused nav, but still need direct access to participant and
// activity workspaces. Cohorts, announcements, and other admin-only areas stay hidden.
const CM_ALLOWED_ROUTES = ["/dashboard", "/tasks", "/participants", "/activities", "/community", "/ops", "/sessions", "/resources", "/alumni", "/settings"];

export function AppShell({
  user,
  children,
}: Readonly<{
  user: CurrentUser;
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close the More menu when tapping outside it.
  useEffect(() => {
    if (!moreOpen) return;
    function onDown(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [moreOpen]);

  // Close the menu on navigation.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Let the guided tour open the mobile "More" menu so it can spotlight items hidden there.
  useEffect(() => {
    (window as Window & { __setMoreOpen?: (open: boolean) => void }).__setMoreOpen = (open) => {
      flushSync(() => setMoreOpen(open));
    };
    return () => {
      delete (window as Window & { __setMoreOpen?: (open: boolean) => void }).__setMoreOpen;
    };
  }, []);

  const visibleNav =
    user.role === "community_manager"
      ? navigationItems.filter((item) => CM_ALLOWED_ROUTES.includes(item.route))
      : navigationItems;

  const primaryItems = mobilePrimary;
  const primaryItemRoutes = primaryItems.map((item) => item.route);

  const moreItems = visibleNav.filter((item) => !primaryItemRoutes.includes(item.route));
  const moreActive = moreItems.some((item) => pathname === item.route || pathname.startsWith(`${item.route}/`));

  return (
    <ToastProvider>
    <div className="min-h-screen app-shell-bg pb-24 lg:pb-0">
      <NotificationPrompt />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] border-r border-slate-200/80 bg-white/92 lg:block">
        <div className="flex h-full flex-col px-5 py-6">
          <div className="mb-7 flex items-center gap-3 px-2">
            <div className="grid size-10 place-items-center rounded-2xl bg-slate-950 text-white">
              <ShieldCheck className="size-4" />
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-slate-950">Morph Ops</p>
              <p className="text-xs text-slate-500">Control Room</p>
            </div>
            <NotificationBell placement="left" />
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
            {visibleNav.map((item) => {
              const active = pathname === item.route || pathname.startsWith(`${item.route}/`);
              return (
                <Link
                  key={item.route}
                  href={item.route}
                  data-tour={item.route.slice(1)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                    active ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                  )}
                >
                  <item.icon className="size-4" />
                  <span className="truncate">{item.title}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="truncate text-sm font-medium text-slate-900">{user.fullName || user.email}</p>
            <p className="mb-3 text-xs capitalize text-slate-500">{user.role?.replace("_", " ")}</p>
            <form action="/auth/sign-out" method="post">
              <Button type="submit" variant="ghost" size="sm" className="text-slate-600 hover:text-slate-950">
                <LogOut className="size-3.5" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/88 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-2xl bg-slate-950 text-white">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <span className="block text-sm font-semibold text-slate-950">Morph Ops</span>
              <span className="block text-[11px] text-slate-500">Control Room</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu name={user.fullName || ""} email={user.email || ""} role={user.role || ""} />
          </div>
        </div>
      </header>

      <main className="px-4 py-5 lg:ml-[272px] lg:px-8 lg:py-8">{children}</main>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 gap-1 rounded-2xl border border-slate-200 bg-white/96 p-2 shadow-lg backdrop-blur lg:hidden">
        {primaryItems.map((item) => {
            const active = pathname === item.route || pathname.startsWith(`${item.route}/`);
            return (
              <Link
                key={item.route}
                href={item.route}
                data-tour={item.route.slice(1)}
                data-tour-mobile={item.route.slice(1)}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] transition",
                  active ? "bg-slate-950 text-white" : "text-slate-500",
                )}
              >
                <item.icon className="size-4" />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        <div ref={moreRef} className="relative">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            data-tour="more"
            data-tour-mobile="more"
            className={cn(
              "flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] transition",
              moreActive || moreOpen ? "bg-slate-950 text-white" : "text-slate-500",
            )}
          >
            <Menu className="size-4" />
            More
          </button>
          {moreOpen ? (
            <div className="absolute bottom-14 right-0 flex w-52 flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              {moreItems.map((item) => {
                const active = pathname === item.route || pathname.startsWith(`${item.route}/`);
                return (
                  <Link
                    key={item.route}
                    href={item.route}
                    data-tour={item.route.slice(1)}
                    data-tour-mobile={item.route.slice(1)}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                      active ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </nav>
    </div>
    </ToastProvider>
  );
}
