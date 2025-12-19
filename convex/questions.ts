import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a new question
 */
export const createQuestion = mutation({
  args: {
    game_id: v.id("games"),
    created_by_player_id: v.id("users"),
    language: v.string(),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
      v.literal("expert")
    ),
    question_text: v.string(),
    code_sample: v.optional(v.string()),
    options: v.array(v.string()),
    correct_answer: v.number(),
    explanation: v.optional(v.string()),
    started_at: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    // Verify the game exists
    const game = await ctx.db.get(args.game_id);
    if (!game) {
      throw new ConvexError("Game not found");
    }

    // Verify correct_answer is within range
    if (args.correct_answer < 0 || args.correct_answer >= args.options.length) {
      throw new ConvexError("Invalid correct_answer index");
    }

    const questionId = await ctx.db.insert("questions", {
      game_id: args.game_id,
      created_by_player_id: args.created_by_player_id,
      language: args.language,
      difficulty: args.difficulty,
      question_text: args.question_text,
      code_sample: args.code_sample,
      options: args.options,
      correct_answer: args.correct_answer,
      explanation: args.explanation,
      started_at: args.started_at ?? Date.now(),
      created_at: Date.now(),
    });

    return questionId;
  },
});

/**
 * Update question fields (mainly for ending questions)
 */
export const updateQuestion = mutation({
  args: {
    question_id: v.id("questions"),
    ended_at: v.optional(v.number()),
    started_at: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const question = await ctx.db.get(args.question_id);
    if (!question) {
      throw new ConvexError("Question not found");
    }

    const updates: Partial<{
      ended_at: number;
      started_at: number;
    }> = {};

    if (args.ended_at !== undefined) {
      // Atomic check: only set ended_at if not already set
      if (!question.ended_at) {
        updates.ended_at = args.ended_at;
      }
    }

    if (args.started_at !== undefined) {
      updates.started_at = args.started_at;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.question_id, updates);
    }
  },
});

/**
 * End a question (sets ended_at atomically)
 */
export const endQuestion = mutation({
  args: {
    question_id: v.id("questions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const question = await ctx.db.get(args.question_id);
    if (!question) {
      throw new ConvexError("Question not found");
    }

    // Atomic check: only set ended_at if not already set
    if (!question.ended_at) {
      await ctx.db.patch(args.question_id, {
        ended_at: Date.now(),
      });
    }
  },
});

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
 */
export const getRecentQuestionTexts = query({
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
 * Get the current question for a game (latest unanswered or most recent)
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

    // If no active questions, get the most recent one
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
