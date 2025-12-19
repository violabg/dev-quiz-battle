# Convex Integration

[← Back to README](../README.md)

This document explains how Dev Quiz Battle integrates with Convex for authentication, real-time updates, and database operations.

---

## Convex Features Used

- **Authentication**: User authentication managed via Convex Auth. User data is stored in the `users` table with support for email/password and OAuth providers.
- **Database**: Stores users, games, players, questions, answers, and per-language scores. All data is accessed through type-safe queries and mutations.
- **Real-Time**: Automatic real-time subscriptions for all data. Convex queries are reactive by default, updating the UI whenever underlying data changes.
- **Actions**: Server-side functions that can call external APIs (like Groq for AI question generation).

## Convex Directory Structure

- `convex/`
  - `schema.ts` — Database schema definition with tables and indexes
  - `auth.config.ts` — Convex Auth configuration
  - `queries/` — Read-only functions for fetching data
    - `games.ts` — Game queries
    - `questions.ts` — Question queries
    - `answers.ts` — Answer queries
    - `leaderboard.ts` — Leaderboard queries
    - `auth.ts` — User auth queries
  - `mutations/` — Functions for writing data
    - `games.ts` — Game mutations (create, join, update, etc.)
    - `questions.ts` — Question mutations
    - `answers.ts` — Answer mutations
    - `auth.ts` — User profile mutations
  - `actions/` — Server-side functions for external API calls
    - `questions.ts` — AI question generation using Groq API
  - `http.ts` — HTTP endpoints
  - `_generated/` — Auto-generated TypeScript types

## Database Schema

### users

- `name`, `image`, `email` — User profile data
- `username` — Unique username
- `total_score`, `games_played` — User stats
- **Indexes**: by `email`, by `total_score`

### games

- `code` — Unique 6-character game code
- `host_id` — Reference to host user
- `status` — `waiting | active | completed`
- `max_players`, `current_turn`, `time_limit` — Game settings
- **Indexes**: by `code`

### game_players

- `game_id`, `player_id` — Game and player references
- `score`, `turn_order`, `is_active` — Player state
- **Indexes**: by `game_id`, by `player_id`, by `game_player` (compound)

### questions

- `game_id`, `created_by_player_id` — Game and creator references
- `language`, `difficulty` — Question metadata
- `question_text`, `code_sample`, `options`, `correct_answer`, `explanation`
- `started_at`, `ended_at` — Question timing
- **Indexes**: by `game_id`, by `language`, by `game_ended` (compound)

### answers

- `question_id`, `player_id` — Question and player references
- `selected_option`, `is_correct` — Answer data
- `response_time_ms`, `score_earned` — Scoring data
- **Indexes**: by `question_id`, by `player_id`, by `question_player` (compound)

### player_language_scores

- `player_id`, `language` — Player and language references
- `total_score` — Accumulated score per language
- **Indexes**: by `player_language`, by `language`, by `language_score` (compound)

## Usage Patterns

### Client Components

Use Convex hooks in React components:

```tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Query (automatically subscribes to real-time updates)
const game = useQuery(api.queries.games.getGameByCode, { code: "ABC123" });

// Mutation
const joinGame = useMutation(api.mutations.games.joinGame);
await joinGame({ code: "ABC123" });
```

### Server Components

Use Convex client in Server Components:

```tsx
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const game = await client.query(api.queries.games.getGameByCode, {
  code: "ABC123",
});
```

### Real-Time Subscriptions

Convex queries are reactive by default. When you use `useQuery`, the component automatically re-renders when data changes:

```tsx
// This component automatically updates when players join/leave
const players = useQuery(api.queries.games.getGameWithPlayers, { game_id });
```

## Authentication

Convex Auth is configured in `convex/auth.config.ts` and provides:

- Email/password authentication
- OAuth providers (Google, GitHub, etc.)
- Session management
- User context in queries/mutations

Access current user in backend functions:

```typescript
import { getAuthUserId } from "@convex-dev/auth/server";

export const myMutation = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    // ...
  },
});
```

## Key Features

### Automatic Code Generation

Convex automatically generates TypeScript types from your schema, ensuring type safety across your entire stack.

### Optimistic Updates

Use optimistic updates for instant UI feedback:

```tsx
const mutation = useMutation(api.mutations.games.joinGame).withOptimisticUpdate(
  (localStore, args) => {
    // Update local state immediately
  }
);
```

### Scheduled Functions

Schedule background tasks:

```typescript
await ctx.scheduler.runAfter(60000, api.mutations.games.endGame, { game_id });
```

### File Storage

Convex includes built-in file storage for avatars, images, etc.

## Example: Creating and Joining a Game

```typescript
// Create a game (mutation)
const createGame = useMutation(api.mutations.games.createGame);
const { gameId, code } = await createGame({ max_players: 4, time_limit: 120 });

// Get game with real-time updates (query)
const game = useQuery(api.queries.games.getGameWithPlayers, {
  game_id: gameId,
});

// Join a game (mutation)
const joinGame = useMutation(api.mutations.games.joinGame);
await joinGame({ code: "ABC123" });
```

## Example: AI Question Generation

```typescript
// Action that calls external Groq API
const generateQuestion = useAction(
  api.actions.questions.generateAndCreateQuestion
);
const questionId = await generateQuestion({
  game_id: gameId,
  player_id: userId,
  language: "javascript",
  difficulty: "medium",
});
```

---

### See also:

- [Architecture Overview](./architecture.md)
- [Game Logic](./game-logic.md)
- [API Reference](./api.md)
- [Convex Schema](../convex/schema.ts)
- [Convex Documentation](https://docs.convex.dev)

[← Back to README](../README.md)
