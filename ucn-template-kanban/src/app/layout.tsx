import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { createClient } from "@/lib/supabase/server";
import { appMeta, getEnvStatus } from "@/lib/env";

export const metadata: Metadata = {
  title: appMeta.name,
  description: appMeta.description
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const env = getEnvStatus();
  let isLoggedIn = false;

  if (env.supabaseReady) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    isLoggedIn = Boolean(data?.claims);
  }

  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3" aria-label="Principal">
            <Link className="font-bold text-slate-950" href="/">Tablero Prisma</Link>
            <div className="flex items-center gap-3 text-sm">
              {isLoggedIn ? (
                <>
                  <Link className="text-slate-700 hover:text-slate-950" href="/dashboard">Tableros</Link>
                  <details className="group relative">
                    <summary className="cursor-pointer list-none rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-950">Perfil</summary>
                    <div className="absolute right-0 z-40 mt-2 grid min-w-40 gap-1 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                      <Link className="rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100" href="/perfil">Ver perfil</Link>
                      <SignOutButton className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100" label="Cerrar sesion" />
                    </div>
                  </details>
                </>
              ) : (
                <>
                  <Link className="rounded-md border border-slate-300 px-3 py-2 text-slate-800 hover:bg-slate-50" href="/login">Entrar</Link>
                  <Link className="rounded-md bg-emerald-700 px-3 py-2 font-semibold text-white hover:bg-emerald-800" href="/registro">Registrarme</Link>
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
