import { NextRequest } from "next/server";
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
} from "@/lib/storage";
import type { ChatMessage, JudgeResult } from "@/types/chat";

// GET — load session or list projects
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");

  if (!projectId) {
    // List all projects
    return Response.json({ projects: listProjects() });
  }

  const project = getProject(projectId);
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const conversation = loadConversation(projectId);
  const judgeHistory = loadJudgeHistory(projectId);
  const approvedSpec = loadApprovedSpec(projectId);

  return Response.json({ project, conversation, judgeHistory, approvedSpec });
}

// POST — project actions + session data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, projectId } = body as { action: string; projectId?: string };

    if (action === "create-project") {
      const { name } = body as { name: string; action: string };
      const project = createProject(name || "Untitled Project");
      return Response.json({ project });
    }

    if (!projectId) {
      return Response.json({ error: "projectId is required" }, { status: 400 });
    }

    switch (action) {
      case "save-conversation": {
        const { messages } = body as { messages: ChatMessage[]; projectId: string; action: string };
        saveConversation(projectId, messages);
        return Response.json({ ok: true });
      }
      case "save-judge-result": {
        const { result } = body as { result: JudgeResult; projectId: string; action: string };
        appendJudgeHistory(projectId, result);
        return Response.json({ ok: true });
      }
      case "save-approved-spec": {
        const { markdown } = body as { markdown: string; projectId: string; action: string };
        saveApprovedSpec(projectId, markdown);
        return Response.json({ ok: true });
      }
      case "save-override-spec": {
        const { markdown } = body as { markdown: string; projectId: string; action: string };
        saveOverrideSpec(projectId, markdown);
        return Response.json({ ok: true });
      }
      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
