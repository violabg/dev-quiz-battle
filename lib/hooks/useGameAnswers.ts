import {
  AnswersWithPlayer,
  getAnswersWithPlayerForQuestion,
  subscribeToAnswers,
  unsubscribeFromAnswers,
} from "@/lib/supabase/supabase-answers";
import { useCallback, useEffect, useState } from "react";

type UseGameAnswersProps = {
  currentQuestionId: string | undefined | null;
  onAnswersLoaded?: (answers: AnswersWithPlayer) => void;
};

export const useGameAnswers = ({
  currentQuestionId,
  onAnswersLoaded,
}: UseGameAnswersProps) => {
  const [allAnswers, setAllAnswers] = useState<AnswersWithPlayer>([]);

  const fetchAnswers = useCallback(
    async (questionId: string) => {
      const answers = await getAnswersWithPlayerForQuestion(questionId);
      setAllAnswers(answers);
      if (onAnswersLoaded) {
        onAnswersLoaded(answers);
      }
    },
    [onAnswersLoaded]
  );

  useEffect(() => {
    if (!currentQuestionId) {
      setAllAnswers([]);
      if (onAnswersLoaded) {
        onAnswersLoaded([]);
      }
      return;
    }

    let isMounted = true;

    // Initial answers fetch
    fetchAnswers(currentQuestionId);

    const answerSubscription = subscribeToAnswers(async (payload) => {
      if (
        isMounted &&
        payload.new &&
        payload.new.question_id === currentQuestionId
      ) {
        // Refetch all answers for the question to ensure consistency
        await fetchAnswers(currentQuestionId);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeFromAnswers(answerSubscription);
    };
  }, [currentQuestionId, fetchAnswers, onAnswersLoaded]);

  return { allAnswers, setAllAnswers }; // Expose setAllAnswers for reset
};
