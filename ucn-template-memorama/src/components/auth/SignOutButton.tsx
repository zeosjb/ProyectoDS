import { signOutAction } from "@/actions/auth.actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button className="rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100" type="submit">
        Salir
      </button>
    </form>
  );
}
