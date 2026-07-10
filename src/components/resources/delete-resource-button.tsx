"use client";

import { Trash2 } from "lucide-react";
import { deleteResourceAction } from "@/lib/actions/ops";
import { DestructiveActionModal } from "@/components/ui/destructive-action-modal";

export function DeleteResourceButton({ resourceId, title }: { resourceId: string; title: string }) {
  return (
    <DestructiveActionModal
      title="Delete resource?"
      description={`"${title}" will be removed for everyone. This cannot be undone.`}
      action={deleteResourceAction}
      trigger={<button
        type="button"
        aria-label="Delete resource"
        className="grid size-7 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
      >
        <Trash2 className="size-4" />
      </button>}
    >
      <input type="hidden" name="resourceId" value={resourceId} />
    </DestructiveActionModal>
  );
}
