"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { inviteText, type InviteCredentials } from "@/lib/invites";
import { useToast } from "@/components/ui/toast";

function useCopy() {
  const { toast } = useToast();
  const [copied, setCopied] = useState<"invite" | "password" | null>(null);

  async function copy(kind: "invite" | "password", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      toast("Could not copy invite details.", "error");
    }
  }

  return { copied, copy };
}

export function InviteDetails({ credentials }: { credentials: InviteCredentials }) {
  const [showPassword, setShowPassword] = useState(false);
  const { copied, copy } = useCopy();
  const message = inviteText(credentials);

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-950">Temporary password</p>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <code className="break-all font-mono text-sm text-slate-800">
            {showPassword ? credentials.password : "*".repeat(credentials.password.length)}
          </code>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => copy("password", credentials.password)}
              aria-label="Copy password"
              className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900"
            >
              {copied === "password" ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-950">Invite message</p>
          <button
            type="button"
            onClick={() => copy("invite", message)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
          >
            {copied === "invite" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied === "invite" ? "Copied" : "Copy invite"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{message}</pre>
      </div>
    </div>
  );
}
