"use client";

import { createContext, useContext } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ModalShellContext = createContext<{ close: () => void } | null>(null);

export function useModalShell() {
  return useContext(ModalShellContext);
}

export function ModalShell({
  open,
  onClose,
  title,
  description,
  children,
  widthClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  widthClassName?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm">
      <div className={cn("w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl", widthClassName)}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
            {description ? <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
        <ModalShellContext.Provider value={{ close: onClose }}>{children}</ModalShellContext.Provider>
      </div>
    </div>
  );
}
