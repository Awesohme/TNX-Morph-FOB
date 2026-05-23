"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(searchParams.get("error") ? "Please sign in again." : "");
  const [isPending, startTransition] = useTransition();

  function signIn() {
    startTransition(async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          setMessage(error.message);
          return;
        }

        await supabase.rpc("claim_first_admin");
        router.push("/dashboard");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to sign in.");
      }
    });
  }

  function sendMagicLink() {
    startTransition(async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const origin = window.location.origin;
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: `${origin}/dashboard` },
        });
        setMessage(error ? error.message : "Magic link sent. Check your email, then return here.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to send magic link.");
      }
    });
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/55 shadow-glow backdrop-blur">
        <div className="grid md:grid-cols-[1.05fr_0.95fr]">
          <section className="relative min-h-80 overflow-hidden bg-slate-950 p-8 text-white md:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(45,212,191,.45),transparent_28rem),radial-gradient(circle_at_80%_70%,rgba(251,191,36,.25),transparent_22rem)]" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm">
                <Sparkles className="size-4" />
                Morph by TNX
              </div>
              <div className="space-y-5">
                <h1 className="font-display text-4xl font-semibold leading-tight md:text-6xl">
                  Your cohort ops, finally out of spreadsheet gravity.
                </h1>
                <p className="max-w-lg text-sm leading-7 text-white/72">
                  Participant health, reviews, CM reports, readiness, content, alumni, and exportable backups in one calm control room.
                </p>
              </div>
            </div>
          </section>
          <section className="p-6 md:p-10">
            <Card className="border-slate-200/80 bg-white/75">
              <div className="mb-8 flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-white">
                  <LockKeyhole className="size-5" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-semibold">Sign in</h2>
                  <p className="text-sm text-muted-foreground">First active user can claim the first admin role.</p>
                </div>
              </div>
              <div className="space-y-4">
                <Input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") signIn();
                  }}
                />
                {message ? <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{message}</p> : null}
                <Button className="w-full" disabled={isPending || !email || !password} onClick={signIn}>
                  Sign in <ArrowRight className="size-4" />
                </Button>
                <Button className="w-full" type="button" variant="outline" disabled={isPending || !email} onClick={sendMagicLink}>
                  Send magic link
                </Button>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center">Loading…</main>}>
      <LoginContent />
    </Suspense>
  );
}
