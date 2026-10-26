"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle } from "lucide-react";

type Toast = { id: number; message: string; tone: "success" | "error" };
type ToastContextValue = { toast: (message: string, tone?: "success" | "error") => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted ? createPortal(<div data-toast-region className="pointer-events-none fixed inset-x-0 bottom-6 z-[300] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            aria-atomic="true"
            className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-xl"
          >
            {t.tone === "success" ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : (
              <XCircle className="size-4 text-rose-600" />
            )}
            {t.message}
          </div>
        ))}
      </div>, document.body) : null}
    </ToastContext.Provider>
  );
}
