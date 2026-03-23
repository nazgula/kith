# Kith MVP Phase 1 — Spec v2 Appendix Update

**Context for Claude Code:** This updates the Web UI appendix (`kith-mvp-spec-v2-appendix-ui.md`). The app has moved ahead of the original spec in some areas and behind it in others. This document describes the delta — what exists now, what changed, and what to build next.

Read this AFTER the original appendix. Where they conflict, this document wins.

---

## What exists now (spec didn't cover these)

### Project management

The app supports multiple projects. Users can create a new project and reopen an old one. Each project has its own conversation history that persists across sessions.

This is correct behavior and should remain. Update the original appendix constraint from "Does not support multiple concurrent projects (one project/ directory at a time)" to:

> Users can create new projects and reopen previous ones. Each project has its own isolated conversation, Judge history, and produced specs. The UI provides a way to switch between projects.

Data storage per project (adapt to whatever structure already exists):
- Conversation history (all messages: user, Spec Writer, Judge, system)
- Judge evaluation history (all verdicts + feedback)
- Produced specs (drafts and approved versions)

### Auto-revision loop

The revision loop is now fully automated. After the Judge rejects:

1. Judge feedback is forwarded to the Spec Writer as an internal message (NOT shown as a user bubble in the chat)
2. Spec Writer responds immediately — either asks the user a targeted question or produces a revised spec
3. If a revised spec is detected, the Router sends it to the Judge automatically
4. Loop continues until: Judge approves, user types `/approve`, or user intervenes with a message

No changes needed — this is working correctly.

---

## What to build next

### 1. Approved spec viewer + download

When the Judge approves a spec (or user overrides with `/approve`), the spec must be viewable in the UI and downloadable.

**Behavior:**

- **Trigger:** Judge returns `APPROVED` verdict, OR user types `/approve`
- **Action:** System extracts the spec markdown from the latest Spec Writer response that contained a spec
- **Expected outcome:**
  - The spec is displayed in the UI in a distinct panel or modal — not as another chat bubble. It should look like a document, not a message. Render the markdown (headings, bold, lists, code blocks) — do not show raw markdown text.
  - A "Download as .md" button is visible. Clicking it downloads the spec markdown as a `.md` file. Filename: `[project-name]-spec.md` (slugified project name). If no project name exists, use `spec-[timestamp].md`.
  - The spec is also saved to the project's persistent storage (so it's available when the user reopens the project later)
  - The chat shows a system message: "Spec approved! View and download below." (or similar — links/scrolls to the spec panel)

- **Edge cases:**
  - User reopens a project that has an approved spec → the spec panel/viewer is visible immediately, not just the chat history
  - User overrides with `/approve` but no spec draft exists → system message: "No spec to approve yet. Continue the interview." (this already exists per the original appendix)
  - Spec contains special characters or very long content → markdown renderer handles gracefully, download produces a valid .md file

**What this is NOT:**
- Not an editor. The user cannot edit the spec in the viewer. To revise, they continue the conversation.
- Not a PDF export. Just `.md` for now.

### 2. Sticky prompt box

The prompt input box must remain fixed at the bottom of the viewport at all times. It should not scroll out of view when the conversation is long.

**Implementation:** `position: sticky` with `bottom: 0` on the prompt container, or `position: fixed` with appropriate bottom padding on the chat scroll area so the last message isn't hidden behind the input.

The chat area should scroll independently. When a new message is added, it auto-scrolls to the bottom.

---

## What is explicitly NOT changing

- **File upload:** Not in scope. Users paste text into the chat input. The prompt box accepts multi-line input (paste works). No file picker, no drag and drop.
- **Streaming:** Not in scope for MVP (per original appendix). Wait for full response, then render.
- **Agent selection UI:** System always uses Spec Writer + Judge. No choice needed.
- **The agent definitions (spec-writer.md, spec-judge.md):** No changes. They work as-is.
- **The Router logic:** No changes. Spec detection, extraction, verdict parsing — all working.

---

## Updated test scenarios

Add these to the existing test list in the original appendix:

**Test G: Spec viewer and download on approval**
1. Complete a full interview. Judge approves.
2. Verify: spec appears in a rendered viewer (not raw markdown, not a chat bubble).
3. Verify: "Download as .md" button is visible and works.
4. Verify: downloaded file contains the full spec markdown, valid formatting.

**Test H: Spec viewer on project reopen**
1. Complete a full interview until approval.
2. Close the app / navigate away.
3. Reopen the project.
4. Verify: approved spec is visible in the viewer without replaying the conversation.

**Test I: Revision loop runs to completion**
1. Start an interview about something deliberately vague.
2. Give vague answers. Let the Spec Writer draft a weak spec.
3. Judge rejects. Verify: Spec Writer responds automatically (no user input needed between rejection and Spec Writer's next message).
4. If Spec Writer asks a question, answer it. If Spec Writer revises, verify Judge re-evaluates automatically.
5. Continue until approved or type `/approve` to end.

**Test J: Sticky prompt box**
1. Have a conversation with 30+ messages (long enough to scroll).
2. Scroll to the top of the conversation.
3. Verify: prompt box is still visible at the bottom of the viewport.
4. Type and submit a message from this scrolled position. Verify: it works.

---

*Read alongside: kith-mvp-spec-v2.md, kith-mvp-spec-v2-appendix-ui.md, agents/spec-writer.md, agents/spec-judge.md*
