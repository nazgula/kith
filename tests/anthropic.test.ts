import { describe, it, expect } from "vitest";
import { createAnthropicProvider } from "@/lib/ai/anthropic";

describe("anthropic provider", () => {
  it("has correct name", () => {
    const provider = createAnthropicProvider("test-key");
    expect(provider.name).toBe("Anthropic");
  });

  it("exposes available models", () => {
    const provider = createAnthropicProvider("test-key");
    expect(provider.models.length).toBeGreaterThan(0);
    expect(provider.models.every((m) => m.provider === "anthropic")).toBe(true);
  });

  it("has a chat method", () => {
    const provider = createAnthropicProvider("test-key");
    expect(typeof provider.chat).toBe("function");
  });
});
