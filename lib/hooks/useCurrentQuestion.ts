import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type {
  GameDifficulty,
  GameLanguage,
  QuestionWithCreator,
} from "@/lib/convex-types";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type UseCurrentQuestionProps = {
  gameId: Id<"games">;
  userId: Id<"users"> | undefined;
  allAnswersCount: number;
  playersCount: number;
  hasCorrectAnswer: boolean;
  winner: { playerId: string; user_name: string; score: number } | null;
  isCurrentPlayersTurn: boolean;
  gameStatus: "waiting" | "active" | "completed";
  timeLimit: number;
  onQuestionLoaded?: (question: QuestionWithCreator, startTime: number) => void;
};

export const useCurrentQuestion = ({
  gameId,
  userId,
  allAnswersCount,
  playersCount,
  hasCorrectAnswer,
  winner,
  isCurrentPlayersTurn,
  gameStatus,
  timeLimit,
  onQuestionLoaded,
}: UseCurrentQuestionProps) => {
  // Convex auto-subscribes with useQuery
  const currentQuestion = useQuery(api.questions.getCurrentQuestion, {
    game_id: gameId,
  });

  const [questionStartTime, setQuestionStartTime] = useState<number | null>(
    null
  );
  const [isLoadingCreateQuestion, setIsLoadingCreateQuestion] = useState(false);

  const createQuestion = useMutation(api.questions.createQuestion);
  const endQuestion = useMutation(api.questions.endQuestion);
  const updateGame = useMutation(api.games.updateGame);

  // Set question start time when question loads or changes
  useEffect(() => {
    if (currentQuestion) {
      const startTime = currentQuestion.started_at ?? Date.now();
      setQuestionStartTime(startTime);
      if (onQuestionLoaded) {
        onQuestionLoaded(currentQuestion, startTime);
      }
    }
  }, [currentQuestion, onQuestionLoaded]);

  // Timer effect with atomic ending
  useEffect(() => {
    if (
      !currentQuestion?._id ||
      !questionStartTime ||
      winner ||
      currentQuestion.ended_at
    ) {
      return;
    }

    const timeLimitMs =
      (typeof timeLimit === "number" && !isNaN(timeLimit) ? timeLimit : 120) *
      1000;

    const timer = setInterval(async () => {
      const now = Date.now();
      const timeIsUp = now - questionStartTime >= timeLimitMs;
      const allPlayersAnswered =
        allAnswersCount === playersCount && allAnswersCount > 0;

      if (timeIsUp || allPlayersAnswered || hasCorrectAnswer) {
        clearInterval(timer);
        if (!currentQuestion.ended_at) {
          // Call mutation to end question atomically
          // The mutation checks ended_at before patching (first client wins)
          try {
            await endQuestion({ question_id: currentQuestion._id });
          } catch (error) {
            // Likely already ended by another client or correct answer
            console.log("Question already ended", error);
          }
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [
    currentQuestion,
    questionStartTime,
    winner,
    timeLimit,
    playersCount,
    allAnswersCount,
    hasCorrectAnswer,
    endQuestion,
  ]);

  // Reset timer when question ends
  useEffect(() => {
    if (currentQuestion?.ended_at && questionStartTime !== null) {
      setQuestionStartTime(null);
    }
  }, [currentQuestion?.ended_at, questionStartTime]);

  const handleCreateQuestion = useCallback(
    async (
      selectedLanguage: GameLanguage,
      selectedDifficulty: GameDifficulty
    ): Promise<any | null> => {
      if (!userId || !isCurrentPlayersTurn) return null;

      setIsLoadingCreateQuestion(true);
      try {
        // Still use API route for question generation
        const response = await fetch("/api/questions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            gameId,
            language: selectedLanguage,
            difficulty: selectedDifficulty,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create question");
        }

        const newQuestion = await response.json();

        if (gameStatus !== "active") {
          await updateGame({
            game_id: gameId,
            status: "active",
          });
        }

        return newQuestion;
      } catch {
        toast.error("Errore", {
          description: "Impossibile creare la domanda",
        });
        return null;
      } finally {
        setIsLoadingCreateQuestion(false);
      }
    },
    [userId, isCurrentPlayersTurn, gameId, gameStatus, updateGame]
  );

  return {
    currentQuestion,
    questionStartTime,
    setQuestionStartTime, // Exposed for reset
    isLoadingCreateQuestion,
    handleCreateQuestion,
  };
};
