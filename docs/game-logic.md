# Game Logic

[← Back to README](../README.md)

This document describes the main game logic and flow in Dev Quiz Battle.

---

## Game Flow

1. **Game Creation**
   - A user creates a game specifying max players and time limit.
   - A unique game code is generated.
2. **Joining a Game**
   - Players join using the game code.
   - Player and profile data are stored in Supabase.
3. **Lobby**
   - Players wait in the lobby until the host starts the game.
   - Real-time updates show player list and status.
4. **Question Rounds**
   - Each round, a question is generated (AI via Groq API) and displayed.
   - Players answer within the time limit.
   - Answers are submitted and stored in Supabase.
5. **Scoring**
   - Scores are calculated and updated in real-time.
   - The scoreboard is shown after each round.
6. **Next Turn / Next Round**
   - The next player becomes the question selector.
   - The process repeats until the game ends.
7. **Game End**
   - Final scores and winners are displayed.
   - Results are saved to the leaderboard.

## Real-Time Updates

- Game state, player list, and answers are synced using Supabase subscriptions.
- UI updates automatically for all players.

## Key Files

- `lib/hooks/useGameState.ts` — Main game state logic
- `lib/supabase/supabase-games.ts` — Game CRUD
- `lib/supabase/supabase-game-players.ts` — Player management
- `lib/supabase/supabase-questions.ts` — Question management
- `lib/supabase/supabase-answers.ts` — Answer management

---

See also:

- [Supabase Integration](./supabase.md)
- [UI Components](./components.md)

[← Back to README](../README.md)
