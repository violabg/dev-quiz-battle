import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useEffect } from "react";

type UseGameAnswersProps = {
  currentQuestionId: Id<"questions"> | undefined | null;
  onAnswersLoaded?: (answers: any[]) => void;
};

export const useGameAnswers = ({
  currentQuestionId,
  onAnswersLoaded,
}: UseGameAnswersProps) => {
  // Convex auto-subscribes to changes with useQuery
  const allAnswers = useQuery(
    api.answers.getAnswersByQuestion,
    currentQuestionId ? { question_id: currentQuestionId } : "skip"
  );

  // Call onAnswersLoaded when answers change
  useEffect(() => {
    if (allAnswers && onAnswersLoaded) {
      onAnswersLoaded(allAnswers);
    }
  }, [allAnswers, onAnswersLoaded]);

  return { allAnswers: allAnswers ?? [] };
};
