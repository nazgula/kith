import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

const DEFAULT_MODEL = "claude-sonnet-4-6";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export interface SendMessageOptions {
  systemPrompt: string;
  messages: MessageParam[];
  model?: string;
  maxTokens?: number;
}

export async function sendMessage(opts: SendMessageOptions): Promise<string> {
  const { systemPrompt, messages, model = DEFAULT_MODEL, maxTokens = 4096 } = opts;

  const response = await getClient().messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text : "";
}
