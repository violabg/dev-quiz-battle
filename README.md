# Supabase Refactor: DevQuizBattle

## Overview

This project uses Supabase for all backend/database interactions, including authentication, real-time updates, and CRUD operations for game data. All Supabase-related logic is organized in the `lib/` directory, with one file per database table or major concern. The project is built with Next.js (v15), React (v19), TypeScript (v5), and Tailwind CSS v4, and uses shadcn/ui and Radix UI for modern, accessible UI components.

## Project Structure

- `app/` — Next.js app directory (routing, pages, layouts)
- `components/` — UI and game components (including shadcn/ui and Radix UI wrappers)
- `lib/` — Supabase logic, helpers, and hooks (one file per table/concern)
- `types/` — Shared TypeScript types (notably `supabase.ts`)
- `public/` — Static assets
- `setup.sql` — Database schema and Postgres functions
- `scripts/` — Utilities (e.g., seed data)

## Main Dependencies

- Next.js 15, React 19, TypeScript 5
- Tailwind CSS v4 (OKLCH color, gradients, modern features)
- Supabase (auth, realtime, Postgres)
- @ai-sdk/groq, @ai-sdk/react, ai (AI question generation)
- react-hook-form, zod (forms & validation)
- Radix UI, shadcn/ui, lucide-react, sonner, class-variance-authority, clsx, tailwind-merge, tw-animate-css

## Environment Variables

Create a `.env` file in the project root with the following keys. **Do not share your real secrets.** Example values are masked:

```env
POSTGRES_URL="postgres://postgres:***@host:6543/postgres?..."
POSTGRES_PRISMA_URL="postgres://postgres:***@host:6543/postgres?..."
SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
POSTGRES_URL_NON_POOLING="postgres://postgres:***@host:5432/postgres?..."
SUPABASE_JWT_SECRET="***"
POSTGRES_USER="postgres"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJI...***"
POSTGRES_PASSWORD="***"
POSTGRES_DATABASE="postgres"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJI...***"
POSTGRES_HOST="db.your-project.supabase.co"
GROQ_API_KEY="gsk_***"
```

## Supabase Functionalities

### 1. Supabase Client Initialization & Context

- `lib/supabase-provider.tsx`: Provides a React context for the Supabase client and user session, handling authentication state and exposing `supabase`, `user`, and `loading` via `useSupabase()`.

### 2. Server-Side Supabase Client

- `lib/supabase-server.ts`: Exports `createServerSupabase()` for server-side Supabase access using cookies.

### 3. Profiles Table

- Handles user profile management (user_name, avatar, etc.).
- CRUD operations for profiles (insert, select, check existence).

### 4. Games Table

- Game creation (host, status, max players, etc.).
- Fetching and updating game state.

### 5. Game Players Table

- Adding players to games.
- Fetching all players for a game, including their profiles.
- Managing turn order and player activity.

### 6. Questions Table

- Inserting and fetching coding questions (language, difficulty, code sample, options, etc.).
- Real-time subscription to question changes (insert, update, delete).

### 7. Answers Table

- Inserting and fetching answers for questions.
- Scoring and response time tracking.

### 8. Supabase Realtime

- Real-time subscriptions for:
  - `game_players` (player join/leave, updates).
  - `questions` (new questions, updates, deletions).
  - Other tables for live game state and leaderboard updates.

### 9. Database Functions

- `calculate_score` — Calculates score based on response time and time limit.
- `generate_unique_game_code` — Generates a unique game room code.
- `get_leaderboard_players` — Returns leaderboard player data (id, score, user_name, avatar).
- `get_user_profile_with_score` — Returns a user's profile and total score.

### 10. State Rules

- Only the host can start the game.
- Players must join before the game starts.
- Game state and player list are kept in sync via real-time events.
- Scores and leaderboard update live.
