"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { saveResourceAction } from "@/lib/actions/ops";
import { resourceStatusOptions, resourceTypeOptions } from "@/lib/ops-constants";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ModalShell } from "@/components/ui/modal-shell";
import { SelectMenu } from "@/components/ui/select-menu";

type ResourceValues = {
  id: string;
  title: string;
  resource_type: string;
  week_label: string | null;
  owner_label: string | null;
  url: string | null;
  file_url: string | null;
  notes: string | null;
  status: string;
  cohort_id: string | null;
};

export function CreateResourceModal({
  cohortId,
  resource,
}: {
  cohortId: string;
  resource?: ResourceValues;
}) {
  const isEdit = Boolean(resource);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"cohort" | "all">(
    resource ? (resource.cohort_id ? "cohort" : "all") : "cohort",
  );

  return (
    <>
      {isEdit ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Edit resource"
          className="grid size-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <Pencil className="size-4" />
        </button>
      ) : (
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Add resource
        </Button>
      )}

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title={isEdit ? "Edit resource" : "Add resource"}
        description="Save a reusable link, template, recording, or asset."
      >
        <form
          action={async (formData) => {
            await saveResourceAction(formData);
            setOpen(false);
          }}
          className="grid gap-3 md:grid-cols-2"
        >
          {resource ? <input type="hidden" name="resourceId" value={resource.id} /> : null}
          {/* Scope: tie to this cohort or make it available to all cohorts (cohortId blank). */}
          <input type="hidden" name="cohortId" value={scope === "all" ? "" : cohortId} />
          <input name="title" aria-label="Resource title" defaultValue={resource?.title ?? ""} placeholder="Resource title" className="app-input h-11" />
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
            defaultValue={resource?.resource_type ?? "Link"}
            buttonClassName="h-11"
            options={resourceTypeOptions.map((option) => ({ value: option, label: option }))}
          />
          <input name="url" aria-label="URL" defaultValue={resource?.url ?? ""} placeholder="URL" className="app-input h-11" />
          <input
            name="file"
            type="file"
            aria-label="Upload file"
            className="app-input h-11 md:col-span-2 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm"
          />
          <SelectMenu
            name="status"
            defaultValue={resource?.status ?? "Active"}
            buttonClassName="h-11"
            options={resourceStatusOptions.map((option) => ({ value: option, label: option }))}
          />
          <input name="notes" aria-label="Notes" defaultValue={resource?.notes ?? ""} placeholder="Notes" className="app-input h-11 md:col-span-2" />
          <div className="flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Saving…">{isEdit ? "Save changes" : "Save resource"}</SubmitButton>
          </div>
        </form>
      </ModalShell>
    </>
  );
}
