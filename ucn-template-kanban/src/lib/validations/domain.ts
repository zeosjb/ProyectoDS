import { z } from "zod";
import { todayDateInputValue } from "@/lib/domain/rules";

const dueDateSchema = z.string().optional().refine((value) => {
  if (!value) return true;
  return value >= todayDateInputValue();
}, "La fecha de vencimiento no puede ser anterior a hoy.");

export const taskSchema = z.object({
  boardId: z.string().uuid("Selecciona un tablero valido."),
  title: z.string().min(3, "Ingresa un titulo."),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: dueDateSchema,
  assigneeId: z.string().uuid("Selecciona un responsable valido.").optional().or(z.literal(""))
});

export const taskUpdateSchema = taskSchema.extend({
  id: z.string().uuid("No se recibio una tarea valida.")
});

export const boardSchema = z.object({
  name: z.string().min(3, "Ingresa un titulo para el tablero."),
  description: z.string().optional()
});

export const taskQuickUpdateSchema = z.object({
  id: z.string().uuid("No se recibio una tarea valida."),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  assigneeId: z.string().uuid().nullable().optional()
});
