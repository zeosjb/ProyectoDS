import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appMeta, getEnvStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function Home() {
  const env = getEnvStatus();

  if (env.supabaseReady) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims) redirect("/dashboard");
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.1fr_0.9fr] md:items-center">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Gestion de tareas</p>
        <h1 className="mt-3 text-4xl font-bold text-slate-950 md:text-5xl">{appMeta.name}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-700">
          Organiza proyectos en tableros Kanban, crea tareas con responsables, prioridades y fechas de vencimiento, y sigue el avance de cada equipo desde un solo lugar.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800" href="/registro">Crear cuenta</Link>
          <Link className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50" href="/login">Entrar</Link>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Que puedes hacer</h2>
        <div className="mt-5 grid gap-4">
          <Feature title="Crear tableros" description="Separa cursos, equipos o proyectos con titulo y descripcion propia." />
          <Feature title="Anadir tareas" description="Registra estado, prioridad, responsable y vencimiento desde formularios claros." />
          <Feature title="Mover trabajo" description="Visualiza pendientes, tareas en progreso y completadas en columnas Kanban." />
        </div>
      </section>
    </main>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <article className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-700">{description}</p>
    </article>
  );
}
