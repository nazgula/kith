import { describe, it, expect } from "vitest";
import { createAnthropicProvider } from "@/lib/ai/anthropic";

const apiKey = process.env.ANTHROPIC_API_KEY;

describe.skipIf(!apiKey)("anthropic live SDK call", () => {
  it("sends a prompt and gets a response from Haiku", async () => {
    const provider = createAnthropicProvider(apiKey!);

    const response = await provider.chat(
      [{ role: "user", content: "Reply with exactly: KITH_OK" }],
      "claude-haiku-4-5-20251001"
    );

    expect(response).toBeTruthy();
    expect(typeof response).toBe("string");
    expect(response).toContain("KITH_OK");
  }, 30000);

  it("maintains conversation context", async () => {
    const provider = createAnthropicProvider(apiKey!);

    const response = await provider.chat(
      [
        { role: "user", content: "My secret word is BLUEFISH. Remember it." },
        { role: "assistant", content: "Got it, your secret word is BLUEFISH." },
        { role: "user", content: "What is my secret word? Reply with just the word." },
      ],
      "claude-haiku-4-5-20251001"
    );

    expect(response).toContain("BLUEFISH");
  }, 30000);
});
