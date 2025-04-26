# Supabase Refactor: DevQuizBattle

## Overview

This project uses Supabase for all backend/database interactions, including authentication, real-time updates, and CRUD operations for game data. To improve maintainability and scalability, all Supabase-related logic has been refactored into separate files under the `lib/` directory, with one file per database table or major concern.

## Supabase Functionalities

### 1. Supabase Client Initialization & Context

- `lib/supabase-provider.tsx`: Provides a React context for the Supabase client and user session, handling authentication state and exposing `supabase`, `user`, and `loading` via `useSupabase()`.

### 2. Server-Side Supabase Client

- `lib/supabase-server.ts`: Exports `createServerSupabase()` for server-side Supabase access using cookies.

### 3. Profiles Table

- Handles user profile management (username, avatar, etc.).
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

- Calling Supabase Postgres functions:
  - `calculate_score` (for time-based scoring).
  - `generate_unique_game_code` (for unique game room codes).

### 10. State Rules

- Only the host can start the game.
- Players must join before the game starts.
- Game state and player list are kept in sync via real-time events.
- Scores and leaderboard update live.

## Refactor Approach

- All logic for interacting with a specific table (CRUD, real-time, helpers) is moved to a dedicated file in `lib/` (e.g., `lib/supabase-profiles.ts`, `lib/supabase-games.ts`, etc.).
- Shared logic and types remain in `types/supabase.ts`.
- All existing functionalities and real-time event handling are preserved.
- Error handling is improved where possible during the refactor.

---

This structure ensures a clear separation of concerns, making the codebase easier to maintain and extend as the project grows.
