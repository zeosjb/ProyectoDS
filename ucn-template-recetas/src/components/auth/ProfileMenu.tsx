import Link from "next/link";
import { SignOutButton } from "@/components/auth/SignOutButton";

export function ProfileMenu() {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
        Perfil
      </summary>
      <div className="absolute right-0 z-20 mt-2 grid min-w-44 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
        <Link className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-950" href="/perfil">
          Ver mi perfil
        </Link>
        <SignOutButton className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-950" />
      </div>
    </details>
  );
}
