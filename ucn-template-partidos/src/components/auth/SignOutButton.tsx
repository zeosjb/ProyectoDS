import { signOutAction } from "@/actions/auth.actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-950" type="submit">
        Salir
      </button>
    </form>
  );
}
