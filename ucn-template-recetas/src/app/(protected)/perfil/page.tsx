import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  const { data: profile } = userId
    ? await supabase.from("profiles").select("full_name,email,role").eq("id", userId).single()
    : { data: null };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-950">Perfil</h1>
      <dl className="mt-6 grid gap-4 rounded-md border border-slate-200 bg-white p-5">
        <div>
          <dt className="text-sm font-medium text-slate-600">Nombre</dt>
          <dd className="text-slate-950">{String(profile?.full_name ?? "Sin nombre")}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-600">Correo</dt>
          <dd className="text-slate-950">{String(profile?.email ?? "Sin correo")}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-600">Rol</dt>
          <dd className="text-slate-950">{String(profile?.role ?? "user")}</dd>
        </div>
      </dl>
    </main>
  );
}
