import type { AIModel } from "@/types/ai";

export const ALL_MODELS: AIModel[] = [
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "anthropic" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "anthropic" },
];

export const DEFAULT_MODEL = ALL_MODELS[0];
