"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, ShieldCheck } from "lucide-react";
import type { CurrentUser } from "@/lib/auth";
import { navigationItems } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { PwaBootstrap } from "@/components/pwa-bootstrap";

const primaryMobileRoutes = ["/dashboard", "/tasks", "/participants", "/reviews", "/community"];

export function AppShell({
  user,
  children,
}: Readonly<{
  user: CurrentUser;
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen app-shell-bg pb-24 lg:pb-0">
      <PwaBootstrap />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] border-r border-slate-200/80 bg-white/92 lg:block">
        <div className="flex h-full flex-col px-5 py-6">
          <div className="mb-7 flex items-center gap-3 px-2">
            <div className="grid size-10 place-items-center rounded-2xl bg-slate-950 text-white">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-950">Morph Ops</p>
              <p className="text-xs text-slate-500">Control Room</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
            {navigationItems.map((item) => {
              const active = pathname === item.route || pathname.startsWith(`${item.route}/`);
              return (
                <Link
                  key={item.route}
                  href={item.route}
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
              <button type="submit" className="inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-950">
                <LogOut className="size-3.5" />
                Sign out
              </button>
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
          <form action="/auth/sign-out" method="post">
            <button type="submit" className="text-sm font-medium text-slate-600">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="px-4 py-5 lg:ml-[272px] lg:px-8 lg:py-8">{children}</main>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-6 gap-1 rounded-2xl border border-slate-200 bg-white/96 p-2 shadow-lg backdrop-blur lg:hidden">
        {navigationItems
          .filter((item) => primaryMobileRoutes.includes(item.route))
          .map((item) => {
            const active = pathname === item.route || pathname.startsWith(`${item.route}/`);
            return (
              <Link
                key={item.route}
                href={item.route}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] transition",
                  active ? "bg-slate-950 text-white" : "text-slate-500",
                )}
              >
                <item.icon className="size-4" />
                <span className="truncate">{item.title.split(" ")[0]}</span>
              </Link>
            );
          })}
        <details className="relative">
          <summary className="flex list-none flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] text-slate-500">
            <Menu className="size-4" />
            More
          </summary>
          <div className="absolute bottom-14 right-0 flex w-52 flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
            {navigationItems
              .filter((item) => !primaryMobileRoutes.includes(item.route))
              .map((item) => (
                <Link key={item.route} href={item.route} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                  <item.icon className="size-4" />
                  {item.title}
                </Link>
              ))}
          </div>
        </details>
      </nav>
    </div>
  );
}
