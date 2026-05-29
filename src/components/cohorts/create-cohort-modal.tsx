"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { saveCohortAction } from "@/lib/actions/ops";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";

export function CreateCohortModal() {
  const [open, setOpen] = useState(false);

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
        <form action={saveCohortAction} className="grid gap-3 md:grid-cols-2">
          <input name="name" placeholder="Cohort name" className="app-input h-11" />
          <input name="slug" placeholder="cohort-slug" className="app-input h-11" />
          <input name="starts_on" type="date" className="app-input h-11" />
          <input name="ends_on" type="date" className="app-input h-11" />
          <select name="status" defaultValue="planning" className="app-select h-11">
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          <input name="description" placeholder="Description" className="app-input h-11" />
          <div className="flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button>Save cohort</Button>
          </div>
        </form>
      </ModalShell>
    </>
  );
}
