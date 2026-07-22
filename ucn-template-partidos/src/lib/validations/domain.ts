import { z } from "zod";

function buildDateTime(startsDate: string, startsTime: string) {
  return `${startsDate}T${startsTime}`;
}

function isFutureDateTime(value: string) {
  const selectedTime = new Date(value).getTime();
  return Number.isFinite(selectedTime) && selectedTime >= Date.now();
}

function isAllowedTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) && value >= "08:00" && value <= "23:00";
}

const matchFieldsSchema = z.object({
  title: z.string().min(3, "Ingresa un titulo."),
  sport: z.string().trim().min(2, "Ingresa un deporte."),
  venueName: z.string().trim().min(3, "Ingresa el nombre de la cancha."),
  startsDate: z.string().min(1, "Indica la fecha del partido."),
  startsTime: z.string().min(1, "Indica la hora del partido.").refine(isAllowedTime, "El horario debe estar entre 08:00 y 23:00."),
  capacity: z.coerce.number().int().min(2, "El cupo minimo es 2.").max(100, "El cupo maximo es 100.")
});

export const matchSchema = matchFieldsSchema
  .refine((data) => isFutureDateTime(buildDateTime(data.startsDate, data.startsTime)), {
    message: "La fecha y hora no puede ser anterior a la actual.",
    path: ["startsDate"]
  })
  .transform((data) => ({
    ...data,
    startsAt: buildDateTime(data.startsDate, data.startsTime)
  }));

export const matchUpdateSchema = matchFieldsSchema.extend({
  id: z.string().uuid("No se recibio un partido valido.")
})
  .refine((data) => isFutureDateTime(buildDateTime(data.startsDate, data.startsTime)), {
    message: "La fecha y hora no puede ser anterior a la actual.",
    path: ["startsDate"]
  })
  .transform((data) => ({
    ...data,
    startsAt: buildDateTime(data.startsDate, data.startsTime)
  }));

export const venueSchema = z.object({
  name: z.string().min(3, "Ingresa el nombre de la cancha."),
  address: z.string().min(3, "Ingresa la ubicacion."),
  sport: z.string().min(2, "Selecciona un deporte."),
  isActive: z.coerce.boolean().optional()
});

export const venueUpdateSchema = venueSchema.extend({
  id: z.string().uuid("No se recibio una cancha valida.")
});
