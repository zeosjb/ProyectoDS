export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export function canMoveTask(from: TaskStatus, to: TaskStatus) {
  if (from === "completed" && to === "pending") return false;
  return from !== to;
}

export function priorityLabel(priority: TaskPriority) {
  return priority === "high" ? "Alta" : priority === "medium" ? "Media" : "Baja";
}

export function statusLabel(status: TaskStatus) {
  return status === "pending" ? "Pendiente" : status === "in_progress" ? "En progreso" : "Completada";
}

export function todayDateInputValue() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
}
