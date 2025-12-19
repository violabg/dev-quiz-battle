"use node";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";

/**
 * Generate and create a new question using AI (Convex Action)
 * This action calls the external Groq API and creates the question
 */
export const generateAndCreateQuestion = action({
  args: {
    game_id: v.id("games"),
    player_id: v.id("users"),
    language: v.string(),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
      v.literal("expert")
    ),
  },
  handler: async (ctx, args): Promise<Id<"questions">> => {
    // Verify user is authenticated (actions can access auth through runQuery)
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    // Import generateQuestion dynamically (only available in Node.js environment)
    const { generateQuestion } = await import("../../lib/groq");

    // Retry logic for generating question
    let questionData;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🔄 Attempting to generate question (attempt ${attempt}/${maxRetries})`
        );

        // Get recent questions to avoid duplicates using Convex query
        let previousQuestions: string[] = [];
        try {
          previousQuestions = await ctx.runQuery(
            internal.queries.questions.getRecentQuestionTexts,
            {
              language: args.language,
              difficulty: args.difficulty,
            }
          );
        } catch {
          previousQuestions = [];
        }

        questionData = await generateQuestion({
          language: args.language as any,
          difficulty: args.difficulty as any,
          previousQuestions,
        });

        console.log("✅ Question generated successfully");
        break; // Success, exit retry loop
      } catch (error) {
        console.warn(
          `❌ Question generation attempt ${attempt} failed:`,
          error
        );

        if (attempt === maxRetries) {
          console.error("🚨 All question generation attempts failed");
          throw new ConvexError(
            "Failed to generate question after all retries"
          );
        }

        // Add delay between retries
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    if (!questionData) {
      throw new ConvexError("Failed to generate question");
    }

    // Convert options from {text: string}[] to string[]
    const optionsAsStrings = questionData.options.map((opt) => opt.text);

    // Create the question using internal mutation
    const questionId: Id<"questions"> = await ctx.runMutation(
      internal.mutations.questions.createQuestion,
      {
        game_id: args.game_id,
        created_by_player_id: args.player_id,
        language: args.language,
        difficulty: args.difficulty,
        question_text: questionData.questionText,
        code_sample: questionData.codeSample || undefined,
        options: optionsAsStrings,
        correct_answer: questionData.correctAnswer,
        explanation: questionData.explanation,
      }
    );

    return questionId;
  },
});
