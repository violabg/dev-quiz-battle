# Submit Answer

[← Back to Convex Docs](./convex.md)

## Purpose

Handles answer submission for a question, checks correctness, updates scores, and ends the question if answered correctly. All in a single, atomic operation.

## How it works

- This is a **Convex mutation** in `convex/mutations/answers.ts` that:
  1. Verifies the user is authenticated
  2. Gets the question and checks if it has ended
  3. Gets the game to retrieve time limit
  4. Checks if player already answered this question
  5. Determines if the answer is correct
  6. Calculates score based on response time (if correct)
  7. Inserts the answer into the `answers` table
  8. If correct:
     - Ends the question (sets `ended_at`)
     - Updates player's score in `game_players`
     - Updates player's language-specific score
     - Updates user's total score
  9. Returns the answer ID

## TypeScript Implementation

Located in `convex/mutations/answers.ts`:

```typescript
export const submitAnswer = mutation({
  args: {
    questionId: v.id("questions"),
    playerId: v.id("users"),
    gameId: v.id("games"),
    selectedOption: v.number(),
    responseTimeMs: v.number(),
    timeLimitMs: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Get question by id
    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new ConvexError("[QNOTF] Question not found");
    }

    // 2. Check if question has already ended
    if (question.ended_at) {
      throw new ConvexError("[QEND] Question has already ended");
    }

    // 3. Check for existing answer by this player
    const existingAnswer = await ctx.db
      .query("answers")
      .withIndex("by_question_player", (q) =>
        q.eq("question_id", args.questionId).eq("player_id", args.playerId)
      )
      .first();

    if (existingAnswer) {
      throw new ConvexError("[ADUP] Player has already submitted an answer");
    }

    // 4. Determine correctness
    const isCorrect = args.selectedOption === question.correct_answer;

    // 5. Calculate score if correct
    const scoreEarned = isCorrect
      ? calculateScore(args.responseTimeMs, args.timeLimitMs)
      : 0;

    // 6. Insert answer document
    const answerId = await ctx.db.insert("answers", {
      question_id: args.questionId,
      player_id: args.playerId,
      selected_option: args.selectedOption,
      is_correct: isCorrect,
      response_time_ms: args.responseTimeMs,
      score_earned: scoreEarned,
      answered_at: Date.now(),
    });

    let wasWinningAnswer = false;

    // 7. If correct, try to end question and update scores
    if (isCorrect) {
      // Re-fetch question to check ended_at (optimistic locking)
      const freshQuestion = await ctx.db.get(args.questionId);

      // If still not ended, patch question with ended_at
      if (freshQuestion && !freshQuestion.ended_at) {
        await ctx.db.patch(args.questionId, {
          ended_at: Date.now(),
        });

        wasWinningAnswer = true;

        // Update game_players score
        const gamePlayer = await ctx.db
          .query("game_players")
          .withIndex("by_game_player", (q) =>
            q.eq("game_id", args.gameId).eq("player_id", args.playerId)
          )
          .first();

        if (gamePlayer) {
          await ctx.db.patch(gamePlayer._id, {
            score: gamePlayer.score + scoreEarned,
          });
        }

        // Upsert player_language_scores
        const langScore = await ctx.db
          .query("player_language_scores")
          .withIndex("by_player_language", (q) =>
            q.eq("player_id", args.playerId).eq("language", question.language)
          )
          .first();

        if (langScore) {
          await ctx.db.patch(langScore._id, {
            total_score: langScore.total_score + scoreEarned,
          });
        } else {
          await ctx.db.insert("player_language_scores", {
            player_id: args.playerId,
            language: question.language,
            total_score: scoreEarned,
          });
        }
      }
    }

    // 8. Return results
    return {
      answerId,
      wasWinningAnswer,
      scoreEarned,
    };
  },
});
```

### Key Points:

- **Atomic Operations**: Uses Convex's transactional guarantees to ensure data consistency
- **Race Condition Handling**: Re-fetches question before ending it to handle concurrent submissions
- **Score Calculation**: Inline `calculateScore` function rewards faster responses (1-10 points)
- **Upsert Pattern**: Creates or updates `player_language_scores` as needed

## Usage

```typescript
const submitAnswer = useMutation(api.mutations.answers.submitAnswer);

const result = await submitAnswer({
  questionId: question._id,
  playerId: user._id,
  gameId: game._id,
  selectedOption: 2,
  responseTimeMs: 3500,
  timeLimitMs: 120000,
});

if (result.wasWinningAnswer) {
  console.log(`Correct! You earned ${result.scoreEarned} points`);
}
```
