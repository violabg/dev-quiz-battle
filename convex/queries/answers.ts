import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get all answers for a question with user data
 */
export const getAnswersByQuestion = query({
  args: {
    question_id: v.id("questions"),
  },
  handler: async (ctx, args) => {
    const answers = await ctx.db
      .query("answers")
      .withIndex("by_question_id", (q) => q.eq("question_id", args.question_id))
      .collect();

    const answersWithUsers = await Promise.all(
      answers.map(async (answer) => {
        const user = await ctx.db.get(answer.player_id);
        return { ...answer, user };
      })
    );

    return answersWithUsers;
  },
});

/**
 * Get answer for a specific player and question
 */
export const getAnswerByPlayerAndQuestion = query({
  args: {
    question_id: v.id("questions"),
    player_id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const answer = await ctx.db
      .query("answers")
      .withIndex("by_question_player", (q) =>
        q.eq("question_id", args.question_id).eq("player_id", args.player_id)
      )
      .first();

    return answer;
  },
});
