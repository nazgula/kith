import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import type { ChatMessage, JudgeResult } from "@/types/chat";

import {
  listProjects,
  createProject,
  getProject,
  loadConversation,
  saveConversation,
  loadJudgeHistory,
  appendJudgeHistory,
  saveApprovedSpec,
  saveOverrideSpec,
  loadApprovedSpec,
  clearSession,
} from "@/lib/storage";

const DATA_DIR = path.resolve(process.cwd(), "data");

function cleanup() {
  if (fs.existsSync(DATA_DIR)) {
    fs.rmSync(DATA_DIR, { recursive: true });
  }
}

describe("storage — projects", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  it("returns empty list when no projects exist", () => {
    expect(listProjects()).toEqual([]);
  });

  it("creates a project with id and name", () => {
    const project = createProject("Test Project");
    expect(project.id).toBeTruthy();
    expect(project.name).toBe("Test Project");
    expect(project.createdAt).toBeTruthy();
  });

  it("lists created projects", () => {
    createProject("A");
    createProject("B");
    const projects = listProjects();
    expect(projects).toHaveLength(2);
    expect(projects.map((p) => p.name)).toEqual(["A", "B"]);
  });

  it("gets a project by id", () => {
    const created = createProject("Find Me");
    const found = getProject(created.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe("Find Me");
  });

  it("returns undefined for nonexistent project", () => {
    expect(getProject("nonexistent")).toBeUndefined();
  });
});

describe("storage — per-project data", () => {
  let projectId: string;

  beforeEach(() => {
    cleanup();
    projectId = createProject("Test").id;
  });
  afterEach(cleanup);

  it("returns empty conversation for new project", () => {
    expect(loadConversation(projectId)).toEqual([]);
  });

  it("saves and loads conversation", () => {
    const messages: ChatMessage[] = [
      { id: "1", role: "user", agent: "user", content: "hello", timestamp: 1000 },
      { id: "2", role: "assistant", agent: "spec-writer", content: "hi", timestamp: 2000 },
    ];
    saveConversation(projectId, messages);
    expect(loadConversation(projectId)).toEqual(messages);
  });

  it("isolates conversations between projects", () => {
    const projectId2 = createProject("Other").id;
    saveConversation(projectId, [{ id: "1", role: "user", agent: "user", content: "project1", timestamp: 1 }]);
    saveConversation(projectId2, [{ id: "2", role: "user", agent: "user", content: "project2", timestamp: 2 }]);

    expect(loadConversation(projectId)[0].content).toBe("project1");
    expect(loadConversation(projectId2)[0].content).toBe("project2");
  });

  it("appends judge history entries", () => {
    const entry: JudgeResult = {
      verdict: "REJECTED",
      feedback: "needs work",
      specMarkdown: "# Spec",
      timestamp: "2026-01-01T00:00:00Z",
    };
    appendJudgeHistory(projectId, entry);
    appendJudgeHistory(projectId, { ...entry, verdict: "APPROVED" });
    const history = loadJudgeHistory(projectId);
    expect(history).toHaveLength(2);
    expect(history[0].verdict).toBe("REJECTED");
    expect(history[1].verdict).toBe("APPROVED");
  });

  it("saves and loads approved spec", () => {
    saveApprovedSpec(projectId, "# My Spec");
    expect(loadApprovedSpec(projectId)).toBe("# My Spec");
  });

  it("saves override spec and loads via loadApprovedSpec", () => {
    saveOverrideSpec(projectId, "# Override");
    expect(loadApprovedSpec(projectId)).not.toBeNull();
  });

  it("returns null when no spec exists", () => {
    expect(loadApprovedSpec(projectId)).toBeNull();
  });

  it("clears session removes conversation and judge history", () => {
    saveConversation(projectId, [{ id: "1", role: "user", agent: "user", content: "x", timestamp: 1 }]);
    appendJudgeHistory(projectId, {
      verdict: "REJECTED",
      feedback: "bad",
      specMarkdown: "#",
      timestamp: "2026-01-01",
    });
    clearSession(projectId);
    expect(loadConversation(projectId)).toEqual([]);
    expect(loadJudgeHistory(projectId)).toEqual([]);
  });
});
