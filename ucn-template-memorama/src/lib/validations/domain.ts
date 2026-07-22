import { z } from "zod";

export const gameResultSchema = z.object({
  themeId: z.string().uuid("Selecciona un tema valido."),
  difficulty: z.enum(["easy", "medium", "hard"]),
  moves: z.coerce.number().int().positive("Los movimientos deben ser positivos."),
  durationSeconds: z.coerce.number().int().positive("El tiempo debe ser positivo."),
  pairsFound: z.coerce.number().int().positive("Debes encontrar pares.")
});
