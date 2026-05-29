import { NextResponse } from "next/server";
import { getWebPushPublicKey } from "@/lib/push";

export async function GET() {
  return NextResponse.json({ publicKey: getWebPushPublicKey() || null });
}
