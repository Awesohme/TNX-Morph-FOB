import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

export class MissingServiceRoleError extends Error {
  constructor() {
    super(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add the service_role key to local and Vercel server-only environment variables.",
    );
    this.name = "MissingServiceRoleError";
  }
}

export function createAdminClient() {
  const { supabaseUrl, supabaseServiceRoleKey } = getServerEnv();
  if (!supabaseUrl || !supabaseServiceRoleKey) throw new MissingServiceRoleError();

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
