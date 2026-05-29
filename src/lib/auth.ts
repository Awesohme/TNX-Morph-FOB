import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AppRole = "admin" | "facilitator" | "community_manager";

export type CurrentUser = {
  id: string;
  email: string | null;
  role: AppRole | null;
  fullName: string | null;
};

async function ensureProfileRow(userId: string, email: string | undefined) {
  try {
    const supabase = createAdminClient();
    const { data: existing, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (error || existing) return;

    await supabase.from("profiles").insert({
      id: userId,
      email: email ?? null,
      role: "community_manager",
      is_active: false,
    });
  } catch {
    // The app can still continue in read-only bootstrap mode if the service role
    // is not available yet, so profile creation should never break auth checks.
  }
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  await ensureProfileRow(user.id, user.email);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active) {
    return { id: user.id, email: user.email ?? null, role: null, fullName: null };
  }

  return {
    id: user.id,
    email: user.email ?? null,
    role: profile.role as AppRole,
    fullName: profile.full_name as string | null,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user?.role) redirect("/auth/login?error=session");
  return user;
}

export async function requireRole(...roles: AppRole[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.role || !roles.includes(user.role)) redirect("/dashboard?error=forbidden");
  return user;
}
