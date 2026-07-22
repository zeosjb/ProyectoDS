"use client";

import Image from "next/image";
import { useActionState, useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import {
  approveLoanAction,
  cancelLoanRequestAction,
  createCategoryAction,
  createDomainItemAction,
  createEquipmentAction,
  markAsDeliveredAction,
  markAsReturnedAction,
  rejectLoanAction,
  updateEquipmentAction,
  type ActionResult
} from "@/actions/domain.actions";
import { Button, Field, SelectField, TextareaField } from "@/components/ui";
import { canApproveLoan, canRequestLoan } from "@/lib/domain/rules";
import { getEnvStatus } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
};

type Equipment = {
  id: string;
  categoryId: string;
  category: string;
  name: string;
  description: string;
  available: number;
  total: number;
  ownerId: string | null;
  imagePath: string | null;
  imageUrl: string | null;
};

type LoanRequest = {
  id: string;
  equipmentId: string;
  equipmentName: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  quantity: number;
  status: string;
  startsOn: string;
  endsOn: string;
  adminComment: string | null;
};

const demoCategories: Category[] = [
  { id: "cat-sensores", name: "Sensores" },
  { id: "cat-computadores", name: "Computadores" }
];

const demoEquipment: Equipment[] = [
  {
    id: "00000000-0000-0000-0000-000000000101",
    categoryId: "cat-sensores",
    category: "Sensores",
    name: "Sensor de temperatura",
    description: "Equipo de ejemplo para probar solicitudes.",
    available: 3,
    total: 5,
    ownerId: null,
    imagePath: null,
    imageUrl: null
  },
  {
    id: "00000000-0000-0000-0000-000000000102",
    categoryId: "cat-computadores",
    category: "Computadores",
    name: "Notebook laboratorio",
    description: "Disponible para actividades practicas.",
    available: 0,
    total: 4,
    ownerId: null,
    imagePath: null,
    imageUrl: null
  }
];

const demoRequests: LoanRequest[] = [
  {
    id: "00000000-0000-0000-0000-000000000201",
    equipmentId: demoEquipment[0].id,
    equipmentName: demoEquipment[0].name,
    requesterId: "demo",
    requesterName: "Usuario demo",
    requesterEmail: "demo@ucn.cl",
    quantity: 1,
    status: "pending",
    startsOn: "2026-08-01",
    endsOn: "2026-08-03",
    adminComment: null
  }
];

const REQUESTS_PAGE_SIZE = 10;

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function todayDateInputValue() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function usePagination<T>(items: T[], pageSize = REQUESTS_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return {
    currentPage,
    pageCount,
    pageItems: items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    setPage
  };
}

function PaginationControls({
  page,
  pageCount,
  onPageChange
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-end gap-2 text-sm">
      <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Anterior
      </Button>
      <span className="text-slate-700">Pagina {page} de {pageCount}</span>
      <Button type="button" variant="secondary" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
        Siguiente
      </Button>
    </div>
  );
}

function useLoanData() {
  const env = getEnvStatus();
  const [categories, setCategories] = useState<Category[]>(demoCategories);
  const [equipment, setEquipment] = useState<Equipment[]>(demoEquipment);
  const [myRequests, setMyRequests] = useState<LoanRequest[]>(demoRequests);
  const [allRequests, setAllRequests] = useState<LoanRequest[]>(demoRequests);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(env.supabaseReady);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!env.supabaseReady) {
      setCategories(demoCategories);
      setEquipment(demoEquipment);
      setMyRequests(demoRequests);
      setAllRequests(demoRequests);
      setCurrentUserId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;
    setCurrentUserId(userId);
    const { data: categoryRows, error: categoryError } = await supabase.from("categories").select("id,name").order("name");
    const { data: equipmentRows, error: equipmentError } = await supabase
      .from("equipment")
      .select("id,category_id,owner_id,name,description,total_quantity,available_quantity,image_path")
      .order("name");
    const { data: requestRows, error: requestError } = await supabase
      .from("loan_requests")
      .select("id,equipment_id,requester_id,quantity,status,starts_on,ends_on,admin_comment")
      .order("created_at", { ascending: false });

    if (categoryError || equipmentError || requestError) {
      setError("No pudimos cargar los datos. Revisa la sesion, RLS y la configuracion de Supabase.");
      setLoading(false);
      return;
    }

    const nextCategories = (categoryRows ?? []).map((row) => ({
      id: text(row.id),
      name: text(row.name, "Categoria")
    }));
    const categoryById = new Map(nextCategories.map((category) => [category.id, category.name]));
    const nextEquipment = (equipmentRows ?? []).map((row) => {
      const imagePath = text(row.image_path) || null;
      const imageUrl = imagePath ? supabase.storage.from("equipment-images").getPublicUrl(imagePath).data.publicUrl : null;
      const categoryId = text(row.category_id);
      return {
        id: text(row.id),
        categoryId,
        category: categoryById.get(categoryId) ?? "Sin categoria",
        name: text(row.name, "Equipo"),
        description: text(row.description),
        total: numberValue(row.total_quantity),
        available: numberValue(row.available_quantity),
        ownerId: text(row.owner_id) || null,
        imagePath,
        imageUrl
      };
    });
    const equipmentById = new Map(nextEquipment.map((item) => [item.id, item.name]));
    const requesterIds = Array.from(new Set((requestRows ?? []).map((row) => text(row.requester_id)).filter(Boolean)));
    const { data: profileRows } = requesterIds.length > 0
      ? await supabase.from("profiles").select("id,full_name,email").in("id", requesterIds)
      : { data: [] };
    const profileById = new Map((profileRows ?? []).map((profile) => [
      text(profile.id),
      {
        name: text(profile.full_name) || text(profile.email) || "Usuario",
        email: text(profile.email)
      }
    ]));
    const nextRequests = (requestRows ?? []).map((row) => {
      const equipmentId = text(row.equipment_id);
      const requesterId = text(row.requester_id);
      const requester = profileById.get(requesterId);
      return {
        id: text(row.id),
        equipmentId,
        equipmentName: equipmentById.get(equipmentId) ?? "Equipo no encontrado",
        requesterId,
        requesterName: requester?.name ?? "Usuario",
        requesterEmail: requester?.email ?? "",
        quantity: numberValue(row.quantity, 1),
        status: text(row.status, "pending"),
        startsOn: text(row.starts_on),
        endsOn: text(row.ends_on),
        adminComment: text(row.admin_comment) || null
      };
    });

    setCategories(nextCategories.length > 0 ? nextCategories : demoCategories);
    setEquipment(nextEquipment);
    setAllRequests(nextRequests);
    setMyRequests(userId ? nextRequests.filter((request) => request.requesterId === userId) : nextRequests);
    setLoading(false);
  }, [env.supabaseReady]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { categories, equipment, myRequests, allRequests, currentUserId, loading, error, refresh, supabaseReady: env.supabaseReady };
}

export function DomainLanding({ title, description }: { title: string; description: string }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-bold">{title}</h1>
      <p className="mt-3 max-w-2xl text-slate-700">{description}</p>
      <section className="mt-8">
        <EquipmentCatalog />
      </section>
    </main>
  );
}

export function DomainDashboard() {
  const data = useLoanData();
  const [creating, setCreating] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  return (
    <div className="grid gap-8">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Inventarios</h1>
          <p className="mt-2 text-slate-700">Publica equipos para prestar y solicita recursos publicados por otras personas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setCreatingCategory(true)}>Añadir categoria</Button>
          <Button type="button" onClick={() => setCreating(true)}>Crear equipo</Button>
        </div>
      </section>
      {creatingCategory ? (
        <EquipmentModal title="Añadir categoria" onClose={() => setCreatingCategory(false)}>
          <CategoryForm onDone={() => { setCreatingCategory(false); void data.refresh(); }} />
        </EquipmentModal>
      ) : null}
      {creating ? (
        <EquipmentModal title="Crear equipo" onClose={() => setCreating(false)}>
          <EquipmentAdminForm categories={data.categories} equipment={null} onDone={() => { setCreating(false); void data.refresh(); }} />
        </EquipmentModal>
      ) : null}
      {editing ? (
        <EquipmentModal title="Editar equipo" onClose={() => setEditing(null)}>
          <EquipmentAdminForm categories={data.categories} equipment={editing} onDone={() => { setEditing(null); void data.refresh(); }} />
        </EquipmentModal>
      ) : null}
      <EquipmentCatalog data={data} onEdit={setEditing} />
      <MyLoanRequests data={data} />
      <OwnedEquipmentRequests data={data} />
    </div>
  );
}

export function AdminPanel() {
  const data = useLoanData();
  const [editing, setEditing] = useState<Equipment | null>(null);

  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold">Administracion de recursos</h1>
      <EquipmentAdminForm categories={data.categories} equipment={editing} onDone={() => { setEditing(null); void data.refresh(); }} />
      <AdminEquipmentList equipment={data.equipment} onEdit={setEditing} />
      <AdminLoanTable data={data} />
    </div>
  );
}

export function EquipmentCatalog({
  title = "Catalogo de equipos",
  data,
  onEdit
}: {
  title?: string;
  data?: ReturnType<typeof useLoanData>;
  onEdit?: (equipment: Equipment) => void;
}) {
  const fallbackData = useLoanData();
  const localData = data ?? fallbackData;
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const filtered = useMemo(() => {
    return localData.equipment.filter((item) => {
      const matchesCategory = category === "Todos" || item.category === category;
      const matchesQuery = item.name.toLowerCase().includes(query.toLowerCase());
      const matchesOwner = !onlyMine || item.ownerId === localData.currentUserId;
      return matchesCategory && matchesQuery && matchesOwner;
    });
  }, [category, localData.currentUserId, localData.equipment, onlyMine, query]);

  if (!localData.loading && !localData.error && localData.equipment.length === 0) return null;

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
        <EquipmentFilter categories={localData.categories} value={category} onChange={setCategory} />
        <Field label="Buscar equipo" name="equipmentSearch" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      {localData.currentUserId ? (
        <label className="flex w-fit items-center gap-2 text-sm font-medium text-slate-800">
          <input className="h-4 w-4 rounded border-slate-300" type="checkbox" checked={onlyMine} onChange={(event) => setOnlyMine(event.target.checked)} />
          Mis equipos
        </label>
      ) : null}
      <h2 className="text-2xl font-bold">{title}</h2>
      {localData.error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{localData.error}</p> : null}
      {localData.loading ? <p className="text-sm text-slate-700">Cargando equipos...</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((item) => (
          <EquipmentCard key={item.id} equipment={item} currentUserId={localData.currentUserId} onChanged={() => void localData.refresh()} onEdit={onEdit} />
        ))}
      </div>
    </section>
  );
}

export function EquipmentCard({
  equipment,
  currentUserId,
  onChanged,
  onEdit
}: {
  equipment?: Equipment;
  currentUserId?: string | null;
  onChanged?: () => void;
  onEdit?: (equipment: Equipment) => void;
}) {
  const item = equipment ?? demoEquipment[0];
  const isOwnEquipment = Boolean(currentUserId && !canRequestLoan(item.ownerId, currentUserId));
  const requestDisabled = item.available === 0 || isOwnEquipment;
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="relative aspect-video overflow-hidden rounded-md bg-amber-100">
        {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" /> : null}
      </div>
      <h3 className="mt-3 text-lg font-semibold">{item.name}</h3>
      <p className="text-sm text-slate-600">{item.category}</p>
      {item.description ? <p className="mt-2 text-sm text-slate-700">{item.description}</p> : null}
      <p className="mt-2 text-sm font-medium">Disponibles: {item.available} de {item.total}</p>
      {isOwnEquipment ? <p className="mt-2 text-sm text-amber-800">Este equipo lo publicaste tu; no puedes solicitartelo.</p> : null}
      {isOwnEquipment && onEdit ? <Button className="mt-4" type="button" variant="secondary" onClick={() => onEdit(item)}>Editar equipo</Button> : null}
      <LoanRequestForm equipmentId={item.id} maxQuantity={item.available} disabled={requestDisabled} disabledLabel={isOwnEquipment ? "Equipo propio" : undefined} onDone={onChanged} />
    </article>
  );
}

export function EquipmentFilter({
  categories = demoCategories,
  value = "Todos",
  onChange
}: {
  categories?: Category[];
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <SelectField label="Filtrar categoria" name="category" value={value} onChange={(event) => onChange?.(event.target.value)}>
      <option>Todos</option>
      {categories.map((category) => (
        <option key={category.id}>{category.name}</option>
      ))}
    </SelectField>
  );
}

export function LoanRequestForm({
  equipmentId = "00000000-0000-0000-0000-000000000000",
  maxQuantity = 1,
  disabled = false,
  disabledLabel = "Sin disponibilidad",
  onDone
}: {
  equipmentId?: string;
  maxQuantity?: number;
  disabled?: boolean;
  disabledLabel?: string;
  onDone?: () => void;
}) {
  const today = useMemo(todayDateInputValue, []);
  const [startsOn, setStartsOn] = useState("");
  const endsOnMin = startsOn && startsOn > today ? startsOn : today;
  const [state, formAction] = useActionState<ActionResult, FormData>(async (previous, formData) => {
    const result = await createDomainItemAction(previous, formData);
    if (result.ok) onDone?.();
    return result;
  }, { ok: false, message: "" });

  return (
    <form action={formAction} className="mt-4 grid gap-3">
      <input type="hidden" name="equipmentId" value={equipmentId} />
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}
      <Field label="Cantidad" name="quantity" type="number" min={1} max={maxQuantity} defaultValue={Math.min(1, maxQuantity)} disabled={disabled} />
      <Field label="Desde" name="startsOn" type="date" min={today} value={startsOn} disabled={disabled} onChange={(event) => setStartsOn(event.target.value)} />
      <Field label="Hasta" name="endsOn" type="date" min={endsOnMin} disabled={disabled} />
      <Button type="submit" disabled={disabled}>{disabled ? disabledLabel : "Solicitar"}</Button>
    </form>
  );
}

export function MyLoanRequests({ data }: { data?: ReturnType<typeof useLoanData> }) {
  const fallbackData = useLoanData();
  const localData = data ?? fallbackData;
  const pagination = usePagination(localData.myRequests);
  if (localData.myRequests.length === 0) return null;

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-xl font-bold">Mis solicitudes</h2>
      <div className="mt-3 grid gap-3">
        {pagination.pageItems.map((request) => (
          <LoanRequestCard key={request.id} request={request} onChanged={() => void localData.refresh()} />
        ))}
      </div>
      <PaginationControls page={pagination.currentPage} pageCount={pagination.pageCount} onPageChange={pagination.setPage} />
    </section>
  );
}

function OwnedEquipmentRequests({ data }: { data: ReturnType<typeof useLoanData> }) {
  const ownedEquipmentIds = new Set(data.equipment.filter((item) => item.ownerId === data.currentUserId).map((item) => item.id));
  const receivedRequests = data.allRequests.filter((request) => ownedEquipmentIds.has(request.equipmentId) && request.requesterId !== data.currentUserId);
  const pagination = usePagination(receivedRequests);

  if (receivedRequests.length === 0) return null;

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-xl font-bold">Solicitudes recibidas</h2>
      <div className="mt-3 grid gap-3">
        {pagination.pageItems.map((request) => (
          <article key={request.id} className="rounded-md border border-slate-200 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{request.equipmentName}</h3>
                <p className="text-sm text-slate-700">
                  Solicitado por {request.requesterName}{request.requesterEmail ? ` (${request.requesterEmail})` : ""}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {request.quantity} unidad(es), {request.startsOn} a {request.endsOn}
                </p>
              </div>
              <LoanStatusBadge status={request.status} />
            </div>
            {request.status === "pending" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <ApproveLoanButton request={request} equipment={data.equipment.find((item) => item.id === request.equipmentId)} onChanged={() => void data.refresh()} />
                <RejectLoanButton requestId={request.id} disabled={false} onChanged={() => void data.refresh()} />
              </div>
            ) : null}
          </article>
        ))}
      </div>
      <PaginationControls page={pagination.currentPage} pageCount={pagination.pageCount} onPageChange={pagination.setPage} />
    </section>
  );
}

function LoanRequestCard({ request, onChanged }: { request: LoanRequest; onChanged: () => void }) {
  return (
    <article className="rounded-md border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">{request.equipmentName}</h3>
          <p className="text-sm text-slate-700">
            {request.quantity} unidad(es), {request.startsOn} a {request.endsOn}
          </p>
        </div>
        <LoanStatusBadge status={request.status} />
      </div>
      {request.adminComment ? <p className="mt-2 text-sm text-slate-700">Comentario: {request.adminComment}</p> : null}
      {request.status === "pending" ? <CancelLoanButton requestId={request.id} onChanged={onChanged} /> : null}
      {request.status === "approved" || request.status === "delivered" ? (
        <div className="mt-3">
          <MarkAsReturnedButton requestId={request.id} onChanged={onChanged} />
        </div>
      ) : null}
    </article>
  );
}

function CancelLoanButton({ requestId, onChanged }: { requestId: string; onChanged: () => void }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <div className="mt-3">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Confirmas cancelar esta solicitud?")) return;
          startTransition(async () => {
            const result = await cancelLoanRequestAction(requestId);
            setMessage(result.message);
            if (result.ok) onChanged();
          });
        }}
      >
        {pending ? "Cancelando..." : "Cancelar solicitud"}
      </Button>
      {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
    </div>
  );
}

function EquipmentModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={onClose}>
      <section
        aria-label={title}
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md bg-white p-5 shadow-xl"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-950">{title}</h2>
          <button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function CategoryForm({ onDone }: { onDone: () => void }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(async (previous, formData) => {
    const result = await createCategoryAction(previous, formData);
    if (result.ok) onDone();
    return result;
  }, { ok: false, message: "" });

  return (
    <form action={formAction} className="grid gap-3 rounded-md border border-slate-200 bg-white p-4">
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}
      <Field label="Nombre de la categoria" name="name" placeholder="Ej: Audio, herramientas, sensores" />
      <Button type="submit">Crear categoria</Button>
    </form>
  );
}

function EquipmentAdminForm({
  categories,
  equipment,
  onDone
}: {
  categories: Category[];
  equipment: Equipment | null;
  onDone: () => void;
}) {
  const action = equipment ? updateEquipmentAction : createEquipmentAction;
  const [state, formAction] = useActionState<ActionResult, FormData>(async (previous, formData) => {
    const result = await action(previous, formData);
    if (result.ok) onDone();
    return result;
  }, { ok: false, message: "" });

  return (
    <form action={formAction} className="grid gap-3 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-xl font-bold">{equipment ? "Editar equipo" : "Crear equipo"}</h2>
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}
      {equipment ? <input type="hidden" name="id" value={equipment.id} /> : null}
      <Field label="Nombre" name="name" defaultValue={equipment?.name ?? ""} />
      <TextareaField label="Descripcion" name="description" defaultValue={equipment?.description ?? ""} />
      <SelectField label="Categoria" name="categoryId" defaultValue={equipment?.categoryId ?? categories[0]?.id ?? ""}>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>{category.name}</option>
        ))}
      </SelectField>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Cantidad total" name="totalQuantity" type="number" min={0} defaultValue={equipment?.total ?? 1} />
        <Field label="Disponibles" name="availableQuantity" type="number" min={0} defaultValue={equipment?.available ?? 1} />
      </div>
      <ImageDropField />
      <Button type="submit">{equipment ? "Guardar cambios" : "Crear equipo"}</Button>
    </form>
  );
}

function ImageDropField() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedName, setSelectedName] = useState("");
  const [dragging, setDragging] = useState(false);

  function updateSelectedName(files: FileList | null) {
    setSelectedName(files?.[0]?.name ?? "");
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);

    const file = event.dataTransfer.files.item(0);
    if (!file) return;

    const transfer = new DataTransfer();
    transfer.items.add(file);
    if (inputRef.current) inputRef.current.files = transfer.files;
    setSelectedName(file.name);
  }

  return (
    <label
      className="grid gap-2 text-sm font-medium text-slate-800"
      htmlFor={inputId}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDrop={handleDrop}
    >
      <span>Imagen del equipo</span>
      <span
        className={
          "grid cursor-pointer place-items-center rounded-md border border-dashed px-4 py-8 text-center transition " +
          (dragging ? "border-emerald-700 bg-emerald-50 text-emerald-900" : "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100")
        }
      >
        <span className="font-semibold">Arrastra una imagen aqui o haz clic para seleccionar</span>
        <span className="mt-1 text-xs text-slate-600">PNG, JPG o WEBP hasta 2 MB</span>
        {selectedName ? <span className="mt-3 rounded-md bg-white px-3 py-1 text-xs font-semibold text-slate-800">{selectedName}</span> : null}
      </span>
      <input
        ref={inputRef}
        id={inputId}
        name="image"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => updateSelectedName(event.target.files)}
      />
    </label>
  );
}

function AdminEquipmentList({ equipment, onEdit }: { equipment: Equipment[]; onEdit: (equipment: Equipment) => void }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-xl font-bold">Equipos registrados</h2>
      <div className="mt-3 grid gap-2">
        {equipment.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
            <span>{item.name} ({item.available}/{item.total})</span>
            <Button type="button" variant="secondary" onClick={() => onEdit(item)}>Editar</Button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminLoanTable({ data }: { data?: ReturnType<typeof useLoanData> }) {
  const fallbackData = useLoanData();
  const localData = data ?? fallbackData;
  const [status, setStatus] = useState("Todos");
  const filtered = status === "Todos" ? localData.allRequests : localData.allRequests.filter((request) => request.status === status);
  const pagination = usePagination(filtered);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-bold">Solicitudes por estado</h2>
        <SelectField label="Estado" name="loanStatus" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option>Todos</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobada</option>
          <option value="rejected">Rechazada</option>
          <option value="delivered">Entregada</option>
          <option value="returned">Devuelta</option>
          <option value="cancelled">Cancelada</option>
        </SelectField>
      </div>
      {filtered.length === 0 ? (
        <p className="mt-3 text-sm text-slate-700">No hay solicitudes para este filtro.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="py-2">Equipo</th>
                <th>Cantidad</th>
                <th>Fechas</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.map((request) => (
                <tr key={request.id} className="border-t align-top">
                  <td className="py-2">{request.equipmentName}</td>
                  <td>{request.quantity}</td>
                  <td>{request.startsOn} a {request.endsOn}</td>
                  <td><LoanStatusBadge status={request.status} /></td>
                  <td className="min-w-72 py-2">
                    <div className="flex flex-wrap gap-2">
                      <ApproveLoanButton request={request} equipment={localData.equipment.find((item) => item.id === request.equipmentId)} onChanged={() => void localData.refresh()} />
                      <RejectLoanButton requestId={request.id} disabled={request.status !== "pending"} onChanged={() => void localData.refresh()} />
                      <MarkAsDeliveredButton requestId={request.id} disabled={request.status !== "approved"} onChanged={() => void localData.refresh()} />
                      <MarkAsReturnedButton requestId={request.id} disabled={request.status !== "delivered"} onChanged={() => void localData.refresh()} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls page={pagination.currentPage} pageCount={pagination.pageCount} onPageChange={pagination.setPage} />
        </div>
      )}
    </section>
  );
}

export function LoanStatusBadge({ status = "pending" }: { status?: string }) {
  const label =
    status === "approved" ? "Aprobada" :
    status === "rejected" ? "Rechazada" :
    status === "delivered" ? "Entregada" :
    status === "returned" ? "Devuelta" :
    status === "overdue" ? "Atrasada" :
    status === "cancelled" ? "Cancelada" :
    "Pendiente";
  const color =
    status === "approved" ? "bg-emerald-100 text-emerald-900" :
    status === "rejected" || status === "cancelled" ? "bg-red-100 text-red-900" :
    status === "returned" ? "bg-slate-100 text-slate-800" :
    "bg-amber-100 text-amber-900";
  return <span className={"inline-flex rounded-full px-2 py-1 text-xs font-semibold " + color}>{label}</span>;
}

export function ApproveLoanButton({
  request = demoRequests[0],
  equipment = demoEquipment[0],
  onChanged
}: {
  request?: LoanRequest;
  equipment?: Equipment;
  onChanged?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const allowed = canApproveLoan(equipment.available, request.quantity, request.status);
  return (
    <span>
      <Button
        type="button"
        disabled={pending || !allowed}
        onClick={() => startTransition(async () => {
          const result = await approveLoanAction(request.id, "Aprobado desde panel");
          setMessage(result.message);
          if (result.ok) onChanged?.();
        })}
      >
        {pending ? "Aprobando..." : "Aprobar"}
      </Button>
      {message ? <span className="ml-2 text-sm">{message}</span> : null}
    </span>
  );
}

export function RejectLoanButton({
  requestId = "00000000-0000-0000-0000-000000000000",
  disabled = false,
  onChanged
}: {
  requestId?: string;
  disabled?: boolean;
  onChanged?: () => void;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(async (previous, formData) => {
    if (!window.confirm("Confirmas rechazar esta solicitud?")) return previous;
    const result = await rejectLoanAction(previous, formData);
    if (result.ok) onChanged?.();
    return result;
  }, { ok: false, message: "" });
  return (
    <form action={formAction} className="grid gap-1">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="comment" value="Rechazada desde panel" />
      <Button type="submit" variant="danger" disabled={disabled}>Rechazar</Button>
      {state.message ? <span className="text-xs text-slate-700">{state.message}</span> : null}
    </form>
  );
}

export function MarkAsDeliveredButton({
  requestId = "00000000-0000-0000-0000-000000000000",
  disabled = false,
  onChanged
}: {
  requestId?: string;
  disabled?: boolean;
  onChanged?: () => void;
}) {
  return <LoanQuickButton label="Registrar entrega" requestId={requestId} disabled={disabled} action={markAsDeliveredAction} onChanged={onChanged} />;
}

export function MarkAsReturnedButton({
  requestId = "00000000-0000-0000-0000-000000000000",
  disabled = false,
  onChanged
}: {
  requestId?: string;
  disabled?: boolean;
  onChanged?: () => void;
}) {
  return <LoanQuickButton label="Registrar devolucion" requestId={requestId} disabled={disabled} action={markAsReturnedAction} onChanged={onChanged} />;
}

function LoanQuickButton({
  label,
  requestId,
  disabled,
  action,
  onChanged
}: {
  label: string;
  requestId: string;
  disabled: boolean;
  action: (requestId: string) => Promise<ActionResult>;
  onChanged?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <span>
      <Button
        type="button"
        variant="secondary"
        disabled={disabled || pending}
        onClick={() => startTransition(async () => {
          const result = await action(requestId);
          setMessage(result.message);
          if (result.ok) onChanged?.();
        })}
      >
        {pending ? "Guardando..." : label}
      </Button>
      {message ? <span className="ml-2 text-sm">{message}</span> : null}
    </span>
  );
}

export function LoanRequestDetail() {
  return <TextareaField label="Comentario administrativo" name="adminComment" />;
}
