"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Avatar button that opens a small menu with the user's identity + Profile and Logout.
 * Replaces the bare "Sign out" link so logout isn't a one-tap accident.
 */
export function UserMenu({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="grid size-9 place-items-center rounded-full bg-slate-950 text-sm font-semibold text-white"
      >
        {initial}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-950">{name || email}</p>
            <p className="truncate text-xs capitalize text-slate-500">{role?.replace("_", " ")}</p>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <User className="size-4" />
            Profile & settings
          </Link>
          <form action="/auth/sign-out" method="post" className="border-t border-slate-100">
            <Button type="submit" variant="ghost" size="sm" className="flex w-full items-center gap-2 px-4 py-2.5 text-rose-600 hover:bg-rose-50">
              <LogOut className="size-4" />
              Log out
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
