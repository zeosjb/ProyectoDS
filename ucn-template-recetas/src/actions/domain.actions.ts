"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEnvStatus } from "@/lib/env";
import { commentSchema, recipeSchema, recipeUpdateSchema } from "@/lib/validations/domain";

export type ActionResult = { ok: boolean; message: string };

type ParsedIngredient = {
  name: string;
  quantity: string;
};

const imageTypes = ["image/png", "image/jpeg", "image/webp"];

type DbErrorLike = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

function formString(formData: FormData, name: string) {
  const direct = formData.get(name);
  if (typeof direct === "string") return direct;

  for (const [key, value] of formData.entries()) {
    if (key.endsWith("_" + name) && typeof value === "string") return value;
  }

  return "";
}

function formFile(formData: FormData, name: string) {
  const direct = formData.get(name);
  if (direct instanceof File) return direct;

  for (const [key, value] of formData.entries()) {
    if (key.endsWith("_" + name) && value instanceof File) return value;
  }

  return null;
}

function pickFormStrings(formData: FormData, names: string[]) {
  return Object.fromEntries(names.map((name) => [name, formString(formData, name)]));
}

function dbFailure(fallback: string, error: DbErrorLike): ActionResult {
  if (process.env.NODE_ENV === "production") return { ok: false, message: fallback };

  const detail = [error.code, error.message, error.details, error.hint].filter(Boolean).join(" | ");
  return { ok: false, message: detail ? `${fallback} Detalle: ${detail}` : fallback };
}

function parseIngredients(value: string): ParsedIngredient[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", ...quantityParts] = line.split("-");
      return {
        name: name.trim(),
        quantity: quantityParts.join("-").trim() || "A gusto"
      };
    })
    .filter((ingredient) => ingredient.name.length >= 2);
}

async function uploadRecipeImage(formData: FormData, userId: string) {
  const file = formFile(formData, "image");
  if (!(file instanceof File) || file.size === 0) return { path: null, error: null };
  if (!imageTypes.includes(file.type)) return { path: null, error: "Usa PNG, JPG o WEBP." };
  if (file.size > 2 * 1024 * 1024) return { path: null, error: "La imagen no puede superar 2 MB." };

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "webp";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const supabase = await createClient();
  const { error } = await supabase.storage.from("recipe-images").upload(path, file, {
    contentType: file.type,
    upsert: false
  });
  return { path: error ? null : path, error: error ? "No pudimos subir la imagen." : null };
}

async function replaceRecipeIngredients(recipeId: string, ingredients: ParsedIngredient[]) {
  const supabase = await createClient();
  await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);

  for (const ingredient of ingredients) {
    const { data: existing } = await supabase.from("ingredients").select("id").eq("name", ingredient.name).maybeSingle();
    const ingredientId = existing?.id
      ? String(existing.id)
      : String((await supabase.from("ingredients").insert({ name: ingredient.name }).select("id").single()).data?.id ?? "");
    if (ingredientId) {
      await supabase.from("recipe_ingredients").insert({
        recipe_id: recipeId,
        ingredient_id: ingredientId,
        quantity: ingredient.quantity
      });
    }
  }
}

export async function createDomainItemAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de guardar datos." };

  const parsed = recipeSchema.safeParse(pickFormStrings(formData, ["title", "category", "instructions", "ingredients"]));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, message: "Debes iniciar sesion." };

  const ingredients = parseIngredients(parsed.data.ingredients);
  if (!ingredients.length) return { ok: false, message: "Agrega al menos un ingrediente valido." };

  const image = await uploadRecipeImage(formData, userId);
  if (image.error) return { ok: false, message: image.error };

  const { data, error } = await supabase.from("recipes").insert({
    owner_id: userId,
    title: parsed.data.title,
    category: parsed.data.category,
    instructions: parsed.data.instructions.split("\n").filter(Boolean),
    image_path: image.path
  }).select("id").single();
  if (error) return dbFailure("No pudimos guardar la receta.", error);
  if (data?.id) await replaceRecipeIngredients(String(data.id), ingredients);
  revalidatePath("/dashboard");
  return { ok: true, message: "Receta guardada correctamente." };
}

export async function updateRecipeAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de editar recetas." };

  const parsed = recipeUpdateSchema.safeParse(pickFormStrings(formData, ["id", "title", "category", "instructions", "ingredients"]));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, message: "Debes iniciar sesion." };

  const ingredients = parseIngredients(parsed.data.ingredients);
  if (!ingredients.length) return { ok: false, message: "Agrega al menos un ingrediente valido." };

  const image = await uploadRecipeImage(formData, userId);
  if (image.error) return { ok: false, message: image.error };

  const updatePayload = {
    title: parsed.data.title,
    category: parsed.data.category,
    instructions: parsed.data.instructions.split("\n").filter(Boolean),
    updated_at: new Date().toISOString(),
    ...(image.path ? { image_path: image.path } : {})
  };
  const { error } = await supabase.from("recipes").update(updatePayload).eq("id", parsed.data.id);
  if (error) return dbFailure("No pudimos actualizar la receta.", error);
  await replaceRecipeIngredients(parsed.data.id, ingredients);
  revalidatePath("/dashboard");
  return { ok: true, message: "Receta actualizada correctamente." };
}

export async function deleteDomainItemAction(id: string): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de eliminar datos." };
  if (!id) return { ok: false, message: "No se recibio un identificador valido." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("soft_delete_recipe_with_related_data", { target_recipe_id: id });
  if (error) return dbFailure("No pudimos eliminar el registro.", error);
  revalidatePath("/dashboard");
  return { ok: true, message: "Registro eliminado." };
}

export async function toggleFavoriteAction(recipeId: string): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de guardar favoritos." };
  if (!recipeId) return { ok: false, message: "No se recibio una receta valida." };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, message: "Debes iniciar sesion." };

  const { data: existing } = await supabase.from("favorites").select("recipe_id").eq("recipe_id", recipeId).eq("user_id", userId).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("favorites").delete().eq("recipe_id", recipeId).eq("user_id", userId);
    if (error) return { ok: false, message: "No pudimos quitar el favorito." };
    revalidatePath("/dashboard");
    return { ok: true, message: "Receta quitada de favoritos." };
  }

  const { error } = await supabase.from("favorites").insert({ recipe_id: recipeId, user_id: userId });
  if (error) return { ok: false, message: "No pudimos guardar el favorito." };
  revalidatePath("/dashboard");
  return { ok: true, message: "Receta guardada como favorita." };
}

export async function createCommentAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de comentar." };

  const parsed = commentSchema.safeParse(pickFormStrings(formData, ["recipeId", "parentCommentId", "body"]));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisa el comentario." };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, message: "Debes iniciar sesion." };

  const { data: profile } = await supabase.from("profiles").select("full_name,email").eq("id", userId).single();
  const authorName = String(profile?.full_name || profile?.email || "Usuario");
  const { error } = await supabase.from("recipe_comments").insert({
    recipe_id: parsed.data.recipeId,
    parent_comment_id: parsed.data.parentCommentId || null,
    user_id: userId,
    author_name: authorName,
    body: parsed.data.body
  });

  if (error) return dbFailure("No pudimos guardar el comentario.", error);
  revalidatePath("/dashboard");
  return { ok: true, message: parsed.data.parentCommentId ? "Respuesta publicada." : "Comentario publicado." };
}

export async function deleteCommentAction(commentId: string): Promise<ActionResult> {
  const env = getEnvStatus();
  if (!env.supabaseReady) return { ok: false, message: "Configura Supabase antes de eliminar comentarios." };
  if (!commentId) return { ok: false, message: "No se recibio un comentario valido." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_recipe_comment_thread", { target_comment_id: commentId });
  if (error) return dbFailure("No pudimos eliminar el comentario.", error);
  revalidatePath("/dashboard");
  return { ok: true, message: Number(data) > 1 ? "Comentario e hilo eliminados." : "Comentario eliminado." };
}
