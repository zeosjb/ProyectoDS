import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEnvStatus } from "@/lib/env";
import { ConfigMissing } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const env = getEnvStatus();
  if (!env.supabaseReady) return <ConfigMissing missing={env.missing} />;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/login");

  return <>{children}</>;
}
