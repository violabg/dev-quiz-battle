import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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
  const questionTexts = await convex.query(
    api.questions.getRecentQuestionTexts,
    {
      language,
      difficulty,
    }
  );
  return questionTexts;
}
