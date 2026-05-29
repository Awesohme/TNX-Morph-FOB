"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Plus } from "lucide-react";
import { createCommunityManagerAccountAction, type CreateCommunityManagerState } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";

const initialCreateCommunityManagerState: CreateCommunityManagerState = {
  ok: false,
  message: "",
};

function useCopy() {
  const [copied, setCopied] = useState(false);
  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return { copied, copy };
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <button
          type="button"
          onClick={() => copy(value)}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <code className="block break-all text-sm font-semibold text-slate-700">{value}</code>
    </div>
  );
}

function roleLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "facilitator") return "Facilitator";
  return "Community Manager";
}

function inviteText(c: { fullName: string; role: string; email: string; password: string; loginUrl: string }) {
  return [
    `Hi${c.fullName ? ` ${c.fullName.split(" ")[0]}` : ""}! You have been added to Morph by TNX Ops as a ${roleLabel(c.role)}.`,
    "",
    "Please see your credentials below:",
    `Email: ${c.email}`,
    `Password: ${c.password}`,
    "",
    "You can log in here:",
    c.loginUrl,
    "",
    "You'll be asked to set your own password on first login.",
  ].join("\n");
}

export function CreateCommunityManagerModal({
  cohorts,
}: {
  cohorts: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  // When true, the latest success result is hidden (after "Create another")
  // until a fresh submission. A new submit re-renders with new state, and the
  // form's onSubmit clears this flag so the next result shows.
  const [dismissed, setDismissed] = useState(false);
  const [state, action, isPending] = useActionState(createCommunityManagerAccountAction, initialCreateCommunityManagerState);
  const invite = useCopy();
  const credentials = dismissed ? undefined : state.credentials;

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Create community manager
      </Button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="Create community manager"
        description="Create the account here, assign the cohort, then copy the invite once for the manager."
      >
        {credentials ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-emerald-700">{state.message}</p>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-950">Invite message</p>
                <button
                  type="button"
                  onClick={() => invite.copy(inviteText(credentials))}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  {invite.copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {invite.copied ? "Copied" : "Copy invite"}
                </button>
              </div>
              <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{inviteText(credentials)}</pre>
            </div>

            <div className="space-y-2">
              <CopyRow label="Email" value={credentials.email} />
              <CopyRow label="Temporary password" value={credentials.password} />
              <CopyRow label="Login URL" value={credentials.loginUrl} />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setDismissed(true);
                  setFormKey((value) => value + 1);
                }}
              >
                <Plus className="size-4" />
                Create another
              </Button>
            </div>
          </div>
        ) : (
          <form key={formKey} action={action} onSubmit={() => setDismissed(false)} className="grid gap-3 md:grid-cols-2">
            <input name="fullName" placeholder="Full name" className="app-input h-11" />
            <input name="email" placeholder="name@example.com" type="email" className="app-input h-11" />
            <select name="cohortId" defaultValue={cohorts[0]?.id ?? ""} className="app-select h-11">
              <option value="">Assign a cohort</option>
              {cohorts.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>
                  {cohort.name}
                </option>
              ))}
            </select>
            <select name="role" defaultValue="community_manager" className="app-select h-11">
              <option value="community_manager">Community manager</option>
              <option value="facilitator">Facilitator</option>
              <option value="admin">Admin</option>
            </select>

            {state.message && !state.ok ? (
              <p className="text-sm text-rose-700 md:col-span-2">{state.message}</p>
            ) : null}

            <div className="flex justify-end gap-3 md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button disabled={isPending}>{isPending ? "Creating..." : "Create account"}</Button>
            </div>
          </form>
        )}
      </ModalShell>
    </>
  );
}
