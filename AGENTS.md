# Kith Agents

Agent system prompts are `.md` files in `agents/`. The application reads these at runtime — they are not embedded in code.

## Shared Configuration

- **Model:** Claude Sonnet (via `src/lib/claude.ts`, default `claude-sonnet-4-6`)
- **Max tokens:** 4096 per response
- **API key:** `ANTHROPIC_API_KEY` in `.env.local` (server-side only, never exposed to client)

## Active Agents

| Agent | Prompt File | Role |
|---|---|---|
| Spec Writer | `agents/spec-writer.md` | Interviews user, produces structured specifications |
| Judge | `agents/spec-judge.md` | Evaluates specs for completeness and buildability |

## How Agents Work

1. Agent prompts are loaded from `.md` files by `src/lib/agent-api.ts`
2. The unified API route (`POST /api/chat`) accepts `{ agentPromptFile, messages }`
3. The system prompt is read from disk, messages are forwarded to Claude, response is returned
4. The Router (`src/lib/router.ts`) handles flow control between agents — it is plain code, not an LLM

## Adding a New Agent

1. Create `agents/your-agent.md` with the system prompt
2. Call it via the existing API: `POST /api/chat` with `agentPromptFile: "your-agent.md"`
3. Add routing logic in the Chat component or Router as needed

## Agent Design Guidelines

- Each agent has a clear, bounded role — it does NOT do other agents' jobs
- Agents are critical but constructive — rejections include specific fixes
- Agents push back on vague language — they ask for specifics, not assume
- System prompts define: identity, role boundaries, method, output format, disposition

## Next.js Notes

> This project uses Next.js 16 with the App Router. APIs and conventions may differ from older versions. Before writing any Next.js-specific code, check `node_modules/next/dist/docs/` for up-to-date guidance.
