import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteClient(request);
  await supabase.auth.signOut();
  return applyCookies(NextResponse.redirect(new URL("/auth/login", request.url)));
}
