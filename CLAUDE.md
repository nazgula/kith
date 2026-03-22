# Kith — Agent Collaboration Platform

## Project Overview

**Kith** is a collaboration platform where AI agents with distinct roles form task forces to work on projects together. Each agent operates within a defined role (e.g., planner, researcher, executor, reviewer) and coordinates with other agents to accomplish shared goals. The platform manages agent sessions, task delegation, inter-agent communication, and project state.

## Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | TypeScript 5 |
| UI | React 19 |
| Styling | Tailwind CSS 4 |
| Linting | ESLint 9 (eslint-config-next) |
| Package Manager | npm |

## Project Structure

```
src/
  app/           # Next.js App Router pages and layouts
    layout.tsx   # Root layout
    page.tsx     # Home page
  components/    # Shared React components
  lib/           # Utilities, helpers, business logic
  types/         # Shared TypeScript types
public/          # Static assets
```

## Key Concepts

- **Agent** — an AI participant with a defined role and capabilities
- **Role** — the function an agent plays in a task force (e.g., Planner, Researcher, Executor, Critic, Coordinator)
- **Task Force** — a group of agents assembled to work on a specific project or goal
- **Project** — the top-level unit of work, containing tasks, agents, and shared context
- **Task** — a discrete unit of work delegated to one or more agents
- **Handoff** — the passing of context or work from one agent to another

## Development

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Conventions

- Use the App Router (`src/app/`) — no Pages Router
- Co-locate components with their route when single-use; shared components go in `src/components/`
- Prefer server components by default; use `"use client"` only when needed (interactivity, browser APIs)
- Tailwind utility classes only — no custom CSS files unless absolutely necessary
- TypeScript strict mode — no `any`, no `@ts-ignore`
- All agent/task/project domain types live in `src/types/`

## Next.js Notes

> This project uses Next.js 16 with the App Router. APIs and conventions may differ from older versions. Before writing any Next.js-specific code, check `node_modules/next/dist/docs/` for up-to-date guidance.
