"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEnvStatus } from "@/lib/env";
import { canRequestLoan } from "@/lib/domain/rules";
import { categorySchema, equipmentSchema, equipmentUpdateSchema, loanAdminSchema, loanRequestSchema } from "@/lib/validations/domain";

export type ActionResult = { ok: boolean; message: string };

const imageTypes = ["image/png", "image/jpeg", "image/webp"];

function formValue(formData: FormData, name: string) {
  const directValue = formData.get(name);
  if (directValue !== null) return directValue;

  for (const [key, value] of formData.entries()) {
    if (key.endsWith("_" + name)) return value;
  }

  return null;
}

function formObject(formData: FormData, fields: string[]) {
  return Object.fromEntries(fields.map((field) => [field, formValue(formData, field)]));
}

async function uploadEquipmentImage(formData: FormData) {
  const file = formValue(formData, "image");
  if (!(file instanceof File) || file.size === 0) return { path: null, error: null };
  if (!imageTypes.includes(file.type)) return { path: null, error: "Usa PNG, JPG o WEBP." };
  if (file.size > 2 * 1024 * 1024) return { path: null, error: "La imagen no puede superar 2 MB." };

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "webp";
  const path = `equipment/${crypto.randomUUID()}.${extension}`;
  const supabase = await createClient();
  const { error } = await supabase.storage.from("equipment-images").upload(path, file, {
    contentType: file.type,
    upsert: false
  });
  return { path: error ? null : path, error: error ? "No pudimos subir la imagen." : null };
}

export async function createDomainItemAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de guardar datos." };

  const parsed = loanRequestSchema.safeParse(formObject(formData, ["equipmentId", "quantity", "startsOn", "endsOn"]));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, message: "Debes iniciar sesion." };
  const { data: equipment } = await supabase.from("equipment").select("owner_id,available_quantity").eq("id", parsed.data.equipmentId).single();
  if (!equipment) return { ok: false, message: "No encontramos el equipo solicitado." };
  if (!canRequestLoan(equipment?.owner_id, userId)) {
    return { ok: false, message: "No puedes solicitar un equipo que publicaste tu mismo." };
  }
  if (parsed.data.quantity > equipment.available_quantity) {
    return { ok: false, message: `Solo hay ${equipment.available_quantity} unidad(es) disponibles.` };
  }
  const { error } = await supabase.from("loan_requests").insert({
    requester_id: userId,
    equipment_id: parsed.data.equipmentId,
    quantity: parsed.data.quantity,
    starts_on: parsed.data.startsOn,
    ends_on: parsed.data.endsOn,
    status: "pending"
  });
  if (error) return { ok: false, message: "No pudimos enviar la solicitud." };
  revalidatePath("/dashboard");
  return { ok: true, message: "Solicitud enviada correctamente." };
}

export async function deleteDomainItemAction(id: string): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de cancelar datos." };
  if (!id) return { ok: false, message: "No se recibio un identificador valido." };
  const supabase = await createClient();
  const { error } = await supabase.from("loan_requests").update({ status: "cancelled" }).eq("id", id).eq("status", "pending");
  if (error) return { ok: false, message: "No pudimos cancelar la solicitud." };
  revalidatePath("/dashboard");
  return { ok: true, message: "Solicitud cancelada." };
}

export async function approveLoanAction(requestId: string, comment: string): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase para aprobar solicitudes." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_loan_request_safe", { p_request_id: requestId, p_comment: comment });
  if (error) return { ok: false, message: "No pudimos aprobar la solicitud. Revisa disponibilidad y permisos." };
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard");
  return { ok: true, message: "Solicitud aprobada." };
}

export async function createCategoryAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de crear categorias." };

  const parsed = categorySchema.safeParse(formObject(formData, ["name"]));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa el nombre de la categoria." };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) return { ok: false, message: "Debes iniciar sesion para crear categorias." };

  const { error } = await supabase.from("categories").insert({ name: parsed.data.name });
  if (error) return { ok: false, message: "No pudimos crear la categoria. Revisa si ya existe." };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
  return { ok: true, message: "Categoria creada." };
}

export async function createEquipmentAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de crear equipos." };

  const parsed = equipmentSchema.safeParse(formObject(formData, ["name", "description", "categoryId", "totalQuantity", "availableQuantity"]));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del equipo." };

  const image = await uploadEquipmentImage(formData);
  if (image.error) return { ok: false, message: image.error };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, message: "Debes iniciar sesion para publicar equipos." };
  const { error } = await supabase.from("equipment").insert({
    owner_id: userId,
    category_id: parsed.data.categoryId,
    name: parsed.data.name,
    description: parsed.data.description ?? "",
    total_quantity: parsed.data.totalQuantity,
    available_quantity: parsed.data.availableQuantity,
    image_path: image.path
  });
  if (error) return { ok: false, message: "No pudimos crear el equipo." };
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard");
  return { ok: true, message: "Equipo creado." };
}

export async function updateEquipmentAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de editar equipos." };

  const parsed = equipmentUpdateSchema.safeParse(formObject(formData, ["id", "name", "description", "categoryId", "totalQuantity", "availableQuantity"]));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del equipo." };

  const image = await uploadEquipmentImage(formData);
  if (image.error) return { ok: false, message: image.error };

  const supabase = await createClient();
  const { error } = await supabase.from("equipment").update({
    category_id: parsed.data.categoryId,
    name: parsed.data.name,
    description: parsed.data.description ?? "",
    total_quantity: parsed.data.totalQuantity,
    available_quantity: parsed.data.availableQuantity,
    ...(image.path ? { image_path: image.path } : {})
  }).eq("id", parsed.data.id);
  if (error) return { ok: false, message: "No pudimos actualizar el equipo. Solo el propietario o administracion puede editarlo." };
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard");
  return { ok: true, message: "Equipo actualizado." };
}

export async function rejectLoanAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = loanAdminSchema.safeParse(formObject(formData, ["requestId", "comment"]));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa la solicitud." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_loan_request_safe", { p_request_id: parsed.data.requestId, p_comment: parsed.data.comment ?? "" });
  if (error) return { ok: false, message: "No pudimos rechazar la solicitud. Revisa permisos y estado." };
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard");
  return { ok: true, message: "Solicitud rechazada." };
}

export async function markAsDeliveredAction(requestId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const actorId = claimsData?.claims?.sub;
  const { error } = await supabase.from("loan_requests").update({ status: "delivered" }).eq("id", requestId).eq("status", "approved");
  if (error) return { ok: false, message: "No pudimos registrar la entrega. Esta accion requiere rol admin." };
  await supabase.from("loan_events").insert({ loan_request_id: requestId, actor_id: actorId ?? null, event_type: "delivered", comment: "Entrega registrada." });
  revalidatePath("/dashboard/admin");
  return { ok: true, message: "Entrega registrada." };
}

export async function markAsReturnedAction(requestId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("return_loan_request_safe", { p_request_id: requestId, p_comment: "Devolucion registrada." });
  if (error) return { ok: false, message: "No pudimos registrar la devolucion. Revisa permisos y estado de la solicitud." };
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard");
  return { ok: true, message: "Devolucion registrada." };
}

export async function cancelLoanRequestAction(requestId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("loan_requests").update({ status: "cancelled" }).eq("id", requestId).eq("status", "pending");
  if (error) return { ok: false, message: "No pudimos cancelar la solicitud." };
  revalidatePath("/dashboard");
  return { ok: true, message: "Solicitud cancelada." };
}
