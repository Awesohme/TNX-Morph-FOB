import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/auth";

export async function requireRequestRole(...roles: AppRole[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Response("Unauthorized", { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active || !profile.role || !roles.includes(profile.role as AppRole)) {
    return { error: new Response("Forbidden", { status: 403 }) };
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      role: profile.role as AppRole,
      fullName: (profile.full_name as string | null) ?? null,
    },
  };
}
