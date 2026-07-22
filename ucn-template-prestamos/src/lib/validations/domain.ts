import { z } from "zod";

export const loanRequestSchema = z.object({
  equipmentId: z.string().uuid("Selecciona un equipo valido."),
  quantity: z.coerce.number().int().min(1, "Solicita al menos una unidad."),
  startsOn: z.string().min(1, "Indica fecha de inicio."),
  endsOn: z.string().min(1, "Indica fecha de termino.")
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

export const loanAdminSchema = z.object({
  requestId: z.string().uuid("No se recibio una solicitud valida."),
  comment: z.string().optional()
});
