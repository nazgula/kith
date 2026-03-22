import { NextRequest } from "next/server";
import { getProviderForModel } from "@/lib/ai/registry";
import type { ChatRequest, ChatResponse } from "@/types/ai";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;
    const { messages, model } = body;

    if (!messages?.length || !model) {
      return Response.json(
        { error: "messages and model are required" },
        { status: 400 }
      );
    }

    const provider = getProviderForModel(model);
    const content = await provider.chat(messages, model);

    const response: ChatResponse = {
      message: { role: "assistant", content },
      model,
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
