import { createAdminClient } from "@/lib/supabase/admin";

export async function createSignedStorageUrl(bucket: string | null | undefined, path: string | null | undefined) {
  if (!bucket || !path) return null;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
    if (error) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
