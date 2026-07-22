import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4">
      <p className="text-sm font-semibold uppercase text-emerald-700">404</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">No encontramos esta pagina</h1>
      <p className="mt-3 text-slate-700">Revisa la direccion o vuelve al inicio.</p>
      <Link className="mt-6 w-fit rounded-md bg-emerald-700 px-4 py-2 text-white" href="/">
        Volver al inicio
      </Link>
    </main>
  );
}
