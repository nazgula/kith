# Multi-Agent Collaboration System — Architecture Specification v0.1

**Author:** Maria Gur  
**Date:** March 2026  
**Status:** Draft — Phase 1 Design

---

## Project Overview

A multi-agent collaboration system for software development, designed to support heterogeneous LLMs (Claude, Gemini, others) communicating via the A2A protocol. The system's core innovation is a Context Compiler that decomposes messages into semantically tagged sections routed at variable depth to relevant agents — solving the context window efficiency problem described in current context engineering literature.

The system is model-agnostic by design: agents can run on any LLM (Claude for general development, Gemini for media tasks like Super-Cut, others as needed). Inter-agent communication follows the A2A (Agent-to-Agent) protocol standard. Tool and resource access follows the MCP (Model Context Protocol) standard.

---

## Architecture Layers

### 1. Orchestration Layer (provided by SDK + A2A)

> **Tagline:** Task planning, delegation, and progress tracking.

> **Concise:** The Orchestrator decomposes user requests into tasks, assigns them to agents via A2A task messages, and maintains two ledgers — a Task Ledger (what needs to happen) and a Progress Ledger (what's actually happening). It re-plans when progress stalls. It does NOT process content — it delegates that to the Context Compiler and specialist agents.

> **Detailed:**
>
> **Implementation:** Built on Claude Agent SDK for Claude-based agents, with A2A protocol endpoints exposed for non-Claude agents (e.g., Gemini-based agents for Super-Cut). Each agent publishes an Agent Card (A2A standard) describing its capabilities, endpoint, and supported content types.
>
> **Task Ledger** contains: verified facts, assumptions, current plan (ordered steps), assigned agents per step, dependencies between steps.
>
> **Progress Ledger** contains: current step, status per agent (idle / working / blocked / done), stall counter (triggers re-plan at threshold of 2), artifacts produced so far.
>
> **Stall detection:** If no progress for 2 consecutive iterations, the Orchestrator updates the Task Ledger with new information gathered from agent status reports and generates a revised plan.
>
> **Human escalation triggers:** Agent conflict (two agents disagree on approach), stall after re-plan, any action flagged as destructive (file deletion, deployment, external API calls with side effects), cost threshold exceeded (token budget).
>
> **A2A integration:** The Orchestrator acts as an A2A Client. Specialist agents act as A2A Servers. Task assignment is an A2A `tasks/send` call. Agent status updates use A2A streaming (SSE). Agent Cards are discovered at `/.well-known/agent.json` per the A2A spec.

---

### 2. Context Compilation Layer (custom — core innovation)

> **Tagline:** Semantic decomposition, relevance tagging, and variable-depth routing.

> **Concise:** The Context Compiler sits at the boundary between unstructured input (user messages, external tool results) and the structured internal communication format. It analyzes incoming content, splits it into semantic chunks, tags each chunk with relevant agents and depth level, and produces structured messages that agents can parse directly. Agent-to-agent messages use this structured format natively — the Compiler only processes boundary input, not internal traffic.

> **Detailed:**
>
> **When it activates:**
> - User input enters the system (always)
> - External tool/MCP resource returns data (always)
> - Context window approaching capacity — triggers re-summarization of warm/cold items
> - Agent requests expansion of a summary ("give me detail on chunk X")
>
> **When it does NOT activate:**
> - Agent-to-agent messages (these are already in structured format)
> - Orchestrator task assignments (these are A2A Task objects)
>
> **Structured Message Format (the internal lingua franca):**
>
> Every message between agents follows this schema, which maps to A2A Message/Part structure:
>
> ```json
> {
>   "message_id": "msg-uuid",
>   "source_agent": "qa-tester",
>   "a2a_task_id": "task-uuid",
>   "chunks": [
>     {
>       "chunk_id": "chunk-A",
>       "title": "Layout breaks on mobile viewport",
>       "summary": "QA found responsive layout failure below 768px on the dashboard grid component",
>       "detail": "Full reproduction steps: 1) Navigate to /dashboard 2) Resize to 375px width 3) Grid columns collapse into single column but overflow container by 42px. Expected: columns stack cleanly. Actual: horizontal scroll appears. Browser: Chrome 124, iOS Safari 18. Screenshots attached as artifact.",
>       "relevant_to": ["designer", "frontend-coder"],
>       "depth_per_agent": {
>         "designer": "detail",
>         "frontend-coder": "detail",
>         "architect": "summary",
>         "qa-tester": "title"
>       },
>       "artifacts": ["screenshot-375px.png"]
>     },
>     {
>       "chunk_id": "chunk-B",
>       "title": "API response time regression",
>       "summary": "Dashboard API endpoint p95 latency increased from 200ms to 1400ms after last deploy",
>       "detail": "...",
>       "relevant_to": ["backend-coder"],
>       "depth_per_agent": {
>         "backend-coder": "detail",
>         "architect": "summary",
>         "frontend-coder": "title"
>       }
>     }
>   ],
>   "metadata": {
>     "timestamp": "2026-03-23T14:30:00Z",
>     "context_budget_used": 1250,
>     "compression_level": "none"
>   }
> }
> ```
>
> **A2A mapping:** Each chunk maps to an A2A `Part` with `content_type: "application/json"`. The full message maps to an A2A `Message` with role "agent". Artifacts map to A2A `Artifact` objects. This means external A2A agents (e.g., a Gemini agent) can participate without knowing the internal chunk schema — they receive standard A2A messages with JSON parts they can parse.
>
> **Depth levels:**
> - `title` — one-line tag, ~10 tokens. Agent sees it exists but doesn't process it.
> - `summary` — key concepts, 50-150 tokens. Enough to decide if expansion is needed.
> - `detail` — full content, variable size. Complete information for action.
>
> **Progressive summarization:** As conversation grows, the Compiler periodically re-evaluates all chunks in context. Items not referenced in the last N turns get demoted: detail → summary → title. Items actively referenced get promoted back. This keeps the total context window within the 60-70% optimal range.
>
> **Expansion protocol:** Any agent can request expansion of a summary/title chunk:
> ```json
> { "request": "expand", "chunk_id": "chunk-A", "requesting_agent": "architect" }
> ```
> The Compiler retrieves the full detail from memory (key-value store) and delivers it.

---

### 3. Principle Evolution Layer (custom — Phase 2-3)

> **Tagline:** System-wide learning from conflicts, decisions, and cross-agent patterns.

> **Concise:** When agents disagree, or when the user overrides an agent's decision, the system logs the conflict, the resolution, and the context. Over time, patterns are extracted as candidate principles. Candidates are tested in subsequent sessions and, if validated, promoted to core agent instructions. This creates a case-law system where precedent accumulates from real decisions.

> **Detailed:**
>
> **Conflict detection:** The Judge agent or Orchestrator flags when:
> - Two agents produce contradictory outputs for the same task
> - User overrides an agent's recommendation
> - An agent's output fails the Judge's quality check repeatedly on the same type of issue
>
> **Conflict log entry:**
> ```json
> {
>   "conflict_id": "conf-uuid",
>   "timestamp": "2026-03-23T15:00:00Z",
>   "agents_involved": ["designer", "frontend-coder"],
>   "topic": "animation vs. load time trade-off",
>   "position_a": { "agent": "designer", "stance": "use CSS transitions for polish" },
>   "position_b": { "agent": "frontend-coder", "stance": "skip animations, prioritize TTI" },
>   "resolution": "user",
>   "decision": "prioritize load time",
>   "context_tags": ["mobile-first", "performance-critical"],
>   "extracted_principle": null
>   }
> ```
>
> **Principle lifecycle:**
> 1. **Logged** — conflict recorded with context
> 2. **Candidate** — pattern detected across 2+ similar conflicts, principle extracted
> 3. **Testing** — principle offered as a suggestion to user in relevant contexts
> 4. **Accepted** — user confirms, principle added to relevant agent(s) system prompt
> 5. **Rejected** — user disagrees, principle archived with reasoning
>
> **Operational intelligence** (what the Context Compiler observes):
> - "Agent A's output frequently triggers clarification requests from Agent B" → interface spec between them needs refinement
> - "User overrides Agent B on topic X in 70%+ of cases" → Agent B's instructions for topic X are misaligned
> - "When agents A and C work on the same task, resolution takes 3x longer" → jurisdiction overlap needs clearer boundaries

---

## Agent Definitions (Phase 1)

### Orchestrator

> **Tagline:** Plans, delegates, tracks, re-plans.

> **Concise:** Receives user input, creates task plan, assigns work to agents via A2A tasks, monitors progress via two ledgers, escalates to human when needed. Does not do content work — only coordination.

> **Detailed:**
>
> - **LLM:** Strong reasoning model (Claude Opus or equivalent)
> - **Tools:** A2A client (send tasks, receive results), Task Ledger (read/write), Progress Ledger (read/write), Human escalation
> - **System prompt focus:** Task decomposition, effort scaling (simple = 1 agent, complex = parallel agents), stall detection, knowing when to re-plan vs. escalate
> - **A2A role:** Client — sends tasks to all other agents
> - **Disposition:** Conservative. When uncertain, asks rather than assumes. Prefers parallel assignment when chunks are independent.

### Context Compiler

> **Tagline:** Decomposes, tags, routes, compresses.

> **Concise:** Analyzes unstructured input, produces structured chunked messages with relevance tags and depth layers. Manages progressive summarization as context grows. Handles chunk expansion requests.

> **Detailed:**
>
> - **LLM:** Fast model (Claude Sonnet or equivalent) — needs to be fast since it's on the critical path for boundary input
> - **Tools:** Memory store (read/write — for storing full detail of summarized chunks), token counter
> - **System prompt focus:** Semantic analysis, relevance classification, summarization at multiple granularities, knowing which agents exist and what they care about
> - **A2A role:** Internal service — not exposed as A2A server (it's a pre-processing step, not an agent other systems talk to)
> - **Disposition:** Precise. Errs on the side of including too much rather than too little in initial routing. Conservative with compression — only demotes chunks after clear inactivity.

### Researcher

> **Tagline:** Fetches current information, keeps the system's knowledge fresh.

> **Concise:** On request from the Orchestrator or other agents, searches the web for current documentation, patterns, API changes, or best practices. Returns structured findings. Maintains a freshness cache to avoid redundant searches.

> **Detailed:**
>
> - **LLM:** Any capable model with web access
> - **Tools:** Web search, web fetch, freshness cache (key-value with TTL — default 24h)
> - **System prompt focus:** Query formulation, source quality assessment, concise summarization of findings, citing sources
> - **A2A role:** Server — exposes `research` skill in Agent Card. Can be called by any agent in the system, or by external A2A agents.
> - **Disposition:** Thorough but concise. Always cites sources. Flags when information is uncertain or conflicting across sources.
> - **Agent Card skills:** `["web-research", "documentation-lookup", "api-reference"]`

### Coder

> **Tagline:** Writes, tests, and fixes code.

> **Concise:** Receives task assignments with context-compiled briefings. Implements features, writes tests, fixes bugs. Outputs code artifacts with explanations. Can request research or expanded context when briefing is insufficient.

> **Detailed:**
>
> - **LLM:** Strong coding model (Claude Sonnet/Opus, or Gemini for specific stacks)
> - **Tools:** File read/write, bash execution, test runner, linter, git operations
> - **System prompt focus:** Clean code practices, test-first when appropriate, clear commit messages, asking for clarification rather than assuming
> - **A2A role:** Server — exposes `code-implementation` and `code-review` skills
> - **Disposition:** Pragmatic. Implements the simplest solution that meets requirements. Asks for expanded context on summary/title chunks before making assumptions.
> - **Multi-LLM note:** For Super-Cut (video editing), a Gemini-based Coder variant handles media pipeline tasks. Same A2A interface, different underlying model.

### Judge

> **Tagline:** Evaluates output quality, enforces standards.

> **Concise:** Reviews agent outputs against task requirements and system standards. Returns structured pass/fail with reasoning. On failure, provides specific feedback for the loop to continue. Detects conflicts between agents.

> **Detailed:**
>
> - **LLM:** Strong reasoning model (Claude Opus or equivalent — different instance than Orchestrator to avoid bias)
> - **Tools:** Task requirements reader, coding standards reference, test result parser
> - **System prompt focus:** Objective evaluation against criteria, specific actionable feedback on failures, detecting when two agents' outputs contradict each other
> - **A2A role:** Server — exposes `quality-review` skill
> - **Disposition:** Critical but constructive. Never just says "fail" — always explains why and suggests what to fix. Flags conflicts to the Orchestrator for potential principle extraction.
> - **Evaluation criteria (per review):**
>   - Does the output match the task requirements?
>   - Does the code pass tests (if applicable)?
>   - Are there security or performance concerns?
>   - Does this contradict any other agent's output?

---

## Communication Architecture

### Protocol Stack

> **Tagline:** A2A for agents, MCP for tools, structured JSON internally.

> **Concise:** All inter-agent communication uses A2A protocol (JSON-RPC over HTTPS). All tool and resource access uses MCP. Internal message structure (chunks with depth layers) is carried as A2A Message Parts with `content_type: "application/json"`. This means any A2A-compliant agent can join the system regardless of its underlying LLM.

> **Detailed:**
>
> **Agent discovery:** Each agent publishes an Agent Card at `/.well-known/agent.json` containing:
> - Agent name, description, version
> - Skills list (what tasks it can handle)
> - Supported input/output content types
> - Authentication requirements
> - Endpoint URL
>
> **Message flow:**
> ```
> User input (unstructured)
>   → Context Compiler (produces structured chunks)
>     → Orchestrator (plans, creates A2A tasks)
>       → A2A tasks sent to relevant agents
>         → Agents work (may call MCP tools)
>         → Agents respond with structured A2A messages
>       → Judge evaluates (A2A task)
>     → If pass: Orchestrator synthesizes result
>     → If fail: Loop with feedback
>   → Response to user
> ```
>
> **Agent-to-agent (internal):** Structured JSON chunks, carried as A2A Parts. Agents write their output in the structured format natively — no compiler needed.
>
> **Agent-to-external (boundary):** Standard A2A Messages. External agents don't need to know the chunk schema — they receive standard A2A with JSON parts.
>
> **Tool access:** All tools exposed via MCP servers. Agents discover available tools through MCP resource listings. This includes: file system operations, web search, git, test runners, build tools, database queries, and any project-specific tools.

### Multi-LLM Support

> **Tagline:** Any LLM, same protocol.

> **Concise:** Agents are LLM-agnostic. The A2A protocol abstracts away the underlying model. A Claude-based Orchestrator can delegate to a Gemini-based Coder for video tasks. The structured message format is the contract — not the model.

> **Detailed:**
>
> **Current LLM assignments:**
> - Orchestrator: Claude Opus (strong reasoning)
> - Context Compiler: Claude Sonnet (fast, good at classification)
> - Researcher: Claude Sonnet with web tools
> - Coder (general): Claude Sonnet/Opus
> - Coder (video/media — Super-Cut): Gemini (native multimodal)
> - Judge: Claude Opus
>
> **Adding a new LLM-backed agent:**
> 1. Implement A2A Server endpoint
> 2. Publish Agent Card with skills and capabilities
> 3. Register with Orchestrator (or let it discover via Agent Card URL)
> 4. Agent receives A2A tasks, returns A2A messages with structured chunks
>
> **No framework lock-in:** An agent can be built with Claude Agent SDK, Google ADK, LangGraph, or raw API calls. The A2A protocol is the integration layer.

---

## UI — Card View (Phase 1)

> **Tagline:** Expandable conversation cards with agent metadata.

> **Concise:** Each message in the conversation renders as a card showing: who sent it, what it's about (chunk titles), who received it, and current status. Cards expand to reveal deeper content layers (summary → detail) and sub-conversations between agents.

> **Detailed:**
>
> **Card structure:**
> ```
> ┌──────────────────────────────────────────────┐
> │ [QA Tester] → Designer, Frontend-Coder       │
> │ ┌─────────┐ ┌────────────────┐               │
> │ │ Layout  │ │ API Latency    │               │
> │ │ Bug ▸   │ │ Regression ▸   │               │
> │ └─────────┘ └────────────────┘               │
> │ ○ 2 agents working · 1 artifact              │
> └──────────────────────────────────────────────┘
> ```
>
> **Expand behavior:** Clicking a chunk tile reveals that chunk's summary. Clicking again reveals full detail. Clicking an agent name shows that agent's response to this chunk.
>
> **Nested cards:** Agent responses appear as child cards indented below the parent. The Designer's response to "Layout Bug" shows as a child card with its own chunks.
>
> **Status indicators:**
> - ○ Gray: not started
> - ◑ Blue: in progress
> - ● Green: complete (passed Judge)
> - ● Red: failed (Judge rejected, feedback loop active)
> - ● Orange: blocked (waiting for human input or dependency)

---

## Data Structures

### Memory Store

> **Tagline:** Key-value store for chunk detail, agent state, and cached research.

> **Concise:** A persistent key-value store used by the Context Compiler (storing full detail of compressed chunks), the Researcher (freshness cache), and the Orchestrator (ledgers). Keys are namespaced per agent and per task.

> **Detailed:**
>
> **Key namespaces:**
> - `chunks:{task_id}:{chunk_id}` — full detail of summarized chunks
> - `research:{query_hash}` — cached research results with TTL
> - `ledger:task:{task_id}` — Task Ledger state
> - `ledger:progress:{task_id}` — Progress Ledger state
> - `principles:candidates` — candidate principles awaiting testing
> - `principles:core` — accepted principles in effect
>
> **Implementation:** Start with file-based JSON (simple, inspectable). Migrate to Redis or SQLite when performance requires it.

### Principles Store

> **Tagline:** Case law for the agent team.

> **Concise:** Logs conflicts, resolutions, extracted principles, and their lifecycle status. Feeds into agent system prompts when principles are promoted to core.

> **Detailed:** See Principle Evolution Layer above for full schema.

---

## Phase Roadmap

### Phase 1 — Minimum Viable Agent Team

> **Tagline:** Five agents, one loop, card UI.

> **Concise:** Orchestrator + Context Compiler + Researcher + Coder + Judge. Structured message format. Card-based UI. Manual conflict logging (principles.json). A2A protocol for all inter-agent communication. MCP for tool access.

> **Deliverables:**
> - 5 agent definitions with system prompts and Agent Cards
> - Context Compiler with chunk/tag/depth logic
> - Structured message schema (JSON)
> - A2A endpoints for each agent
> - MCP tool server (file ops, web search, bash)
> - Card UI (expandable, shows agent metadata)
> - Manual conflict log (JSON file)
> - The system builds itself — use the agents to develop the system

### Phase 2 — Team Expansion + Flow View

> **Tagline:** More agents, better visibility, cross-LLM integration.

> **Concise:** Add Designer, Architect, QA, Security agents. Implement flow/branch view UI. Integrate Gemini agents for Super-Cut media tasks. Agent memory (MEMORY.md per agent). Automated conflict detection.

### Phase 3 — Self-Improving System

> **Tagline:** The system that learns from its own work.

> **Concise:** Automated principle extraction from conflict logs. Candidate → tested → core promotion pipeline. Cross-agent operational intelligence. Auto-research loop for evolving agent prompts. The system refines its own agent definitions based on accumulated experience.

---

*End of specification v0.1*
