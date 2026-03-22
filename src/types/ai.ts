export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
}

export interface ChatRequest {
  messages: Pick<Message, "role" | "content">[];
  model: string;
}

export interface ChatResponse {
  message: Pick<Message, "role" | "content">;
  model: string;
}

export interface AIProvider {
  name: string;
  models: AIModel[];
  chat(
    messages: Pick<Message, "role" | "content">[],
    model: string
  ): Promise<string>;
}
