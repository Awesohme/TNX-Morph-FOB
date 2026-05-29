"use client";

import { useEffect } from "react";

export function PwaBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Ignore registration failures in unsupported/local environments.
    });
  }, []);

  return null;
}
