"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteResourceAction } from "@/lib/actions/ops";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { SubmitButton } from "@/components/ui/submit-button";

export function DeleteResourceButton({ resourceId, title }: { resourceId: string; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Delete resource"
        className="grid size-7 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
      >
        <Trash2 className="size-4" />
      </button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="Delete resource?"
        description={`"${title}" will be removed for everyone. This cannot be undone.`}
        widthClassName="max-w-md"
      >
        <form action={deleteResourceAction} onSubmit={() => setOpen(false)} className="flex justify-end gap-3">
          <input type="hidden" name="resourceId" value={resourceId} />
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <SubmitButton pendingLabel="Deleting…" className="bg-rose-600 text-white hover:bg-rose-700">
            Delete
          </SubmitButton>
        </form>
      </ModalShell>
    </>
  );
}
