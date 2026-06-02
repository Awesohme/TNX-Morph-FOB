"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * "Install app" prompt. Re-appears on every load until the app is actually installed
 * (display-mode: standalone) — a soft dismiss only hides it for the current view, it does
 * NOT persist, so the user keeps being nudged until they install. Chrome/Edge/Android use
 * the `beforeinstallprompt` event; iOS Safari has no such event, so we show an
 * "Add to Home Screen via Share" hint instead.
 */
const TOUR_SEEN_KEY = "morph-tour-seen-v1";
const TOUR_SEEN_EVENT = "morph-tour-seen";

function isTourDone() {
  try {
    return !!localStorage.getItem(TOUR_SEEN_KEY);
  } catch {
    return true;
  }
}

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [tourDone, setTourDone] = useState(false);

  // Resolve initial tour state after mount (localStorage not available during SSR).
  useEffect(() => {
    setTourDone(isTourDone());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return; // already installed — never show

    function tryShow(ios: boolean, evt?: BeforeInstallPromptEvent) {
      if (!isTourDone()) return; // hold until tour is finished
      setIosHint(ios);
      if (evt) setDeferred(evt);
      setVisible(true);
    }

    // iOS Safari: no beforeinstallprompt. Show the manual Add-to-Home-Screen hint.
    if (isIos()) {
      tryShow(true);
    }

    function onPrompt(e: Event) {
      e.preventDefault();
      tryShow(false, e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setVisible(false);
      setDeferred(null);
    }
    function onTourSeen() {
      setTourDone(true);
      // Show immediately now that tour is done (if we already have a deferred event or iOS).
      if (isIos()) {
        setIosHint(true);
        setVisible(true);
      } else if (deferred) {
        setVisible(true);
      }
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(TOUR_SEEN_EVENT, onTourSeen);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(TOUR_SEEN_EVENT, onTourSeen);
    };
  }, [deferred]);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    setVisible(false);
    setDeferred(null);
  }

  // Soft dismiss only — does not persist, so it re-appears on the next reload until installed.
  function dismiss() {
    setVisible(false);
  }

  if (!visible || !tourDone) return null;

  return (
    <div className="fixed inset-x-3 bottom-40 z-[60] mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl lg:bottom-24 lg:left-auto lg:right-6 lg:mx-0">
      <div className="flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100">
          {iosHint ? <Share className="size-4 text-slate-700" /> : <Download className="size-4 text-slate-700" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-950">Install Morph Ops</p>
          {iosHint ? (
            <p className="text-xs text-muted-foreground">Tap the Share icon, then &ldquo;Add to Home Screen&rdquo;.</p>
          ) : (
            <p className="text-xs text-muted-foreground">Add it to your device for quick access.</p>
          )}
        </div>
        {iosHint ? null : (
          <button type="button" onClick={install} className="shrink-0 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">
            Install
          </button>
        )}
        <button type="button" onClick={dismiss} aria-label="Dismiss install prompt" className="shrink-0 text-slate-400 hover:text-slate-700">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
