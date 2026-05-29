import Link from "next/link";
import { LogOut, Menu, ShieldCheck } from "lucide-react";
import type { CurrentUser } from "@/lib/auth";
import { navigationItems } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { PwaBootstrap } from "@/components/pwa-bootstrap";

export function AppShell({
  user,
  children,
}: Readonly<{
  user: CurrentUser;
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <PwaBootstrap />
      <aside className="fixed inset-y-4 left-4 z-30 hidden w-72 rounded-[2rem] border border-white/60 bg-slate-950/95 p-4 text-white shadow-glow backdrop-blur lg:block">
        <div className="mb-8 flex items-center gap-3 px-2 pt-2">
          <div className="grid size-11 place-items-center rounded-2xl bg-white text-slate-950">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold">Morph Ops</p>
            <p className="text-xs text-white/55">Control Room</p>
          </div>
        </div>
        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <Link
              key={item.route}
              href={item.route}
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-white/68 transition hover:bg-white/10 hover:text-white"
            >
              <item.icon className="size-4" />
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="absolute inset-x-4 bottom-4 rounded-3xl bg-white/8 p-4">
          <p className="truncate text-sm font-medium">{user.fullName || user.email}</p>
          <p className="mb-3 text-xs capitalize text-white/52">{user.role?.replace("_", " ")}</p>
          <form action="/auth/sign-out" method="post">
            <button type="submit" className="inline-flex items-center gap-2 text-xs text-white/72 hover:text-white">
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-white/60 bg-background/80 px-4 py-3 backdrop-blur lg:ml-80 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Menu className="size-5" />
            <span className="font-display text-lg font-semibold">Morph Ops</span>
          </div>
          <form action="/auth/sign-out" method="post">
            <button type="submit" className="text-sm font-medium">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="px-4 py-6 lg:ml-80 lg:px-8 lg:py-8">{children}</main>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-6 gap-1 rounded-[1.75rem] border border-white/70 bg-slate-950/95 p-2 text-white shadow-glow backdrop-blur lg:hidden">
        {navigationItems.filter((item) => ["/dashboard", "/tasks", "/participants", "/reviews", "/community"].includes(item.route)).map((item) => (
          <Link key={item.route} href={item.route} className="flex flex-col items-center gap-1 rounded-2xl p-2 text-[10px] text-white/70">
            <item.icon className={cn("size-4", item.route === "/dashboard" && "text-teal-300")} />
            {item.title.split(" ")[0]}
          </Link>
        ))}
        <details className="relative">
          <summary className="flex list-none flex-col items-center gap-1 rounded-2xl p-2 text-[10px] text-white/70">
            <Menu className="size-4" />
            More
          </summary>
          <div className="absolute bottom-14 right-0 flex w-48 flex-col gap-1 rounded-[1.2rem] border border-white/15 bg-slate-950 p-2 shadow-2xl">
            {navigationItems
              .filter((item) => !["/dashboard", "/tasks", "/participants", "/reviews", "/community"].includes(item.route))
              .map((item) => (
                <Link key={item.route} href={item.route} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/75">
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
