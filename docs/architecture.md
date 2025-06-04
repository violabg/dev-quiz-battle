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

  - React hooks and context (see `lib/hooks/` and `lib/supabase/supabase-provider.tsx`).
  - Real-time updates via Supabase subscriptions.

- **Backend (Supabase)**

  - Authentication, database, and real-time features are handled by Supabase.
  - All database logic is in `lib/supabase/`.

- **Styling**
  - Tailwind CSS v4 with OKLCH color variables for theme support.
  - Custom utilities and variants in `app/globals.css`.

## Data Flow

1. **User Authentication**
   - Managed by Supabase Auth.
   - User state is provided via context.
2. **Game Creation & Joining**
   - Users can create or join games via forms.
   - Game and player data is stored in Supabase tables.
3. **Real-Time Game Play**
   - Game state, player actions, and answers are synced in real-time using Supabase channels.
4. **Question Generation**
   - AI-generated questions via Groq API (see `lib/groq.ts`).
5. **Score Calculation & Leaderboard**
   - Scores are calculated and persisted in Supabase.
   - Leaderboard is paginated and filterable.

## Directory Structure

- `app/` — Routing, pages, layouts
- `components/` — UI and feature components
- `lib/` — Supabase logic, hooks, utilities
- `types/` — TypeScript types
- `public/` — Static assets

---

See also:

- [Supabase Integration](./supabase.md)
- [UI Components](./components.md)
- [Game Logic](./game-logic.md)

[← Back to README](../README.md)
