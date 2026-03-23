import { NextRequest } from "next/server";
import { callAgent } from "@/lib/agent-api";
import type { AgentRequest, AgentResponse } from "@/types/chat";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AgentRequest;
    const { agentPromptFile, messages } = body;

    if (!messages?.length || !agentPromptFile) {
      return Response.json(
        { error: "agentPromptFile and messages are required" },
        { status: 400 }
      );
    }

    const content = await callAgent({ agentPromptFile, messages });
    const response: AgentResponse = { content };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message, content: "" } as AgentResponse, { status: 500 });
  }
}
