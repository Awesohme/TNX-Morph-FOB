"use client";

import { useActionState, useState } from "react";
import { Check, LogIn, LogOut } from "lucide-react";
import { attendanceAction } from "@/lib/actions/attendance";
import { initialAttendanceState } from "@/lib/attendance-config";
import { SelectMenu } from "@/components/ui/select-menu";
import { Button } from "@/components/ui/button";

export function AttendanceForm({
  cohortSlug,
  cohortName,
  participants,
  weekOptions,
}: {
  cohortSlug: string;
  cohortName: string;
  participants: Array<{ id: string; name: string }>;
  weekOptions: string[];
}) {
  const [state, action, isPending] = useActionState(attendanceAction, initialAttendanceState);
  const [mode, setMode] = useState<"sign_in" | "sign_out">("sign_in");

  if (state.ok) {
    return (
      <div className="rounded-[28px] border border-slate-200/70 bg-white p-10 text-center shadow-[0_1px_40px_-12px_rgba(15,23,42,0.12)]">
        <div className={`mx-auto grid size-14 place-items-center rounded-full ${state.action === "signed_out" ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-600"}`}>
          {state.action === "signed_out" ? <LogOut className="size-7" strokeWidth={2.5} /> : <Check className="size-7" strokeWidth={2.5} />}
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
          {state.action === "signed_out" ? "Signed out" : "Signed in"}
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-7 text-slate-500">{state.message}</p>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="space-y-6 rounded-[28px] border border-slate-200/70 bg-white p-7 shadow-[0_1px_40px_-12px_rgba(15,23,42,0.12)] sm:p-9"
    >
      <input type="hidden" name="cohortSlug" value={cohortSlug} />
      <input type="hidden" name="mode" value={mode} />

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

      <div className="space-y-2.5">
        <p className="text-[13px] font-medium text-slate-700">Week</p>
        <SelectMenu
          name="week"
          placeholder="Select the week"
          buttonClassName="h-12 rounded-2xl text-[15px]"
          options={weekOptions.map((w) => ({ value: w, label: w }))}
        />
      </div>

      {/* Sign in / Sign out toggle */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode("sign_in")}
          className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-medium transition ${
            mode === "sign_in"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <LogIn className="size-4" />
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("sign_out")}
          className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-medium transition ${
            mode === "sign_out"
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>

      {state.message && !state.ok ? (
        <p className="text-[13px] text-rose-600">{state.message}</p>
      ) : null}

      <Button
        className="h-12 w-full rounded-2xl bg-[#0067FF] text-[15px] hover:bg-[#005EE9]"
        disabled={isPending}
      >
        {isPending ? "Processing…" : mode === "sign_in" ? "Sign in" : "Sign out"}
      </Button>
    </form>
  );
}
