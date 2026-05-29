"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Subtle click-to-copy. Renders the text with a small copy icon that appears on hover and
 * flips to a tick for ~1.5s after copying. Keep it quiet — for emails, phones, ids, links.
 */
export function CopyText({
  value,
  display,
  className,
}: {
  value: string;
  display?: React.ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      title="Click to copy"
      className={cn("group inline-flex items-center gap-1.5 text-left", className)}
    >
      <span className="truncate">{display ?? value}</span>
      {copied ? (
        <Check className="size-3 shrink-0 text-emerald-600" />
      ) : (
        <Copy className="size-3 shrink-0 text-slate-300 transition group-hover:text-slate-500" />
      )}
    </button>
  );
}
