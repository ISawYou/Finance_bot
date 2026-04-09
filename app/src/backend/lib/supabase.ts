import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

export function createServerSupabaseClient() {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

  if (!env.SUPABASE_URL || !key) {
    return null;
  }

  return createClient(env.SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
