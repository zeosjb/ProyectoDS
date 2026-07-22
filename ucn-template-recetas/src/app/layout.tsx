import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { appMeta, getEnvStatus } from "@/lib/env";
import { ProfileMenu } from "@/components/auth/ProfileMenu";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: appMeta.name,
  description: appMeta.description
};

async function isAuthenticated() {
  if (!getEnvStatus().supabaseReady) return false;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  return !error && Boolean(data?.claims);
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const authenticated = await isAuthenticated();

  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3" aria-label="Principal">
            <Link className="font-bold text-slate-950" href="/">Recetario Base</Link>
            <div className="flex items-center gap-3 text-sm">
              {authenticated ? (
                <>
                  <Link className="text-slate-700 hover:text-slate-950" href="/dashboard">Recetas</Link>
                  <ProfileMenu />
                </>
              ) : (
                <>
                  <Link className="text-slate-700 hover:text-slate-950" href="/login">Entrar</Link>
                  <Link className="rounded-md border border-slate-300 px-3 py-2 font-semibold text-slate-800 hover:bg-slate-50" href="/registro">Registrarme</Link>
                </>
              )}
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
