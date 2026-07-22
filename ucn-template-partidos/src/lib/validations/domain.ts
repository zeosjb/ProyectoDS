import { z } from "zod";

export const matchSchema = z.object({
  title: z.string().min(3, "Ingresa un titulo."),
  sport: z.string().min(2, "Selecciona un deporte."),
  venueId: z.string().uuid("Selecciona una cancha valida."),
  startsAt: z.string().min(1, "Indica la fecha y hora."),
  capacity: z.coerce.number().int().min(2, "El cupo minimo es 2.").max(100, "El cupo maximo es 100.")
});

export const matchUpdateSchema = matchSchema.extend({
  id: z.string().uuid("No se recibio un partido valido.")
});

export const venueSchema = z.object({
  name: z.string().min(3, "Ingresa el nombre de la cancha."),
  address: z.string().min(3, "Ingresa la ubicacion."),
  sport: z.string().min(2, "Selecciona un deporte."),
  isActive: z.coerce.boolean().optional()
});

export const venueUpdateSchema = venueSchema.extend({
  id: z.string().uuid("No se recibio una cancha valida.")
});
