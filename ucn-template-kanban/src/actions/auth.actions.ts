"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEnvStatus } from "@/lib/env";
import { loginSchema, recoverPasswordSchema, registerSchema } from "@/lib/validations/auth";

export type ActionState = {
  ok: boolean;
  message: string;
  details?: string;
};

const initialError = "Revisa los datos ingresados.";

type AuthErrorLike = {
  name?: string;
  message?: string;
  status?: number;
  code?: string;
};

function authErrorDetails(error: AuthErrorLike) {
  if (process.env.NODE_ENV === "production") return undefined;

  return [
    error.name ? `name=${error.name}` : null,
    typeof error.status === "number" ? `status=${error.status}` : null,
    error.code ? `code=${error.code}` : null,
    error.message ? `message=${error.message}` : null
  ]
    .filter(Boolean)
    .join(" | ");
}

function authFailure(error: AuthErrorLike): ActionState {
  return {
    ok: false,
    message: authErrorMessage(error),
    details: authErrorDetails(error)
  };
}

function authErrorMessage(error: AuthErrorLike) {
  const message = error.message?.toLowerCase() ?? "";

  if (error.code === "email_address_invalid" || error.message?.includes("Email address")) {
    return "Supabase rechazo ese correo. Usa un correo real o institucional; dominios de prueba como example.com suelen estar bloqueados.";
  }

  if (error.code === "signup_disabled" || message.includes("signups not allowed") || message.includes("signup is disabled")) {
    return "El registro de usuarios esta deshabilitado en Supabase. Activa Email provider y permite nuevos usuarios en Authentication.";
  }

  if (error.code === "email_provider_disabled" || message.includes("email provider is disabled")) {
    return "El proveedor de correo esta deshabilitado en Supabase. Activa Email en Authentication > Providers.";
  }

  if (error.code === "over_email_send_rate_limit" || message.includes("rate limit")) {
    return "Supabase bloqueo temporalmente el envio de correos por limite de frecuencia. Espera unos minutos o usa otro correo controlado por ti.";
  }

  if (error.code === "weak_password" || message.includes("weak password") || message.includes("password")) {
    return "La contrasena no cumple la politica configurada en Supabase. Usa al menos 8 caracteres con letras y numeros.";
  }

  if (message.includes("error sending confirmation email") || message.includes("smtp")) {
    return "Supabase no pudo enviar el correo de confirmacion. Revisa la configuracion SMTP o desactiva confirmacion de correo solo para pruebas locales.";
  }

  if (error.status === 404 || error.message?.includes("Invalid path specified")) {
    return "La URL de Supabase esta mal configurada. Debe ser solo https://tu-proyecto.supabase.co, sin /rest/v1 ni rutas extra.";
  }

  if (error.message?.includes("Database error saving new user")) {
    return "Supabase creo el usuario, pero fallo el trigger de perfiles. Ejecuta las migraciones y revisa la tabla profiles.";
  }

  if (error.message?.includes("User already registered")) {
    return "Ese correo ya esta registrado. Intenta iniciar sesion o recuperar la contrasena.";
  }

  if (error.status === 401 || message.includes("invalid api key") || message.includes("jwt")) {
    return "La Publishable Key de Supabase no corresponde a este proyecto. Copia nuevamente la anon/public key desde Project Settings > API.";
  }

  return "No pudimos completar la operacion en Supabase. Revisa la configuracion del proyecto e intenta nuevamente.";
}

export async function loginAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de iniciar sesion." };

  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? initialError };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return authFailure(error);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function registerAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de registrar usuarios." };

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? initialError };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: env.siteUrl + "/auth/confirm"
    }
  });
  if (error) return authFailure(error);

  return { ok: true, message: "Revisa tu correo para confirmar la cuenta." };
}

export async function recoverPasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de recuperar contrasenas." };

  const parsed = recoverPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? initialError };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: env.siteUrl + "/login"
  });
  if (error) return authFailure(error);

  return { ok: true, message: "Te enviamos instrucciones al correo indicado." };
}

export async function signOutAction() {
  const env = getEnvStatus();
  if (env.supabaseReady) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims) await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
