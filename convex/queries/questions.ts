import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";

/**
 * Get a single question by id
 */
export const getQuestion = query({
  args: {
    question_id: v.id("questions"),
    include_correct_answer: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.question_id);

    if (!question) {
      return null;
    }

    const creator = await ctx.db.get(question.created_by_player_id);

    // Optionally exclude correct_answer for active questions
    if (!args.include_correct_answer && !question.ended_at) {
      const { correct_answer, ...questionWithoutAnswer } = question;
      return {
        ...questionWithoutAnswer,
        creator,
      };
    }

    return {
      ...question,
      creator,
    };
  },
});

/**
 * Get recent question texts by language and difficulty (last 5 hours)
 * Internal query for use by actions
 */
export const getRecentQuestionTexts = internalQuery({
  args: {
    language: v.string(),
    difficulty: v.string(),
  },
  handler: async (ctx, args) => {
    const fiveHoursAgo = Date.now() - 5 * 60 * 60 * 1000;

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_language", (q) => q.eq("language", args.language))
      .filter((q) =>
        q.and(
          q.eq(q.field("difficulty"), args.difficulty),
          q.gte(q.field("created_at"), fiveHoursAgo)
        )
      )
      .collect();

    return questions.map((q) => q.question_text);
  },
});

/**
 * Get all questions for a game
 */
export const getQuestionsByGame = query({
  args: {
    game_id: v.id("games"),
  },
  handler: async (ctx, args) => {
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_game_id", (q) => q.eq("game_id", args.game_id))
      .order("desc")
      .collect();

    const questionsWithCreators = await Promise.all(
      questions.map(async (q) => {
        const creator = await ctx.db.get(q.created_by_player_id);
        return { ...q, creator };
      })
    );

    return questionsWithCreators;
  },
});

/**
 * Get the current question for a game (latest active or most recent)
 */
export const getCurrentQuestion = query({
  args: {
    game_id: v.id("games"),
  },
  handler: async (ctx, args) => {
    // First try to find an active question (not ended)
    const activeQuestions = await ctx.db
      .query("questions")
      .withIndex("by_game_ended", (q) => q.eq("game_id", args.game_id))
      .filter((q) => q.eq(q.field("ended_at"), undefined))
      .order("desc")
      .collect();

    if (activeQuestions.length > 0) {
      const question = activeQuestions[0];
      const creator = await ctx.db.get(question.created_by_player_id);
      return { ...question, creator };
    }

    // If no active questions, get the most recent one (so players can see the explanation)
    const allQuestions = await ctx.db
      .query("questions")
      .withIndex("by_game_id", (q) => q.eq("game_id", args.game_id))
      .order("desc")
      .take(1);

    if (allQuestions.length > 0) {
      const question = allQuestions[0];
      const creator = await ctx.db.get(question.created_by_player_id);
      return { ...question, creator };
    }

    return null;
  },
});

/**
 * Get recent questions for a specific language (for question generation reference)
 */
export const getRecentQuestions = query({
  args: {
    language: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_language", (q) => q.eq("language", args.language))
      .order("desc")
      .take(args.limit ?? 10);

    return questions;
  },
});
