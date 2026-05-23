export function getPublicEnv() {
  return {
    // NEXT_PUBLIC_* values must be accessed statically so Next can inline them
    // into the client bundle during build.
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
    appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
  };
}

export function getServerEnv() {
  return {
    ...getPublicEnv(),
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "",
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
