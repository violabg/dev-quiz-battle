# API Reference

[← Back to README](../README.md)

This document provides a high-level reference for the main API functions and modules in DevQuizBattle.

---

## Supabase API Modules

All database and real-time logic is abstracted in the `lib/supabase/` directory.

### Games

- `createGame(host_id, max_players, time_limit)`
- `getGameByCode(supabase, code)`
- `updateGameTurn(gameId, nextTurn)`
- `updateGameStatus(gameId, status)`

### Game Players

- `addPlayerToGame(game_id, player_id, turn_order)`
- `getPlayersForGame(game_id)`
- `getPlayerInGame(game_id, player_id)`
- `getLeaderboardPlayers(supabase, offset, limit, languageFilter?)`

### Questions

- `getQuestionsForGame(game_id)`
- `getQuestionById(question_id)`
- `insertQuestion(question)`
- `updateQuestion(questionId, update)`
- `getQuestionsByLanguageAndDifficulty(language, difficulty, since?)`

### Answers

- `insertAnswer(answer)`
- `getAnswersForQuestion(question_id)`
- `getAnswersWithPlayerForQuestion(question_id)`
- `subscribeToAnswers(handler)`
- `unsubscribeFromAnswers(channel)`

### Profiles

- `getProfileById(id)`
- `getProfileByUsername(user_name)`
- `createProfile(id, user_name)`
- `ensureUserProfile(user)`
- `getProfileWithScore(userId)`
- `subscribeToProfiles(handler)`

## AI & Question Generation

- `lib/groq.ts` — Generates coding questions using Groq API
- `lib/get-recent-questions.ts` — Fetches recent questions for deduplication

## Utilities

- `lib/utils.ts` — Utility functions (e.g., `cn` for class merging)

---

See also:

- [Game Logic](./game-logic.md)
- [Supabase Integration](./supabase.md)

[← Back to README](../README.md)
