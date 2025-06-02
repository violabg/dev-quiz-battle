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

    const questionData = await generateQuestion({
      language: language as GameLanguage,
      difficulty: difficulty as GameDifficulty,
    });
    console.log("🚀 ~ POST ~ correct_answer:", questionData.correctAnswer);

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
