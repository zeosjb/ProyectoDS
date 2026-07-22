import { describe, expect, it } from "vitest";
import { canJoinMatch, getMatchAvailability } from "@/lib/domain/rules";

describe("reglas de partidos", () => {
  it("detecta estados de cupos", () => {
    expect(getMatchAvailability(10, 4)).toBe("Disponible");
    expect(getMatchAvailability(10, 8)).toBe("Ultimos cupos");
    expect(getMatchAvailability(10, 10)).toBe("Completo");
  });

  it("impide inscripcion duplicada", () => {
    expect(canJoinMatch(10, 3, true)).toBe(false);
  });
});
