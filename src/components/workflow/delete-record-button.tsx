"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteRecordAction } from "@/lib/actions/records";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";

/**
 * Delete control with an in-app confirm modal (no native browser dialog). The actual
 * delete still posts to the server action via a form, so it works without JS too.
 */
export function DeleteRecordButton({
  moduleKey,
  recordId,
  recordLabel,
}: {
  moduleKey: string;
  recordId: string;
  recordLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
        Delete
      </Button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title={`Delete ${recordLabel.toLowerCase()}?`}
        description="This permanently removes the record and its history. This cannot be undone."
        widthClassName="max-w-md"
      >
        <form action={deleteRecordAction} className="flex justify-end gap-3">
          <input type="hidden" name="moduleKey" value={moduleKey} />
          <input type="hidden" name="recordId" value={recordId} />
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="bg-rose-600 text-white hover:bg-rose-700">
            <Trash2 className="size-4" />
            Delete
          </Button>
        </form>
      </ModalShell>
    </>
  );
}
