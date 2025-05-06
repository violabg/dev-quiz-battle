# Supabase Integration

[← Back to README](../README.md)

This document explains how DevQuizBattle integrates with Supabase for authentication, real-time updates, and database operations.

---

## Supabase Features Used

- **Authentication**: User sign-up, login, password reset, and session management via Supabase Auth. Profiles are extended in the `profiles` table, which is automatically populated on user creation.
- **Database**: Stores users, games, players, questions, answers, and per-language scores. All tables use row-level security (RLS) with detailed policies for privacy and game integrity.
- **Real-Time**: Subscriptions for game state, player list, questions, and answers using Supabase Realtime. All main tables are enabled for realtime updates.

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

- Table: `profiles` (extends Supabase Auth users)
  - Columns: `id`, `name`, `full_name`, `user_name`, `avatar_url`, `created_at`, `updated_at`
  - Automatically created via trigger on new auth user (see `handle_new_user` function)
  - RLS: Only users can insert/update/delete their own profile; all users can select

### 4. Games Table

- Table: `games`
  - Columns: `id`, `code`, `host_id`, `status`, `max_players`, `current_turn`, `created_at`, `updated_at`, `time_limit`
  - Game code is generated automatically via trigger and `generate_unique_game_code()`
  - RLS: Only host can insert/delete; all users can select; updates are open for realtime/game state

### 5. Game Players Table

- Table: `game_players`
  - Columns: `id`, `game_id`, `player_id`, `score`, `turn_order`, `is_active`, `joined_at`
  - Each player can join a game once; scores are updated as the game progresses
  - RLS: Only the player can insert/update/delete their own row; all users can select

### 6. Questions Table

- Table: `questions`
  - Columns: `id`, `game_id`, `created_by_player_id`, `language`, `difficulty`, `question_text`, `code_sample`, `options`, `correct_answer`, `explanation`, `started_at`, `ended_at`, `created_at`
  - Supports multiple languages and difficulty levels; options are stored as JSONB
  - RLS: Only the author can insert/update/delete; all users can select

### 7. Answers Table

- Table: `answers`
  - Columns: `id`, `question_id`, `player_id`, `selected_option`, `is_correct`, `response_time_ms`, `score_earned`, `answered_at`
  - Each player can answer each question once; correctness and score are tracked
  - RLS: Only the player can insert/update/delete their own answer; all users can select

### 8. Supabase Realtime

- All main tables (`profiles`, `games`, `game_players`, `questions`, `answers`) are enabled for realtime updates via `supabase_realtime` publication.
- Used for live game state, player list, questions, answers, and leaderboard.

### 9. Database Functions & Triggers

- `handle_new_user()` — Trigger: inserts a row into `profiles` when a new auth user is created
- `generate_unique_game_code()` — Generates a unique 6-character game code
- `set_game_code()` — Trigger: sets a unique code before inserting a new game
- `calculate_score(response_time_ms, time_limit_ms)` — Returns a score based on response speed (bonus for faster answers)
- `submit_answer(...)` — Inserts an answer, checks correctness, ends question if correct, updates scores atomically
- `get_leaderboard_players(offset, limit, language_filter)` — Returns paginated leaderboard, filtered by language if provided
- `get_user_profile_with_score(user_id)` — Returns a user's profile and total score

### 10. Row-Level Security (RLS) Policies

- All tables have RLS enabled for security and privacy
- Policies:
  - `profiles`: Only users can insert/update/delete their own profile; all can select
  - `games`: Only host can insert/delete; all can select; updates are open
  - `game_players`: Only player can insert/update/delete their own row; all can select
  - `questions`: Only author can insert/update/delete; all can select
  - `answers`: Only player can insert/update/delete their own answer; all can select
  - `player_language_scores`: All can select/insert/update/delete (for leaderboard)

---

#### See also:

- [Architecture Overview](./architecture.md)
  [← Back to README](../README.md)
- [Game Logic](./game-logic.md)

[← Back to README](../README.md)
