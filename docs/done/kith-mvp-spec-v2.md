# Kith MVP Phase 1 — Specification v2

**Author:** Maria Gur
**Date:** March 2026
**Status:** Ready to build

---

## Overview

A CLI-based two-agent system that transforms vague ideas into validated specifications. The user talks to a Spec Writer agent through conversational interview. When the Spec Writer produces a draft spec, the system passes ONLY the spec markdown to a Judge agent for evaluation. The Judge approves or rejects with actionable feedback. On rejection, the user and Spec Writer revise, then resubmit. On approval, the spec is saved to disk.

This MVP validates two things: (1) an AI agent can interview a human and produce a buildable spec, and (2) an information barrier between agents works — the Judge never sees the conversation, only the spec.

## User

Maria — a developer with partial ideas who can answer questions but needs structured extraction. Interacts through a terminal (CLI). Sees Spec Writer messages and Judge feedback. Does not talk to the Judge directly.

## System architecture

```
User (terminal)
  ↕ conversation
Spec Writer (Claude Sonnet, system prompt: agents/spec-writer.md)
  ↓ outputs spec markdown
Router (application code — NOT an LLM)
  ↓ passes ONLY the spec markdown string
Judge (Claude Sonnet, system prompt: agents/spec-judge.md)
  ↓ returns verdict + feedback
Router
  ↓ if REJECTED: shows feedback to user, loops back to Spec Writer
  ↓ if APPROVED: saves spec to disk, exits
```

The Router is plain Node.js code. It is not an agent. It does not use an LLM. It does three things: (1) detect when the Spec Writer has output a spec (by checking for the `# ` + `## Behaviors` markers in the response), (2) extract the spec markdown and send it to the Judge, (3) route the Judge's response back to the user.

## Behaviors

### Starting a project

- **Precondition:** User runs `node kith.js` in terminal. No project is in progress.
- **Action:** System prints welcome message and prompts: "What are you building? Describe your idea." User types a response (one sentence to multiple paragraphs).
- **Expected outcome:** User's input is sent to the Spec Writer as the first message. Spec Writer responds with its first clarifying question. The conversation loop begins.
- **Edge cases:**
  - Empty input (user just hits Enter) → System re-prompts: "What are you building? Describe your idea." Does not send empty string to Spec Writer.
  - Very long input (>5000 characters) → Accepted. No truncation. Spec Writer handles it.
  - User types "quit" or "exit" → System exits cleanly. No spec saved. Message: "Session ended. No spec saved."

### Conversation loop

- **Precondition:** Spec Writer has sent a question. User sees it in terminal.
- **Action:** User types a response. System sends it to Spec Writer. Spec Writer responds with the next question or with a draft spec.
- **Expected outcome:** Conversation continues turn by turn. Each Spec Writer response is printed to terminal with a `[Spec Writer]` prefix. Each user input is prompted with `You > `.
- **Edge cases:**
  - User types empty response → System re-prompts `You > `. Does not send empty string to Spec Writer.
  - Spec Writer response takes >30 seconds → System prints "Still thinking..." after 10 seconds. No timeout — waits indefinitely. (LLM latency is unpredictable; timing out would lose context.)
  - API error (network failure, rate limit, 500) → System prints "Connection error: [error message]. Your conversation is saved. Run `node kith.js --resume` to continue." Conversation history is written to `project/conversation.json` before exit.

### Spec detection and Judge handoff

- **Precondition:** Spec Writer has responded with a message.
- **Action:** Router checks if the response contains a markdown spec. Detection rule: response contains the string `## Behaviors` AND contains at least one `### ` subheading under it.
- **Expected outcome:**
  - If spec detected → System prints "[System] Spec draft detected. Sending to Judge for evaluation..." Extracts everything from the first `# ` heading to end of the Spec Writer's response. Sends ONLY this extracted markdown string to the Judge. The Judge receives no conversation history, no user messages, no file contents — only the spec markdown.
  - If no spec detected → Normal conversation continues. No action taken.
- **Edge cases:**
  - Spec Writer mentions "## Behaviors" in a discussion message without actually drafting a spec → False positive is possible but unlikely. If it happens, the Judge will reject the non-spec, feedback loops back, and conversation continues normally. Acceptable for MVP.
  - Spec is inside a markdown code fence (```markdown ... ```) → Router strips the code fence delimiters before sending to Judge. Extraction regex: `/```markdown\n([\s\S]*?)```/` tried first, falls back to `/^(# .+[\s\S]*)/m`.

### Judge evaluation

- **Precondition:** Router has sent spec markdown to Judge.
- **Action:** Judge evaluates the spec using its system prompt criteria. Returns a structured response.
- **Expected outcome:** Judge responds with one of:
  - **APPROVED:** Response starts with `## Verdict: APPROVED`. System prints the full Judge response (strengths + scenario seeds) to terminal with `[Judge]` prefix. Spec is saved to `project/spec-approved.md`. System prints "Spec approved and saved to project/spec-approved.md" and exits.
  - **REJECTED:** Response starts with `## Verdict: REJECTED`. System prints the full Judge response (strengths + issues + scenario seeds) to terminal with `[Judge]` prefix. Conversation continues — user sees feedback and can discuss with Spec Writer.
- **Edge cases:**
  - Judge response doesn't start with `## Verdict:` → System treats as REJECTED with the full response as feedback. Prints warning: "[System] Judge response format unexpected. Treating as rejection. Feedback below:"
  - Judge API error → Same error handling as conversation loop (save state, suggest --resume).

### Revision loop

- **Precondition:** Judge has rejected spec. User sees feedback in terminal.
- **Action:** System prints "[System] Judge rejected the spec. You can discuss the feedback with the Spec Writer." Conversation loop resumes. The Judge's feedback is appended to the Spec Writer's conversation history as a system-injected message: `"The Judge rejected your spec with this feedback: [full judge response]. Address these issues — either by asking the user for clarification or by revising the spec directly."` User then continues talking to the Spec Writer normally.
- **Expected outcome:** Spec Writer either asks the user targeted questions about Judge's feedback, or produces a revised spec. When a new spec is detected, it goes to Judge again.
- **Edge cases:**
  - Judge rejects same spec 3+ times → System prints "[System] The Judge has rejected 3 times. The unresolved issues are: [list issues from latest rejection]. Your direct input is needed." Conversation continues — this is informational, not a block.
  - User wants to override Judge and accept the spec anyway → User types "/approve" at any prompt. System saves current spec draft (even if rejected) to `project/spec-override.md`. Prints "Spec saved with user override. Judge did not approve this version." Exits.

### Resume interrupted session

- **Precondition:** A `project/conversation.json` file exists from a previous interrupted session.
- **Action:** User runs `node kith.js --resume`.
- **Expected outcome:** System loads conversation history from JSON. Prints "[System] Resuming session. [N] messages loaded." Sends the full conversation history to the Spec Writer for the next turn. Conversation continues from where it left off.
- **Edge cases:**
  - No conversation.json exists → System prints "No session to resume. Starting new project." Starts normally.
  - conversation.json is corrupted (invalid JSON) → System prints "Session file is corrupted. Starting new project." Starts normally. Does not delete the corrupted file (user might want to recover manually).

## File structure

```
kith/
├── kith.js              # Entry point. CLI loop + Router logic.
├── agents/
│   ├── spec-writer.md   # Spec Writer system prompt (exists already)
│   └── spec-judge.md    # Judge system prompt (exists already)
├── lib/
│   ├── claude.js        # Anthropic API wrapper. sendMessage(systemPrompt, messages) → response string.
│   └── router.js        # Spec detection, extraction, Judge routing, verdict parsing.
├── project/             # Created per project. Gitignored.
│   ├── conversation.json       # Full conversation history (for resume + future analysis)
│   ├── spec-approved.md        # Final approved spec (written on approval)
│   ├── spec-override.md        # User-overridden spec (written on /approve)
│   └── judge-history.json      # Array of Judge evaluations [{verdict, feedback, timestamp}]
└── package.json
```

## Constraints

### What this system does NOT do
- Does not implement code from the spec (Phase 2 — Coder agent)
- Does not have a web UI (CLI only for MVP)
- Does not support file attachments (text input only — file support is in the JSX artifact, not in this CLI MVP)
- Does not use A2A protocol (direct API calls only)
- Does not use a Context Compiler LLM (the Router is plain code)
- Does not learn from feedback (Principle Evolution is Phase 3)
- Does not support multiple concurrent projects (one project/ directory at a time)
- Does not stream responses (waits for full response, then prints — streaming is a UX polish, not an MVP requirement)

### Technical requirements
- Node.js (Maria's stack)
- Anthropic API via raw fetch (no SDK — consistent with Week 1 learning exercises)
- Claude Sonnet for both agents (fast, cheap, good enough for spec writing and judging)
- Agent system prompts loaded from .md files on disk (agents/spec-writer.md, agents/spec-judge.md)
- All state persisted to JSON files in project/ directory
- No database. No framework. No build step.

### Performance expectations
- Spec Writer response: 3-15 seconds (depends on Claude Sonnet latency)
- Judge evaluation: 5-20 seconds (longer responses due to detailed feedback)
- Spec detection + routing: <100ms (string matching, no LLM call)
- Full session (idea → approved spec): 10-25 minutes typical, depending on spec complexity

## Acceptance criteria

- [ ] `node kith.js` starts a conversation. User types an idea. Spec Writer asks first clarifying question.
- [ ] Spec Writer asks one question at a time (never lists multiple questions in one response)
- [ ] After 8-15 turns, Spec Writer produces a markdown spec in the defined format
- [ ] Router detects the spec and sends ONLY the markdown to Judge (verified by logging Judge's input to judge-history.json)
- [ ] Judge returns APPROVED or REJECTED with structured feedback
- [ ] On REJECTED: feedback is shown to user, conversation resumes, Spec Writer addresses the feedback
- [ ] On APPROVED: spec saved to project/spec-approved.md, program exits
- [ ] Revision loop works end to end: idea → draft → rejected → revised → approved
- [ ] `/approve` override works: saves rejected spec to project/spec-override.md
- [ ] `--resume` flag restores a previously interrupted session
- [ ] API error during conversation saves state and suggests --resume
- [ ] Empty input at any prompt is re-prompted (never sent to API)
- [ ] Judge rejection count is tracked. After 3 rejections, system surfaces the stuck issues.

## Test scenarios

### Scenario 1: Happy path (SHOULD APPROVE in 1-2 Judge rounds)
- User describes a simple timer app (well-scoped, single feature)
- Spec Writer interviews in ~10 questions
- Judge approves first draft or after one minor revision
- Spec saved to project/spec-approved.md

### Scenario 2: Vague user (SHOULD take 3+ Judge rounds)
- User describes "a note taking app" with no details
- Spec Writer has to extract everything through persistent questioning
- First spec draft has gaps (because user gave vague answers)
- Judge rejects. Spec Writer asks user for missing details. Revises. Eventually approved.

### Scenario 3: User override
- User describes something. Spec Writer drafts. Judge rejects.
- User disagrees with Judge and types `/approve`
- Spec saved to project/spec-override.md with override note

### Scenario 4: Interrupted session
- User starts conversation. After 5 messages, kills the process (Ctrl+C or API error)
- conversation.json exists with 5 messages
- User runs `node kith.js --resume`. Conversation continues from message 6.

### Scenario 5: Information barrier verification
- After a full session, open judge-history.json
- Verify: Judge's input contains ONLY the spec markdown. No conversation excerpts, no user messages, no "the user mentioned..." references.

## Open questions

- **Graceful Ctrl+C handling:** Should the process trap SIGINT to save conversation.json before exit, or is "save on every turn" sufficient? (Leaning toward: save after every exchange. Then Ctrl+C always has a resumable state.)
- **Token tracking:** Should the system log tokens used per agent per turn? (Yes for future cost analysis, but not blocking for MVP. Add as a nice-to-have if time permits.)

---

*End of MVP Phase 1 specification v2*
