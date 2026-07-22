import Link from "next/link";
import { LoginForm } from "@/components/auth/AuthForms";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-950">Iniciar sesion</h1>
      <p className="mt-2 text-slate-700">Accede con tu correo universitario.</p>
      <div className="mt-6 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <LoginForm />
      </div>
      <p className="mt-4 text-sm text-slate-700">
        No tienes cuenta? <Link className="font-semibold text-emerald-700" href="/registro">Registrate</Link>
      </p>
      <Link className="mt-2 inline-block text-sm text-slate-600 underline" href="/recuperar-contrasena">Recuperar contrasena</Link>
    </main>
  );
}
