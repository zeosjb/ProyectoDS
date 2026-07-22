import { z } from "zod";

export const gameResultSchema = z.object({
  themeId: z.string().uuid("Selecciona un tema valido."),
  difficulty: z.enum(["easy", "medium", "hard"]),
  moves: z.coerce.number().int().positive("Los movimientos deben ser positivos."),
  durationSeconds: z.coerce.number().int().positive("El tiempo debe ser positivo."),
  pairsFound: z.coerce.number().int().positive("Debes encontrar pares.")
});

export const boardSchema = z.object({
  name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres.").max(80, "El nombre es demasiado largo."),
  description: z.string().trim().max(240, "La descripcion es demasiado larga.").optional(),
  cards: z.string().trim().min(1, "Agrega las cartas del tablero.")
}).superRefine((value, context) => {
  const labels = value.cards
    .split(/[\n,;]+/)
    .map((label) => label.trim())
    .filter(Boolean);
  const unique = new Set(labels.map((label) => label.toLowerCase()));

  if (unique.size < 10) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cards"],
      message: "Agrega al menos 10 cartas distintas para poder jugar todas las dificultades."
    });
  }
});
