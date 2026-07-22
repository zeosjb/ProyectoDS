import { z } from "zod";

function todayIsoDate() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Indica una fecha valida.");

export const loanRequestSchema = z.object({
  equipmentId: z.string().uuid("Selecciona un equipo valido."),
  quantity: z.coerce.number().int().min(1, "Solicita al menos una unidad."),
  startsOn: dateField,
  endsOn: dateField
}).superRefine((data, context) => {
  const today = todayIsoDate();

  if (data.startsOn < today) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["startsOn"],
      message: "La fecha de solicitud no puede ser anterior a hoy."
    });
  }

  if (data.endsOn < today) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endsOn"],
      message: "La fecha de devolucion no puede ser anterior a hoy."
    });
  }

  if (data.endsOn < data.startsOn) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endsOn"],
      message: "La fecha de devolucion no puede ser anterior a la fecha de solicitud."
    });
  }
});

export const equipmentSchema = z.object({
  name: z.string().min(3, "Ingresa el nombre del equipo."),
  description: z.string().optional(),
  categoryId: z.string().uuid("Selecciona una categoria valida."),
  totalQuantity: z.coerce.number().int().min(0, "La cantidad total no puede ser negativa."),
  availableQuantity: z.coerce.number().int().min(0, "La disponibilidad no puede ser negativa.")
});

export const equipmentUpdateSchema = equipmentSchema.extend({
  id: z.string().uuid("No se recibio un equipo valido.")
});

export const categorySchema = z.object({
  name: z.string().trim().min(3, "Ingresa el nombre de la categoria.")
});

export const loanAdminSchema = z.object({
  requestId: z.string().uuid("No se recibio una solicitud valida."),
  comment: z.string().optional()
});
