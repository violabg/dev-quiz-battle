import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";

/**
 * Create a new question (internal mutation for use by actions)
 */
export const createQuestion = internalMutation({
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
