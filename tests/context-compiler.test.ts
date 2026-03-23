import { describe, it, expect } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { compile } from "@/lib/poc/context-compiler";

const apiKey = process.env.ANTHROPIC_API_KEY;

describe.skipIf(!apiKey)("context compiler", () => {
  const client = new Anthropic({ apiKey });

  it("decomposes a multi-issue bug report into separate chunks", async () => {
    const result = await compile(
      client,
      `Two bugs: 1. The search bar doesn't work on mobile. 2. The API returns 500 when filtering by date.`
    );

    expect(result.chunks.length).toBeGreaterThanOrEqual(2);
    for (const chunk of result.chunks) {
      expect(chunk.id).toBeTruthy();
      expect(chunk.title).toBeTruthy();
      expect(chunk.summary).toBeTruthy();
      expect(chunk.detail).toBeTruthy();
      expect(chunk.tags.length).toBeGreaterThan(0);
    }
  }, 30000);

  it("returns one chunk for a single-concern message", async () => {
    const result = await compile(
      client,
      `The submit button on the contact form is the wrong shade of blue. It should be #2563EB per the design system.`
    );

    expect(result.chunks.length).toBe(1);
    expect(result.chunks[0].tags).toContain("ui");
  }, 30000);

  it("tags vague messages with needs-clarification", async () => {
    const result = await compile(client, `stuff is broken, fix it please`);

    expect(result.chunks.length).toBeGreaterThanOrEqual(1);
    const allTags = result.chunks.flatMap((c) => c.tags);
    expect(allTags).toContain("needs-clarification");
  }, 30000);
});
