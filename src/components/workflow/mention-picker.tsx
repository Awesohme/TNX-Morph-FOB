"use client";

import { useEffect, useRef, useState } from "react";
import { AtSign, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Multi-select of teammates to @mention in a comment. Emits a hidden comma-separated
 * `mentions` field (profile ids) consumed by createCommentAction.
 */
export function MentionPicker({ people }: { people: Array<{ id: string; label: string }> }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const byId = Object.fromEntries(people.map((p) => [p.id, p.label]));

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name="mentions" value={selected.join(",")} />
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
            @{byId[id]}
            <button type="button" onClick={() => setSelected((s) => s.filter((x) => x !== id))} aria-label="Remove">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <AtSign className="size-3.5" />
          Mention
        </button>
      </div>
      {open ? (
        <div className="absolute z-50 mt-1.5 max-h-56 w-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {people.length ? (
            people.map((p) => {
              const checked = selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected((s) => (checked ? s.filter((x) => x !== p.id) : [...s, p.id]))}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                    checked ? "bg-slate-100 font-medium text-slate-900" : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {p.label}
                  {checked ? <span className="text-xs text-slate-500">✓</span> : null}
                </button>
              );
            })
          ) : (
            <p className="px-3 py-2 text-sm text-slate-400">No teammates.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
