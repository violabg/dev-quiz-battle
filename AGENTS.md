# Copilot Instructions

## Project Snapshot

- Stack: Next.js 16.1.6, React 19.2.4, TypeScript 5.9, Tailwind CSS 4, Convex, Convex Auth, Groq AI.
- Package manager: prefer `pnpm` because the repo is checked in with `pnpm-lock.yaml`.
- The app is a real-time multiplayer coding quiz game with Next.js App Router on the frontend and Convex for backend, auth, data, and realtime updates.
- Use the existing docs as the source of truth for feature details. Link to them instead of restating large sections in code comments or generated docs.

## Working Rules

- Prefer minimal, targeted edits that preserve the existing architecture and visual language.
- Follow repo conventions before generic framework conventions when they differ.
- Do not add example/demo files unless explicitly requested.
- Do not invent tests or commands that are not present in the repo.
- If a task touches Next.js behavior, prefer current Next.js 16 patterns.

## Commands

- Install dependencies: `pnpm install`
- Start Next.js dev server: `pnpm dev`
- Build: `pnpm build`
- Start production server: `pnpm start`
- Lint: `pnpm lint`
- AI SDK DevTools: `pnpm devAi`
- Convex dev workflow also requires a separate terminal running `npx convex dev`

## Architecture Boundaries

- `app/`: App Router routes, layouts, and route-level composition.
- `components/`: shared UI, auth, game, theme, and layout components.
- `convex/`: schema, auth, queries, mutations, and actions.
- `lib/`: shared utilities, domain types, Groq integration, and several game hooks under `lib/hooks/`.
- `hooks/`: lightweight user-facing hooks only. Most game logic hooks live in `lib/hooks/`, not here.
- `docs/`: architecture, API, styling, component, and game-logic documentation.

Key references:

- [README.md](./README.md)
- [docs/architecture.md](./docs/architecture.md)
- [docs/api.md](./docs/api.md)
- [docs/convex.md](./docs/convex.md)
- [docs/components.md](./docs/components.md)
- [docs/game-logic.md](./docs/game-logic.md)
- [docs/styling.md](./docs/styling.md)
- [docs/contributing.md](./docs/contributing.md)

## Code Conventions

- Use functional React components and arrow functions.
- Prefer `type` over `interface`.
- Use TypeScript throughout and keep changes compatible with strict typing, even though the current build is configured to ignore type errors.
- Use Zod for validation and React Hook Form for forms.
- Use Convex APIs for backend interactions rather than ad hoc fetch layers.
- Server Components are the default. Add `"use client"` only where interactivity, hooks, or browser APIs require it.
- In App Router dynamic routes, handle async route props correctly. This codebase already uses `params: Promise<...>` in places.

## UI And Styling

- Tailwind CSS v4 only. Do not use deprecated Tailwind v3-era patterns.
- In CSS files, color variables must use OKLCH values.
- In JSX and TSX, Tailwind utility classes and existing semantic utilities are preferred.
- Preserve the current visual language: gradients, glass effects, bordered cards, and light/dark theme support.
- Prefer the existing component primitives in `components/ui/` and the current Base UI based patterns over introducing a different component system.

## Convex-Specific Guidance

- Queries belong in `convex/queries/`, mutations in `convex/mutations/`, and external-service logic in `convex/actions/`.
- Convex actions that need Node.js APIs or server-only libraries must keep `"use node"` at the top.
- Reuse generated API and data model types from `convex/_generated/` instead of recreating shapes manually.
- Authentication uses Convex Auth. Follow the existing auth flow patterns rather than adding separate auth state management.
- Be careful around multiplayer answer submission and turn progression logic. There are concurrency-sensitive paths in the Convex mutations.

## Known Gotchas

- `next.config.mjs` currently ignores TypeScript build errors. Do not treat a successful build as proof that types are correct.
- There is no test runner configured yet. Validate changes with linting, local builds, and focused manual checks.
- Some docs or comments may lag behind the actual package versions. Prefer `package.json` and current source code when they conflict.
- Missing Convex or Groq environment variables can fail indirectly. Check `.env.local` expectations in [README.md](./README.md).
- The repo mixes `hooks/` and `lib/hooks/`; check both before adding new hook logic.

## Exemplar Files

- App shell and providers: `app/layout.tsx`
- Global theme and utility classes: `app/globals.css`
- Auth form pattern: `components/auth/login-form.tsx`
- Game orchestration pattern: `components/game/game-room.tsx`
- Convex schema: `convex/schema.ts`
- Convex auth setup: `convex/auth.ts`
- Convex Node action pattern: `convex/actions/questions.ts`
- Shared domain types: `lib/convex-types.ts`

## When Updating Docs

- Prefer linking to the existing files in `docs/` instead of duplicating feature explanations.
- Update docs when behavior or public developer workflow changes.
- If you find conflicting guidance, align AGENTS.md to the actual code and then update the stale doc closest to the source of truth.
