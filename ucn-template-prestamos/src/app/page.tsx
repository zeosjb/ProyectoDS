import Link from "next/link";

const sampleEquipment = [
  { name: "Notebook laboratorio", category: "Computadores", available: "4 disponibles", status: "Alta demanda" },
  { name: "Kit Arduino", category: "Electronica", available: "7 disponibles", status: "Disponible" },
  { name: "Proyector portatil", category: "Audiovisual", available: "2 disponibles", status: "Reservas abiertas" }
];

const steps = [
  {
    title: "Busca recursos",
    description: "Revisa equipos por categoria, disponibilidad y descripcion antes de planificar una actividad."
  },
  {
    title: "Solicita fechas",
    description: "Indica cantidad, fecha de retiro y fecha de devolucion desde tu cuenta."
  },
  {
    title: "Sigue el estado",
    description: "Consulta si tu solicitud fue aprobada, entregada, devuelta o necesita revision."
  }
];

export default function Home() {
  return (
    <main>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Gestion de prestamos</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold text-slate-950 sm:text-5xl">
              Prestamos de Aula
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-700">
              Organiza solicitudes de equipos, aprobaciones y devoluciones en un solo lugar. El catalogo real esta
              disponible solo para usuarios registrados.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800" href="/registro">
                Registrarme
              </Link>
              <Link className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50" href="/login">
                Entrar
              </Link>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">Ejemplo de catalogo</p>
                <p className="text-xs text-slate-600">Datos ilustrativos</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
                Demo
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {sampleEquipment.map((item) => (
                <article key={item.name} className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-slate-950">{item.name}</h2>
                      <p className="text-sm text-slate-600">{item.category}</p>
                    </div>
                    <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                      {item.available}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">{item.status}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-md border border-slate-200 bg-white p-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-emerald-100 text-sm font-bold text-emerald-900">
                {index + 1}
              </span>
              <h2 className="mt-4 text-lg font-bold text-slate-950">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

    </main>
  );
}
