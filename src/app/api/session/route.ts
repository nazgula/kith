import { NextRequest } from "next/server";
import {
  loadConversation,
  saveConversation,
  loadJudgeHistory,
  appendJudgeHistory,
  saveApprovedSpec,
  saveOverrideSpec,
} from "@/lib/storage";
import type { ChatMessage, JudgeResult } from "@/types/chat";

// GET — load session (conversation + judge history)
export async function GET() {
  const conversation = loadConversation();
  const judgeHistory = loadJudgeHistory();
  return Response.json({ conversation, judgeHistory });
}

// POST — save session data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body as { action: string };

    switch (action) {
      case "save-conversation": {
        const { messages } = body as { messages: ChatMessage[]; action: string };
        saveConversation(messages);
        return Response.json({ ok: true });
      }
      case "save-judge-result": {
        const { result } = body as { result: JudgeResult; action: string };
        appendJudgeHistory(result);
        return Response.json({ ok: true });
      }
      case "save-approved-spec": {
        const { markdown } = body as { markdown: string; action: string };
        saveApprovedSpec(markdown);
        return Response.json({ ok: true });
      }
      case "save-override-spec": {
        const { markdown } = body as { markdown: string; action: string };
        saveOverrideSpec(markdown);
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
