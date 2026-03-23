import * as fs from "fs";
import * as path from "path";
import { sendMessage } from "./claude";

const AGENTS_DIR = path.resolve(process.cwd(), "agents");

export interface AgentCallParams {
  agentPromptFile: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

export async function callAgent(params: AgentCallParams): Promise<string> {
  const { agentPromptFile, messages } = params;

  const promptPath = path.join(AGENTS_DIR, agentPromptFile);
  if (!fs.existsSync(promptPath)) {
    throw new Error(`Agent prompt file not found: ${agentPromptFile}`);
  }

  const systemPrompt = fs.readFileSync(promptPath, "utf-8");

  return sendMessage({
    systemPrompt,
    messages,
  });
}
