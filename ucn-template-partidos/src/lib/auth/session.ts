import { getEnvStatus } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function getIsAuthenticated() {
  if (!getEnvStatus().supabaseReady) return false;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  return !error && Boolean(data?.claims);
}
