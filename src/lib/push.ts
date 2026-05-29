import webpush from "web-push";
import { getServerEnv } from "@/lib/env";

export type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

let configured = false;

export function getWebPushPublicKey() {
  return getServerEnv().webPushPublicKey;
}

export function canSendPush() {
  const env = getServerEnv();
  return Boolean(env.webPushPublicKey && env.webPushPrivateKey && env.webPushSubject);
}

export function configureWebPush() {
  if (configured || !canSendPush()) return;
  const env = getServerEnv();
  webpush.setVapidDetails(env.webPushSubject, env.webPushPublicKey, env.webPushPrivateKey);
  configured = true;
}

export async function sendPushNotification(
  subscription: PushSubscriptionRow,
  payload: Record<string, unknown>,
) {
  configureWebPush();
  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify(payload),
  );
}
