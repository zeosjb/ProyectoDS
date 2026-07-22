"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEnvStatus } from "@/lib/env";
import { matchSchema, matchUpdateSchema, venueSchema, venueUpdateSchema } from "@/lib/validations/domain";

export type ActionResult = { ok: boolean; message: string };
export type MatchAttendee = {
  userId: string;
  fullName: string;
  email: string;
};

type DomainErrorLike = {
  message?: string;
  code?: string;
};

function domainErrorMessage(error: DomainErrorLike, fallback: string) {
  const message = error.message?.toLowerCase() ?? "";

  if (error.code === "PGRST202" || message.includes("could not find the function")) {
    return "Falta aplicar las migraciones de Supabase para crear partidos con canchas nuevas.";
  }

  if (message.includes("fecha") || message.includes("hora")) {
    return error.message ?? fallback;
  }

  if (message.includes("cupo")) {
    return error.message ?? fallback;
  }

  return fallback;
}

export async function createDomainItemAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de guardar datos." };

  const parsed = matchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, message: "Debes iniciar sesion." };

  const { error } = await supabase.rpc("create_match_with_venue", {
    p_title: parsed.data.title,
    p_sport: parsed.data.sport,
    p_venue_name: parsed.data.venueName,
    p_starts_at: parsed.data.startsAt,
    p_capacity: parsed.data.capacity
  });
  if (error) return { ok: false, message: domainErrorMessage(error, "No pudimos crear el partido.") };
  revalidatePath("/dashboard");
  return { ok: true, message: "Partido creado correctamente." };
}

export async function deleteDomainItemAction(id: string): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de eliminar datos." };
  if (!id) return { ok: false, message: "No se recibio un identificador valido." };
  const supabase = await createClient();
  const { error } = await supabase.from("matches").update({ status: "cancelled" }).eq("id", id);
  if (error) return { ok: false, message: "No pudimos cancelar el partido." };
  revalidatePath("/dashboard");
  return { ok: true, message: "Partido cancelado." };
}

export async function joinMatchAction(matchId: string): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase para inscribirte." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_match_safe", { p_match_id: matchId });
  if (error) return { ok: false, message: "No pudimos inscribirte. Puede que no queden cupos." };
  revalidatePath("/dashboard");
  return { ok: true, message: "Inscripcion confirmada." };
}

export async function updateMatchAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de editar partidos." };

  const parsed = matchUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_match_with_venue", {
    p_match_id: parsed.data.id,
    p_title: parsed.data.title,
    p_sport: parsed.data.sport,
    p_venue_name: parsed.data.venueName,
    p_starts_at: parsed.data.startsAt,
    p_capacity: parsed.data.capacity
  });

  if (error) return { ok: false, message: domainErrorMessage(error, "No pudimos actualizar el partido. Revisa permisos y cupos.") };
  revalidatePath("/dashboard");
  return { ok: true, message: "Partido actualizado." };
}

export async function cancelRegistrationAction(matchId: string): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de cancelar inscripciones." };
  if (!matchId) return { ok: false, message: "No se recibio un partido valido." };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, message: "Debes iniciar sesion." };

  const { error } = await supabase.from("registrations").update({ status: "cancelled" }).eq("match_id", matchId).eq("user_id", userId);
  if (error) return { ok: false, message: "No pudimos cancelar tu inscripcion." };
  revalidatePath("/dashboard");
  return { ok: true, message: "Inscripcion cancelada." };
}

export async function getMatchAttendeesAction(matchId: string): Promise<ActionResult & { attendees: MatchAttendee[] }> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de ver inscritos.", attendees: [] };
  if (!matchId) return { ok: false, message: "No se recibio un partido valido.", attendees: [] };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_match_attendees", { p_match_id: matchId });
  if (error) {
    return {
      ok: false,
      message: domainErrorMessage(error, "No pudimos cargar los inscritos del partido."),
      attendees: []
    };
  }

  return {
    ok: true,
    message: "",
    attendees: (data ?? []).map((attendee) => ({
      userId: String(attendee.user_id),
      fullName: String(attendee.full_name),
      email: String(attendee.email)
    }))
  };
}

export async function createVenueAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de crear canchas." };

  const parsed = venueSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos de la cancha." };

  const supabase = await createClient();
  const { error } = await supabase.from("venues").insert({
    name: parsed.data.name,
    address: parsed.data.address,
    sport: parsed.data.sport,
    is_active: parsed.data.isActive ?? true
  });
  if (error) return { ok: false, message: "No pudimos crear la cancha. Esta accion requiere rol admin." };
  revalidatePath("/dashboard/admin");
  return { ok: true, message: "Cancha creada." };
}

export async function updateVenueAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de editar canchas." };

  const parsed = venueUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos de la cancha." };

  const supabase = await createClient();
  const { error } = await supabase.from("venues").update({
    name: parsed.data.name,
    address: parsed.data.address,
    sport: parsed.data.sport,
    is_active: parsed.data.isActive ?? true
  }).eq("id", parsed.data.id);
  if (error) return { ok: false, message: "No pudimos actualizar la cancha. Esta accion requiere rol admin." };
  revalidatePath("/dashboard/admin");
  return { ok: true, message: "Cancha actualizada." };
}

export async function deleteVenueAction(id: string): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de desactivar canchas." };
  if (!id) return { ok: false, message: "No se recibio una cancha valida." };

  const supabase = await createClient();
  const { error } = await supabase.from("venues").update({ is_active: false }).eq("id", id);
  if (error) return { ok: false, message: "No pudimos desactivar la cancha. Esta accion requiere rol admin." };
  revalidatePath("/dashboard/admin");
  return { ok: true, message: "Cancha desactivada." };
}
