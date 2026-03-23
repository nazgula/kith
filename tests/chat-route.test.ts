import { describe, it, expect, vi, beforeEach } from "vitest";
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
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 400 when messages are missing", async () => {
    const res = await POST(makeRequest({ model: "claude-haiku-4-5-20251001" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("messages and model are required");
  });

  it("returns 400 when model is missing", async () => {
    const res = await POST(makeRequest({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("messages and model are required");
  });

  it("returns 400 when messages array is empty", async () => {
    const res = await POST(makeRequest({ messages: [], model: "claude-haiku-4-5-20251001" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 for unknown model prefix", async () => {
    const res = await POST(makeRequest({
      messages: [{ role: "user", content: "hi" }],
      model: "gpt-4",
    }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("No provider found");
  });
});
