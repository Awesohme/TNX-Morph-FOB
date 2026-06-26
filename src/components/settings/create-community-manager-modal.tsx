"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createCommunityManagerAccountAction, type CreateCommunityManagerState } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { InviteDetails } from "@/components/settings/invite-details";
import { ModalShell } from "@/components/ui/modal-shell";
import { SelectMenu } from "@/components/ui/select-menu";

const initialCreateCommunityManagerState: CreateCommunityManagerState = {
  ok: false,
  message: "",
};

function newFormToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function CreateCommunityManagerModal({
  cohorts,
}: {
  cohorts: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [formToken, setFormToken] = useState("initial");
  const [submittedToken, setSubmittedToken] = useState("");
  // When true, the latest success result is hidden (after "Create another")
  // until a fresh submission. A new submit re-renders with new state, and the
  // form's onSubmit clears this flag so the next result shows.
  const [dismissed, setDismissed] = useState(false);
  const [state, action, isPending] = useActionState(createCommunityManagerAccountAction, initialCreateCommunityManagerState);
  const credentials = !dismissed && !isPending && state.formToken === submittedToken ? state.credentials : undefined;
  const errorMessage = !dismissed && state.formToken === submittedToken && !state.ok ? state.message : "";

  function resetForm() {
    setDismissed(true);
    setSubmittedToken("");
    setFormToken(newFormToken());
    setFormKey((value) => value + 1);
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
      >
        <Plus className="size-4" />
        Add user
      </Button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="Add user"
        description="Create the account, pick a role and cohort, then copy the invite for them."
      >
        {credentials ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-emerald-700">{state.message}</p>
            <InviteDetails credentials={credentials} />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  resetForm();
                }}
              >
                <Plus className="size-4" />
                Create another
              </Button>
            </div>
          </div>
        ) : (
          <form
            key={formKey}
            action={action}
            onSubmit={() => {
              setSubmittedToken(formToken);
              setDismissed(false);
            }}
            className="grid gap-3 md:grid-cols-2"
          >
            <input type="hidden" name="formToken" value={formToken} />
            <input name="fullName" aria-label="Full name" placeholder="Full name" className="app-input h-11" />
            <input name="email" aria-label="Email address" placeholder="name@example.com" type="email" className="app-input h-11" />
            <SelectMenu
              name="cohortId"
              defaultValue={cohorts[0]?.id ?? ""}
              placeholder="Assign a cohort"
              buttonClassName="h-11"
              options={cohorts.map((cohort) => ({ value: cohort.id, label: cohort.name }))}
            />
            <SelectMenu
              name="role"
              defaultValue="community_manager"
              buttonClassName="h-11"
              options={[
                { value: "community_manager", label: "Community manager" },
                { value: "facilitator", label: "Facilitator" },
                { value: "admin", label: "Admin" },
              ]}
            />

            {errorMessage ? (
              <p className="text-sm text-rose-700 md:col-span-2">{errorMessage}</p>
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
