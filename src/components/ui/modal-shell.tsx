"use client";

import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ModalShellContext = createContext<{ close: () => void } | null>(null);

// Every dialog owns a lock. Nested dialogs may unmount in either order during navigation.
const backgroundLocks = new WeakMap<HTMLElement, { count: number; original: boolean }>();
let scrollLockCount = 0;
let originalOverflow = "";

function lockBackground(element: HTMLElement) {
  const existing = backgroundLocks.get(element);
  if (existing) existing.count += 1;
  else backgroundLocks.set(element, { count: 1, original: element.inert });
  element.inert = true;
  return () => {
    const lock = backgroundLocks.get(element);
    if (!lock) return;
    lock.count -= 1;
    if (lock.count === 0) {
      element.inert = lock.original;
      backgroundLocks.delete(element);
    }
  };
}

function lockScroll() {
  if (scrollLockCount === 0) originalOverflow = document.body.style.overflow;
  scrollLockCount += 1;
  document.body.style.overflow = "hidden";
  return () => {
    scrollLockCount -= 1;
    if (scrollLockCount === 0) document.body.style.overflow = originalOverflow;
  };
}

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
  const closeRef = useRef(onClose);
  const disableCloseRef = useRef(disableClose);
  closeRef.current = onClose;
  disableCloseRef.current = disableClose;
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !mounted) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const background = Array.from(document.body.children).filter((element) => !element.contains(dialog) && !element.hasAttribute("data-toast-region"));
    const releaseBackground = background.map((element) => lockBackground(element as HTMLElement));
    const isTopDialog = () => Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]')).at(-1) === dialog;
    const tabbable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]')).filter(
      (element) => element.tabIndex >= 0 && !element.matches(':disabled, [type="hidden"]') && !element.closest('[hidden], [inert], [aria-hidden="true"]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden",
    );
    function onKey(e: KeyboardEvent) {
      if (!isTopDialog() || e.defaultPrevented) return;
      if (e.key === "Escape") {
        // Let an open select consume Escape before closing its containing dialog.
        if (dialog?.querySelector('[aria-haspopup="listbox"][aria-expanded="true"]')) return;
        if (!disableCloseRef.current) closeRef.current();
      }
      if (e.key !== "Tab") return;
      const items = tabbable();
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (!items.length) { e.preventDefault(); dialog?.focus(); return; }
      if (index < 0 || (e.shiftKey && index === 0) || (!e.shiftKey && index === items.length - 1)) {
        e.preventDefault();
        (e.shiftKey ? items.at(-1) : items[0])?.focus();
      }
    }
    function containFocus(event: FocusEvent) {
      if (isTopDialog() && !dialog?.contains(event.target as Node)) (tabbable()[0] ?? dialog)?.focus();
    }
    const frame = window.requestAnimationFrame(() => dialog.focus());
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("focusin", containFocus);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("focusin", containFocus);
      releaseBackground.forEach((release) => release());
      if (previousFocus?.isConnected && !previousFocus.closest('[inert]')) previousFocus.focus();
    };
  }, [open, mounted]);

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    return lockScroll();
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
