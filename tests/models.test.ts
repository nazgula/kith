import { describe, it, expect } from "vitest";
import { ALL_MODELS, DEFAULT_MODEL } from "@/lib/ai/models";

describe("models", () => {
  it("has at least one model", () => {
    expect(ALL_MODELS.length).toBeGreaterThan(0);
  });

  it("default model is in the list", () => {
    expect(ALL_MODELS).toContainEqual(DEFAULT_MODEL);
  });

  it("all models have required fields", () => {
    for (const model of ALL_MODELS) {
      expect(model.id).toBeTruthy();
      expect(model.name).toBeTruthy();
      expect(model.provider).toBeTruthy();
    }
  });

  it("all model ids are unique", () => {
    const ids = ALL_MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
