# Architecture Overview

[← Back to README](../README.md)

This document provides a high-level overview of the architecture for Dev Quiz Battle.

---

## Main Layers

- **Frontend (Next.js App Router)**

  - All UI and routing logic is in the `app/` directory.
  - Uses React Server Components and Client Components for optimal performance and interactivity.

- **Component Library**

  - UI is built with shadcn/ui and Radix UI primitives for accessibility and modern design.
  - Custom components are in `components/`.

- **State Management**

  - React hooks and context (see `hooks/` and `components/convex-provider.tsx`).
  - Real-time updates via Convex subscriptions.

- **Backend (Convex)**

  - Authentication, database, and real-time features are handled by Convex.
  - All backend logic is in `convex/` (queries, mutations, actions, schema).

- **Styling**
  - Tailwind CSS v4 with OKLCH color variables for theme support.
  - Custom utilities and variants in `app/globals.css`.

## Data Flow

1. **User Authentication**
   - Managed by Convex Auth.
   - User state is provided via context.
2. **Game Creation & Joining**
   - Users can create or join games via forms.
   - Game and player data is stored in Convex tables.
3. **Real-Time Game Play**
   - Game state, player actions, and answers are synced in real-time using Convex subscriptions.
4. **Question Generation**
   - AI-generated questions via Groq API (see `lib/groq.ts` and `convex/actions/questions.ts`).
5. **Score Calculation & Leaderboard**
   - Scores are calculated and persisted in Convex.
   - Leaderboard is queried from Convex with pagination and filtering.

## Directory Structure

- `app/` — Routing, pages, layouts
- `components/` — UI and feature components
- `convex/` — Backend (queries, mutations, actions, schema)
- `lib/` — Utilities, helpers, types
- `hooks/` — Custom React hooks
- `public/` — Static assets

---

See also:

- [Convex Integration](./convex.md)
- [UI Components](./components.md)
- [Game Logic](./game-logic.md)

[← Back to README](../README.md)
