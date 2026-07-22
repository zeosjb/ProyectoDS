"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEnvStatus } from "@/lib/env";
import { equipmentSchema, equipmentUpdateSchema, loanAdminSchema, loanRequestSchema } from "@/lib/validations/domain";

export type ActionResult = { ok: boolean; message: string };

const imageTypes = ["image/png", "image/jpeg", "image/webp"];

async function uploadEquipmentImage(formData: FormData) {
  const file = formData.get("image");
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
  return { path: error ? null : path, error: error ? "No pudimos subir la imagen. Esta accion requiere rol admin." : null };
}

export async function createDomainItemAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de guardar datos." };

  const parsed = loanRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, message: "Debes iniciar sesion." };
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
  return { ok: true, message: "Solicitud aprobada." };
}

export async function createEquipmentAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de crear equipos." };

  const parsed = equipmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del equipo." };

  const image = await uploadEquipmentImage(formData);
  if (image.error) return { ok: false, message: image.error };

  const supabase = await createClient();
  const { error } = await supabase.from("equipment").insert({
    category_id: parsed.data.categoryId,
    name: parsed.data.name,
    description: parsed.data.description ?? "",
    total_quantity: parsed.data.totalQuantity,
    available_quantity: parsed.data.availableQuantity,
    image_path: image.path
  });
  if (error) return { ok: false, message: "No pudimos crear el equipo. Esta accion requiere rol admin." };
  revalidatePath("/dashboard/admin");
  return { ok: true, message: "Equipo creado." };
}

export async function updateEquipmentAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de editar equipos." };

  const parsed = equipmentUpdateSchema.safeParse(Object.fromEntries(formData));
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
  if (error) return { ok: false, message: "No pudimos actualizar el equipo. Esta accion requiere rol admin." };
  revalidatePath("/dashboard/admin");
  return { ok: true, message: "Equipo actualizado." };
}

export async function rejectLoanAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = loanAdminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa la solicitud." };

  const supabase = await createClient();
  const { error } = await supabase.from("loan_requests").update({ status: "rejected", admin_comment: parsed.data.comment ?? "" }).eq("id", parsed.data.requestId).eq("status", "pending");
  if (error) return { ok: false, message: "No pudimos rechazar la solicitud. Esta accion requiere rol admin." };
  revalidatePath("/dashboard/admin");
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
  if (error) return { ok: false, message: "No pudimos registrar la devolucion. Esta accion requiere rol admin y una solicitud entregada." };
  revalidatePath("/dashboard/admin");
  return { ok: true, message: "Devolucion registrada." };
}

export async function cancelLoanRequestAction(requestId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("loan_requests").update({ status: "cancelled" }).eq("id", requestId).eq("status", "pending");
  if (error) return { ok: false, message: "No pudimos cancelar la solicitud." };
  revalidatePath("/dashboard");
  return { ok: true, message: "Solicitud cancelada." };
}
