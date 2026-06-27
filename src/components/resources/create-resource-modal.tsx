"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { saveResourceAction } from "@/lib/actions/ops";
import { resourceStatusOptions, resourceTypeOptions } from "@/lib/ops-constants";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ModalShell } from "@/components/ui/modal-shell";
import { RequiredLabel } from "@/components/ui/required-indicator";
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
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            <RequiredLabel>Resource title</RequiredLabel>
            <input name="title" required aria-required="true" defaultValue={resource?.title ?? ""} className="app-input h-11" />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            <span>Scope</span>
            <SelectMenu
              value={scope}
              onChange={(v) => setScope(v as "cohort" | "all")}
              buttonClassName="h-11"
              options={[
                { value: "cohort", label: "This cohort only" },
                { value: "all", label: "All cohorts" },
              ]}
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            <span>Resource type</span>
            <SelectMenu
              name="resourceType"
              defaultValue={resource?.resource_type ?? "Link"}
              buttonClassName="h-11"
              options={resourceTypeOptions.map((option) => ({ value: option, label: option }))}
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            <span>URL</span>
            <input name="url" defaultValue={resource?.url ?? ""} className="app-input h-11" />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700 md:col-span-2">
            <span>Upload file</span>
            <input
              name="file"
              type="file"
              className="app-input h-11 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm"
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            <span>Status</span>
            <SelectMenu
              name="status"
              defaultValue={resource?.status ?? "Active"}
              buttonClassName="h-11"
              options={resourceStatusOptions.map((option) => ({ value: option, label: option }))}
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700 md:col-span-2">
            <span>Notes</span>
            <input name="notes" defaultValue={resource?.notes ?? ""} className="app-input h-11" />
          </label>
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
