"use client";

import Image from "next/image";
import { useActionState, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  approveLoanAction,
  cancelLoanRequestAction,
  createDomainItemAction,
  createEquipmentAction,
  markAsDeliveredAction,
  markAsReturnedAction,
  rejectLoanAction,
  updateEquipmentAction,
  type ActionResult
} from "@/actions/domain.actions";
import { Button, EmptyState, Field, SelectField, TextareaField } from "@/components/ui";
import { canApproveLoan } from "@/lib/domain/rules";
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
  imagePath: string | null;
  imageUrl: string | null;
};

type LoanRequest = {
  id: string;
  equipmentId: string;
  equipmentName: string;
  requesterId: string;
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
    quantity: 1,
    status: "pending",
    startsOn: "2026-08-01",
    endsOn: "2026-08-03",
    adminComment: null
  }
];

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function useLoanData() {
  const env = getEnvStatus();
  const [categories, setCategories] = useState<Category[]>(demoCategories);
  const [equipment, setEquipment] = useState<Equipment[]>(demoEquipment);
  const [myRequests, setMyRequests] = useState<LoanRequest[]>(demoRequests);
  const [allRequests, setAllRequests] = useState<LoanRequest[]>(demoRequests);
  const [loading, setLoading] = useState(env.supabaseReady);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!env.supabaseReady) {
      setCategories(demoCategories);
      setEquipment(demoEquipment);
      setMyRequests(demoRequests);
      setAllRequests(demoRequests);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: categoryRows, error: categoryError } = await supabase.from("categories").select("id,name").order("name");
    const { data: equipmentRows, error: equipmentError } = await supabase
      .from("equipment")
      .select("id,category_id,name,description,total_quantity,available_quantity,image_path")
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
        imagePath,
        imageUrl
      };
    });
    const equipmentById = new Map(nextEquipment.map((item) => [item.id, item.name]));
    const nextRequests = (requestRows ?? []).map((row) => {
      const equipmentId = text(row.equipment_id);
      return {
        id: text(row.id),
        equipmentId,
        equipmentName: equipmentById.get(equipmentId) ?? "Equipo no encontrado",
        requesterId: text(row.requester_id),
        quantity: numberValue(row.quantity, 1),
        status: text(row.status, "pending"),
        startsOn: text(row.starts_on),
        endsOn: text(row.ends_on),
        adminComment: text(row.admin_comment) || null
      };
    });

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    setCategories(nextCategories.length > 0 ? nextCategories : demoCategories);
    setEquipment(nextEquipment);
    setAllRequests(nextRequests);
    setMyRequests(userId ? nextRequests.filter((request) => request.requesterId === userId) : nextRequests);
    setLoading(false);
  }, [env.supabaseReady]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { categories, equipment, myRequests, allRequests, loading, error, refresh, supabaseReady: env.supabaseReady };
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
  return (
    <div className="grid gap-8">
      <EquipmentCatalog data={data} />
      <MyLoanRequests data={data} />
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
  data
}: {
  title?: string;
  data?: ReturnType<typeof useLoanData>;
}) {
  const fallbackData = useLoanData();
  const localData = data ?? fallbackData;
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    return localData.equipment.filter((item) => {
      const matchesCategory = category === "Todos" || item.category === category;
      const matchesQuery = item.name.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [category, localData.equipment, query]);

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
        <EquipmentFilter categories={localData.categories} value={category} onChange={setCategory} />
        <Field label="Buscar equipo" name="equipmentSearch" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <h2 className="text-2xl font-bold">{title}</h2>
      {localData.error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{localData.error}</p> : null}
      {localData.loading ? <p className="text-sm text-slate-700">Cargando equipos...</p> : null}
      {!localData.loading && filtered.length === 0 ? <EmptyState title="Sin equipos" description="No hay equipos para los filtros seleccionados." /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((item) => (
          <EquipmentCard key={item.id} equipment={item} onChanged={() => void localData.refresh()} />
        ))}
      </div>
    </section>
  );
}

export function EquipmentCard({ equipment, onChanged }: { equipment?: Equipment; onChanged?: () => void }) {
  const item = equipment ?? demoEquipment[0];
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="relative aspect-video overflow-hidden rounded-md bg-amber-100">
        {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" /> : null}
      </div>
      <h3 className="mt-3 text-lg font-semibold">{item.name}</h3>
      <p className="text-sm text-slate-600">{item.category}</p>
      {item.description ? <p className="mt-2 text-sm text-slate-700">{item.description}</p> : null}
      <p className="mt-2 text-sm font-medium">Disponibles: {item.available} de {item.total}</p>
      <LoanRequestForm equipmentId={item.id} disabled={item.available === 0} onDone={onChanged} />
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
  disabled = false,
  onDone
}: {
  equipmentId?: string;
  disabled?: boolean;
  onDone?: () => void;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(async (previous, formData) => {
    const result = await createDomainItemAction(previous, formData);
    if (result.ok) onDone?.();
    return result;
  }, { ok: false, message: "" });

  return (
    <form action={formAction} className="mt-4 grid gap-3">
      <input type="hidden" name="equipmentId" value={equipmentId} />
      {state.message ? <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}
      <Field label="Cantidad" name="quantity" type="number" min={1} defaultValue={1} disabled={disabled} />
      <Field label="Desde" name="startsOn" type="date" disabled={disabled} />
      <Field label="Hasta" name="endsOn" type="date" disabled={disabled} />
      <Button type="submit" disabled={disabled}>{disabled ? "Sin disponibilidad" : "Solicitar"}</Button>
    </form>
  );
}

export function MyLoanRequests({ data }: { data?: ReturnType<typeof useLoanData> }) {
  const fallbackData = useLoanData();
  const localData = data ?? fallbackData;
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-xl font-bold">Mis solicitudes</h2>
      {localData.myRequests.length === 0 ? (
        <p className="mt-2 text-sm text-slate-700">Aun no tienes solicitudes registradas.</p>
      ) : (
        <div className="mt-3 grid gap-3">
          {localData.myRequests.map((request) => (
            <LoanRequestCard key={request.id} request={request} onChanged={() => void localData.refresh()} />
          ))}
        </div>
      )}
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
      <Field label="Imagen del equipo" name="image" type="file" accept="image/png,image/jpeg,image/webp" />
      <Button type="submit">{equipment ? "Guardar cambios" : "Crear equipo"}</Button>
    </form>
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
              {filtered.map((request) => (
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
