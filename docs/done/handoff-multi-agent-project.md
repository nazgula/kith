# Multi-Agent Project — Session Handoff
**Date:** March 23, 2026  
**Session:** #1 (13 messages, research + architecture)  
**Next step:** Build proof of concept

---

## What we decided

Maria is building a multi-agent collaboration system for software development. The core innovation is **intelligent context routing** — messages get decomposed into semantic chunks, and agents receive only what's relevant to them at the appropriate depth (title / summary / detail).

The system is **model-agnostic** (Claude for general dev, Gemini for Super-Cut video tasks, others as needed). Communication follows **A2A protocol** for inter-agent, **MCP** for tool/resource access.

### Architecture (3 layers, decided but not yet refined):
1. **Orchestration** — task planning, delegation, progress tracking (two-ledger pattern from Microsoft Magentic-One)
2. **Context Compilation** — semantic decomposition, relevance tagging, variable-depth routing (core innovation)
3. **Principle Evolution** — system learns from conflicts and human decisions over time (Phase 2-3)

### Phase 1 agents: 
Orchestrator, Context Compiler, Researcher, Coder, Judge

---

## Key architectural question: UNRESOLVED

**Compiler-routes vs. Agents-self-select:**

| Approach | How it works | Pro | Con |
|---|---|---|---|
| **Compiler routes** | Central compiler analyzes message, decides who gets what | Precise, agents only see relevant data | Single point of failure, mapping layer needed |
| **Agents self-select** | Broadcast titles to all agents, each decides involvement | Natural, resilient, no routing mistakes | Slightly more tokens, agents need good self-awareness |
| **Hybrid (leaning toward)** | Broadcast summaries, agents self-select, can pull in other agents mid-task | Most flexible, mirrors real teams | Needs clear "I'm getting involved" protocol |

**Maria's instinct (and Max's recommendation): agents self-select.** The programmer pulling in QA mid-feature because things got complicated — that's natural team behavior and doesn't require a smart router to predict.

**This question gets resolved by building the POC and seeing what works.**

---

## What to build FIRST (proof of concept)

### Goal: See the decomposition + routing work end-to-end in ~80 lines

**File 1: `context-compiler.js`**
- Takes a raw message string (hardcode 2-3 test messages)
- Calls Claude API with a prompt that returns structured JSON:
  ```json
  {
    "chunks": [
      {
        "id": "A",
        "title": "short title",
        "summary": "2-3 sentences",
        "detail": "full content",
        "tags": ["ui", "responsive", "bug"]
      }
    ]
  }
  ```
- Test with: a QA bug report mentioning 3 different issues, a feature request with UI + backend components, a vague user message that's hard to decompose

**File 2: `agent-relevance.js`**
- Defines 2 agents as system prompts (e.g., "frontend-coder" and "designer")
- Sends each agent the chunk titles + summaries
- Each agent responds with:
  - Which chunks are relevant to them (yes/no per chunk)
  - What they'd do about each relevant chunk (1 sentence)
  - Whether they need the full detail for any chunk
- Compare: do agents self-select correctly? Do they agree with what a human would assign?

**File 3 (optional): `display.js`**
- Takes the compiler output + agent responses
- Prints a simple card-like view in the terminal showing routing

### Success criteria:
- The compiler produces sensible chunks from messy input
- Agents correctly self-select relevant chunks
- You can see the routing happening and it matches your intuition

### Tech stack:
- Node.js (Maria's stack)
- Raw Anthropic API (Claude Sonnet for speed)
- No frameworks, no SDK, no A2A yet — just API calls and JSON
- Build in `AI Journey/Week 1/multi-agent-poc/`

---

## Open questions (PARKED for after POC)

### Architecture
- [ ] Orchestrator responsibilities vs. Context Compiler — where does planning end and routing begin?
- [ ] Should Context Compiler be an A2A server? (probably yes, for Gemini agent access)
- [ ] Token budget management — who decides when to compress? (RAM/disk metaphor: active context in window, older content in memory store, fetchable on demand)
- [ ] Parallel vs. sequential agent execution — leaning parallel, Judge evaluates at milestones not every step
- [ ] Error handling / retry / circuit breaker patterns
- [ ] Auth model between agents

### Design choices to validate with POC
- [ ] Does semantic decomposition work reliably? (test with diverse message types)
- [ ] Can agents self-select relevance accurately? (compare to human judgment)
- [ ] Is title/summary/detail the right depth model or do we need more/fewer levels?
- [ ] How well does progressive summarization preserve important context?

### Broader questions
- [ ] A2A protocol integration (Phase 1 or Phase 2?)
- [ ] How the card UI should actually work (after we see real data flowing)
- [ ] Principle evolution — deferred to Phase 2-3
- [ ] CrewAI backstory concept — use for agent disposition (skeptical, pragmatic, thorough) not RPG flavor
- [ ] Judge configuration — configurable rigor (thorough vs. fast), mini-judge at input (agents flag unclear input), full Judge at milestones

---

## Research completed (reference)

### Frameworks surveyed:
- **Microsoft Magentic-One** — Orchestrator with Task+Progress ledgers, WebSurfer, FileSurfer, Coder, ComputerTerminal
- **OpenAI Agents SDK** — Triage Agent + handoffs (flat, decentralized)
- **Google ADK** — Hierarchical tree, SequentialAgent/ParallelAgent/LoopAgent, A2A protocol
- **CrewAI** — Role/goal/backstory agents, hierarchical process with auto-Manager
- **Anthropic Claude Agent SDK** — Subagents as tools, context isolation, auto-compaction

### Consensus roles (every framework has these):
Orchestrator/Coordinator, Researcher/WebSurfer, Coder/Builder, Critic/Judge/Evaluator

### Key insights:
- Context engineering video: 6 components compete for context window, 60-70% capacity is optimal
- Nobody does sub-message-level routing (our innovation)
- A2A = agents talk to agents (across frameworks). MCP = agents talk to tools/data.
- Self-improving agent prompts via CLAUDE.md + chat log analysis is an emerging pattern
- The "debate" pattern (advocate + critic + judge) is gaining traction for conflict resolution

### Relevant links:
- A2A spec: https://a2a-protocol.org/latest/specification/
- Claude Agent SDK subagents: https://platform.claude.com/docs/en/agent-sdk/subagents
- Anthropic multi-agent research system: https://www.anthropic.com/engineering/multi-agent-research-system
- Microsoft Magentic-One: https://www.microsoft.com/en-us/research/articles/magentic-one-a-generalist-multi-agent-system-for-solving-complex-tasks/

---

## Existing spec

The full architecture spec v0.1 was created this session (architecture-spec.md). It's useful as a reference but too grand to build from directly. The POC above is the right entry point — validate the core, then come back to the spec with real data.

---

*"Build the innermost core. See it work. Then expand." — Session 1 conclusion*
