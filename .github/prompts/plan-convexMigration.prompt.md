# Plan: Migrate Supabase to Convex

Comprehensive migration from Supabase to Convex, replacing all database operations, realtime subscriptions, and complex SQL logic with Convex mutations, queries, and actions. Focus on preserving concurrent operation semantics, especially the critical "first correct answer wins" race condition handling.

## Steps

### 1. Define Convex schema with 5 tables and indexes

**File**: [convex/schema.ts](convex/schema.ts)

Create tables: `games`, `game_players`, `questions`, `answers`, `player_language_scores`.

**Table definitions**:

- **games**: id, code (string, unique), host_id (reference to users), status (enum: 'waiting', 'active', 'completed'), max_players (number, default 8), current_turn (number, default 0), time_limit (number, default 120), created_at, updated_at
- **game_players**: id, game_id (reference), player_id (reference to users), score (number, default 0), turn_order (number), is_active (boolean, default true), joined_at
- **questions**: id, game_id (reference), created_by_player_id (reference to users), language (string), difficulty (enum: 'easy', 'medium', 'hard', 'expert'), question_text (string), code_sample (optional string), options (array), correct_answer (number), explanation (optional string), started_at (optional), ended_at (optional), created_at
- **answers**: id, question_id (reference), player_id (reference to users), selected_option (number), is_correct (boolean), response_time_ms (number), score_earned (number), answered_at
- **player_language_scores**: id, player_id (reference to users), language (string), total_score (number, default 0)

**Indexes**:

- `by_code` on games (for unique code lookups)
- `by_game_player` on game_players (composite: game_id, player_id)
- `by_game_id` on questions (for fetching all questions in a game)
- `by_question_player` on answers (composite: question_id, player_id - for duplicate check)
- `by_player_language` on player_language_scores (composite: player_id, language)
- `by_language` on player_language_scores (for leaderboard filtering)

Use existing `users` table instead of profiles.

---

### 2. Create core mutations for game management

**File**: [convex/games.ts](convex/games.ts)

**Mutations to implement**:

- `createGame`: Insert game with unique code generation loop (similar to SQL trigger). Args: host_id, max_players, time_limit. Loop: generate 6-char code from 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', check uniqueness with `by_code` index, retry if exists. Return game document.
- `updateGame`: Patch game fields (status, current_turn, etc.). Args: game_id, updates object.
- `deleteGame`: Delete game by id. Args: game_id. Verify caller is host.
- `joinGame`: Insert into game_players. Args: code, player_id. Find game by code, check max_players, determine turn_order, insert game_player. Return game_player document.
- `updateGamePlayer`: Update score, is_active, etc. Args: game_player_id, updates.
- `startGame`: Set game status to 'active'. Args: game_id. Verify caller is host.
- `advanceTurn`: Increment current_turn. Args: game_id, new_turn_index.

**Queries to implement**:

- `getGameByCode`: Return game + host user + all game_players with joined user data. Args: code.
- `getGameById`: Similar to above but by id. Args: game_id.
- `getGamePlayers`: Return all players for a game with user data. Args: game_id.

Include proper error handling and validation using Convex validators (v.object, v.string, v.number, etc.).

---

### 3. Port submit_answer atomic operation

**File**: [convex/answers.ts](convex/answers.ts)

**Critical mutation: `submitAnswer`**

This is the MOST CRITICAL function for migration. Must preserve atomicity and "first correct answer wins" semantics.

**Args**:

- `questionId`: v.id("questions")
- `playerId`: v.id("users")
- `gameId`: v.id("games")
- `selectedOption`: v.number()
- `responseTimeMs`: v.number()
- `timeLimitMs`: v.number()

**Logic flow** (matches SQL function):

1. Get question by id (throw `[QNOTF]` if not found)
2. Check if question.ended_at is set (throw `[QEND]` if already ended)
3. Check for existing answer by this player (query answers with `by_question_player` index, throw `[ADUP]` if exists)
4. Determine correctness: `isCorrect = selectedOption === question.correct_answer`
5. Calculate score if correct using `calculateScore` helper (10-tier timing bonus function - see step 3a)
6. Insert answer document: { question_id, player_id, selected_option, is_correct, response_time_ms, score_earned, answered_at: Date.now() }
7. If isCorrect:
   a. Re-fetch question to check ended_at (optimistic locking check)
   b. If still not ended, patch question with { ended_at: Date.now() }
   c. Set `wasWinningAnswer = true` only if this call set ended_at
   d. Update game_players score: find by `by_game_player` index, patch with incremented score
   e. Upsert player_language_scores: find by `by_player_language` index, if exists patch total_score, else insert new record
8. Return: `{ answerId, wasWinningAnswer, scoreEarned }`

**Helper function: `calculateScore`**

```typescript
function calculateScore(responseTimeMs: number, timeLimitMs: number): number {
  const base = 1.0;
  const t1 = timeLimitMs * 0.05; // 5%
  const t2 = timeLimitMs * 0.1; // 10%
  const t3 = timeLimitMs * 0.15; // 15%
  const t4 = timeLimitMs * 0.2; // 20%
  const t5 = timeLimitMs * 0.3; // 30%
  const t6 = timeLimitMs * 0.4; // 40%
  const t7 = timeLimitMs * 0.55; // 55%
  const t8 = timeLimitMs * 0.7; // 70%
  const t9 = timeLimitMs * 0.85; // 85%

  let timeBonus = 0;
  if (responseTimeMs < t1) timeBonus = 9.0;
  else if (responseTimeMs < t2) timeBonus = 8.0;
  else if (responseTimeMs < t3) timeBonus = 7.0;
  else if (responseTimeMs < t4) timeBonus = 6.0;
  else if (responseTimeMs < t5) timeBonus = 5.0;
  else if (responseTimeMs < t6) timeBonus = 4.0;
  else if (responseTimeMs < t7) timeBonus = 3.0;
  else if (responseTimeMs < t8) timeBonus = 2.0;
  else if (responseTimeMs < t9) timeBonus = 1.0;
  else timeBonus = 0.5;

  return base + timeBonus;
}
```

**Query to implement**:

- `getAnswersByQuestion`: Return all answers for a question with joined user data. Args: question_id.

**Error handling**: Use ConvexError with codes matching current Supabase RPC:

- `[QNOTF]`: Question not found
- `[QEND]`: Question has already ended
- `[ADUP]`: Player has already submitted an answer

---

### 4. Create question and leaderboard queries/mutations

**File**: [convex/questions.ts](convex/questions.ts)

**Mutations**:

- `createQuestion`: Insert question. Args: game_id, created_by_player_id, language, difficulty, question_text, code_sample (optional), options (array of 4 strings), correct_answer (0-3), explanation (optional), started_at (optional).
- `updateQuestion`: Patch question fields (mainly ended_at). Args: question_id, updates object.
- `endQuestion`: Specifically set ended_at. Args: question_id.

**Queries**:

- `getQuestion`: Get single question by id with creator user data. Args: question_id, include_correct_answer (boolean).
- `getQuestionsByGame`: Get all questions for a game. Args: game_id.
- `getCurrentQuestion`: Get latest question for a game (highest created_at where ended_at is null OR most recent). Args: game_id.
- `getRecentQuestions`: Get recent questions across all games for a specific language. Args: language, limit.

**File**: [convex/leaderboard.ts](convex/leaderboard.ts)

**Queries**:

- `getLeaderboardPlayers`: Paginated leaderboard with optional language filter.

  - Args: offset (number), limit (number), languageFilter (optional string)
  - Logic:
    - If languageFilter provided:
      - Query player_language_scores with `by_language` index
      - Filter by language, sort by total_score desc
      - Paginate with offset/limit
      - Join with users table
    - Else:
      - Query all game_players
      - Group by player_id, sum scores
      - Sort by total_score desc
      - Paginate with offset/limit
      - Join with users table
  - Return: `{ players: Array<{player_id, total_score, user}>, totalItems: number }`

- `getUserProfileWithScore`: Get single user with aggregated score.
  - Args: user_id
  - Logic: Get user, sum all game_players scores for this user
  - Return: `{ user, totalScore }`

---

### 5. Migrate 4 custom hooks to use Convex subscriptions

**Files to update**:

- [lib/hooks/useGameState.ts](lib/hooks/useGameState.ts)
- [lib/hooks/useCurrentQuestion.ts](lib/hooks/useCurrentQuestion.ts)
- [lib/hooks/useGameAnswers.ts](lib/hooks/useGameAnswers.ts)
- [lib/hooks/useGameTurns.ts](lib/hooks/useGameTurns.ts)

**Changes per hook**:

**useGameState**:

- Replace `createClient()` with `useQuery` from "convex/react"
- Replace `.from('games').select().eq('code', code).single()` with `useQuery(api.games.getGameByCode, { code })`
- Replace `.from('game_players').select()` with data from `getGameByCode` (includes players)
- Replace `.channel().on('postgres_changes')` - remove entirely (Convex auto-subscribes)
- Replace `updateGame` Supabase call with `useMutation(api.games.updateGame)`
- Replace `deleteGame` Supabase call with `useMutation(api.games.deleteGame)`
- Update return types to match Convex document structure (`_id` instead of `id`)

**useCurrentQuestion**:

- Replace Supabase query with `useQuery(api.questions.getCurrentQuestion, { gameId })`
- Remove manual `.subscribe()` - Convex queries auto-subscribe to changes
- Replace question creation API route call with `useMutation(api.questions.createQuestion)`
- Replace `updateQuestion` with `useMutation(api.questions.updateQuestion)` or `endQuestion`
- Update timer effect to call Convex mutation when ending question

**useGameAnswers**:

- Replace Supabase query with `useQuery(api.answers.getAnswersByQuestion, { questionId })`
- Remove `.subscribe()` call - Convex auto-subscribes
- Update return types for Convex documents

**useGameTurns**:

- Replace `updateGameTurn` with `useMutation(api.games.advanceTurn)`
- Update to use Convex game document structure

**General pattern**:

```typescript
// Before (Supabase)
const supabase = createClient();
const { data, error } = await supabase.from('table').select().eq('id', id).single();
const channel = supabase.channel('changes').on('postgres_changes', ...).subscribe();

// After (Convex)
const data = useQuery(api.module.queryName, { id });
const mutation = useMutation(api.module.mutationName);
// No manual subscription needed - useQuery auto-subscribes
```

---

### 6. Update all components and pages using migrated hooks

**Files to update**:

- [app/dashboard/CreateGameForm.tsx](app/dashboard/CreateGameForm.tsx) - Replace game creation logic
- [app/dashboard/JoinGameForm.tsx](app/dashboard/JoinGameForm.tsx) - Replace join game logic
- [app/game/[code]/page.tsx](app/game/[code]/page.tsx) - Update auth check, use Convex
- [components/game/game-room.tsx](components/game/game-room.tsx) - Replace submitAnswer RPC call
- [components/game/question-display.tsx](components/game/question-display.tsx) - Update answer submission
- [app/leaderboard/page.tsx](app/leaderboard/page.tsx) - Replace leaderboard RPC
- [app/profile/ProfileContent.tsx](app/profile/ProfileContent.tsx) - Replace profile fetch

**Key changes**:

**game-room.tsx** (CRITICAL):

```typescript
// Before
const result = await supabase.rpc("submit_answer", {
  p_question_id,
  p_player_id,
  p_game_id,
  p_selected_option,
  p_response_time_ms,
  p_time_limit_ms,
});

// After
const submitAnswer = useMutation(api.answers.submitAnswer);
const result = await submitAnswer({
  questionId,
  playerId,
  gameId,
  selectedOption,
  responseTimeMs,
  timeLimitMs,
});
```

**Auth checks**:

```typescript
// Before
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();

// After
import { auth } from "@/convex/auth";
const user = await auth.getUserIdentity(ctx);
// Or in client components:
import { useConvexAuth } from "convex/react";
const { isAuthenticated, isLoading } = useConvexAuth();
```

**Leaderboard page**:

```typescript
// Before
const { data } = await supabase.rpc("get_leaderboard_players", {
  offset_value,
  limit_value,
  language_filter,
});

// After
const data = useQuery(api.leaderboard.getLeaderboardPlayers, {
  offset,
  limit,
  languageFilter,
});
```

**Profile page**:

```typescript
// Before
const { data } = await supabase.rpc("get_user_profile_with_score", { user_id });

// After
const data = useQuery(api.leaderboard.getUserProfileWithScore, { userId });
```

**Document ID handling**:

- Convex uses `_id` field for document IDs, not `id`
- Update all references: `game.id` → `game._id`
- Foreign keys reference `_id` values: `{ game_id: game._id }`

**Remove files**:

- [lib/supabase/client.ts](lib/supabase/client.ts) - Remove entirely
- [lib/supabase/server.ts](lib/supabase/server.ts) - Remove entirely
- Update [lib/supabase/types.ts](lib/supabase/types.ts) to use Convex generated types instead

---

## Further Considerations

### 1. Question ending timer

**Current implementation**: Client-side timer in `useCurrentQuestion` that calls `updateQuestion` when time expires or all players answer.

**Issue**: Multiple clients can trigger simultaneously.

**\*Keep client-side with atomic check**: Ensure `updateQuestion` mutation checks `ended_at` before patching (similar to submit_answer). First client to call wins.

---

### 2. Convex optimistic locking for race conditions

The `submitAnswer` mutation relies on checking `ended_at` before patching. This provides optimistic locking:

```typescript
// Step 7a-c in submitAnswer
const freshQuestion = await ctx.db.get(questionId);
if (!freshQuestion.ended_at) {
  await ctx.db.patch(questionId, { ended_at: Date.now() });
  wasWinningAnswer = true;
}
```

If two correct answers arrive simultaneously:

1. Both read `ended_at = null`
2. Both insert answer
3. First patch succeeds, sets `ended_at`
4. Second gets fresh question, sees `ended_at` is now set, skips patch

## Success Criteria

✅ All game functionality works identically to Supabase version
✅ Race conditions handled correctly (first correct answer wins)
✅ Realtime updates work via Convex subscriptions (no manual subscribe calls)
✅ No Supabase dependencies remaining
✅ TypeScript type safety maintained
✅ Score calculations match exactly
✅ Leaderboard aggregation correct
✅ Multi-player concurrent gameplay tested
✅ Question timing and ending logic reliable
