"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { saveResourceAction } from "@/lib/actions/ops";
import { resourceStatusOptions, resourceTypeOptions } from "@/lib/ops-constants";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";

export function CreateResourceModal({
  cohortId,
}: {
  cohortId: string;
}) {
  const [open, setOpen] = useState(false);

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
        <form action={saveResourceAction} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="cohortId" value={cohortId} />
          <input name="title" placeholder="Resource title" className="app-input h-11" />
          <select name="resourceType" defaultValue="Link" className="app-select h-11">
            {resourceTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input name="weekLabel" placeholder="Week label" className="app-input h-11" />
          <input name="ownerLabel" placeholder="Owner" className="app-input h-11" />
          <input name="url" placeholder="URL" className="app-input h-11" />
          <input name="fileUrl" placeholder="File URL" className="app-input h-11" />
          <select name="status" defaultValue="Active" className="app-select h-11">
            {resourceStatusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input name="notes" placeholder="Notes" className="app-input h-11 md:col-span-2" />
          <div className="flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button>Save resource</Button>
          </div>
        </form>
      </ModalShell>
    </>
  );
}
