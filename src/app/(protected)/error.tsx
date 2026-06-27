"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const CHUNK_RELOAD_KEY = "morph-protected-chunk-reload-attempted";

function isChunkLoadError(error: Error) {
  return /chunkloaderror|loading chunk|failed to fetch dynamically imported module/i.test(
    `${error.name} ${error.message} ${error.stack ?? ""}`,
  );
}

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    if (!isChunkLoadError(error)) return;

    const currentUrl = window.location.href;
    const lastAttempt = sessionStorage.getItem(CHUNK_RELOAD_KEY);
    if (lastAttempt === currentUrl) return;

    sessionStorage.setItem(CHUNK_RELOAD_KEY, currentUrl);
    window.location.reload();
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="max-w-xl rounded-3xl border bg-white/80 p-6 shadow-glow">
        <h1 className="font-display text-2xl font-semibold">Something went sideways.</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {isDev ? error.message : "An unexpected error occurred. Try again or contact an admin."}
        </p>
        {isDev && error.stack ? (
          <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-white">{error.stack}</pre>
        ) : null}
        <div className="mt-5 flex gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </div>
    </main>
  );
}
