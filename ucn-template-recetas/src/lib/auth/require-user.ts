import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  return userId;
}
