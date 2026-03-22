import type { AIProvider } from "@/types/ai";
import { createAnthropicProvider } from "./anthropic";

const providers = new Map<string, AIProvider>();

export function getProvider(name: string): AIProvider {
  const existing = providers.get(name);
  if (existing) return existing;

  switch (name) {
    case "anthropic": {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
      const provider = createAnthropicProvider(apiKey);
      providers.set(name, provider);
      return provider;
    }
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

export function getProviderForModel(modelId: string): AIProvider {
  // For now, derive provider from model ID prefix
  if (modelId.startsWith("claude")) return getProvider("anthropic");
  throw new Error(`No provider found for model: ${modelId}`);
}
