"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { Button } from "@/components/ui/button";

export function PwaBootstrap() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  function refreshApp() {
    if (!waitingWorker || isRefreshing) return;
    setIsRefreshing(true);
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }

  return (
    <ModalShell
      open={Boolean(waitingWorker)}
      onClose={() => undefined}
      title="Update required"
      description="A new version of Morph Ops is ready. Refresh now to continue with the latest version."
      widthClassName="max-w-md"
      disableClose
      hideClose
    >
      <Button type="button" className="w-full" loading={isRefreshing} onClick={refreshApp}>
        <RefreshCw className="size-4" />
        {isRefreshing ? "Updating…" : "Refresh now"}
      </Button>
    </ModalShell>
  );
}
