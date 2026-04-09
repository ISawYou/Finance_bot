import { createClient } from "@supabase/supabase-js";

const processEnv = typeof process !== "undefined" ? process.env : undefined;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || processEnv?.SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || processEnv?.SUPABASE_ANON_KEY;

export function createSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}
