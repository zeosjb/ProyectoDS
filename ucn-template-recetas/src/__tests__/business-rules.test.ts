import { describe, expect, it } from "vitest";
import { canEditRecipe, validateImageFileMeta } from "@/lib/domain/rules";

describe("reglas de recetas", () => {
  it("valida propietario", () => {
    expect(canEditRecipe("u1", "u1")).toBe(true);
    expect(canEditRecipe("u1", "u2")).toBe(false);
  });

  it("valida imagenes permitidas", () => {
    expect(validateImageFileMeta("image/webp", 1024)).toBe(true);
    expect(validateImageFileMeta("application/pdf", 1024)).toBe(false);
  });
});
