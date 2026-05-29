"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  const [isPending, startTransition] = useTransition();

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
        if (!publicKey) {
          setMessage("Push notifications are not configured yet.");
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
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not disable push notifications.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Push notifications</CardTitle>
        <CardDescription>Use this device for task reminders, CM nudges, and due-date alerts.</CardDescription>
      </CardHeader>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-muted-foreground">
          <p>Support: {supported ? "Available" : "Unavailable"}</p>
          <p>Permission: {permission}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" disabled={!supported || isPending} onClick={unsubscribe}>
            Disable on this device
          </Button>
          <Button type="button" disabled={!supported || isPending} onClick={subscribe}>
            {isPending ? "Saving..." : "Enable notifications"}
          </Button>
        </div>
      </div>
      {message ? <p className="mt-4 text-sm text-muted-foreground">{message}</p> : null}
    </Card>
  );
}
