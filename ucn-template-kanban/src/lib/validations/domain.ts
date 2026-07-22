import { z } from "zod";

export const taskSchema = z.object({
  boardId: z.string().uuid("Selecciona un tablero valido."),
  title: z.string().min(3, "Ingresa un titulo."),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().optional(),
  assigneeId: z.string().uuid("Selecciona un responsable valido.").optional().or(z.literal(""))
});

export const taskUpdateSchema = taskSchema.extend({
  id: z.string().uuid("No se recibio una tarea valida.")
});

export const boardSchema = z.object({
  name: z.string().min(3, "Ingresa un nombre para el tablero.")
});

export const taskQuickUpdateSchema = z.object({
  id: z.string().uuid("No se recibio una tarea valida."),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  assigneeId: z.string().uuid().nullable().optional()
});
