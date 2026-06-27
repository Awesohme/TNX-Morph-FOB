"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { saveCohortStateAction, type CohortActionState } from "@/lib/actions/ops";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { RequiredLabel } from "@/components/ui/required-indicator";
import { SelectMenu } from "@/components/ui/select-menu";

const initialState: CohortActionState = { ok: false, message: "" };

export function CreateCohortModal() {
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState(saveCohortStateAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    setOpen(false);
    router.refresh();
  }, [state.ok, router]);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add cohort
      </Button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="Create cohort"
        description="Add a new cohort without reopening the workbook flow."
      >
        <form ref={formRef} action={action} className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            <RequiredLabel>Cohort name</RequiredLabel>
            <input name="name" required aria-required="true" className="app-input h-11" />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            <RequiredLabel>Cohort slug</RequiredLabel>
            <input name="slug" required aria-required="true" placeholder="cohort-slug" className="app-input h-11" />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            <span>Start date</span>
            <input name="starts_on" type="date" className="app-input h-11" />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            <span>End date</span>
            <input name="ends_on" type="date" className="app-input h-11" />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            <span>Status</span>
            <SelectMenu
              name="status"
              defaultValue="planning"
              buttonClassName="h-11"
              options={[
                { value: "planning", label: "Planning" },
                { value: "active", label: "Active" },
                { value: "completed", label: "Completed" },
                { value: "archived", label: "Archived" },
              ]}
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            <span>Description</span>
            <input name="description" className="app-input h-11" />
          </label>
          {state.message && !state.ok ? (
            <p className="text-sm text-rose-700 md:col-span-2">{state.message}</p>
          ) : null}
          <div className="flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={isPending}>{isPending ? "Saving..." : "Save cohort"}</Button>
          </div>
        </form>
      </ModalShell>
    </>
  );
}
