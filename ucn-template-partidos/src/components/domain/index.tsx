"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import {
  cancelRegistrationAction,
  createDomainItemAction,
  createVenueAction,
  deleteDomainItemAction,
  deleteVenueAction,
  getMatchAttendeesAction,
  joinMatchAction,
  updateMatchAction,
  updateVenueAction,
  type ActionResult,
  type MatchAttendee
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

type DateFilter = "day" | "week" | "month";

const demoVenues: Venue[] = [
  { id: "00000000-0000-0000-0000-000000000000", name: "Cancha Norte UCN", address: "Campus norte", sport: "Futbol", isActive: true },
  { id: "00000000-0000-0000-0000-000000000001", name: "Gimnasio Central", address: "Edificio deportivo", sport: "Basquetbol", isActive: true }
];

const demoMatches: Match[] = [
  { id: "demo-1", title: "Futbol mixto", sport: "Futbol", venueId: demoVenues[0].id, venue: demoVenues[0].name, startsAt: "2026-08-04T18:00", capacity: 12, registered: 9, status: "scheduled", isCreator: false, isJoined: false },
  { id: "demo-2", title: "Basquet 3x3", sport: "Basquetbol", venueId: demoVenues[1].id, venue: demoVenues[1].name, startsAt: "2026-08-05T16:30", capacity: 6, registered: 6, status: "scheduled", isCreator: true, isJoined: true }
];

const defaultSports = ["Futbol", "Basquetbol", "Voleibol", "Padel", "Tenis"];
const pageSize = 10;
const initialAction: ActionResult = { ok: false, message: "" };
const allowedTimes = Array.from({ length: 31 }, (_, index) => {
  const totalMinutes = 8 * 60 + index * 30;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
});

function localInputDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  const normalized = localDate.toISOString();
  return {
    date: normalized.slice(0, 10),
    time: normalized.slice(11, 16)
  };
}

function todayValue() {
  return localInputDateTime(new Date()).date;
}

function availableTimesForDate(date: string, fallbackTime?: string) {
  const today = todayValue();
  const currentTime = localInputDateTime(new Date()).time;
  const options = date === today ? allowedTimes.filter((time) => time >= currentTime) : allowedTimes;
  return fallbackTime && !options.includes(fallbackTime) ? uniqueValues([...options, fallbackTime]) : options;
}

function dateRangeForFilter(filter: DateFilter) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);

  if (filter === "day") {
    end.setDate(start.getDate() + 1);
    return { start, end };
  }

  if (filter === "week") {
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 7);
    return { start, end };
  }

  start.setDate(1);
  end.setTime(start.getTime());
  end.setMonth(start.getMonth() + 1);
  return { start, end };
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
}

function useVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
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

export function DomainLanding({ title, description, isAuthenticated = false }: { title: string; description: string; isAuthenticated?: boolean }) {
  if (isAuthenticated) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <section className="grid gap-6 border-b border-slate-200 pb-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-700">Agenda deportiva</p>
            <h1 className="mt-2 text-4xl font-bold text-slate-950">{title}</h1>
            <p className="mt-3 max-w-2xl text-slate-700">{description}</p>
          </div>
          <Link className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800" href="/dashboard">
            Ir a partidos
          </Link>
        </section>
        <section className="mt-8">
          <MatchList />
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.15fr_0.85fr] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-700">Agenda deportiva UCN</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold text-slate-950 md:text-5xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-700">{description}</p>
            <p className="mt-3 max-w-2xl text-slate-600">
              Organiza partidos, revisa cupos y coordina canchas desde un solo lugar. Para participar en encuentros reales necesitas iniciar sesion.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800" href="/registro">
                Registrarme
              </Link>
              <Link className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50" href="/login">
                Entrar
              </Link>
            </div>
          </div>
          <Link
            aria-label="Iniciar sesion para inscribirte en partidos"
            className="group block rounded-md border border-slate-200 bg-slate-50 p-5 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            href="/login"
          >
            <p className="text-xs font-semibold uppercase text-slate-500">Vista de ejemplo</p>
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950">{demoMatches[0].title}</h2>
                <p className="text-sm text-slate-600">{demoMatches[0].sport} - {demoMatches[0].venue}</p>
              </div>
              <MatchStatusBadge capacity={demoMatches[0].capacity} registered={demoMatches[0].registered} status={demoMatches[0].status} />
            </div>
            <p className="mt-4 text-sm text-slate-700">{new Date(demoMatches[0].startsAt).toLocaleString("es-CL")}</p>
            <AvailableSlots capacity={demoMatches[0].capacity} registered={demoMatches[0].registered} />
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white group-hover:bg-emerald-800">
                Inscribirme
              </span>
              <span className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                Ver detalle
              </span>
            </div>
            <p className="mt-4 text-sm font-medium text-emerald-800">Inicia sesion para activar esta accion.</p>
          </Link>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 md:grid-cols-3">
        <article className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-950">Encuentra partidos</h2>
          <p className="mt-2 text-sm text-slate-600">Filtra por deporte, fecha y cupos disponibles para elegir donde participar.</p>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-950">Crea encuentros</h2>
          <p className="mt-2 text-sm text-slate-600">Publica horarios, cancha, deporte y cantidad de participantes desde la seccion de partidos.</p>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-950">Controla inscripciones</h2>
          <p className="mt-2 text-sm text-slate-600">Revisa si quedan cupos, cancela tu participacion o administra tus partidos creados.</p>
        </article>
      </section>
    </main>
  );
}

export function DomainDashboard() {
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="grid gap-8">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Partidos</h1>
          <p className="mt-1 text-sm text-slate-600">Crea encuentros, revisa tus inscripciones y encuentra cupos disponibles.</p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>Crear partido</Button>
      </section>
      <CreateMatchModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          setRefreshKey((value) => value + 1);
        }}
      />
      <MyMatches refreshKey={refreshKey} />
      <MatchList title="Partidos disponibles" refreshKey={refreshKey} />
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

export function MatchList({ title = "Partidos disponibles", mode = "available", refreshKey = 0 }: { title?: string; mode?: "available" | "mine"; refreshKey?: number }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [sport, setSport] = useState("Todos");
  const [dateFilter, setDateFilter] = useState<DateFilter>("day");
  const [page, setPage] = useState(1);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const { venues } = useVenues();

  useEffect(() => {
    if (!getEnvStatus().supabaseReady) return;
    const supabase = createClient();
    setLoading(true);
    void Promise.all([
      supabase.auth.getClaims(),
      supabase.from("matches").select("id,title,sport,starts_at,capacity,status,creator_id,venue_id").order("starts_at", { ascending: true }),
      supabase.from("registrations").select("match_id,user_id,status"),
      supabase.rpc("get_active_registration_counts")
    ]).then(([claimsResult, matchesResult, registrationsResult, countsResult]) => {
      const userId = claimsResult.data?.claims?.sub;
      const registrations = registrationsResult.data ?? [];
      const venueById = new Map(venues.map((venue) => [venue.id, venue.name]));
      const registrationCountByMatch = new Map((countsResult.data ?? []).map((item) => [item.match_id, item.registered]));
      setMatches((matchesResult.data ?? []).map((item) => {
        const activeUserRegistrations = registrations.filter((registration) => registration.match_id === item.id && registration.status === "active");
        return {
          id: String(item.id),
          title: String(item.title),
          sport: String(item.sport),
          venueId: String(item.venue_id),
          venue: venueById.get(String(item.venue_id)) ?? "Cancha",
          startsAt: String(item.starts_at),
          capacity: Number(item.capacity),
          registered: registrationCountByMatch.get(item.id) ?? 0,
          status: String(item.status),
          isCreator: userId === item.creator_id,
          isJoined: activeUserRegistrations.some((registration) => registration.user_id === userId)
        };
      }));
    }).finally(() => setLoading(false));
  }, [localRefreshKey, refreshKey, venues]);

  useEffect(() => {
    setPage(1);
  }, [dateFilter, sport]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const range = dateRangeForFilter(dateFilter);
    return matches.filter((match) => {
      const bySport = sport === "Todos" || match.sport === sport;
      const startsAt = new Date(match.startsAt);
      const startsAtTime = startsAt.getTime();
      const byDate = startsAt >= range.start && startsAt < range.end;
      const isFuture = startsAtTime >= now;
      const byMode = mode === "available" || match.isCreator || match.isJoined;
      return byMode && bySport && byDate && isFuture && match.status !== "cancelled";
    });
  }, [dateFilter, matches, mode, sport]);

  const sportOptions = uniqueValues([...defaultSports, ...venues.map((venue) => venue.sport), ...matches.map((match) => match.sport)]);
  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const emptyTitle = mode === "mine" ? "No hay partidos ni inscripciones" : "No hay partidos disponibles";
  const emptyDescription = mode === "mine"
    ? "Crea un partido o inscribete en uno disponible para verlo aqui."
    : "Cuando se cree un partido futuro con cupos, aparecera en esta seccion.";

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <SportFilter options={sportOptions} value={sport} onChange={setSport} />
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
      </div>
      <h2 className="text-2xl font-bold">{title}</h2>
      {loading ? <p className="text-sm text-slate-600">Cargando partidos...</p> : null}
      {paginated.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {paginated.map((match) => <MatchCard key={match.id} {...match} venues={venues} onChanged={() => setLocalRefreshKey((value) => value + 1)} />)}
        </div>
      ) : (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}
      {filtered.length > pageSize ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <span>Pagina {currentPage} de {totalPages}</span>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(value - 1, 1))}>Anterior</Button>
            <Button type="button" variant="secondary" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(value + 1, totalPages))}>Siguiente</Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function MyMatches({ refreshKey = 0 }: { refreshKey?: number }) {
  return <MatchList title="Mis partidos e inscripciones" mode="mine" refreshKey={refreshKey} />;
}

export function MatchCard(props: Partial<Match> & { venues?: Venue[]; onChanged?: () => void }) {
  const {
    id = "demo-1",
    title = "Partido amistoso",
    sport = "Futbol",
    venue = "Cancha UCN",
    startsAt = "2026-08-04T18:00",
    capacity = 10,
    registered = 4,
    status = "scheduled",
    isCreator = false,
    isJoined = false,
    venues = demoVenues,
    onChanged
  } = props;
  const [editOpen, setEditOpen] = useState(false);

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
        {isJoined ? <CancelRegistrationButton matchId={id} onChanged={onChanged} /> : <JoinMatchButton matchId={id} disabled={status === "cancelled" || registered >= capacity} onChanged={onChanged} />}
        {isCreator ? <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>Editar</Button> : null}
        {isCreator ? <AttendeesModalButton matchId={id} title={title} /> : null}
        {isCreator ? <CancelMatchButton matchId={id} onChanged={onChanged} /> : null}
      </div>
      {isCreator ? (
        <EditMatchModal
          match={{ id, title, sport, venue, startsAt, capacity, registered }}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            onChanged?.();
          }}
          open={editOpen}
          venues={venues}
        />
      ) : null}
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

function CreateMatchModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="create-match-title">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-md bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="create-match-title" className="text-xl font-bold text-slate-950">Crear partido</h2>
            <p className="mt-1 text-sm text-slate-600">Completa los datos del encuentro para publicarlo.</p>
          </div>
          <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
        <MatchForm onSuccess={onCreated} />
      </div>
    </div>
  );
}

function EditMatchModal({ match, open, venues, onClose, onSaved }: { match: Pick<Match, "id" | "title" | "sport" | "venue" | "startsAt" | "capacity" | "registered">; open: boolean; venues: Venue[]; onClose: () => void; onSaved: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby={"edit-match-title-" + match.id}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-md bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id={"edit-match-title-" + match.id} className="text-xl font-bold text-slate-950">Editar partido</h2>
            <p className="mt-1 text-sm text-slate-600">{match.title}</p>
          </div>
          <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
        <MatchEditForm match={match} venues={venues} onChanged={onSaved} />
      </div>
    </div>
  );
}

export function MatchForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(createDomainItemAction, initialAction);
  const { venues } = useVenues();
  const [sports, setSports] = useState(() => uniqueValues([...defaultSports, ...venues.map((venue) => venue.sport)]));
  const [sport, setSport] = useState(sports[0] ?? "");
  const [sportModalOpen, setSportModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState(allowedTimes[0]);
  const timeOptions = useMemo(() => availableTimesForDate(selectedDate), [selectedDate]);

  useEffect(() => {
    setSports((current) => uniqueValues([...current, ...defaultSports, ...venues.map((venue) => venue.sport)]));
  }, [venues]);

  useEffect(() => {
    if (selectedTime && timeOptions.includes(selectedTime)) return;
    setSelectedTime(timeOptions[0] ?? "");
  }, [selectedTime, timeOptions]);

  useEffect(() => {
    if (state.ok) onSuccess?.();
  }, [onSuccess, state.ok]);

  return (
    <form action={formAction} className="grid gap-4">
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}
      <Field label="Titulo" name="title" required />
      <SportInput
        label="Deporte"
        options={sports}
        value={sport}
        onChange={setSport}
        onAddClick={() => setSportModalOpen(true)}
      />
      <Field list="venue-options" label="Cancha" name="venueName" placeholder="Ej: Cancha Norte UCN" required />
      <datalist id="venue-options">
        {venues.map((venue) => <option key={venue.id} value={venue.name} />)}
      </datalist>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Fecha" name="startsDate" type="date" min={todayValue()} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} required />
        <TimeSelect options={timeOptions} value={selectedTime} onChange={setSelectedTime} />
      </div>
      <Field label="Cupos" name="capacity" type="number" min={2} max={100} defaultValue={10} />
      <Button type="submit">Guardar partido</Button>
      <AddSportModal
        open={sportModalOpen}
        onClose={() => setSportModalOpen(false)}
        onAdd={(newSport) => {
          setSports((current) => uniqueValues([...current, newSport]));
          setSport(newSport);
          setSportModalOpen(false);
        }}
      />
    </form>
  );
}

function MatchEditForm({ match, venues, onChanged }: { match: Pick<Match, "id" | "title" | "sport" | "venue" | "startsAt" | "capacity" | "registered">; venues: Venue[]; onChanged?: () => void }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(updateMatchAction, initialAction);
  const [sports, setSports] = useState(() => uniqueValues([...defaultSports, match.sport, ...venues.map((venue) => venue.sport)]));
  const [sport, setSport] = useState(match.sport);
  const [sportModalOpen, setSportModalOpen] = useState(false);
  const startsAtParts = localInputDateTime(match.startsAt);
  const [selectedDate, setSelectedDate] = useState(startsAtParts.date);
  const [selectedTime, setSelectedTime] = useState(startsAtParts.time);
  const timeOptions = useMemo(() => availableTimesForDate(selectedDate, startsAtParts.time), [selectedDate, startsAtParts.time]);

  useEffect(() => {
    if (state.ok) onChanged?.();
  }, [onChanged, state.ok]);

  useEffect(() => {
    if (selectedTime && timeOptions.includes(selectedTime)) return;
    setSelectedTime(timeOptions[0] ?? "");
  }, [selectedTime, timeOptions]);

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="id" value={match.id} />
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}
      <Field label="Titulo" name="title" defaultValue={match.title} required />
      <SportInput
        label="Deporte"
        options={sports}
        value={sport}
        onChange={setSport}
        onAddClick={() => setSportModalOpen(true)}
      />
      <Field list={"venue-edit-options-" + match.id} label="Cancha" name="venueName" defaultValue={match.venue} required />
      <datalist id={"venue-edit-options-" + match.id}>
        {venues.map((venue) => <option key={venue.id} value={venue.name} />)}
      </datalist>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Fecha" name="startsDate" type="date" min={todayValue()} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} required />
        <TimeSelect options={timeOptions} value={selectedTime} onChange={setSelectedTime} />
      </div>
      <Field label="Cupos" name="capacity" type="number" min={Math.max(match.registered, 2)} max={100} defaultValue={match.capacity} />
      <p className="text-xs text-slate-600">Minimo actual: {Math.max(match.registered, 2)} cupos por los inscritos activos.</p>
      <Button type="submit">Actualizar partido</Button>
      <AddSportModal
        open={sportModalOpen}
        onClose={() => setSportModalOpen(false)}
        onAdd={(newSport) => {
          setSports((current) => uniqueValues([...current, newSport]));
          setSport(newSport);
          setSportModalOpen(false);
        }}
      />
    </form>
  );
}

function SportInput({ label, options, value, onChange, onAddClick }: { label: string; options: string[]; value: string; onChange: (value: string) => void; onAddClick: () => void }) {
  return (
    <div className="grid gap-1 text-sm font-medium text-slate-800">
      <span>{label}</span>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <select
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 shadow-sm focus:border-emerald-700"
          name="sport"
          onChange={(event) => onChange(event.target.value)}
          required
          value={value}
        >
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <Button type="button" variant="secondary" onClick={onAddClick}>Añadir deporte</Button>
      </div>
    </div>
  );
}

function TimeSelect({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <SelectField label="Hora" name="startsTime" required value={value} onChange={(event) => onChange(event.target.value)}>
      {options.length ? (
        options.map((time) => <option key={time} value={time}>{time}</option>)
      ) : (
        <option value="" disabled>Sin horarios disponibles hoy</option>
      )}
    </SelectField>
  );
}

function AddSportModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (sport: string) => void }) {
  const [value, setValue] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/50 px-4" role="dialog" aria-modal="true" aria-labelledby="add-sport-title">
      <div className="w-full max-w-sm rounded-md bg-white p-5 shadow-xl">
        <h2 id="add-sport-title" className="text-lg font-bold text-slate-950">Añadir deporte</h2>
        <div className="mt-4 grid gap-4">
          <Field label="Nombre del deporte" name="newSport" value={value} onChange={(event) => setValue(event.target.value)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button
              type="button"
              disabled={value.trim().length < 2}
              onClick={() => {
                onAdd(value.trim());
                setValue("");
              }}
            >
              Añadir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SportFilter({ options = defaultSports, value = "Todos", onChange }: { options?: string[]; value?: string; onChange?: (value: string) => void }) {
  return (
    <SelectField label="Filtrar por deporte" name="sport-filter" value={value} onChange={(event) => onChange?.(event.target.value)}>
      <option>Todos</option>
      {options.map((option) => <option key={option}>{option}</option>)}
    </SelectField>
  );
}

function DateRangeFilter({ value, onChange }: { value: DateFilter; onChange: (value: DateFilter) => void }) {
  return (
    <SelectField label="Filtrar por fecha" name="date-filter" value={value} onChange={(event) => onChange(event.target.value as DateFilter)}>
      <option value="day">Este dia</option>
      <option value="week">Esta semana</option>
      <option value="month">Este mes</option>
    </SelectField>
  );
}

export function JoinMatchButton({ matchId = "demo-1", disabled = false, onChanged }: { matchId?: string; disabled?: boolean; onChanged?: () => void }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return <span><Button disabled={pending || disabled} onClick={() => startTransition(async () => { const result = await joinMatchAction(matchId); setMessage(result.message); if (result.ok) onChanged?.(); })}>{pending ? "Inscribiendo..." : "Inscribirme"}</Button>{message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}</span>;
}

function CancelRegistrationButton({ matchId, onChanged }: { matchId: string; onChanged?: () => void }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return <span><Button variant="secondary" disabled={pending} onClick={() => startTransition(async () => { const result = await cancelRegistrationAction(matchId); setMessage(result.message); if (result.ok) onChanged?.(); })}>{pending ? "Cancelando..." : "Cancelar inscripcion"}</Button>{message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}</span>;
}

function CancelMatchButton({ matchId, onChanged }: { matchId: string; onChanged?: () => void }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return <span><Button variant="danger" disabled={pending} onClick={() => { if (window.confirm("Confirmas cancelar este partido?")) startTransition(async () => { const result = await deleteDomainItemAction(matchId); setMessage(result.message); if (result.ok) onChanged?.(); }); }}>{pending ? "Cancelando..." : "Cancelar partido"}</Button>{message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}</span>;
}

function AttendeesModalButton({ matchId, title }: { matchId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [attendees, setAttendees] = useState<MatchAttendee[]>([]);

  function openAttendees() {
    setOpen(true);
    setMessage("");
    setAttendees([]);
    startTransition(async () => {
      const result = await getMatchAttendeesAction(matchId);
      setMessage(result.message);
      setAttendees(result.attendees);
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" disabled={pending} onClick={openAttendees}>
        {pending ? "Cargando..." : "Ver inscritos"}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby={"attendees-title-" + matchId}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id={"attendees-title-" + matchId} className="text-xl font-bold text-slate-950">Inscritos</h2>
                <p className="mt-1 text-sm text-slate-600">{title}</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cerrar</Button>
            </div>
            {pending ? <p className="text-sm text-slate-600">Cargando inscritos...</p> : null}
            {message ? <p className="text-sm text-red-700">{message}</p> : null}
            {!message && !attendees.length && !pending ? <p className="text-sm text-slate-600">No hay inscritos activos.</p> : null}
            {attendees.length ? (
              <ul className="grid gap-2">
                {attendees.map((attendee) => (
                  <li key={attendee.userId} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <span className="font-medium text-slate-950">{attendee.fullName}</span>
                    <span className="block text-xs text-slate-500">{attendee.email}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
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
