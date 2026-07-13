import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteClient(request);
  await supabase.auth.signOut();
  // A POST logout must redirect with 303; 307 preserves the POST method and causes the
  // GET-only login page to respond 405 in browsers.
  return applyCookies(NextResponse.redirect(new URL("/auth/login", request.url), 303));
}
