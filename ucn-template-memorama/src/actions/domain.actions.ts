"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEnvStatus } from "@/lib/env";
import { boardSchema, gameResultSchema } from "@/lib/validations/domain";

export type ActionResult = { ok: boolean; message: string };

function cardLabels(value: string) {
  const labels = value
    .split(/[\n,;]+/)
    .map((label) => label.trim())
    .filter(Boolean);

  return Array.from(new Map(labels.map((label) => [label.toLowerCase(), label])).values()).slice(0, 20);
}

function pairKey(label: string, index: number) {
  const slug = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `carta-${index + 1}`;
}

type SupabaseActionError = {
  code?: string;
  message?: string;
  details?: string;
};

function gameSessionErrorMessage(error: SupabaseActionError) {
  const message = (error.message ?? "").toLowerCase();
  const details = (error.details ?? "").toLowerCase();

  if (error.code === "PGRST202" || error.code === "PGRST205") {
    return "Faltan migraciones de memorama en Supabase. Ejecuta npm run supabase:push.";
  }

  if (message.includes("debes iniciar sesion")) {
    return "Debes iniciar sesion para guardar el resultado.";
  }

  if (message.includes("validacion minima")) {
    return "El resultado no coincide con la dificultad seleccionada. Reinicia la partida e intenta guardarlo otra vez.";
  }

  if (error.code === "23503" || message.includes("foreign key") || details.includes("theme_id")) {
    return "El tema seleccionado no existe en Supabase. Carga los datos iniciales con npx supabase db query --linked --file supabase/seed.sql.";
  }

  return "No pudimos guardar el resultado en Supabase. Revisa migraciones, sesion y datos iniciales.";
}

function boardErrorMessage(error: SupabaseActionError) {
  if (error.code === "PGRST202" || error.code === "PGRST205") {
    return "Faltan las tablas de memorama en Supabase. Ejecuta las migraciones antes de crear tableros.";
  }

  if (error.code === "42501") {
    return "Supabase rechazo la operacion por permisos. Revisa las politicas RLS de memorama.";
  }

  return "No pudimos crear el tablero. Revisa RLS y las migraciones.";
}

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
  if (error) return { ok: false, message: gameSessionErrorMessage(error) };
  revalidatePath("/dashboard");
  return { ok: true, message: "Resultado guardado correctamente." };
}

export async function createBoardAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de crear tableros." };

  const parsed = boardSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del tablero." };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, message: "Debes iniciar sesion para crear tableros." };

  const labels = cardLabels(parsed.data.cards);
  const { data: theme, error: themeError } = await supabase
    .from("game_themes")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      owner_id: userId,
      is_active: true
    })
    .select("id")
    .single();

  const themeId = typeof theme?.id === "string" ? theme.id : "";
  if (themeError || !themeId) return { ok: false, message: boardErrorMessage(themeError ?? {}) };

  const { error: cardsError } = await supabase.from("cards").insert(
    labels.map((label, index) => ({
      theme_id: themeId,
      pair_key: pairKey(label, index),
      label
    }))
  );

  if (cardsError) {
    await supabase.from("game_themes").delete().eq("id", themeId);
    return { ok: false, message: "El tablero se creo, pero no pudimos guardar sus cartas." };
  }

  revalidatePath("/dashboard");
  return { ok: true, message: "Tablero creado correctamente." };
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
