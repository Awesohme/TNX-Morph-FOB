"use client";

import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  disableClose = false,
  hideClose = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  widthClassName?: string;
  disableClose?: boolean;
  hideClose?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !disableClose) onClose();
      if (e.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.requestAnimationFrame(() => dialogRef.current?.focus());
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previousFocus?.focus();
    };
  }, [open, onClose, disableClose]);

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/40 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} tabIndex={-1} className={cn("w-full max-w-2xl overflow-y-auto rounded-t-[28px] border border-slate-200 bg-white p-6 shadow-2xl sm:rounded-[28px]", "max-h-[92dvh] sm:max-h-[90dvh]", widthClassName)}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
            {description ? <p id={descriptionId} className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
          {!hideClose ? (
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={disableClose} aria-label="Close">
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
        <ModalShellContext.Provider value={{ close: onClose }}>{children}</ModalShellContext.Provider>
      </div>
    </div>,
    document.body,
  );
}
