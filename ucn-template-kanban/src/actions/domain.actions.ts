"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEnvStatus } from "@/lib/env";
import { boardSchema, taskQuickUpdateSchema, taskSchema, taskUpdateSchema } from "@/lib/validations/domain";

export type ActionResult = { ok: boolean; message: string; id?: string };

function formDataObject(formData: FormData) {
  const values: Record<string, FormDataEntryValue> = {};

  for (const [key, value] of formData.entries()) {
    values[key.replace(/^_\d+_/, "")] = value;
  }

  return values;
}

export async function createDomainItemAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de guardar datos." };

  const parsed = taskSchema.safeParse(formDataObject(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, message: "Debes iniciar sesion." };
  const { error } = await supabase.from("tasks").insert({
    creator_id: userId,
    board_id: parsed.data.boardId,
    title: parsed.data.title,
    description: parsed.data.description ?? "",
    status: parsed.data.status,
    priority: parsed.data.priority,
    assignee_id: parsed.data.assigneeId || null,
    due_date: parsed.data.dueDate || null
  });
  if (error) return { ok: false, message: "No pudimos crear la tarea." };
  revalidatePath("/dashboard");
  return { ok: true, message: "Tarea creada correctamente." };
}

export async function createBoardAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de crear tableros." };

  const parsed = boardSchema.safeParse(formDataObject(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa el nombre del tablero." };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, message: "Debes iniciar sesion." };

  const { data, error } = await supabase.rpc("create_board_with_owner", {
    board_name: parsed.data.name,
    board_description: parsed.data.description ?? ""
  });

  if (error || !data) {
    return {
      ok: false,
      message: "No pudimos crear el tablero. Revisa las politicas RLS y que las migraciones esten aplicadas."
    };
  }

  revalidatePath("/dashboard");
  return { ok: true, message: "Tablero creado.", id: String(data) };
}

export async function updateTaskAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de editar tareas." };

  const parsed = taskUpdateSchema.safeParse(formDataObject(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos de la tarea." };

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({
    title: parsed.data.title,
    description: parsed.data.description ?? "",
    status: parsed.data.status,
    priority: parsed.data.priority,
    assignee_id: parsed.data.assigneeId || null,
    due_date: parsed.data.dueDate || null,
    updated_at: new Date().toISOString()
  }).eq("id", parsed.data.id);

  if (error) return { ok: false, message: "No pudimos actualizar la tarea." };
  revalidatePath("/dashboard");
  return { ok: true, message: "Tarea actualizada." };
}

export async function quickUpdateTaskAction(input: { id: string; status?: "pending" | "in_progress" | "completed"; priority?: "low" | "medium" | "high"; assigneeId?: string | null }): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de mover tareas." };

  const parsed = taskQuickUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "No se recibio una actualizacion valida." };

  const payload = {
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
    ...(parsed.data.priority ? { priority: parsed.data.priority } : {}),
    ...(parsed.data.assigneeId !== undefined ? { assignee_id: parsed.data.assigneeId } : {}),
    updated_at: new Date().toISOString()
  };

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update(payload).eq("id", parsed.data.id);
  if (error) return { ok: false, message: "No pudimos actualizar la tarea." };
  revalidatePath("/dashboard");
  return { ok: true, message: "Tarea actualizada." };
}

export async function deleteDomainItemAction(id: string): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de eliminar datos." };
  if (!id) return { ok: false, message: "No se recibio un identificador valido." };
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, message: "No pudimos eliminar el registro." };
  revalidatePath("/dashboard");
  return { ok: true, message: "Registro eliminado." };
}
