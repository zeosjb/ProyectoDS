export type EnvStatus = {
  ok: boolean;
  missing: string[];
  supabaseReady: boolean;
  builderReady: boolean;
  siteUrl: string;
};

const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  builderKey: process.env.NEXT_PUBLIC_BUILDER_API_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
};

function normalizeSupabaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return url.origin;
  } catch {
    return trimmed;
  }
}

export function getEnvStatus(): EnvStatus {
  const missing: string[] = [];
  if (!publicEnv.supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!publicEnv.supabaseKey) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (!publicEnv.builderKey) missing.push("NEXT_PUBLIC_BUILDER_API_KEY");

  return {
    ok: missing.length === 0,
    missing,
    supabaseReady: Boolean(publicEnv.supabaseUrl && publicEnv.supabaseKey),
    builderReady: Boolean(publicEnv.builderKey),
    siteUrl: publicEnv.siteUrl
  };
}

export function getSupabaseEnv() {
  return {
    url: normalizeSupabaseUrl(publicEnv.supabaseUrl) || "https://example.supabase.co",
    publishableKey: publicEnv.supabaseKey || "missing-publishable-key"
  };
}

export function getBuilderApiKey() {
  return publicEnv.builderKey;
}

export const appMeta = {
  name: "Tablero Prisma",
  description: "Plantilla Kanban academica con integrantes, responsables, prioridades y vista de tabla.",
  projectId: "kanban"
};
