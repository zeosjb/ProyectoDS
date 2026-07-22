"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEnvStatus } from "@/lib/env";
import { gameResultSchema } from "@/lib/validations/domain";

export type ActionResult = { ok: boolean; message: string };

export async function createDomainItemAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de guardar datos." };

  const parsed = gameResultSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_game_session_safe", {
    p_theme_id: parsed.data.themeId,
    p_difficulty: parsed.data.difficulty,
    p_moves: parsed.data.moves,
    p_duration_seconds: parsed.data.durationSeconds,
    p_pairs_found: parsed.data.pairsFound
  });
  if (error) return { ok: false, message: "El resultado no supero la validacion del servidor." };
  revalidatePath("/dashboard");
  return { ok: true, message: "Resultado guardado correctamente." };
}

export async function deleteDomainItemAction(id: string): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de eliminar datos." };
  if (!id) return { ok: false, message: "No se recibio un identificador valido." };
  const supabase = await createClient();
  const { error } = await supabase.from("game_sessions").delete().eq("id", id);
  if (error) return { ok: false, message: "No pudimos eliminar el registro." };
  revalidatePath("/dashboard");
  return { ok: true, message: "Registro eliminado." };
}
