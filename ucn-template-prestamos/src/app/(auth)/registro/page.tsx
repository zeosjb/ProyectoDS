import { RegisterForm } from "@/components/auth/AuthForms";

export default function RegisterPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-950">Crear cuenta</h1>
      <p className="mt-2 text-slate-700">El perfil se creara automaticamente al confirmar el registro.</p>
      <div className="mt-6 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <RegisterForm />
      </div>
    </main>
  );
}
