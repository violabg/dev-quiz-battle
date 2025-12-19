import { api } from "@/convex/_generated/api";
import { GameDifficulty, GameLanguage } from "@/lib/convex-types";
import { generateQuestion } from "@/lib/groq";
import { ConvexHttpClient } from "convex/browser";
import { NextRequest, NextResponse } from "next/server";

// Create Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    // Get auth token from request headers
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    convex.setAuth(token);

    const { gameId, language, difficulty, playerId } = await req.json();

    if (!gameId || !language || !difficulty || !playerId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Retry logic for generating question
    let questionData;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🔄 Attempting to generate question (attempt ${attempt}/${maxRetries})`
        );
        questionData = await generateQuestion({
          language: language as GameLanguage,
          difficulty: difficulty as GameDifficulty,
        });
        console.log("🚀 ~ POST ~ correct_answer:", questionData.correctAnswer);
        break; // Success, exit retry loop
      } catch (error) {
        console.warn(
          `❌ Question generation attempt ${attempt} failed:`,
          error
        );

        if (attempt === maxRetries) {
          console.error("🚨 All question generation attempts failed");
          throw error; // Re-throw the last error if all attempts failed
        }

        // Optional: Add a small delay between retries
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    // Ensure questionData is defined (TypeScript safety check)
    if (!questionData) {
      throw new Error("Failed to generate question after all retry attempts");
    }

    console.log(
      "🚀 ~ POST ~ questionData.correctAnswer:",
      questionData.correctAnswer
    );

    // Call Convex mutation to create question
    // Convert options from {text: string}[] to string[]
    const optionsAsStrings = questionData.options.map((opt) => opt.text);

    const newQuestion = await convex.mutation(api.questions.createQuestion, {
      game_id: gameId,
      created_by_player_id: playerId,
      language: language as GameLanguage,
      difficulty: difficulty as GameDifficulty,
      question_text: questionData.questionText,
      code_sample: questionData.codeSample,
      options: optionsAsStrings,
      correct_answer: questionData.correctAnswer,
      explanation: questionData.explanation,
    });

    return NextResponse.json(newQuestion);
  } catch (error) {
    console.error("Error creating question:", error);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}
