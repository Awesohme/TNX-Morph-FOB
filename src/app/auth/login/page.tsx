"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

function LoginContent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function signIn() {
    startTransition(async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: signInData, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          setMessage(error.message);
          return;
        }

        // Only bootstrap the first account when it genuinely has no profile yet. Calling the
        // RPC for every established user returns a handled 400 and adds needless login noise.
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", signInData.user?.id ?? "")
          .maybeSingle();
        if (!profile) {
          const { error: claimError } = await supabase.rpc("claim_first_admin");
          if (claimError && !claimError.message.toLowerCase().includes("already exists")) {
            setMessage(claimError.message);
            return;
          }
        }
        router.push("/dashboard");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to sign in.");
      }
    });
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
        <div className="grid md:grid-cols-[1.05fr_0.95fr]">
          <section className="relative min-h-80 overflow-hidden border-b border-slate-200 bg-slate-950 p-8 text-white md:border-b-0 md:border-r md:p-12">
            <div className="relative z-10 flex h-full flex-col justify-between">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tnx-logo.png" alt="TNX Solve" className="h-7 w-auto" />
              <div className="space-y-5">
                <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                  Cohort operations in one calm workspace.
                </h1>
                <p className="max-w-lg text-sm leading-7 text-white/72">
                  Participant health, weekly activities, CM reports, readiness, alumni, imports, and follow-up work in one calm control room.
                </p>
              </div>
            </div>
          </section>
          <section className="p-6 md:p-10">
            <Card className="border-slate-200 bg-white">
              <div className="mb-8 flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-900">
                  <LockKeyhole className="size-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">Sign in</h2>
                  <p className="text-sm text-muted-foreground">Welcome back to the Morph Ops control room.</p>
                </div>
              </div>
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  signIn();
                }}
              >
                <Input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") signIn();
                    }}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-900"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {message ? <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{message}</p> : null}
                <Button type="submit" className="w-full" loading={isPending} disabled={!email || !password}>
                  {isPending ? "Signing in…" : <>Sign in <ArrowRight className="size-4" /></>}
                </Button>
              </form>
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
