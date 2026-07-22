import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { appMeta } from "@/lib/env";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getIsAuthenticated } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: appMeta.name,
  description: appMeta.description
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const isAuthenticated = await getIsAuthenticated();

  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3" aria-label="Principal">
            <Link className="font-bold text-slate-950" href="/">Campus Activo</Link>
            <div className="flex items-center gap-3 text-sm">
              {isAuthenticated ? (
                <>
                  <Link className="text-slate-700 hover:text-slate-950" href="/dashboard">Partidos</Link>
                  <details className="relative">
                    <summary className="cursor-pointer list-none rounded-md border border-slate-300 px-3 py-2 font-semibold text-slate-800 hover:bg-slate-50">
                      Perfil
                    </summary>
                    <div className="absolute right-0 z-20 mt-2 grid min-w-40 gap-1 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                      <Link className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-950" href="/perfil">
                        Mi perfil
                      </Link>
                      <SignOutButton />
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
