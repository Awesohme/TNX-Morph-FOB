"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOUR_SEEN_EVENT = "morph-tour-seen";
const TOUR_SEEN_KEY = "morph-tour-seen-v1";

function base64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replaceAll("-", "+").replaceAll("_", "/");
  const rawData = window.atob(normalized);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

/**
 * First-run notification prompt. On first open of the app/PWA, if the browser supports push,
 * permission is still "default", and the user hasn't dismissed it before, we surface a small
 * banner offering to enable notifications. Reuses the same subscribe flow as the settings card.
 */
export function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function maybeShowPrompt() {
      const hasSupport =
        typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!hasSupport) return;
      if (Notification.permission !== "default") return;
      const tourSeen = localStorage.getItem(TOUR_SEEN_KEY);
      if (!tourSeen) return;
      setVisible(true);
    }

    maybeShowPrompt();
    window.addEventListener(TOUR_SEEN_EVENT, maybeShowPrompt);
    return () => window.removeEventListener(TOUR_SEEN_EVENT, maybeShowPrompt);
  }, []);

  // Soft dismiss only — does not persist, so it returns on the next reload until the user acts.
  function dismiss() {
    setVisible(false);
  }

  function enable() {
    startTransition(async () => {
      try {
        const nextPermission = await Notification.requestPermission();
        if (nextPermission !== "granted") {
          // Whatever the choice, don't nag again this device.
          dismiss();
          return;
        }

        const keyResponse = await fetch("/api/push/public-key");
        const { publicKey } = (await keyResponse.json()) as { publicKey?: string };
        if (publicKey) {
          const registration = await navigator.serviceWorker.register("/sw.js");
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64ToUint8Array(publicKey),
          });
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(subscription),
          });
        }
        dismiss();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not enable notifications.");
      }
    });
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700">
          <BellRing className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-950">Turn on notifications?</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Get reminders for due tasks, CM nudges, and session readiness alerts on this device.
          </p>
          {message ? <p className="mt-2 text-xs text-rose-600">{message}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" loading={isPending} onClick={enable}>
              Enable
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-slate-400 hover:text-slate-700">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
