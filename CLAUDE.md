# Kith

> For system architecture, see `docs/architecture.md`

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

## Context & Session Management

- If context is getting heavy and data is being lost, create a breakpoint:
  1. Commit current working state
  2. Write a handoff document for the next session
  3. Stop and resume in a new session

## Merge Workflow

When ready to merge a branch into main:

1. Push the branch and open a PR: `gh pr create --base main --fill`
2. Wait for CI checks (lint, typecheck, tests) — they must all pass
3. Copilot reviews automatically — wait ~30 seconds
4. Check for review comments: `gh pr view --comments`
5. If Copilot left comments:
   - Read each comment
   - Fix the code
   - Commit and push: `git add -A && git commit -m "address review feedback" && git push`
   - Copilot re-reviews on new push. Repeat from step 4.
6. If CI passes and no unresolved comments: `gh pr merge --squash --delete-branch`

Do not merge if CI is failing. Fix the issue first.

## Next.js Notes

> This project uses Next.js 16 with the App Router. APIs and conventions may differ from older versions. Before writing any Next.js-specific code, check `node_modules/next/dist/docs/` for up-to-date guidance.
