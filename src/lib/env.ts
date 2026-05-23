import { trimmedEnv } from "@/lib/utils";

export function getPublicEnv() {
  return {
    supabaseUrl: trimmedEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: trimmedEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    appUrl: trimmedEnv("NEXT_PUBLIC_APP_URL") || "http://localhost:3000",
  };
}

export function getServerEnv() {
  return {
    ...getPublicEnv(),
    supabaseServiceRoleKey: trimmedEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export function getConfigHealth() {
  const env = getServerEnv();
  return {
    supabaseUrl: Boolean(env.supabaseUrl),
    supabaseAnonKey: Boolean(env.supabaseAnonKey),
    supabaseServiceRoleKey: Boolean(env.supabaseServiceRoleKey),
    appUrl: Boolean(env.appUrl),
    publicValuesAreBuildTime: true,
  };
}
