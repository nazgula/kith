import Anthropic from "@anthropic-ai/sdk";
import { compile, type Chunk } from "./context-compiler";

interface AgentDef {
  name: string;
  systemPrompt: string;
}

interface ChunkRelevance {
  chunkId: string;
  relevant: boolean;
  action: string;
  needsDetail: boolean;
}

interface AgentResponse {
  agent: string;
  relevance: ChunkRelevance[];
}

const AGENTS: AgentDef[] = [
  {
    name: "frontend-coder",
    systemPrompt: `You are a frontend engineer. You work on UI components, browser compatibility, responsive design, CSS, React, and client-side JavaScript. You do NOT handle backend APIs, databases, or server infrastructure.`,
  },
  {
    name: "backend-coder",
    systemPrompt: `You are a backend engineer. You work on APIs, databases, server logic, authentication, data processing, and infrastructure. You do NOT handle UI components, CSS, or visual design.`,
  },
];

const RELEVANCE_PROMPT = `You will receive a list of work chunks (title + summary). For each chunk, decide:
1. Is this relevant to your role? (true/false)
2. If relevant, what would you do? (1 sentence)
3. Do you need the full detail to act on it? (true/false)

Be honest — only claim chunks that genuinely fall within your expertise. If something is borderline, claim it but note why.

Respond with ONLY valid JSON: { "relevance": [{ "chunkId": "A", "relevant": true/false, "action": "what you'd do", "needsDetail": true/false }] }`;

async function evaluateRelevance(
  client: Anthropic,
  agent: AgentDef,
  chunks: Chunk[]
): Promise<AgentResponse> {
  const chunkSummaries = chunks
    .map((c) => `[${c.id}] ${c.title}\n    ${c.summary}`)
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: `${agent.systemPrompt}\n\n${RELEVANCE_PROMPT}`,
    messages: [{ role: "user", content: chunkSummaries }],
  });

  const raw = response.content.find((b) => b.type === "text")?.text ?? "";
  const text = raw.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
  const parsed = JSON.parse(text) as { relevance: ChunkRelevance[] };

  return { agent: agent.name, relevance: parsed.relevance };
}

function display(chunks: Chunk[], responses: AgentResponse[]) {
  console.log("\n  ROUTING MAP");
  console.log("  " + "-".repeat(56));

  for (const chunk of chunks) {
    console.log(`\n  [${chunk.id}] ${chunk.title}`);
    console.log(`      tags: ${chunk.tags.join(", ")}`);

    for (const resp of responses) {
      const rel = resp.relevance.find((r) => r.chunkId === chunk.id);
      if (!rel) continue;

      const icon = rel.relevant ? "✓" : "·";
      const detail = rel.needsDetail ? " [wants detail]" : "";
      const action = rel.relevant ? ` → ${rel.action}` : " (not my area)";
      console.log(`      ${icon} ${resp.agent}${action}${detail}`);
    }
  }
}

const TEST_MESSAGE = `Bug report from QA team:

1. The dashboard chart is rendering incorrectly on mobile Safari — the bars overlap and the legend gets cut off. This only happens on iOS 17+.

2. When a user clicks "Export CSV" on the reports page, the file downloads but all date columns show UTC instead of the user's local timezone. Several enterprise customers have complained about this.

3. The login page has a race condition — if you double-click the submit button, two auth requests fire and sometimes the second one returns a 401 that logs you back out immediately. Sarah noticed this happens about 30% of the time on slow connections.`;

async function main() {
  const client = new Anthropic();

  console.log("Step 1: Compiling context...\n");
  const compiled = await compile(client, TEST_MESSAGE);

  for (const chunk of compiled.chunks) {
    console.log(`  [${chunk.id}] ${chunk.title}`);
    console.log(`      ${chunk.summary}`);
    console.log();
  }

  console.log("Step 2: Agents self-selecting relevance...\n");
  const responses = await Promise.all(
    AGENTS.map((agent) => evaluateRelevance(client, agent, compiled.chunks))
  );

  display(compiled.chunks, responses);
  console.log();
}

main().catch(console.error);
