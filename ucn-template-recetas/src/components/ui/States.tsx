export function Alert({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "error" | "success" }) {
  const color = tone === "error" ? "border-red-200 bg-red-50 text-red-800" : tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700";
  return <div className={"rounded-md border px-4 py-3 text-sm " + color}>{children}</div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-md border border-dashed border-slate-300 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-700">{description}</p>
    </section>
  );
}

export function ConfigMissing({ missing }: { missing: string[] }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Alert tone="error">
        <strong>Falta configurar el proyecto.</strong>
        <span className="mt-2 block">Copia <code>.env.example</code> como <code>.env.local</code> y completa estas variables:</span>
        <span className="mt-2 block font-mono">{missing.join(", ")}</span>
      </Alert>
    </main>
  );
}
