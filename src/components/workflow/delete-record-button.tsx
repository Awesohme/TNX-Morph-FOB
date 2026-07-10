"use client";

import { Trash2 } from "lucide-react";
import { deleteRecordAction } from "@/lib/actions/records";
import { Button } from "@/components/ui/button";
import { DestructiveActionModal } from "@/components/ui/destructive-action-modal";

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
  return (
    <DestructiveActionModal
      title={`Delete ${recordLabel.toLowerCase()}?`}
      description="This permanently removes the record and its history. This cannot be undone."
      action={deleteRecordAction}
      trigger={<Button
        type="button"
        variant="outline"
        className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
      >
        <Trash2 className="size-4" />
        Delete
      </Button>}
    >
      <input type="hidden" name="moduleKey" value={moduleKey} />
      <input type="hidden" name="recordId" value={recordId} />
    </DestructiveActionModal>
  );
}
