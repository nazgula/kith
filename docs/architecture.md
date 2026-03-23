# Kith — Architecture

## System Overview

Kith is a multi-agent collaboration platform for software development. Agents have distinct roles, receive only the context relevant to them, and coordinate through structured handoffs. The platform is model-agnostic — currently using Anthropic Claude, designed to support additional providers.

## Current Implementation

### Two-Agent Pipeline: Spec Writer + Judge

The user describes a project idea through a web chat interface. Two agents collaborate to produce a validated specification:

```
User (web chat)
  ↕ conversation
Spec Writer (Claude Sonnet, agents/spec-writer.md)
  ↓ outputs spec markdown
Router (plain TypeScript — NOT an LLM)
  ↓ passes ONLY the spec markdown
Judge (Claude Sonnet, agents/spec-judge.md)
  ↓ returns verdict + feedback
Router
  ↓ APPROVED → save spec to disk
  ↓ REJECTED → show feedback, loop back to Spec Writer
```

**Key design decisions:**
- **Information barrier** — the Judge receives only the spec markdown, never the conversation. If the spec needs conversation context to make sense, the spec is incomplete.
- **Router is plain code** — spec detection uses string matching (`## Behaviors` + `### ` subheading), not an LLM call. Verdict parsing checks for `## Verdict: APPROVED/REJECTED`.
- **Session persistence** — conversation, judge history, and approved specs are saved to `data/` (filesystem). Sessions survive page refresh.

### Context Compiler (POC — validated, not yet integrated)

Decomposes raw messages into semantic chunks with variable-depth routing:

```
Raw message → Context Compiler → chunks[]
  Each chunk: { id, title, summary, detail, tags }

chunks[] → Agent self-selection → routing map
  Each agent decides: relevant? what action? need full detail?
```

Validated with 3 test message types (multi-issue bug report, cross-domain feature request, vague user message). Agents correctly self-select relevant chunks. Both frontend and backend agents claimed a race condition bug — matching real team behavior.

**Status:** standalone scripts in `src/lib/poc/`. Next step is integration into the web flow.

## Agents

Agent definitions are `.md` files in `agents/`. Each agent has a system prompt that defines its role, method, and disposition.

| Agent | File | Purpose |
|---|---|---|
| Spec Writer | `agents/spec-writer.md` | Interviews user, extracts structured specs |
| Judge | `agents/spec-judge.md` | Evaluates specs for completeness and buildability |

### How agents communicate

Currently: agents don't talk to each other directly. The Router (application code) mediates:
1. User ↔ Spec Writer: conversational, full history
2. Router → Judge: spec markdown only (information barrier)
3. Judge → Router → Spec Writer: feedback injected as a user message in conversation history

### Planned agents (not yet built)

- **Orchestrator** — task planning, delegation, progress tracking
- **Researcher** — web search, documentation lookup
- **Coder** — implementation from validated specs
- **Context Compiler** — as an agent (currently a standalone function)

## Architecture Layers

### 1. Orchestration (partially implemented)

The Router handles basic flow control: spec detection, judge handoff, revision loop. A full Orchestrator agent (task ledger, progress tracking, stall detection) is planned but not built.

### 2. Context Compilation (POC validated)

Semantic decomposition works. Agents self-select correctly. Three depth levels: title (10 tokens), summary (50-150 tokens), detail (full content). Progressive summarization (demoting inactive chunks) is designed but not implemented.

### 3. Principle Evolution (not started — Phase 2-3)

System learns from conflicts and human decisions. Conflicts logged → patterns extracted → candidate principles → tested → accepted into agent prompts. Designed in architecture spec v0.1, deferred.

## Technical Details

### API Routes

- `POST /api/chat` — unified agent endpoint. Accepts `{ agentPromptFile, messages }`. Reads the `.md` prompt from `agents/`, calls Claude, returns response text. Both Spec Writer and Judge use this same route.
- `GET /api/session` — loads conversation + judge history from `data/`
- `POST /api/session` — saves conversation, judge results, approved/override specs

### Provider Abstraction

`src/lib/ai/` contains a provider registry designed for multi-provider support:
- `models.ts` — model definitions (currently Claude Sonnet 4.6, Haiku 4.5)
- `registry.ts` — provider factory (`getProvider("anthropic")`)
- `anthropic.ts` — Anthropic SDK wrapper

### Persistence

Filesystem-based (`data/` directory, gitignored):
- `conversation.json` — full chat history with agent badges
- `judge-history.json` — every judge evaluation (verdict, feedback, spec markdown, timestamp)
- `spec-approved.md` — final approved spec
- `spec-override.md` — user-overridden spec (via `/approve` command)

## Design Principles

- **Model-agnostic** — provider abstraction supports adding OpenAI, Gemini, etc.
- **Information barriers** — agents receive only what they need. The Judge never sees the conversation.
- **Plain code routing** — routing decisions are deterministic string matching, not LLM calls. Predictable and fast.
- **Agents self-select** — broadcast context at summary level, let agents decide involvement. Validated in POC.
- **Build the core first** — validate each piece (compiler, routing, agents) before connecting them.

## Project Structure

```
src/
  app/
    layout.tsx              # Root layout
    page.tsx                # Chat page
    api/
      chat/route.ts         # Agent API (Spec Writer + Judge)
      session/route.ts      # Session persistence
  components/
    Chat.tsx                # Main chat with two-agent flow
    ChatInput.tsx           # Prompt box
    ChatMessage.tsx         # Message bubble with agent badges
    SystemMessage.tsx       # Muted system status messages
  lib/
    agent-api.ts            # Reads .md prompt from disk, calls Claude
    claude.ts               # Anthropic SDK wrapper
    router.ts               # Spec detection, extraction, verdict parsing
    storage.ts              # Filesystem persistence to data/
    ai/                     # Provider abstraction (models, registry)
    poc/                    # Context compiler + agent relevance POC scripts
  types/
    chat.ts                 # ChatMessage, JudgeResult, AgentRequest/Response
    ai.ts                   # AIModel, AIProvider
  cli/
    kith.ts                 # CLI entry point (alternative to web UI)
agents/
  spec-writer.md            # Spec Writer system prompt
  spec-judge.md             # Judge system prompt
docs/
  architecture.md           # This file
  done/                     # Completed/superseded specs
data/                       # Runtime data (gitignored)
```

## Vision / Next Steps

### Phase 2 — Full Agent Team

- **Orchestrator agent** — task planning with two-ledger pattern (Task Ledger + Progress Ledger, from Microsoft Magentic-One). Decomposes user requests into tasks, assigns to agents, re-plans when progress stalls.
- **Coder agent** — builds from approved specs. Writes code, runs tests, iterates.
- **Researcher agent** — web search, documentation lookup, freshness cache.
- **Context Compiler as a service** — integrate the validated POC into the live flow. Every user message gets decomposed; agents self-select from summaries.

### Phase 2 — Communication

- **A2A protocol** for inter-agent communication (currently agents don't talk directly — Router mediates)
- **MCP** for tool/resource access (file system, web search, git, test runners)
- Agent discovery via Agent Cards (`/.well-known/agent.json`)

### Phase 3 — Self-Improving System

- **Principle Evolution** — log conflicts between agents and human overrides. Extract patterns as candidate principles. Test them. Promote validated principles into agent system prompts.
- **Progressive summarization** — as context grows, demote inactive chunks from detail → summary → title. Agents can request expansion on demand.
- **Operational intelligence** — detect patterns like "Agent A's output frequently triggers clarification from Agent B" and refine agent boundaries.

### Core Innovation (validated, not yet integrated)

**Intelligent context routing** — messages decomposed into semantic chunks at three depth levels (title ~10 tokens, summary ~50-150 tokens, detail = full content). Agents self-select which chunks are relevant to them. Nobody else does sub-message-level routing.

Design principle: broadcast at summary level, let agents decide involvement. Like a real team where the programmer pulls in QA mid-feature because things got complicated.

## Research References

- A2A protocol: https://a2a-protocol.org/latest/specification/
- Microsoft Magentic-One: two-ledger pattern (Task + Progress)
- Context engineering: 60-70% context window capacity is optimal
- Sub-message-level routing is novel — no existing framework does this
