export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export function canMoveTask(from: TaskStatus, to: TaskStatus) {
  if (from === "completed" && to === "pending") return false;
  return from !== to;
}

export function priorityLabel(priority: TaskPriority) {
  return priority === "high" ? "Alta" : priority === "medium" ? "Media" : "Baja";
}
