"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4">
      <h1 className="text-3xl font-bold text-slate-950">Algo salio mal</h1>
      <p className="mt-3 text-slate-700">La aplicacion encontro un problema. Intenta nuevamente.</p>
      <button className="mt-6 w-fit rounded-md bg-emerald-700 px-4 py-2 text-white" onClick={reset}>
        Reintentar
      </button>
    </main>
  );
}
