import { signOutAction } from "@/actions/auth.actions";

export function SignOutButton({ className = "rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100", label = "Salir" }: { className?: string; label?: string }) {
  return (
    <form action={signOutAction}>
      <button className={className} type="submit">
        {label}
      </button>
    </form>
  );
}
