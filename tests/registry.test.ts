import { describe, it, expect, vi, beforeEach } from "vitest";

describe("registry", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("throws when ANTHROPIC_API_KEY is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { getProvider } = await import("@/lib/ai/registry");
    expect(() => getProvider("anthropic")).toThrow("ANTHROPIC_API_KEY is not set");
    vi.unstubAllEnvs();
  });

  it("throws for unknown provider", async () => {
    const { getProvider } = await import("@/lib/ai/registry");
    expect(() => getProvider("openai")).toThrow("Unknown provider: openai");
  });

  it("returns anthropic provider when key is set", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const { getProvider } = await import("@/lib/ai/registry");
    const provider = getProvider("anthropic");
    expect(provider.name).toBe("Anthropic");
    expect(provider.models.length).toBeGreaterThan(0);
    vi.unstubAllEnvs();
  });

  it("getProviderForModel routes claude models to anthropic", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const { getProviderForModel } = await import("@/lib/ai/registry");
    const provider = getProviderForModel("claude-sonnet-4-6");
    expect(provider.name).toBe("Anthropic");
    vi.unstubAllEnvs();
  });

  it("getProviderForModel throws for unknown model prefix", async () => {
    const { getProviderForModel } = await import("@/lib/ai/registry");
    expect(() => getProviderForModel("gpt-4")).toThrow("No provider found for model: gpt-4");
  });
});
