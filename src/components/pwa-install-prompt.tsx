"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed";

/**
 * Browser-only "Install app" prompt. Shows a dismissible banner when the browser fires
 * `beforeinstallprompt` (Chrome/Edge/Android). Hidden when the app is already installed
 * (display-mode: standalone) or the user dismissed it. iOS Safari has no such event, so
 * nothing shows there — that's expected (users install via the share sheet).
 */
export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Already installed / running as an installed PWA — never show.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    function onPrompt(e: Event) {
      e.preventDefault(); // stop Chrome's mini-infobar; we show our own
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    function onInstalled() {
      setVisible(false);
      setDeferred(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    setVisible(false);
    setDeferred(null);
  }

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore storage failures
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-40 z-[60] mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl lg:bottom-24 lg:left-auto lg:right-6 lg:mx-0">
      <div className="flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100">
          <Download className="size-4 text-slate-700" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-950">Install Morph Ops</p>
          <p className="text-xs text-muted-foreground">Add it to your device for quick access.</p>
        </div>
        <button type="button" onClick={install} className="shrink-0 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">
          Install
        </button>
        <button type="button" onClick={dismiss} aria-label="Dismiss install prompt" className="shrink-0 text-slate-400 hover:text-slate-700">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
