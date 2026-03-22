import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AIModel, Message } from "@/types/ai";

const MODELS: AIModel[] = [
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "anthropic" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "anthropic" },
];

export function createAnthropicProvider(apiKey: string): AIProvider {
  const client = new Anthropic({ apiKey });

  return {
    name: "Anthropic",
    models: MODELS,

    async chat(
      messages: Pick<Message, "role" | "content">[],
      model: string
    ): Promise<string> {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const textBlock = response.content.find((block) => block.type === "text");
      return textBlock ? textBlock.text : "";
    },
  };
}
