import { describe, expect, it } from "vitest";
import { canMoveTask, priorityLabel } from "@/lib/domain/rules";

describe("reglas de kanban", () => {
  it("evita volver de completado a pendiente", () => {
    expect(canMoveTask("completed", "pending")).toBe(false);
  });

  it("traduce prioridades", () => {
    expect(priorityLabel("high")).toBe("Alta");
  });
});
