"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";

export function IconModalButton({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
        className="inline-flex size-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
      >
        <Pencil className="size-4" />
      </button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
      >
        {children}
      </ModalShell>
    </>
  );
}
