"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import {
  cancelRegistrationAction,
  createDomainItemAction,
  createVenueAction,
  deleteDomainItemAction,
  deleteVenueAction,
  joinMatchAction,
  updateMatchAction,
  updateVenueAction,
  type ActionResult
} from "@/actions/domain.actions";
import { createClient } from "@/lib/supabase/client";
import { getEnvStatus } from "@/lib/env";
import { getMatchAvailability } from "@/lib/domain/rules";
import { Button, EmptyState, Field, SelectField } from "@/components/ui";

type Venue = {
  id: string;
  name: string;
  address: string;
  sport: string;
  isActive: boolean;
};

type Match = {
  id: string;
  title: string;
  sport: string;
  venueId: string;
  venue: string;
  startsAt: string;
  capacity: number;
  registered: number;
  status: string;
  isCreator: boolean;
  isJoined: boolean;
};

const demoVenues: Venue[] = [
  { id: "00000000-0000-0000-0000-000000000000", name: "Cancha Norte UCN", address: "Campus norte", sport: "Futbol", isActive: true },
  { id: "00000000-0000-0000-0000-000000000001", name: "Gimnasio Central", address: "Edificio deportivo", sport: "Basquetbol", isActive: true }
];

const demoMatches: Match[] = [
  { id: "demo-1", title: "Futbol mixto", sport: "Futbol", venueId: demoVenues[0].id, venue: demoVenues[0].name, startsAt: "2026-08-04T18:00", capacity: 12, registered: 9, status: "scheduled", isCreator: false, isJoined: false },
  { id: "demo-2", title: "Basquet 3x3", sport: "Basquetbol", venueId: demoVenues[1].id, venue: demoVenues[1].name, startsAt: "2026-08-05T16:30", capacity: 6, registered: 6, status: "scheduled", isCreator: true, isJoined: true }
];

const initialAction: ActionResult = { ok: false, message: "" };

function normalizeDateTime(value: string) {
  if (!value) return "";
  return value.slice(0, 16);
}

function useVenues() {
  const [venues, setVenues] = useState<Venue[]>(demoVenues);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getEnvStatus().supabaseReady) return;
    let mounted = true;
    void (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("venues")
        .select("id,name,address,sport,is_active")
        .order("name");
      if (mounted) {
        if (data?.length) {
          setVenues(data.map((item) => ({
            id: String(item.id),
            name: String(item.name),
            address: String(item.address),
            sport: String(item.sport),
            isActive: Boolean(item.is_active)
          })));
        }
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { venues, loading };
}

export function DomainLanding({ title, description }: { title: string; description: string }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section className="grid gap-6 rounded-md border border-slate-200 bg-white p-6 md:grid-cols-[1fr_320px]">
        <div>
          <p className="text-sm font-semibold uppercase text-emerald-700">Agenda deportiva</p>
          <h1 className="mt-2 text-4xl font-bold text-slate-950">{title}</h1>
          <p className="mt-3 max-w-2xl text-slate-700">{description}</p>
        </div>
        <MatchCard {...demoMatches[0]} />
      </section>
      <section className="mt-8">
        <MatchList />
      </section>
    </main>
  );
}

export function DomainDashboard() {
  return (
    <div className="grid gap-8">
      <MatchForm />
      <MyMatches />
      <MatchList title="Partidos disponibles" />
    </div>
  );
}

export function AdminPanel() {
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold">Administracion de canchas</h1>
      <VenueAdmin />
    </div>
  );
}

export function MatchList({ title = "Partidos disponibles" }: { title?: string }) {
  const [matches, setMatches] = useState<Match[]>(demoMatches);
  const [sport, setSport] = useState("Todos");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const { venues } = useVenues();

  useEffect(() => {
    if (!getEnvStatus().supabaseReady) return;
    const supabase = createClient();
    setLoading(true);
    void Promise.all([
      supabase.auth.getClaims(),
      supabase.from("matches").select("id,title,sport,starts_at,capacity,status,creator_id,venue_id").order("starts_at", { ascending: true }),
      supabase.from("registrations").select("match_id,user_id,status")
    ]).then(([claimsResult, matchesResult, registrationsResult]) => {
      const userId = claimsResult.data?.claims?.sub;
      const registrations = registrationsResult.data ?? [];
      const venueById = new Map(venues.map((venue) => [venue.id, venue.name]));
      if (matchesResult.data?.length) {
        setMatches(matchesResult.data.map((item) => {
          const activeRegistrations = registrations.filter((registration) => registration.match_id === item.id && registration.status === "active");
          return {
            id: String(item.id),
            title: String(item.title),
            sport: String(item.sport),
            venueId: String(item.venue_id),
            venue: venueById.get(String(item.venue_id)) ?? "Cancha",
            startsAt: String(item.starts_at),
            capacity: Number(item.capacity),
            registered: activeRegistrations.length,
            status: String(item.status),
            isCreator: userId === item.creator_id,
            isJoined: activeRegistrations.some((registration) => registration.user_id === userId)
          };
        }));
      }
    }).finally(() => setLoading(false));
  }, [venues]);

  const filtered = useMemo(() => {
    return matches.filter((match) => {
      const bySport = sport === "Todos" || match.sport === sport;
      const byDate = !date || match.startsAt.slice(0, 10) === date;
      return bySport && byDate && match.status !== "cancelled";
    });
  }, [date, matches, sport]);

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <SportFilter value={sport} onChange={setSport} />
        <Field label="Filtrar por fecha" name="date-filter" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </div>
      <h2 className="text-2xl font-bold">{title}</h2>
      {loading ? <p className="text-sm text-slate-600">Cargando partidos...</p> : null}
      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((match) => <MatchCard key={match.id} {...match} venues={venues} />)}
        </div>
      ) : (
        <EmptyState title="Sin partidos" description="Cambia los filtros o crea un nuevo partido." />
      )}
    </section>
  );
}

export function MyMatches() {
  return <MatchList title="Mis partidos e inscripciones" />;
}

export function MatchCard(props: Partial<Match> & { venues?: Venue[] }) {
  const {
    id = "demo-1",
    title = "Partido amistoso",
    sport = "Futbol",
    venueId = demoVenues[0].id,
    venue = "Cancha UCN",
    startsAt = "2026-08-04T18:00",
    capacity = 10,
    registered = 4,
    status = "scheduled",
    isCreator = false,
    isJoined = false,
    venues = demoVenues
  } = props;
  const [editing, setEditing] = useState(false);

  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-slate-600">{sport} - {venue}</p>
        </div>
        <MatchStatusBadge capacity={capacity} registered={registered} status={status} />
      </div>
      <p className="mt-3 text-sm text-slate-700">{new Date(startsAt).toLocaleString("es-CL")}</p>
      <AvailableSlots capacity={capacity} registered={registered} />
      <div className="mt-4 flex flex-wrap gap-2">
        {isJoined ? <CancelRegistrationButton matchId={id} /> : <JoinMatchButton matchId={id} disabled={status === "cancelled" || registered >= capacity} />}
        {isCreator ? <Button variant="secondary" onClick={() => setEditing((value) => !value)}>{editing ? "Cerrar edicion" : "Editar"}</Button> : null}
        {isCreator ? <CancelMatchButton matchId={id} /> : null}
      </div>
      {editing ? <MatchEditForm match={{ id, title, sport, venueId, startsAt, capacity }} venues={venues} /> : null}
    </article>
  );
}

export function MatchDetail(props: Partial<Match>) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <MatchCard {...props} />
      <p className="mt-4 text-sm text-slate-700">Detalle conectado a inscripcion, cupos y acciones protegidas por RLS.</p>
    </section>
  );
}

export function MatchForm() {
  const [state, formAction] = useActionState<ActionResult, FormData>(createDomainItemAction, initialAction);
  const { venues, loading } = useVenues();

  return (
    <form action={formAction} className="grid gap-4 rounded-md border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-bold">Crear partido</h2>
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}
      <Field label="Titulo" name="title" required />
      <SelectField label="Deporte" name="sport"><option>Futbol</option><option>Basquetbol</option><option>Voleibol</option><option>Padel</option><option>Tenis</option></SelectField>
      <VenueSelector venues={venues} loading={loading} />
      <Field label="Fecha y hora" name="startsAt" type="datetime-local" required />
      <Field label="Cupos" name="capacity" type="number" min={2} max={100} defaultValue={10} />
      <Button type="submit">Guardar partido</Button>
    </form>
  );
}

function MatchEditForm({ match, venues }: { match: Pick<Match, "id" | "title" | "sport" | "venueId" | "startsAt" | "capacity">; venues: Venue[] }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(updateMatchAction, initialAction);
  return (
    <form action={formAction} className="mt-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
      <input type="hidden" name="id" value={match.id} />
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}
      <Field label="Titulo" name="title" defaultValue={match.title} required />
      <SelectField label="Deporte" name="sport" defaultValue={match.sport}><option>Futbol</option><option>Basquetbol</option><option>Voleibol</option><option>Padel</option><option>Tenis</option></SelectField>
      <VenueSelector venues={venues} selectedVenueId={match.venueId} />
      <Field label="Fecha y hora" name="startsAt" type="datetime-local" defaultValue={normalizeDateTime(match.startsAt)} required />
      <Field label="Cupos" name="capacity" type="number" min={2} max={100} defaultValue={match.capacity} />
      <Button type="submit">Actualizar partido</Button>
    </form>
  );
}

export function SportFilter({ value = "Todos", onChange }: { value?: string; onChange?: (value: string) => void }) {
  return <SelectField label="Filtrar por deporte" name="sport-filter" value={value} onChange={(event) => onChange?.(event.target.value)}><option>Todos</option><option>Futbol</option><option>Basquetbol</option><option>Voleibol</option><option>Padel</option><option>Tenis</option></SelectField>;
}

export function VenueSelector({ venues = demoVenues, selectedVenueId, loading = false }: { venues?: Venue[]; selectedVenueId?: string; loading?: boolean }) {
  const activeVenues = venues.filter((venue) => venue.isActive);
  return (
    <SelectField label={loading ? "Cargando canchas..." : "Cancha"} name="venueId" defaultValue={selectedVenueId ?? activeVenues[0]?.id}>
      {activeVenues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name} - {venue.sport}</option>)}
    </SelectField>
  );
}

export function JoinMatchButton({ matchId = "demo-1", disabled = false }: { matchId?: string; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return <span><Button disabled={pending || disabled} onClick={() => startTransition(async () => { const result = await joinMatchAction(matchId); setMessage(result.message); })}>{pending ? "Inscribiendo..." : "Inscribirme"}</Button>{message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}</span>;
}

function CancelRegistrationButton({ matchId }: { matchId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return <span><Button variant="secondary" disabled={pending} onClick={() => startTransition(async () => { const result = await cancelRegistrationAction(matchId); setMessage(result.message); })}>{pending ? "Cancelando..." : "Cancelar inscripcion"}</Button>{message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}</span>;
}

function CancelMatchButton({ matchId }: { matchId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return <span><Button variant="danger" disabled={pending} onClick={() => { if (window.confirm("Confirmas cancelar este partido?")) startTransition(async () => { const result = await deleteDomainItemAction(matchId); setMessage(result.message); }); }}>{pending ? "Cancelando..." : "Cancelar partido"}</Button>{message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}</span>;
}

export function AvailableSlots({ capacity = 10, registered = 4 }: { capacity?: number; registered?: number }) {
  return <p className="mt-3 text-sm font-medium text-slate-800">Cupos disponibles: {Math.max(capacity - registered, 0)} de {capacity}</p>;
}

export function MatchStatusBadge({ capacity = 10, registered = 4, status = "scheduled" }: { capacity?: number; registered?: number; status?: string }) {
  if (status === "cancelled") return <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Cancelado</span>;
  const availability = getMatchAvailability(capacity, registered);
  const color = availability === "Completo" ? "bg-red-100 text-red-800" : availability === "Ultimos cupos" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800";
  return <span className={"rounded-full px-3 py-1 text-xs font-semibold " + color}>{availability}</span>;
}

function VenueAdmin() {
  const { venues, loading } = useVenues();
  const [state, formAction] = useActionState<ActionResult, FormData>(createVenueAction, initialAction);

  return (
    <section className="grid gap-4">
      <form action={formAction} className="grid gap-3 rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold">Crear cancha</h2>
        {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}
        <Field label="Nombre" name="name" required />
        <Field label="Ubicacion" name="address" required />
        <SelectField label="Deporte" name="sport"><option>Futbol</option><option>Basquetbol</option><option>Voleibol</option><option>Padel</option><option>Tenis</option></SelectField>
        <Button type="submit">Crear cancha</Button>
      </form>
      {loading ? <p className="text-sm text-slate-600">Cargando canchas...</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {venues.map((venue) => <VenueAdminCard key={venue.id} venue={venue} />)}
      </div>
    </section>
  );
}

function VenueAdminCard({ venue }: { venue: Venue }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(updateVenueAction, initialAction);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  return (
    <article className="rounded-md border border-slate-200 bg-white p-4">
      <form action={formAction} className="grid gap-3">
        <input type="hidden" name="id" value={venue.id} />
        {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}
        <Field label="Nombre" name="name" defaultValue={venue.name} required />
        <Field label="Ubicacion" name="address" defaultValue={venue.address} required />
        <SelectField label="Deporte" name="sport" defaultValue={venue.sport}><option>Futbol</option><option>Basquetbol</option><option>Voleibol</option><option>Padel</option><option>Tenis</option></SelectField>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <input name="isActive" type="checkbox" value="true" defaultChecked={venue.isActive} />
          Activa
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Guardar</Button>
          <Button type="button" variant="danger" disabled={pending} onClick={() => { if (window.confirm("Confirmas desactivar esta cancha?")) startTransition(async () => { const result = await deleteVenueAction(venue.id); setMessage(result.message); }); }}>Desactivar</Button>
        </div>
        {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      </form>
    </article>
  );
}
