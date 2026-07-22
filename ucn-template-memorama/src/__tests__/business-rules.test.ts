import { describe, expect, it } from "vitest";
import { calculateScore, validateGameResult } from "@/lib/domain/rules";

describe("reglas de memorama", () => {
  it("calcula puntaje sin valores negativos", () => {
    expect(calculateScore("easy", 6, 12)).toBeGreaterThan(0);
    expect(calculateScore("easy", 999, 999)).toBe(0);
  });

  it("rechaza resultados imposibles", () => {
    expect(validateGameResult("medium", 4, 5, 8)).toBe(false);
  });
});
