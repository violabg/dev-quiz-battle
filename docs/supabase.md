# Supabase Integration

[← Back to README](../README.md)

This document explains how DevQuizBattle integrates with Supabase for authentication, real-time updates, and database operations.

---

## Supabase Features Used

- **Authentication**: User sign-up, login, password reset, and session management.
- **Database**: Stores users, games, players, questions, answers, and scores.
- **Real-Time**: Subscriptions for game state, player list, and answers.

## Directory Structure

- `lib/supabase/`
  - `client.ts` — Browser-side Supabase client
  - `server.ts` — Server-side Supabase client (SSR)
  - `middleware.ts` — Session update middleware
  - `supabase-games.ts` — Game CRUD and logic
  - `supabase-game-players.ts` — Player management
  - `supabase-questions.ts` — Question CRUD
  - `supabase-answers.ts` — Answer CRUD and subscriptions
  - `supabase-profiles.ts` — User profile management
  - `supabase-provider.tsx` — React context provider for Supabase

## Usage Patterns

- **Client Components** use the browser client from `lib/supabase/client.ts`.
- **Server Components** use the server client from `lib/supabase/server.ts`.
- **Subscriptions** are set up in client components for real-time updates.
- **All database logic** is abstracted in the `lib/supabase/` files for maintainability.

## Example: Creating a Game

```ts
import { createGame } from "@/lib/supabase/supabase-games";

const { data, error } = await createGame(user.id, 4, 120);
```

## Example: Subscribing to Answers

```ts
import { subscribeToAnswers } from "@/lib/supabase/supabase-answers";

const channel = subscribeToAnswers((payload) => {
  // handle new/updated answers
});
```

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

---

See also:

- [Architecture Overview](./architecture.md)
- [Game Logic](./game-logic.md)

[← Back to README](../README.md)
