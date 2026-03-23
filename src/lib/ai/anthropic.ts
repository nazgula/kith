import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, Message } from "@/types/ai";
import { ALL_MODELS } from "./models";

export function createAnthropicProvider(apiKey: string): AIProvider {
  const client = new Anthropic({ apiKey });

  return {
    name: "Anthropic",
    models: ALL_MODELS.filter((m) => m.provider === "anthropic"),

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
