import { RecoverPasswordForm } from "@/components/auth/AuthForms";

export default function RecoverPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-950">Recuperar contrasena</h1>
      <p className="mt-2 text-slate-700">Enviaremos un enlace seguro a tu correo.</p>
      <div className="mt-6 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <RecoverPasswordForm />
      </div>
    </main>
  );
}
