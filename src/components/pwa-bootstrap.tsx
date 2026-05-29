"use client";

import { useEffect, useState } from "react";

export function PwaBootstrap() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let reg: ServiceWorkerRegistration | undefined;
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        reg = registration;
        // Already has an update waiting on load.
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(registration.waiting);
        }
        // A new worker started installing — watch it become "installed".
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(registration.waiting ?? installing);
            }
          });
        });
      })
      .catch(() => {
        // Ignore registration failures in unsupported/local environments.
      });

    // When the new worker takes over, reload once to get fresh assets.
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    // Periodically check for updates while the app is open.
    const interval = window.setInterval(() => reg?.update().catch(() => undefined), 60 * 60 * 1000);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.clearInterval(interval);
    };
  }, []);

  if (!waitingWorker) return null;

  return (
    <div className="fixed inset-x-3 bottom-24 z-[60] mx-auto max-w-sm rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-white shadow-xl lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">A new version is available.</p>
        <button
          type="button"
          onClick={() => waitingWorker.postMessage({ type: "SKIP_WAITING" })}
          className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-slate-100"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
