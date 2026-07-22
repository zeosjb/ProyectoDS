import { describe, expect, it } from "vitest";
import { canApproveLoan, nextLoanStatus } from "@/lib/domain/rules";

describe("reglas de prestamos", () => {
  it("no aprueba mas unidades que las disponibles", () => {
    expect(canApproveLoan(2, 3, "pending")).toBe(false);
    expect(canApproveLoan(4, 3, "pending")).toBe(true);
  });

  it("valida transiciones", () => {
    expect(nextLoanStatus("pending", "approve")).toBe(true);
    expect(nextLoanStatus("returned", "deliver")).toBe(false);
  });
});
