import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

// server only. uses the secret key, bypasses rls.
// never import this from client components.
export function getSupabaseAdmin(): SupabaseClient {
  if (cached !== null) {
    return cached;
  }
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SECRET_KEY"];
  if (url === undefined || key === undefined) {
    throw new Error("missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
