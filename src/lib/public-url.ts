import { headers } from "next/headers";
import { getPublicEnv } from "@/lib/env";

function cleanBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
}

export async function getPublicBaseUrl() {
  const headerList = await headers();
  const forwardedHost = firstHeaderValue(headerList.get("x-forwarded-host"));
  const host = forwardedHost || firstHeaderValue(headerList.get("host"));

  if (host) {
    const forwardedProto = firstHeaderValue(headerList.get("x-forwarded-proto"));
    const proto = forwardedProto || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return cleanBaseUrl(getPublicEnv().appUrl);
}
