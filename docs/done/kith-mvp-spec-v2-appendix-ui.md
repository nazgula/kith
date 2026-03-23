# Kith MVP Phase 1 — Spec v2 Appendix: Web UI

**Context for Claude Code:** This appendix extends `kith-mvp-spec-v2.md` to use the existing Next.js web UI instead of a CLI. The core logic is identical — Spec Writer interviews user, Router detects spec and sends ONLY the spec markdown to Judge, revision loop until approved. The change is the interface layer.

You already have a chat UI with a prompt box. The job is to wire it to the two-agent flow described below. Do NOT build a generic agent framework. Build exactly this flow.

---

## What changes from the CLI spec

The CLI spec has `kith.js` as a terminal REPL. Replace that with the existing Next.js chat interface. Everything else stays the same:

- Spec Writer and Judge are still separate Claude Sonnet calls with system prompts loaded from `agents/spec-writer.md` and `agents/spec-judge.md`
- The Router is still plain TypeScript code (not an LLM) — it detects specs via string matching and routes to Judge
- The information barrier is still enforced — Judge receives ONLY the spec markdown string
- Conversation history and Judge evaluations are still persisted

---

## UI behavior

### Chat area

The existing chat area shows the conversation. Three visual sources need to be distinguishable:

1. **User messages** — right-aligned (probably already styled this way)
2. **Spec Writer messages** — left-aligned with a label/badge: `Spec Writer`
3. **System messages** — centered or left-aligned, visually distinct (muted color, smaller text, no bubble). Used for: "Sending to Judge...", "Judge rejected — feedback below", "Spec approved and saved", "Session resumed (N messages loaded)"
4. **Judge messages** — left-aligned with a label/badge: `Judge`. Only appears when the Judge returns a verdict. User does not converse with Judge — these are read-only evaluation results inserted into the chat flow.

The label/badge approach: a small colored tag above or beside the message bubble. Spec Writer = one color, Judge = another, System = muted/gray. Exact colors are your call — just make them visually distinct.

### Prompt box

The existing prompt box sends messages to the Spec Writer. No changes to basic behavior except:

- Empty submit → do nothing (no API call)
- While waiting for Spec Writer or Judge response → disable the input, show a loading indicator in the chat area (a typing indicator or "thinking..." message)
- `/approve` command → triggers override flow (see below). Not sent to Spec Writer.

### Session start

When the user first loads the page with no active session:

- Chat area shows one system message: "What are you building? Describe your idea."
- User types in prompt box, submits
- First message goes to Spec Writer. Conversation loop begins.

When the user loads the page with an existing session (conversation history exists):

- Chat area renders all previous messages from stored history
- System message at top: "Session restored — N messages loaded"
- Conversation continues from where it left off

---

## Routing logic (this is application code, NOT an LLM)

After every Spec Writer response, the Router checks for a spec draft.

**Detection rule:** Response contains the string `## Behaviors` AND contains at least one `### ` subheading after it.

**If spec detected:**
1. Insert system message in chat: "Spec draft detected. Sending to Judge..."
2. Extract the spec markdown from the response. Try regex: `/```markdown\n([\s\S]*?)```/` first (spec inside code fence). Fallback: `/^(# .+[\s\S]*)/m` (spec starts at first `# ` heading).
3. Send ONLY the extracted markdown string to the Judge API call. No conversation history. No user messages. Just the markdown.
4. Wait for Judge response.
5. Parse Judge response for verdict: check if it contains `Verdict: APPROVED` or `Verdict: REJECTED` (case-insensitive search).

**If APPROVED:**
- Insert Judge message in chat (full response with strengths + scenario seeds)
- Insert system message: "Spec approved!"
- Save spec to persistent storage (see Data section below)
- Optionally show a "Copy spec" or "Download spec" button in the system message

**If REJECTED:**
- Insert Judge message in chat (full response with issues + scenario seeds)
- Insert system message: "Judge rejected the spec. Discuss the feedback with the Spec Writer, or type /approve to override."
- Append Judge feedback to Spec Writer's conversation context as: `"The Judge rejected your spec with this feedback:\n\n[full judge response]\n\nAddress these issues — either by asking the user for clarification or by revising the spec directly."`
- Re-enable prompt box. User continues talking to Spec Writer.
- Track rejection count. After 3 rejections, system message: "The Judge has rejected 3 times. Your direct input is needed on the unresolved issues above."

**If verdict can't be parsed:**
- Treat as REJECTED. Insert system message: "Judge response format unexpected. Treating as rejection."

---

## /approve override

When user types `/approve` in the prompt box:

- Do NOT send to Spec Writer
- If a spec draft exists (Router has previously extracted one): save it as the overridden spec. Insert system message: "Spec saved with user override. The Judge did not approve this version."
- If no spec draft exists yet: insert system message: "No spec to approve yet. Continue the interview."

---

## API layer

Create a server-side API route (or server action — your call based on what fits the existing project) that:

1. Accepts: system prompt path (string), messages array (conversation history)
2. Reads the system prompt .md file from disk
3. Calls Anthropic API (Claude Sonnet) with the system prompt and messages
4. Returns the response text

Both the Spec Writer and Judge use this same API function. The only difference is which system prompt file is loaded and which messages are passed.

**Anthropic API call shape:**
```typescript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01"
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: systemPromptContent,
    messages: messages
  })
});
```

API key goes in `.env.local` as `ANTHROPIC_API_KEY`. The key must never reach the client — all API calls happen server-side.

---

## Data persistence

Use the filesystem for MVP. Store in a `data/` directory at project root (gitignored).

```
data/
├── conversation.json     # Array of {role, content, agent, timestamp}
├── judge-history.json    # Array of {verdict, feedback, specMarkdown, timestamp}
└── spec-approved.md      # Written on approval (or spec-override.md on /approve)
```

- Save conversation.json after every message exchange (both user message and agent response)
- Save judge-history.json after every Judge evaluation
- On page load, read conversation.json to restore session

If you prefer a different persistence approach that fits the existing project better (e.g., server actions writing to disk, or a simple SQLite), go ahead — the requirement is: conversation survives page refresh, Judge history is logged, approved spec is saved as a .md file.

---

## File placement

Based on the existing project structure:

```
src/
  app/
    page.tsx                  # Chat UI (may already exist — wire to the flow)
    api/
      chat/route.ts           # API route for Spec Writer messages
      judge/route.ts          # API route for Judge evaluation
  components/
    ChatMessage.tsx           # Message bubble with agent badge
    SystemMessage.tsx         # Muted system status messages
    ChatInput.tsx             # Prompt box (may already exist)
  lib/
    router.ts                 # Spec detection, extraction, verdict parsing
    claude.ts                 # Anthropic API wrapper
    storage.ts                # Read/write conversation.json, judge-history.json
  types/
    chat.ts                   # Message, JudgeResult, SessionState types
agents/
  spec-writer.md              # Already exists
  spec-judge.md               # Already exists
data/                         # Gitignored runtime data
  conversation.json
  judge-history.json
```

Adapt this to whatever already exists. If components or routes are already partially built, use them. Don't duplicate.

---

## What is explicitly NOT in scope

- Streaming responses (wait for full response, then render — add streaming later as polish)
- File attachments in the UI (the JSX artifact has this — the MVP CLI/web does not)
- Multiple projects (one session at a time)
- Agent selection UI (the system always uses Spec Writer + Judge, no choice needed)
- Dark mode / theming (use whatever Tailwind defaults are set up)
- Authentication (single user, local)
- A2A protocol (direct API calls only)

---

## Testing — two layers

### Layer 1: Judge calibration (agents/judge-test-fixtures.md — already exists, no changes needed)

These test the Judge agent's brain. Feed each fixture spec directly to the Judge API route and verify verdicts match. These work identically in CLI or web — they're just API calls with markdown in, verdict out.

**How to run in the web UI context:** Call `POST /api/judge` with each fixture's spec markdown as the body. Assert:
- Fixture 1 (timer app) → `APPROVED`
- Fixture 2 (vague notes app) → `REJECTED` with at least 3 critical issues
- Fixture 3 (expense tracker with auth gap) → `REJECTED`, but response mentions strengths

These can be automated as integration tests (Vitest + fetch against the running dev server) or run manually by pasting fixture specs into the Judge route.

### Layer 2: System flow tests (new — specific to web UI)

These test the plumbing: does the Router detect specs, does the handoff work, does persistence survive refresh, does the override command work. Run these manually through the UI.

**Test A: Happy path — full interview to approval**
1. Open the app. See "What are you building?" prompt.
2. Type: "A countdown timer for freelancers. Set minutes, start, pause, resume, get a notification when done."
3. Answer Spec Writer's questions (8-15 turns).
4. Spec Writer outputs a draft spec.
5. Verify: system message "Spec draft detected. Sending to Judge..." appears.
6. Verify: Judge message appears with verdict.
7. If REJECTED: continue conversation, Spec Writer revises, resubmit until approved.
8. On APPROVED: verify system message "Spec approved!", verify `data/spec-approved.md` exists on disk, verify `data/judge-history.json` has at least one entry.

**Test B: Information barrier**
1. Complete Test A.
2. Open `data/judge-history.json`.
3. Read the `specMarkdown` field of each entry.
4. Verify: it contains ONLY the markdown spec. No conversation fragments, no "the user said...", no Q&A pairs. Just the spec starting with `# `.

**Test C: Session persistence**
1. Start a conversation. Answer 3-4 questions.
2. Refresh the browser.
3. Verify: all previous messages are visible. System message "Session restored" appears.
4. Continue the conversation. Spec Writer picks up where it left off (doesn't re-ask questions you already answered — it has the full history).

**Test D: /approve override**
1. Start a conversation. Get to a spec draft. Judge rejects.
2. Type `/approve` in the prompt box.
3. Verify: system message "Spec saved with user override." appears.
4. Verify: `data/spec-override.md` exists on disk with the spec content.
5. Verify: message was NOT sent to Spec Writer (no Spec Writer response to "/approve").

**Test E: Empty and edge inputs**
1. Submit empty input (just hit Enter). Verify: nothing happens, no API call, no message in chat.
2. Submit `/approve` when no spec draft exists. Verify: system message "No spec to approve yet."
3. If API key is missing or invalid: verify error message appears in chat, conversation history is saved.

**Test F: 3x rejection escalation**
1. Start a conversation about something intentionally vague ("an app that does stuff").
2. Give vague answers. Let the Spec Writer draft a weak spec.
3. Judge rejects. Continue giving vague answers. Let it reject 3 times.
4. Verify: after 3rd rejection, system message surfaces unresolved issues.

---

*This appendix should be read alongside kith-mvp-spec-v2.md and the agent definitions in agents/spec-writer.md and agents/spec-judge.md. Judge calibration fixtures are in agents/judge-test-fixtures.md.*
