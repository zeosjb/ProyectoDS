import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEnvStatus } from "@/lib/env";

export async function GET(request: NextRequest) {
  const env = getEnvStatus();
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = "/dashboard";
  redirectTo.search = "";

  if (!env.supabaseReady) {
    redirectTo.pathname = "/login";
    return NextResponse.redirect(redirectTo);
  }

  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(redirectTo);
  }

  redirectTo.pathname = "/login";
  redirectTo.searchParams.set("error", "confirmacion");
  return NextResponse.redirect(redirectTo);
}
