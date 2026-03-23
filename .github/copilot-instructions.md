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
