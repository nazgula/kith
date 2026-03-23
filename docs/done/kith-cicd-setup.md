# Kith CI/CD Setup — Instructions for Claude Code

## What to build

Three files. That's it.

### 1. `.github/workflows/ci.yml`

GitHub Actions workflow. Triggers on pull requests to `main`. Runs lint, typecheck, and tests. **This blocks merge** (via branch protection rule — Maria will enable manually in GitHub Settings).

```yaml
name: CI
on:
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test -- --run
```

If `npm test` or `npm run lint` or `tsc` commands don't exist yet in package.json, add them. Vitest for tests, ESLint for lint, tsc for typecheck. Check what's already configured before adding anything.

### 2. `.github/copilot-instructions.md`

Custom instructions for Copilot code review. This file tells Copilot what to look for when reviewing PRs. Keep it short — Copilot reads this on every review.

```markdown
# Copilot Review Instructions

## Project
Kith is a multi-agent collaboration platform. Next.js 16, TypeScript strict, React 19, Tailwind 4.

## Review priorities
1. Type safety — no `any`, no `@ts-ignore`, no type assertions without justification
2. Agent isolation — Spec Writer and Judge must never share context. The Judge receives ONLY the spec markdown. Flag any code that passes conversation history to the Judge.
3. Server/client boundary — API keys must never reach the client. All LLM calls happen server-side.
4. Error handling — every API call (Anthropic, file I/O) must have error handling. No unhandled promises.
5. State persistence — conversation and judge history must be saved after every exchange. Verify save calls exist.

## Conventions
- App Router only (src/app/)
- Tailwind utility classes only, no custom CSS files
- Shared components in src/components/, types in src/types/
- Prefer server components, use "use client" only when needed

## Do not flag
- Styling opinions (color choices, spacing, layout)
- Import ordering (not configured)
- Missing tests on UI components (tests focus on logic: router, storage, API)
```

### 3. Add to CLAUDE.md — merge workflow

Append this section to the existing CLAUDE.md:

```markdown
## Merge workflow

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
```

## Setup Maria needs to do manually (not automatable by Claude Code)

1. **Enable branch protection on `main`:**
   GitHub repo → Settings → Branches → Add rule for `main` →
   - ✅ Require status checks to pass before merging → select the `check` job
   - ✅ Require branches to be up to date before merging

2. **Enable automatic Copilot review:**
   GitHub repo → Settings → Rules → Rulesets → New branch ruleset →
   - Target: `main`
   - Under "Branch rules": ✅ Automatically request Copilot code review

3. **Verify Copilot plan supports code review:**
   Go to github.com/settings/copilot. Code review requires Copilot Pro or higher. If on basic plan, the review step simply won't trigger — CI still blocks merge, you just lose the AI review comments.
