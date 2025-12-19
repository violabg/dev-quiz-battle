# API Reference

[← Back to README](../README.md)

This document provides a high-level reference for the main API functions and modules in Dev Quiz Battle.

---

## Convex API Modules

All database and real-time logic is in the `convex/` directory, organized into queries, mutations, and actions.

### Queries (convex/queries/)

**Games:**

- `getGameByCode(code)` — Get game by code
- `getGameById(game_id)` — Get game by ID
- `getGameWithPlayers(game_id)` — Get game with all players

**Questions:**

- `getQuestionById(question_id)` — Get question by ID
- `getQuestionsByGame(game_id)` — Get all questions for a game
- `getCurrentQuestion(game_id)` — Get active question
- `getRecentQuestionTexts(language, difficulty)` — Get recent questions for deduplication

**Answers:**

- `getAnswersByQuestion(question_id)` — Get answers for a question
- `getAnswerByPlayerAndQuestion(question_id, player_id)` — Get specific player's answer

**Leaderboard:**

- `getLeaderboard(language?, page?, pageSize?)` — Get paginated leaderboard

**Auth:**

- `currentUser()` — Get current authenticated user

### Mutations (convex/mutations/)

**Games:**

- `createGame(max_players?, time_limit?)` — Create new game
- `joinGame(code)` — Join game by code
- `startGame(game_id)` — Start game (host only)
- `updateGame(game_id, status?, current_turn?)` — Update game state
- `advanceTurn(game_id, new_turn_index)` — Move to next turn
- `deleteGame(game_id)` — Delete game (host only)
- `updateGamePlayer(game_player_id, score?, is_active?)` — Update player state

**Questions:**

- `createQuestion(...)` — Create new question (internal)
- `updateQuestion(question_id, started_at?, ended_at?)` — Update question state

**Answers:**

- `submitAnswer(question_id, selected_option, response_time_ms)` — Submit player answer

**Auth:**

- `updateUser(name?, username?)` — Update user profile

### Actions (convex/actions/)

**Questions:**

- `generateAndCreateQuestion(game_id, player_id, language, difficulty)` — Generate AI question using Groq API

## AI & Question Generation

- `lib/groq.ts` — Generates coding questions using Groq API
- `lib/get-recent-questions.ts` — Fetches recent questions for deduplication

## Utilities

- `lib/utils.ts` — Utility functions (e.g., `cn` for class merging)

---

See also:

- [Game Logic](./game-logic.md)
- [Convex Integration](./convex.md)
- [Database Schema](../convex/schema.ts)

[← Back to README](../README.md)
