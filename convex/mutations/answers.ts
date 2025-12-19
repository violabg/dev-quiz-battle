import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Calculate score based on response time (10-tier system)
 */
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

/**
 * Submit an answer to a question (CRITICAL: handles race conditions)
 * Only the first correct answer ends the question and awards points
 */
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

    // 7. If correct, try to end question and update scores (atomic operation)
    if (isCorrect) {
      // 7a. Re-fetch question to check ended_at (optimistic locking)
      const freshQuestion = await ctx.db.get(args.questionId);

      // 7b. If still not ended, patch question with ended_at
      if (freshQuestion && !freshQuestion.ended_at) {
        await ctx.db.patch(args.questionId, {
          ended_at: Date.now(),
        });

        // 7c. This call successfully ended the question
        wasWinningAnswer = true;

        // 7d. Update game_players score
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

        // 7e. Upsert player_language_scores
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
