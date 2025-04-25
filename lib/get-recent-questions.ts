import { createServerSupabase } from "@/lib/supabase-server";
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
  const supabase = createServerSupabase();
  const since = subHours(new Date(), 5).toISOString();
  const { data, error } = await supabase
    .from("questions")
    .select("question_text")
    .eq("language", language)
    .eq("difficulty", difficulty)
    .gte("created_at", since);
  if (error) throw error;
  return (data ?? []).map((q) => q.question_text);
}
