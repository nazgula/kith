import Anthropic from "@anthropic-ai/sdk";

export interface Chunk {
  id: string;
  title: string;
  summary: string;
  detail: string;
  tags: string[];
}

export interface CompilerResult {
  chunks: Chunk[];
}

const SYSTEM_PROMPT = `You are a Context Compiler. Your job is to decompose a raw message into discrete, self-contained semantic chunks.

Each chunk must be a single concern — something one specialist could act on independently. Do not merge unrelated issues. Do not split a single issue across chunks.

For each chunk, produce:
- id: a short uppercase letter (A, B, C...)
- title: 5-8 words, specific enough that a specialist can decide relevance from the title alone
- summary: 2-3 sentences capturing the essential information. Include enough context that someone who only reads the summary can understand the problem and its scope.
- detail: the full original text relevant to this chunk, preserved verbatim where possible
- tags: 2-5 lowercase labels covering domain (ui, backend, database, auth, api), type (bug, feature, refactor, question), and severity/priority if mentioned

Rules:
- If the message contains only one concern, return one chunk.
- If the message is vague or ambiguous, still decompose it — tag unclear chunks with "needs-clarification".
- Never invent information not present in the original message.
- Respond with ONLY valid JSON matching this schema: { "chunks": [{ "id", "title", "summary", "detail", "tags" }] }`;

const TEST_MESSAGES = [
  // 1. QA bug report with 3 distinct issues
  `Bug report from QA team:

1. The dashboard chart is rendering incorrectly on mobile Safari — the bars overlap and the legend gets cut off. This only happens on iOS 17+.

2. When a user clicks "Export CSV" on the reports page, the file downloads but all date columns show UTC instead of the user's local timezone. Several enterprise customers have complained about this.

3. The login page has a race condition — if you double-click the submit button, two auth requests fire and sometimes the second one returns a 401 that logs you back out immediately. Sarah noticed this happens about 30% of the time on slow connections.`,

  // 2. Feature request spanning UI + backend
  `Feature request: Team Workspaces

We need to add multi-tenant workspace support. Here's what the PM outlined:

Backend: Each workspace gets its own isolated data partition. We need a workspace_id foreign key on basically every table. API endpoints need to be scoped — /api/v2/workspaces/:id/projects instead of /api/v2/projects. Auth tokens should encode workspace context.

Frontend: The top nav needs a workspace switcher dropdown (like Slack). When switching, all data should refresh without a full page reload. The workspace settings page needs role management — owner, admin, member, viewer.

Design: Each workspace should be able to set a custom accent color and upload a logo. The switcher should show the logo as an avatar.

Timeline: MVP by end of Q2, design review next Thursday.`,

  // 3. Vague user message
  `hey, the thing is slow again. like really slow. it worked fine yesterday but today everything takes forever. some users are complaining on twitter. can someone look into it?`,
];

export async function compile(
  client: Anthropic,
  message: string
): Promise<CompilerResult> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: message }],
  });

  const raw = response.content.find((b) => b.type === "text")?.text ?? "";
  const text = raw.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
  return JSON.parse(text) as CompilerResult;
}

async function main() {
  const client = new Anthropic();

  for (let i = 0; i < TEST_MESSAGES.length; i++) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`TEST MESSAGE ${i + 1}`);
    console.log(`${"=".repeat(60)}`);
    console.log(TEST_MESSAGES[i].slice(0, 80) + "...\n");

    const result = await compile(client, TEST_MESSAGES[i]);

    for (const chunk of result.chunks) {
      console.log(`  [${chunk.id}] ${chunk.title}`);
      console.log(`      ${chunk.summary}`);
      console.log(`      tags: ${chunk.tags.join(", ")}`);
      console.log();
    }
  }
}

main().catch(console.error);
