"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound } from "lucide-react";
import { clearTemporaryPasswordStateAction } from "@/lib/actions/settings";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function CompleteSetupPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        if (!password || password.length < 8) {
          setMessage("Use at least 8 characters for the new password.");
          return;
        }
        if (password !== confirmPassword) {
          setMessage("Passwords do not match.");
          return;
        }

        const supabase = createBrowserSupabaseClient();
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          setMessage(error.message);
          return;
        }

        await clearTemporaryPasswordStateAction();
        router.push("/dashboard");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not finish account setup.");
      }
    });
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-xl">
        <Card className="space-y-6 p-8">
          <div className="space-y-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-950">
              <KeyRound className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">First-time setup</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create your own password</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Your admin created this account with a temporary password. Set your own password once, then you can enter the control room normally.
              </p>
            </div>
          </div>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" />
            <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" />
            {message ? <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{message}</p> : null}
            <Button type="submit" className="w-full" disabled={isPending || !password || !confirmPassword}>
              {isPending ? "Saving..." : "Save password"}
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
