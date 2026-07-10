"use client";

import { useEffect, useState, useTransition } from "react";
import { BellOff, BellRing, CircleAlert, Settings2 } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";

function base64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replaceAll("-", "+").replaceAll("_", "/");
  const rawData = window.atob(normalized);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export function PushSettingsCard() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);
  const [message, setMessage] = useState("");
  const [serverConfigured, setServerConfigured] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();
  const [unsubscribeOpen, setUnsubscribeOpen] = useState(false);

  useEffect(() => {
    const hasSupport = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(hasSupport);
    if (hasSupport) {
      setPermission(Notification.permission);
    }
  }, []);

  function subscribe() {
    startTransition(async () => {
      try {
        if (!supported) {
          setMessage("Push notifications are not supported in this browser.");
          return;
        }

        const nextPermission = await Notification.requestPermission();
        setPermission(nextPermission);
        if (nextPermission !== "granted") {
          setMessage("Notification permission was not granted.");
          return;
        }

        const keyResponse = await fetch("/api/push/public-key");
        const { publicKey } = (await keyResponse.json()) as { publicKey?: string };
        setServerConfigured(Boolean(publicKey));
        if (!publicKey) {
          setMessage("Notifications are not set up on the server yet. Add the Web Push keys to finish setup.");
          return;
        }

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

        setMessage("Push notifications enabled on this device.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not enable push notifications.");
      }
    });
  }

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/push/public-key");
        const { publicKey } = (await response.json()) as { publicKey?: string };
        setServerConfigured(Boolean(publicKey));
      } catch {
        setServerConfigured(false);
      }
    })();
  }, []);

  function unsubscribe() {
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (!subscription) {
          setMessage("No active push subscription found on this device.");
          return;
        }

        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
        setMessage("Push notifications disabled on this device.");
        setUnsubscribeOpen(false);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not disable push notifications.");
      }
    });
  }

  const state = !supported
    ? {
        title: "Notifications unavailable",
        description: "This browser does not support push notifications. The rest of the app still works normally.",
        icon: BellOff,
      }
    : !serverConfigured
      ? {
          title: "Notifications not set up",
          description: "This device is ready, but the app still needs server-side push keys before reminders can be delivered.",
          icon: Settings2,
        }
      : permission !== "granted"
        ? {
            title: "Enable notifications on this device",
            description: "Turn on browser notifications to receive reminders for due tasks and CM follow-ups.",
            icon: CircleAlert,
          }
        : {
            title: "Notifications active",
            description: "This device can receive task reminders and CM nudges.",
            icon: BellRing,
          };
  const StateIcon = state.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Push notifications</CardTitle>
        <CardDescription>Use this device for task reminders, CM nudges, and due-date alerts.</CardDescription>
      </CardHeader>
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm">
              <StateIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-950">{state.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{state.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-white px-2.5 py-1">Browser: {supported ? "Supported" : "Unsupported"}</span>
                <span className="rounded-full bg-white px-2.5 py-1">Permission: {permission}</span>
                <span className="rounded-full bg-white px-2.5 py-1">Server: {serverConfigured ? "Ready" : "Needs setup"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">
            Enable notifications on any device you personally use. Reminder delivery logs stay in the admin tools section below.
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" disabled={!supported || isPending} onClick={() => setUnsubscribeOpen(true)}>
              Disable on this device
            </Button>
            <Button type="button" disabled={!supported || isPending || !serverConfigured} onClick={subscribe}>
              {isPending ? "Saving..." : "Enable notifications"}
            </Button>
          </div>
        </div>
      </div>
      <ModalShell
        open={unsubscribeOpen}
        onClose={() => !isPending && setUnsubscribeOpen(false)}
        disableClose={isPending}
        title="Disable push notifications?"
        description="This removes this device’s push subscription. You can enable notifications again later."
        widthClassName="max-w-md"
      >
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => setUnsubscribeOpen(false)}>Cancel</Button>
          <Button type="button" loading={isPending} disabled={isPending} className="bg-rose-600 text-white hover:bg-rose-700" onClick={unsubscribe}>
            {isPending ? "Disabling…" : "Disable notifications"}
          </Button>
        </div>
      </ModalShell>
      {message ? <p className="mt-4 text-sm text-muted-foreground">{message}</p> : null}
    </Card>
  );
}
