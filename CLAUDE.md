# Kith

## Documentation Map

Read these when you need context beyond this file. Don't guess — check the relevant doc.

| File | What it is | When to read it |
|---|---|---|
| `CLAUDE.md` | This file — dev rules, conventions, commands | Auto-loaded every session |
| `AGENTS.md` | Shared agent config, how to add agents | Adding/modifying agents |
| `docs/architecture.md` | System design, current state, project structure, vision | Understanding what Kith is or planning new features |
| `agents/spec-writer.md` | Spec Writer system prompt (loaded at runtime) | Changing how the Writer interviews or drafts |
| `agents/spec-judge.md` | Judge system prompt (loaded at runtime) | Changing evaluation criteria or output format |
| `docs/done/architecture-spec.md` | Full Phase 1-3 design spec (agent defs, message schemas, protocols) | Designing new agents, communication, or data structures |
| `docs/done/` | Completed specs and session handoffs | Historical reference only |

## Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | TypeScript 5 |
| UI | React 19 |
| Styling | Tailwind CSS 4 |
| AI SDK | @anthropic-ai/sdk |
| Testing | Vitest |
| Linting | ESLint 9 (eslint-config-next) |
| Package Manager | npm |

## Development

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm test         # Run tests (Vitest)
```

### Running POC scripts

```bash
npx tsx --env-file=.env.local src/lib/poc/context-compiler.ts
npx tsx --env-file=.env.local src/lib/poc/agent-relevance.ts
```

### Running CLI (alternative to web UI)

```bash
npx tsx --env-file=.env.local src/cli/kith.ts
npx tsx --env-file=.env.local src/cli/kith.ts --resume
```

## Conventions

- Use the App Router (`src/app/`) — no Pages Router
- Co-locate components with their route when single-use; shared components go in `src/components/`
- Prefer server components by default; use `"use client"` only when needed (interactivity, browser APIs)
- Tailwind utility classes only — no custom CSS files unless absolutely necessary
- TypeScript strict mode — no `any`, no `@ts-ignore`
- Domain types live in `src/types/`
- Agent system prompts are `.md` files in `agents/`
- Light mode by default; dark mode via `.dark` class on `<html>`

## Working Rules

- **Do not change architecture without asking explicitly**
- **Do not install libraries without asking explicitly**
- **Prefer short, concise solutions when possible**
- **Never read `.env` files to extract secrets** — configure tools to load them (e.g. Vite's `loadEnv`, Node's `--env-file`)

## Git & Branching

- **Branch per feature** — work on feature branches, not main
- **Atomic commits** — each commit should be a coherent, working unit
- **Commit often** — especially before starting risky changes

## Testing

- All tests run via `npm test` (Vitest)
- Write unit tests for new logic. Write live SDK tests for agent behavior (use Haiku for cost).
- **Run tests and fix until all pass before committing**
- If a test fails twice after attempted fixes, stop and reconsider the approach
- If a previously passing test breaks, consider rolling back to the last working commit and trying a different approach
- After 2 failed rollback-and-rewrite attempts, stop and ask for guidance
- **Never install new libraries just to make a test pass**

## Spec Lifecycle

When a spec in `docs/` (NOT `docs/architecture.md`) has been fully built and all tests pass:
1. Move the spec file to `docs/done/`
2. Commit the move

If the spec was **partially** implemented (some features built and tested, others not):
1. Do NOT move the spec file
2. Add an `## Open Issues` section at the bottom of the spec listing what's missing
3. Inform the user: "Spec partially implemented. Open issues added to [filename]. Please review."
4. Wait for the user to handle the open issues
5. When all open issues are resolved and tests pass, remove the `## Open Issues` section and move to `docs/done/`

## Context & Session Management

- If context is getting heavy and data is being lost, create a breakpoint:
  1. Commit current working state
  2. Write a handoff document to `docs/` summarizing: what was done, what's in progress, what's next, any gotchas
  3. Tell the user: "Context is getting heavy. I've committed and written a handoff. Please start a new session — the handoff doc has everything needed to continue."

## Merge Workflow

When ready to merge a branch into main, run this loop until the PR is merged:

1. Push the branch and open a PR: `gh pr create --base main --fill`
2. **Poll CI until complete:** run `gh pr checks <number>` — wait ~60 seconds between checks. Do not proceed until CI passes.
3. If CI fails: read the failure, fix the code, commit and push, go back to step 2.
4. Once CI passes, check for Copilot review comments: `gh api repos/{owner}/{repo}/pulls/{number}/comments`
5. If Copilot left comments:
   - Read each comment
   - Fix the code
   - Commit and push
   - Go back to step 2 (CI re-runs, Copilot re-reviews)
6. If CI passes and no unresolved comments: `gh pr merge --squash --delete-branch`

**This is a continuous loop — do not stop and ask the user between steps.** Keep polling and fixing until the PR is merged or a problem requires user input.

## Next.js Notes

> This project uses Next.js 16 with the App Router. APIs and conventions may differ from older versions. Before writing any Next.js-specific code, check `node_modules/next/dist/docs/` for up-to-date guidance.
