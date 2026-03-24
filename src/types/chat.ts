export type MessageAgent = "user" | "spec-writer" | "judge" | "system";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  agent: MessageAgent;
  content: string;
  timestamp: number;
}

export interface JudgeResult {
  verdict: "APPROVED" | "REJECTED" | "UNKNOWN";
  feedback: string;
  specMarkdown: string;
  timestamp: string;
}

export interface AgentRequest {
  agentPromptFile: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

export interface AgentResponse {
  content: string;
  error?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  approvedSpec?: string;
}
