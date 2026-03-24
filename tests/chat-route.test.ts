import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/chat/route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  it("returns 400 when messages are missing", async () => {
    const res = await POST(makeRequest({ agentPromptFile: "spec-writer.md" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("agentPromptFile and messages are required");
  });

  it("returns 400 when agentPromptFile is missing", async () => {
    const res = await POST(makeRequest({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("agentPromptFile and messages are required");
  });

  it("returns 400 when messages array is empty", async () => {
    const res = await POST(makeRequest({ agentPromptFile: "spec-writer.md", messages: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 500 for nonexistent agent prompt file", async () => {
    const res = await POST(makeRequest({
      agentPromptFile: "nonexistent.md",
      messages: [{ role: "user", content: "hi" }],
    }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Unknown agent prompt file");
  });
});
