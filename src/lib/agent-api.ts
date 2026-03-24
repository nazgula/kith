import * as fs from "fs";
import * as path from "path";
import { sendMessage } from "./claude";

const AGENTS_DIR = path.resolve(process.cwd(), "agents");

export interface AgentCallParams {
  agentPromptFile: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

const ALLOWED_PROMPTS = new Set(["spec-writer.md", "spec-judge.md"]);

export async function callAgent(params: AgentCallParams): Promise<string> {
  const { agentPromptFile, messages } = params;

  if (!ALLOWED_PROMPTS.has(agentPromptFile)) {
    throw new Error(`Unknown agent prompt file: ${agentPromptFile}`);
  }

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
