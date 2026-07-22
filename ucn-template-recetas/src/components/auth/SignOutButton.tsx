import { signOutAction } from "@/actions/auth.actions";

type SignOutButtonProps = {
  className?: string;
  label?: string;
};

export function SignOutButton({
  className = "rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100",
  label = "Cerrar sesion"
}: SignOutButtonProps) {
  return (
    <form action={signOutAction}>
      <button className={className} type="submit">
        {label}
      </button>
    </form>
  );
}
