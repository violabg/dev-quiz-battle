import { generateQuestion } from "@/lib/groq";
import { createClient } from "@/lib/supabase/server";
import { insertQuestion } from "@/lib/supabase/supabase-questions";
import { GameDifficulty, GameLanguage } from "@/lib/supabase/types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { gameId, language, difficulty } = await req.json();

    if (!gameId || !language || !difficulty) {
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
    const startedAt = new Date().toISOString();
    const newQuestion = await insertQuestion(supabase, {
      game_id: gameId,
      created_by_player_id: user.id,
      language: language as GameLanguage,
      difficulty: difficulty as GameDifficulty,
      question_text: questionData.questionText,
      code_sample: questionData.codeSample,
      options: questionData.options,
      correct_answer: questionData.correctAnswer,
      explanation: questionData.explanation,
      started_at: startedAt,
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
