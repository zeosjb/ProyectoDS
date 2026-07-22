import { z } from "zod";

export const recipeSchema = z.object({
  title: z.string().min(3, "Ingresa un nombre para la receta."),
  category: z.string().min(2, "Selecciona una categoria."),
  instructions: z.string().min(10, "Agrega instrucciones claras."),
  ingredients: z.string().min(2, "Agrega al menos un ingrediente.")
});

export const recipeUpdateSchema = recipeSchema.extend({
  id: z.string().uuid("No se recibio una receta valida.")
});

export const commentSchema = z.object({
  recipeId: z.string().uuid("No se recibio una receta valida."),
  parentCommentId: z.string().uuid("No se recibio un comentario valido.").optional().or(z.literal("")),
  body: z.string().trim().min(2, "Escribe un comentario.").max(800, "El comentario no puede superar 800 caracteres.")
});
