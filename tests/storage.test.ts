import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import type { ChatMessage, JudgeResult } from "@/types/chat";

// We need to test storage functions but they use process.cwd() for data dir.
// Import and test directly — the data dir will be created in the test cwd.
import {
  loadConversation,
  saveConversation,
  loadJudgeHistory,
  appendJudgeHistory,
  saveApprovedSpec,
  saveOverrideSpec,
  clearSession,
} from "@/lib/storage";

const DATA_DIR = path.resolve(process.cwd(), "data");

function cleanup() {
  if (fs.existsSync(DATA_DIR)) {
    fs.rmSync(DATA_DIR, { recursive: true });
  }
}

describe("storage", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  it("returns empty array when no conversation exists", () => {
    expect(loadConversation()).toEqual([]);
  });

  it("saves and loads conversation", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        agent: "user",
        content: "hello",
        timestamp: 1000,
      },
      {
        id: "2",
        role: "assistant",
        agent: "spec-writer",
        content: "hi there",
        timestamp: 2000,
      },
    ];
    saveConversation(messages);
    expect(loadConversation()).toEqual(messages);
  });

  it("returns empty array for corrupted conversation file", () => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, "conversation.json"), "not json");
    expect(loadConversation()).toEqual([]);
  });

  it("returns empty array when no judge history exists", () => {
    expect(loadJudgeHistory()).toEqual([]);
  });

  it("appends judge history entries", () => {
    const entry1: JudgeResult = {
      verdict: "REJECTED",
      feedback: "needs work",
      specMarkdown: "# Spec",
      timestamp: "2026-01-01T00:00:00Z",
    };
    const entry2: JudgeResult = {
      verdict: "APPROVED",
      feedback: "great",
      specMarkdown: "# Spec v2",
      timestamp: "2026-01-02T00:00:00Z",
    };
    appendJudgeHistory(entry1);
    appendJudgeHistory(entry2);
    const history = loadJudgeHistory();
    expect(history).toHaveLength(2);
    expect(history[0].verdict).toBe("REJECTED");
    expect(history[1].verdict).toBe("APPROVED");
  });

  it("saves approved spec as markdown file", () => {
    saveApprovedSpec("# My Approved Spec");
    const content = fs.readFileSync(
      path.join(DATA_DIR, "spec-approved.md"),
      "utf-8"
    );
    expect(content).toBe("# My Approved Spec");
  });

  it("saves override spec as markdown file", () => {
    saveOverrideSpec("# My Override Spec");
    const content = fs.readFileSync(
      path.join(DATA_DIR, "spec-override.md"),
      "utf-8"
    );
    expect(content).toBe("# My Override Spec");
  });

  it("clears session removes conversation and judge history", () => {
    saveConversation([{ id: "1", role: "user", agent: "user", content: "x", timestamp: 1 }]);
    appendJudgeHistory({
      verdict: "REJECTED",
      feedback: "bad",
      specMarkdown: "#",
      timestamp: "2026-01-01",
    });
    clearSession();
    expect(loadConversation()).toEqual([]);
    expect(loadJudgeHistory()).toEqual([]);
  });
});
