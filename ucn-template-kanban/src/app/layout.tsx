import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { appMeta } from "@/lib/env";
import { SignOutButton } from "@/components/auth/SignOutButton";

export const metadata: Metadata = {
  title: appMeta.name,
  description: appMeta.description
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3" aria-label="Principal">
            <Link className="font-bold text-slate-950" href="/">Tablero Prisma</Link>
            <div className="flex items-center gap-3 text-sm">
              <Link className="text-slate-700 hover:text-slate-950" href="/dashboard">Dashboard</Link>
              <Link className="text-slate-700 hover:text-slate-950" href="/perfil">Perfil</Link>
              <Link className="rounded-md border border-slate-300 px-3 py-2 text-slate-800" href="/login">Entrar</Link>
              <SignOutButton />
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
