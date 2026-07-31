// Supabase client — single instance for the whole app (auth + data + realtime).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE } from "./config";

export const supabase: SupabaseClient = createClient(SUPABASE.url, SUPABASE.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
