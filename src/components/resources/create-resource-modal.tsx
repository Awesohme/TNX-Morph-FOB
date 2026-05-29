"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { saveResourceAction } from "@/lib/actions/ops";
import { resourceStatusOptions, resourceTypeOptions } from "@/lib/ops-constants";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ModalShell } from "@/components/ui/modal-shell";
import { SelectMenu } from "@/components/ui/select-menu";

export function CreateResourceModal({
  cohortId,
}: {
  cohortId: string;
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"cohort" | "all">("cohort");

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add resource
      </Button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="Add resource"
        description="Save a reusable link, template, recording, or asset for this cohort."
      >
        <form action={saveResourceAction} onSubmit={() => setOpen(false)} className="grid gap-3 md:grid-cols-2">
          {/* Scope: tie to this cohort or make it available to all cohorts (cohortId blank). */}
          <input type="hidden" name="cohortId" value={scope === "all" ? "" : cohortId} />
          <input name="title" placeholder="Resource title" className="app-input h-11" />
          <SelectMenu
            value={scope}
            onChange={(v) => setScope(v as "cohort" | "all")}
            buttonClassName="h-11"
            options={[
              { value: "cohort", label: "This cohort only" },
              { value: "all", label: "All cohorts" },
            ]}
          />
          <SelectMenu
            name="resourceType"
            defaultValue="Link"
            buttonClassName="h-11"
            options={resourceTypeOptions.map((option) => ({ value: option, label: option }))}
          />
          <input name="weekLabel" placeholder="Week label" className="app-input h-11" />
          <input name="ownerLabel" placeholder="Owner" className="app-input h-11" />
          <input name="url" placeholder="URL" className="app-input h-11" />
          <input name="fileUrl" placeholder="External file URL" className="app-input h-11" />
          <input
            name="file"
            type="file"
            className="app-input h-11 md:col-span-2 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm"
          />
          <SelectMenu
            name="status"
            defaultValue="Active"
            buttonClassName="h-11"
            options={resourceStatusOptions.map((option) => ({ value: option, label: option }))}
          />
          <input name="notes" placeholder="Notes" className="app-input h-11 md:col-span-2" />
          <div className="flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Saving…">Save resource</SubmitButton>
          </div>
        </form>
      </ModalShell>
    </>
  );
}
