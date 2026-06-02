"use client";

import { useActionState, useState } from "react";
import { Check, LogOut } from "lucide-react";
import { attendanceAction } from "@/lib/actions/attendance";
import { initialAttendanceState } from "@/lib/attendance-config";
import { SelectMenu } from "@/components/ui/select-menu";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const KNOWLEDGE_SCALE = [
  { value: "1", label: "1 - Very little" },
  { value: "2", label: "2 - A little" },
  { value: "3", label: "3 - Some understanding" },
  { value: "4", label: "4 - Quite a bit" },
  { value: "5", label: "5 - Very confident" },
];

function topicPrompt(topic: string | null | undefined, when: "before" | "after") {
  if (!topic) {
    return when === "before"
      ? "What do you know about this topic right now?"
      : "How much do you know about this topic now?";
  }

  return when === "before"
    ? `What do you know about ${topic} right now?`
    : `How much do you know about ${topic} now?`;
}

function SignOutQuestions({ sessionTopic }: { sessionTopic?: string | null }) {
  return (
    <>
      <div className="space-y-2.5">
        <p className="text-[13px] font-medium text-slate-700">What did you get from this session?</p>
        <Textarea name="sessionTakeaway" rows={2} required placeholder="Share the main thing you learned or understood better." className="rounded-2xl text-[15px]" />
      </div>

      <div className="space-y-2.5">
        <p className="text-[13px] font-medium text-slate-700">Quick summary of the session</p>
        <Textarea name="sessionSummary" rows={2} required placeholder="Summarise the session in your own words." className="rounded-2xl text-[15px]" />
      </div>

      <div className="space-y-2.5">
        <p className="text-[13px] font-medium text-slate-700">What next step will you take after this session?</p>
        <Textarea name="nextStep" rows={2} required placeholder="What are you going to do next?" className="rounded-2xl text-[15px]" />
      </div>

      <div className="space-y-2.5">
        <p className="text-[13px] font-medium text-slate-700">{topicPrompt(sessionTopic, "after")}</p>
        <SelectMenu
          name="knowledgeAfterRating"
          placeholder="Choose a rating"
          buttonClassName="h-12 rounded-2xl text-[15px]"
          options={KNOWLEDGE_SCALE}
        />
      </div>

      <div className="space-y-2.5">
        <p className="text-[13px] font-medium text-slate-700">Any feedback about today&apos;s session or the program? (optional)</p>
        <Textarea name="feedback" rows={3} placeholder="Share what worked, what didn't, ideas…" className="rounded-2xl text-[15px]" />
      </div>
    </>
  );
}

export function AttendanceForm({
  cohortSlug,
  cohortName,
  participants,
  activeWeek,
  sessionTopic,
}: {
  cohortSlug: string;
  cohortName: string;
  participants: Array<{ id: string; name: string }>;
  activeWeek: string;
  sessionTopic?: string | null;
}) {
  const [state, action, isPending] = useActionState(attendanceAction, initialAttendanceState);
  const [mode, setMode] = useState<"sign_in" | "sign_out">("sign_in");

  if (state.ok && state.action === "signed_out") {
    return (
      <div className="rounded-[28px] border border-slate-200/70 bg-white p-10 text-center shadow-[0_1px_40px_-12px_rgba(15,23,42,0.12)]">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-slate-100 text-slate-600">
          <LogOut className="size-7" strokeWidth={2.5} />
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">See you at your next class!</h2>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-7 text-slate-500">
          Your attendance and feedback are saved. Thank you.
        </p>
      </div>
    );
  }

  if (state.ok && state.action === "signed_in") {
    return (
      <form
        action={action}
        className="space-y-6 rounded-[28px] border border-slate-200/70 bg-white p-7 text-center shadow-[0_1px_40px_-12px_rgba(15,23,42,0.12)] sm:p-9"
      >
        <input type="hidden" name="cohortSlug" value={cohortSlug} />
        <input type="hidden" name="participantId" value={state.participantId ?? ""} />
        <input type="hidden" name="mode" value="sign_out" />

        <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <Check className="size-7" strokeWidth={2.5} />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">You&apos;re signed in</h2>
        <p className="mx-auto max-w-sm text-[15px] leading-7 text-slate-500">{state.message}</p>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Come back here when the session is over to sign out.
        </div>

        <div className="space-y-6 text-left">
          <SignOutQuestions sessionTopic={sessionTopic} />
        </div>

        <Button className="h-12 w-full rounded-2xl bg-slate-900 text-[15px] hover:bg-slate-800" disabled={isPending}>
          <LogOut className="size-4" />
          {isPending ? "Signing out…" : "Sign out"}
        </Button>
      </form>
    );
  }

  // Phase 1: sign in.
  return (
    <form
      action={action}
      className="space-y-6 rounded-[28px] border border-slate-200/70 bg-white p-7 shadow-[0_1px_40px_-12px_rgba(15,23,42,0.12)] sm:p-9"
    >
      <input type="hidden" name="cohortSlug" value={cohortSlug} />

      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-[13px] font-medium text-slate-600">
        {activeWeek} attendance
      </div>

      {sessionTopic ? (
        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">Today&apos;s topic</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{sessionTopic}</p>
        </div>
      ) : null}

      <div className="space-y-2.5">
        <p className="text-[13px] font-medium text-slate-700">Your name</p>
        <SelectMenu
          name="participantId"
          placeholder="Select your name"
          buttonClassName="h-12 rounded-2xl text-[15px]"
          options={participants.map((p) => ({ value: p.id, label: p.name }))}
        />
        <p className="text-[12px] leading-5 text-slate-400">
          Attending {cohortName}. Can&apos;t find your name? Contact your community manager.
        </p>
      </div>

      {/* Toggle kept for the rare case someone needs to sign out directly. */}
      <label className="flex items-center gap-2 text-[13px] text-slate-500">
        <input type="checkbox" checked={mode === "sign_out"} onChange={(e) => setMode(e.target.checked ? "sign_out" : "sign_in")} className="size-4 rounded border-slate-300" />
        I&apos;m signing out (I already signed in earlier)
      </label>
      <input type="hidden" name="mode" value={mode} />

      {mode === "sign_in" ? (
        <>
          <div className="space-y-2.5">
            <p className="text-[13px] font-medium text-slate-700">{topicPrompt(sessionTopic, "before")}</p>
            <Textarea name="topicBaseline" rows={3} required placeholder="Tell us what you already know before the session starts." className="rounded-2xl text-[15px]" />
          </div>

          <div className="space-y-2.5">
            <p className="text-[13px] font-medium text-slate-700">On a scale of 1 to 5, how much do you know about this topic?</p>
            <SelectMenu
              name="knowledgeBeforeRating"
              placeholder="Choose a rating"
              buttonClassName="h-12 rounded-2xl text-[15px]"
              options={KNOWLEDGE_SCALE}
            />
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <SignOutQuestions sessionTopic={sessionTopic} />
        </div>
      )}

      {state.message && !state.ok ? <p className="text-[13px] text-rose-600">{state.message}</p> : null}

      <Button className="h-12 w-full rounded-2xl bg-[#0067FF] text-[15px] hover:bg-[#005EE9]" disabled={isPending}>
        {isPending ? "Processing…" : mode === "sign_in" ? "Sign in" : "Sign out"}
      </Button>
    </form>
  );
}
