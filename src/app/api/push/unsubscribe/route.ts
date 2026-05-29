import { NextRequest, NextResponse } from "next/server";
import { requireRequestRole } from "@/lib/request-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const auth = await requireRequestRole("admin", "facilitator", "community_manager");
  if ("error" in auth) return auth.error;

  const body = (await request.json()) as { endpoint?: string };
  if (!body.endpoint) {
    return NextResponse.json({ ok: false, message: "Endpoint is required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", auth.user.id)
    .eq("endpoint", body.endpoint);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
