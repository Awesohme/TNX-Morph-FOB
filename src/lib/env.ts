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
    googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ?? "",
    googleServiceAccountPrivateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() ?? "",
    googleSheetsProjectId: process.env.GOOGLE_SHEETS_PROJECT_ID?.trim() ?? "",
    storageBucketName: process.env.SUPABASE_STORAGE_BUCKET?.trim() ?? "morph-ops-files",
    webPushPublicKey: process.env.WEB_PUSH_PUBLIC_KEY?.trim() ?? "",
    webPushPrivateKey: process.env.WEB_PUSH_PRIVATE_KEY?.trim() ?? "",
    webPushSubject: process.env.WEB_PUSH_SUBJECT?.trim() ?? "",
    reminderCronSecret: process.env.REMINDER_CRON_SECRET?.trim() ?? "",
  };
}

export function getConfigHealth() {
  const env = getServerEnv();
  return {
    supabaseUrl: Boolean(env.supabaseUrl),
    supabaseAnonKey: Boolean(env.supabaseAnonKey),
    supabaseServiceRoleKey: Boolean(env.supabaseServiceRoleKey),
    googleServiceAccountEmail: Boolean(env.googleServiceAccountEmail),
    googleServiceAccountPrivateKey: Boolean(env.googleServiceAccountPrivateKey),
    googleSheetsProjectId: Boolean(env.googleSheetsProjectId),
    storageBucketName: Boolean(env.storageBucketName),
    appUrl: Boolean(env.appUrl),
    webPushPublicKey: Boolean(env.webPushPublicKey),
    webPushPrivateKey: Boolean(env.webPushPrivateKey),
    webPushSubject: Boolean(env.webPushSubject),
    reminderCronSecret: Boolean(env.reminderCronSecret),
    publicValuesAreBuildTime: true,
  };
}
