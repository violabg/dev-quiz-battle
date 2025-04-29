import { getQuestionsByLanguageAndDifficulty } from "@/lib/supabase-questions";
import type { Question } from "@/types/supabase";
import { subHours } from "date-fns";

/**
 * Fetches the question_text of all questions generated in the last 5 hours for a given language and difficulty.
 */
export async function getRecentQuestionTexts({
  language,
  difficulty,
}: {
  language: string;
  difficulty: string;
}) {
  const since = subHours(new Date(), 5).toISOString();
  const questions: Question[] = await getQuestionsByLanguageAndDifficulty(
    language,
    difficulty,
    since
  );
  return questions.map((q: Question) => q.question_text);
}
