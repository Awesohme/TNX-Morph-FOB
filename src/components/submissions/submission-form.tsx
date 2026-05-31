"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { submitWorksheetAction } from "@/lib/actions/submissions";
import { initialSubmissionState } from "@/lib/actions/submission-state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SelectMenu } from "@/components/ui/select-menu";

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between text-[13px] font-medium text-slate-700">
        <span>{label}</span>
        {optional ? <span className="text-[12px] font-normal text-slate-400">Optional</span> : null}
      </div>
      {children}
    </div>
  );
}

export function SubmissionForm({
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
  const [state, action, isPending] = useActionState(submitWorksheetAction, initialSubmissionState);

  if (state.ok) {
    return (
      <div className="rounded-[28px] border border-slate-200/70 bg-white p-10 text-center shadow-[0_1px_40px_-12px_rgba(15,23,42,0.12)]">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <Check className="size-7" strokeWidth={2.5} />
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">Submission received</h2>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-7 text-slate-500">
          Thank you for submitting this week&apos;s task. Consistency is what gets you the most from the
          Morph Program. Keep building, keep learning. If you asked for support, the team will follow up.
        </p>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="space-y-7 rounded-[28px] border border-slate-200/70 bg-white p-7 shadow-[0_1px_40px_-12px_rgba(15,23,42,0.12)] sm:p-9"
    >
      <input type="hidden" name="cohortSlug" value={cohortSlug} />

      <Field label="Your name">
        <SelectMenu
          name="participantId"
          placeholder="Select your name"
          buttonClassName="h-12 rounded-2xl text-[15px]"
          options={participants.map((participant) => ({ value: participant.id, label: participant.name }))}
        />
        <p className="text-[12px] leading-5 text-slate-400">
          Submitting for {cohortName}. Can&apos;t find your name? Contact your community manager.
        </p>
      </Field>

      <Field label="Week of submission">
        <SelectMenu
          name="week"
          placeholder="Select the week"
          buttonClassName="h-12 rounded-2xl text-[15px]"
          options={weekOptions.map((week) => ({ value: week, label: week }))}
        />
      </Field>

      <Field label="Task worksheet" optional>
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3.5 text-[14px] text-slate-500 transition hover:border-slate-400 hover:bg-slate-50">
          <input name="worksheet" type="file" aria-label="Task worksheet file" className="block w-full text-[13px] file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-medium file:text-white" />
        </label>
      </Field>

      <Field label="What challenge did you face this week?" optional>
        <Textarea name="challenge" rows={3} placeholder="Tell us what slowed you down…" className="rounded-2xl text-[15px]" />
      </Field>

      <Field label="Do you need support from the team?">
        <SelectMenu
          name="supportNeeded"
          placeholder="Select an option"
          buttonClassName="h-12 rounded-2xl text-[15px]"
          options={[
            { value: "No, I'm progressing well", label: "No, I'm progressing well" },
            { value: "Yes, I need clarification", label: "Yes, I need clarification" },
            { value: "Yes, I'm stuck and need help", label: "Yes, I'm stuck and need help" },
          ]}
        />
      </Field>

      {state.message && !state.ok ? <p className="text-[13px] text-rose-600">{state.message}</p> : null}

      <Button className="h-12 w-full rounded-2xl bg-[#0067FF] text-[15px] hover:bg-[#005EE9]" disabled={isPending}>
        {isPending ? "Submitting…" : "Submit weekly task"}
      </Button>
    </form>
  );
}
